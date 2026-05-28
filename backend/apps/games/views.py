from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.groups.models import GroupMembership

from .models import Game, GameParticipant, Team, TeamMember, TeamSuggestion, Waitlist
from .serializers import (
    GameDetailSerializer,
    GameParticipantSerializer,
    GameSerializer,
    RSVPSerializer,
    WaitlistSerializer,
)


def _ensure_payment_record(game, user):
    """Auto-create a pending payment record when a player confirms."""
    if game.cost_per_player and game.cost_per_player > 0:
        from apps.payments.models import Payment
        Payment.objects.get_or_create(
            game=game,
            user=user,
            defaults={"amount": game.cost_per_player, "status": Payment.STATUS_PENDING},
        )


def _promote_waitlist(game):
    """Promote first waitlisted player to confirmed when a spot opens."""
    if game.is_full:
        return
    first_entry = game.waitlist_entries.order_by("position").first()
    if not first_entry:
        return
    with transaction.atomic():
        participant, created = GameParticipant.objects.get_or_create(
            game=game,
            user=first_entry.user,
            defaults={"rsvp_status": GameParticipant.STATUS_CONFIRMED},
        )
        if not created:
            participant.rsvp_status = GameParticipant.STATUS_CONFIRMED
            participant.save()
        first_entry.delete()
        game.waitlist_entries.filter(position__gt=1).update(position=F("position") - 1)
        _ensure_payment_record(game, first_entry.user)


class GameListCreateView(generics.ListCreateAPIView):
    serializer_class = GameSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["group", "status", "date"]
    ordering_fields = ["date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Game.objects.filter(group__memberships__user=user).distinct()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def get_serializer_context(self):
        return {"request": self.request}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.validated_data["group"]
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only group admins can create games."}, status=status.HTTP_403_FORBIDDEN)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GameDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GameDetailSerializer

    def get_queryset(self):
        return Game.objects.filter(group__memberships__user=self.request.user).distinct()

    def get_serializer_context(self):
        return {"request": self.request}

    def _is_admin(self, game):
        return GroupMembership.objects.filter(
            group=game.group, user=self.request.user, role=GroupMembership.ROLE_ADMIN
        ).exists()

    def update(self, request, *args, **kwargs):
        game = self.get_object()
        if not self._is_admin(game):
            return Response({"detail": "Only group admins can edit games."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        game = self.get_object()
        if not self._is_admin(game):
            return Response({"detail": "Only group admins can delete games."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class RSVPView(APIView):
    def post(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        serializer = RSVPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        if game.status == Game.STATUS_CANCELLED:
            return Response({"detail": "Cannot RSVP to a cancelled game."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if action == "leave":
                # Remove from participants or waitlist
                deleted_p = GameParticipant.objects.filter(game=game, user=request.user).delete()
                deleted_w = Waitlist.objects.filter(game=game, user=request.user).delete()
                if deleted_p[0] == 0 and deleted_w[0] == 0:
                    return Response({"detail": "You are not in this game."}, status=status.HTTP_400_BAD_REQUEST)
                # Remove payment if not yet paid
                from apps.payments.models import Payment
                Payment.objects.filter(game=game, user=request.user, status=Payment.STATUS_PENDING).delete()
                # Promote waitlist
                _promote_waitlist(game)
                return Response({"detail": "You have left the game.", "status": "left"})

            elif action == "join":
                # Check if already in
                existing = GameParticipant.objects.filter(game=game, user=request.user).first()
                if existing and existing.rsvp_status == GameParticipant.STATUS_CONFIRMED:
                    return Response({"detail": "You are already confirmed.", "status": "confirmed"})
                if Waitlist.objects.filter(game=game, user=request.user).exists():
                    return Response({"detail": "You are already on the waitlist.", "status": "waitlisted"})

                if game.is_full:
                    next_pos = (game.waitlist_entries.order_by("-position").first() or type("o", (), {"position": 0})()).position + 1
                    Waitlist.objects.create(game=game, user=request.user, position=next_pos)
                    return Response({"detail": f"Game is full. Added to waitlist at position {next_pos}.", "status": "waitlisted"})
                else:
                    participant, created = GameParticipant.objects.update_or_create(
                        game=game, user=request.user,
                        defaults={"rsvp_status": GameParticipant.STATUS_CONFIRMED}
                    )
                    _ensure_payment_record(game, request.user)
                    return Response({"detail": "Joined the game.", "status": "confirmed"}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

            elif action == "maybe":
                if Waitlist.objects.filter(game=game, user=request.user).exists():
                    return Response({"detail": "Cannot set maybe while on waitlist."}, status=status.HTTP_400_BAD_REQUEST)
                participant, created = GameParticipant.objects.update_or_create(
                    game=game, user=request.user,
                    defaults={"rsvp_status": GameParticipant.STATUS_MAYBE}
                )
                return Response({"detail": "RSVP set to maybe.", "status": "maybe"})

        return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)


class CancelGameView(APIView):
    def post(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        if not GroupMembership.objects.filter(group=game.group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only group admins can cancel games."}, status=status.HTTP_403_FORBIDDEN)
        if game.status == Game.STATUS_CANCELLED:
            return Response({"detail": "Game is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        game.status = Game.STATUS_CANCELLED
        game.save()

        # Send cancellation notification
        from apps.notifications.tasks import send_cancellation_notification
        send_cancellation_notification.delay(str(game.id))

        return Response({"detail": "Game cancelled.", "status": "cancelled"})


class GameParticipantsView(generics.ListAPIView):
    serializer_class = GameParticipantSerializer

    def get_queryset(self):
        game = get_object_or_404(Game, pk=self.kwargs["pk"], group__memberships__user=self.request.user)
        return game.participants.select_related("user").all()


class GameWaitlistView(generics.ListAPIView):
    serializer_class = WaitlistSerializer

    def get_queryset(self):
        game = get_object_or_404(Game, pk=self.kwargs["pk"], group__memberships__user=self.request.user)
        return game.waitlist_entries.select_related("user").all()


class AdminMoveParticipantView(APIView):
    """Admin: move a confirmed player to waitlist, or a waitlisted player to confirmed."""

    def _is_admin(self, game, user):
        return GroupMembership.objects.filter(
            group=game.group, user=user, role=GroupMembership.ROLE_ADMIN
        ).exists()

    def post(self, request, pk, user_id):
        game = get_object_or_404(Game, pk=pk)
        if not self._is_admin(game, request.user):
            return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        target_user = get_object_or_404(get_user_model(), pk=user_id)
        action = request.data.get("action")  # "waitlist" or "confirm"

        with transaction.atomic():
            if action == "waitlist":
                participant = get_object_or_404(GameParticipant, game=game, user=target_user)
                if participant.rsvp_status != GameParticipant.STATUS_CONFIRMED:
                    return Response({"detail": "Player is not confirmed."}, status=status.HTTP_400_BAD_REQUEST)
                if Waitlist.objects.filter(game=game, user=target_user).exists():
                    return Response({"detail": "Player is already on the waitlist."}, status=status.HTTP_400_BAD_REQUEST)
                participant.delete()
                next_pos = (game.waitlist_entries.order_by("-position").first() or type("o", (), {"position": 0})()).position + 1
                Waitlist.objects.create(game=game, user=target_user, position=next_pos)
                return Response({"detail": f"{target_user.display_name} moved to waitlist."})

            elif action == "confirm":
                waitlist_entry = get_object_or_404(Waitlist, game=game, user=target_user)
                waitlist_entry.delete()
                game.waitlist_entries.filter(position__gt=waitlist_entry.position).update(position=F("position") - 1)
                participant, _ = GameParticipant.objects.update_or_create(
                    game=game, user=target_user,
                    defaults={"rsvp_status": GameParticipant.STATUS_CONFIRMED},
                )
                _ensure_payment_record(game, target_user)
                return Response({"detail": f"{target_user.display_name} confirmed."})

            return Response({"detail": "action must be 'waitlist' or 'confirm'."}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, user_id):
        game = get_object_or_404(Game, pk=pk)
        if not self._is_admin(game, request.user):
            return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        target_user = get_object_or_404(get_user_model(), pk=user_id)

        with transaction.atomic():
            deleted_p = GameParticipant.objects.filter(game=game, user=target_user).delete()
            deleted_w = Waitlist.objects.filter(game=game, user=target_user).delete()
            if deleted_p[0] == 0 and deleted_w[0] == 0:
                return Response({"detail": "Player is not in this game."}, status=status.HTTP_404_NOT_FOUND)
            from apps.payments.models import Payment
            Payment.objects.filter(game=game, user=target_user, status=Payment.STATUS_PENDING).delete()
            if deleted_p[0] > 0:
                _promote_waitlist(game)
            return Response({"detail": f"{target_user.display_name} removed from game."})


class PublicGameRSVPInfoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        game = get_object_or_404(Game, rsvp_token=token)
        serializer = GameSerializer(game, context={"request": request})
        return Response(serializer.data)


class PublicJoinGameView(APIView):
    def post(self, request, token):
        game = get_object_or_404(Game, rsvp_token=token)
        GroupMembership.objects.get_or_create(
            group=game.group, user=request.user,
            defaults={"role": GroupMembership.ROLE_MEMBER}
        )
        request.data["action"] = "join"
        rsvp_view = RSVPView()
        return rsvp_view.post(request, game.pk)


class GameTeamsView(APIView):
    def get(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        from .serializers import TeamSerializer
        teams = game.teams.prefetch_related("members__user", "created_by").all()
        return Response(TeamSerializer(teams, many=True).data)

    def put(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        teams_data = request.data.get("teams", [])
        with transaction.atomic():
            game.teams.all().delete()
            for td in teams_data:
                team = Team.objects.create(game=game, name=td["name"], created_by=request.user)
                for user_id in td.get("member_ids", []):
                    TeamMember.objects.create(team=team, user_id=user_id)
        from .serializers import TeamSerializer
        teams = game.teams.prefetch_related("members__user", "created_by").all()
        return Response(TeamSerializer(teams, many=True).data)

    def delete(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        game.teams.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GameTeamSuggestionsView(APIView):
    def get(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        from .serializers import TeamSuggestionSerializer
        suggestions = game.team_suggestions.select_related("suggested_by").all()
        return Response(TeamSuggestionSerializer(suggestions, many=True).data)

    def post(self, request, pk):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "Suggestion cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        from .serializers import TeamSuggestionSerializer
        suggestion = TeamSuggestion.objects.create(game=game, suggested_by=request.user, text=text)
        return Response(TeamSuggestionSerializer(suggestion).data, status=status.HTTP_201_CREATED)


class DeleteTeamSuggestionView(APIView):
    def delete(self, request, pk, suggestion_id):
        game = get_object_or_404(Game, pk=pk, group__memberships__user=request.user)
        suggestion = get_object_or_404(TeamSuggestion, pk=suggestion_id, game=game)
        is_admin = GroupMembership.objects.filter(
            group=game.group, user=request.user, role=GroupMembership.ROLE_ADMIN
        ).exists()
        if str(suggestion.suggested_by_id) != str(request.user.id) and not is_admin:
            return Response({"detail": "Cannot delete others' suggestions."}, status=status.HTTP_403_FORBIDDEN)
        suggestion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
