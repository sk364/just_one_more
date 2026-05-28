import secrets
import uuid

from django.conf import settings
from django.db import models
from django.db.models import F


class Game(models.Model):
    STATUS_SCHEDULED = "scheduled"
    STATUS_ONGOING = "ongoing"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_ONGOING, "Ongoing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        "groups.Group", on_delete=models.CASCADE, related_name="games"
    )
    title = models.CharField(max_length=200)
    sport = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=300, blank=True)
    location_url = models.URLField(blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    max_players = models.IntegerField(null=True, blank=True)
    cost_per_player = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="INR")
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    rsvp_token = models.CharField(max_length=64, unique=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_games",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "games"
        ordering = ["-date", "-start_time"]
        indexes = [
            models.Index(fields=["group", "date"]),
            models.Index(fields=["date", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.rsvp_token:
            self.rsvp_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def confirmed_count(self):
        return self.participants.filter(rsvp_status=GameParticipant.STATUS_CONFIRMED).count()

    @property
    def is_full(self):
        if self.max_players is None:
            return False
        return self.confirmed_count >= self.max_players

    def __str__(self):
        return f"{self.title} on {self.date}"


class GameParticipant(models.Model):
    STATUS_CONFIRMED = "confirmed"
    STATUS_DECLINED = "declined"
    STATUS_MAYBE = "maybe"
    STATUS_CHOICES = [
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_DECLINED, "Declined"),
        (STATUS_MAYBE, "Maybe"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_participations",
    )
    rsvp_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_CONFIRMED
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "game_participants"
        unique_together = ("game", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} → {self.game} ({self.rsvp_status})"


class Waitlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="waitlist_entries")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
    )
    position = models.IntegerField()
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "game_waitlist"
        unique_together = ("game", "user")
        ordering = ["position"]

    def __str__(self):
        return f"{self.user} waitlisted for {self.game} (#{self.position})"


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="teams")
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_teams"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "game_teams"
        ordering = ["created_at"]


class TeamMember(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships"
    )

    class Meta:
        db_table = "game_team_members"
        unique_together = ("team", "user")


class TeamSuggestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="team_suggestions")
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_suggestions"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "game_team_suggestions"
        ordering = ["created_at"]
