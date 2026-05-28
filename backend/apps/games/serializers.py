from django.conf import settings
from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Game, GameParticipant, Team, TeamMember, TeamSuggestion, Waitlist


class GameParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = GameParticipant
        fields = ("id", "user", "rsvp_status", "joined_at", "updated_at")
        read_only_fields = ("id", "joined_at", "updated_at")


class WaitlistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Waitlist
        fields = ("id", "user", "position", "joined_at")
        read_only_fields = ("id", "position", "joined_at")


class GameSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    confirmed_count = serializers.IntegerField(read_only=True)
    waitlist_count = serializers.SerializerMethodField()
    my_rsvp_status = serializers.SerializerMethodField()
    is_full = serializers.BooleanField(read_only=True)
    rsvp_url = serializers.SerializerMethodField()
    group_name = serializers.CharField(source="group.name", read_only=True)
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = (
            "id", "group", "group_name", "title", "sport", "location", "location_url",
            "date", "start_time", "end_time", "max_players", "cost_per_player", "currency",
            "notes", "status", "rsvp_token", "rsvp_url", "created_by",
            "confirmed_count", "waitlist_count", "my_rsvp_status", "is_full", "is_admin",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "rsvp_token", "created_by", "created_at", "updated_at")

    def get_waitlist_count(self, obj):
        return obj.waitlist_entries.count()

    def get_my_rsvp_status(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            participant = obj.participants.filter(user=request.user).first()
            if participant:
                return participant.rsvp_status
            if obj.waitlist_entries.filter(user=request.user).exists():
                return "waitlisted"
        return None

    def get_rsvp_url(self, obj):
        return f"{settings.FRONTEND_URL}/rsvp/{obj.rsvp_token}"

    def get_is_admin(self, obj):
        from apps.groups.models import GroupMembership
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return GroupMembership.objects.filter(
                group=obj.group, user=request.user, role=GroupMembership.ROLE_ADMIN
            ).exists()
        return False

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class GameDetailSerializer(GameSerializer):
    participants_list = serializers.SerializerMethodField()
    waitlist_list = serializers.SerializerMethodField()

    class Meta(GameSerializer.Meta):
        fields = GameSerializer.Meta.fields + ("participants_list", "waitlist_list")

    def get_participants_list(self, obj):
        participants = obj.participants.select_related("user").filter(
            rsvp_status__in=[GameParticipant.STATUS_CONFIRMED, GameParticipant.STATUS_MAYBE]
        ).order_by("rsvp_status")
        return GameParticipantSerializer(participants, many=True).data

    def get_waitlist_list(self, obj):
        return WaitlistSerializer(obj.waitlist_entries.select_related("user").all(), many=True).data


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ("user",)


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Team
        fields = ("id", "name", "members", "created_by", "created_at")


class TeamSuggestionSerializer(serializers.ModelSerializer):
    suggested_by = UserSerializer(read_only=True)

    class Meta:
        model = TeamSuggestion
        fields = ("id", "suggested_by", "text", "created_at")


class RSVPSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["join", "leave", "maybe"])
