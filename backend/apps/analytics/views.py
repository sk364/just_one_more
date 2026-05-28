import datetime

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game, GameParticipant
from apps.groups.models import Group, GroupMembership


class GroupAttendanceView(APIView):
    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id, memberships__user=request.user)
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        participants_qs = GameParticipant.objects.filter(
            game__group=group,
            rsvp_status=GameParticipant.STATUS_CONFIRMED,
        )
        if date_from:
            participants_qs = participants_qs.filter(game__date__gte=date_from)
        if date_to:
            participants_qs = participants_qs.filter(game__date__lte=date_to)

        attendance = (
            participants_qs
            .values("user__id", "user__display_name", "user__avatar_url")
            .annotate(games_played=Count("id"))
            .order_by("user__display_name")
        )
        return Response(list(attendance))


class GroupTopPlayersView(APIView):
    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id, memberships__user=request.user)
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        limit = int(request.query_params.get("limit", 10))

        participants_qs = GameParticipant.objects.filter(
            game__group=group,
            rsvp_status=GameParticipant.STATUS_CONFIRMED,
        )
        if date_from:
            participants_qs = participants_qs.filter(game__date__gte=date_from)
        if date_to:
            participants_qs = participants_qs.filter(game__date__lte=date_to)

        top = (
            participants_qs
            .values("user__id", "user__display_name", "user__avatar_url")
            .annotate(games_played=Count("id"))
            .order_by("-games_played")[:limit]
        )
        return Response(list(top))


class GroupGameCountView(APIView):
    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id, memberships__user=request.user)
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        games_qs = Game.objects.filter(group=group)
        if date_from:
            games_qs = games_qs.filter(date__gte=date_from)
        if date_to:
            games_qs = games_qs.filter(date__lte=date_to)

        by_month = (
            games_qs
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(
                total=Count("id"),
                completed=Count("id", filter=Q(status=Game.STATUS_COMPLETED)),
                cancelled=Count("id", filter=Q(status=Game.STATUS_CANCELLED)),
                scheduled=Count("id", filter=Q(status=Game.STATUS_SCHEDULED)),
            )
            .order_by("month")
        )
        return Response(list(by_month))


class GroupSummaryView(APIView):
    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id, memberships__user=request.user)
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        games_qs = Game.objects.filter(group=group)
        if date_from:
            games_qs = games_qs.filter(date__gte=date_from)
        if date_to:
            games_qs = games_qs.filter(date__lte=date_to)

        total_games = games_qs.count()
        completed_games = games_qs.filter(status=Game.STATUS_COMPLETED).count()
        cancelled_games = games_qs.filter(status=Game.STATUS_CANCELLED).count()
        total_members = group.memberships.count()

        participation = GameParticipant.objects.filter(
            game__group=group,
            rsvp_status=GameParticipant.STATUS_CONFIRMED,
        )
        if date_from:
            participation = participation.filter(game__date__gte=date_from)
        if date_to:
            participation = participation.filter(game__date__lte=date_to)

        total_slots = participation.count()
        avg_attendance = round(total_slots / total_games, 1) if total_games > 0 else 0

        return Response({
            "total_games": total_games,
            "completed_games": completed_games,
            "cancelled_games": cancelled_games,
            "total_members": total_members,
            "avg_attendance": avg_attendance,
        })


class OverviewView(APIView):
    def get(self, request):
        user = request.user
        groups = Group.objects.filter(memberships__user=user)
        total_groups = groups.count()
        total_games_played = GameParticipant.objects.filter(
            user=user, rsvp_status=GameParticipant.STATUS_CONFIRMED
        ).count()
        upcoming_games = Game.objects.filter(
            group__memberships__user=user,
            date__gte=timezone.now().date(),
            status=Game.STATUS_SCHEDULED,
        ).count()
        thirty_days_ago = timezone.now().date() - datetime.timedelta(days=30)
        recent_games = Game.objects.filter(
            group__memberships__user=user,
            date__gte=thirty_days_ago,
        ).count()

        return Response({
            "total_groups": total_groups,
            "total_games_played": total_games_played,
            "upcoming_games": upcoming_games,
            "recent_games": recent_games,
        })
