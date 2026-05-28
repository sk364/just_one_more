from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.groups.models import GroupMembership

from .models import Payment
from .serializers import PaymentSerializer, PaymentSummarySerializer, UpdatePaymentSerializer


class GamePaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        game = get_object_or_404(
            Game, pk=self.kwargs["game_pk"], group__memberships__user=self.request.user
        )
        if game.cost_per_player and game.cost_per_player > 0:
            existing_user_ids = set(game.payments.values_list("user_id", flat=True))
            confirmed_users = game.participants.filter(
                rsvp_status="confirmed"
            ).exclude(user_id__in=existing_user_ids).select_related("user")
            if confirmed_users.exists():
                Payment.objects.bulk_create([
                    Payment(game=game, user=p.user, amount=game.cost_per_player, status=Payment.STATUS_PENDING)
                    for p in confirmed_users
                ])
        return game.payments.select_related("user", "marked_by").all()


class UpdatePaymentView(APIView):
    def patch(self, request, game_pk, user_id):
        game = get_object_or_404(Game, pk=game_pk, group__memberships__user=request.user)
        payment = get_object_or_404(Payment, game=game, user_id=user_id)
        serializer = UpdatePaymentSerializer(payment, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PaymentSerializer(payment).data)


class PaymentSummaryView(APIView):
    def get(self, request, game_pk):
        game = get_object_or_404(Game, pk=game_pk, group__memberships__user=request.user)
        payments = game.payments.all()
        agg = payments.aggregate(
            total=Sum("amount"),
            paid=Sum("amount", filter=Q(status=Payment.STATUS_PAID)),
            pending=Sum("amount", filter=Q(status=Payment.STATUS_PENDING)),
            waived=Sum("amount", filter=Q(status=Payment.STATUS_WAIVED)),
        )
        data = {
            "total_amount": agg["total"] or 0,
            "paid_amount": agg["paid"] or 0,
            "pending_amount": agg["pending"] or 0,
            "waived_amount": agg["waived"] or 0,
            "paid_count": payments.filter(status=Payment.STATUS_PAID).count(),
            "pending_count": payments.filter(status=Payment.STATUS_PENDING).count(),
            "waived_count": payments.filter(status=Payment.STATUS_WAIVED).count(),
            "currency": game.currency,
        }
        serializer = PaymentSummarySerializer(data)
        return Response(serializer.data)
