from rest_framework import serializers

from .models import Notification, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    game_title = serializers.CharField(source="game.title", read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = ("id", "game", "game_title", "notification_type", "title", "body", "data", "is_read", "sent_at", "created_at")
        read_only_fields = ("id", "created_at", "sent_at")


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ("endpoint", "p256dh_key", "auth_key", "user_agent")

    def create(self, validated_data):
        user = self.context["request"].user
        sub, created = PushSubscription.objects.update_or_create(
            endpoint=validated_data["endpoint"],
            defaults={**validated_data, "user": user},
        )
        return sub


class SendNotificationSerializer(serializers.Serializer):
    game_id = serializers.UUIDField()
    notification_type = serializers.ChoiceField(choices=["cancellation", "payment_reminder", "game_starting_soon", "reminder", "custom"])
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)
