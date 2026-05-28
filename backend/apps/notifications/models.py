import uuid

from django.conf import settings
from django.db import models


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.TextField(unique=True)
    p256dh_key = models.TextField()
    auth_key = models.TextField()
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "push_subscriptions"

    def __str__(self):
        return f"Push subscription for {self.user}"


class Notification(models.Model):
    TYPE_REMINDER = "reminder"
    TYPE_GAME_STARTING_SOON = "game_starting_soon"
    TYPE_CANCELLATION = "cancellation"
    TYPE_PAYMENT_REMINDER = "payment_reminder"
    TYPE_CUSTOM = "custom"
    TYPE_CHOICES = [
        (TYPE_REMINDER, "Reminder"),
        (TYPE_GAME_STARTING_SOON, "Game Starting Soon"),
        (TYPE_CANCELLATION, "Cancellation"),
        (TYPE_PAYMENT_REMINDER, "Payment Reminder"),
        (TYPE_CUSTOM, "Custom Message"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    game = models.ForeignKey(
        "games.Game",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    body = models.TextField()
    data = models.JSONField(default=dict)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient}"
