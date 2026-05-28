from django.utils import timezone
from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    marked_by = UserSerializer(read_only=True)
    game_title = serializers.CharField(source="game.title", read_only=True)
    game_date = serializers.DateField(source="game.date", read_only=True)
    currency = serializers.CharField(source="game.currency", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "game", "game_title", "game_date", "user", "amount", "currency",
            "status", "marked_by", "marked_at", "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "game", "user", "amount", "created_at", "updated_at", "game_title", "game_date", "currency")


class UpdatePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("status", "notes")

    def update(self, instance, validated_data):
        if "status" in validated_data and validated_data["status"] != instance.status:
            instance.marked_by = self.context["request"].user
            instance.marked_at = timezone.now()
        return super().update(instance, validated_data)


class PaymentSummarySerializer(serializers.Serializer):
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    waived_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    waived_count = serializers.IntegerField()
    currency = serializers.CharField()
