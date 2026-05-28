from django.conf import settings
from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Group, GroupMembership, InviteLink


class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class GroupSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ("id", "name", "description", "created_by", "member_count", "my_role", "created_at", "updated_at")
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user).first()
            return membership.role if membership else None
        return None

    def create(self, validated_data):
        user = self.context["request"].user
        group = Group.objects.create(created_by=user, **validated_data)
        GroupMembership.objects.create(group=group, user=user, role=GroupMembership.ROLE_ADMIN)
        return group


class GroupDetailSerializer(GroupSerializer):
    recent_games_count = serializers.SerializerMethodField()

    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ("recent_games_count",)

    def get_recent_games_count(self, obj):
        from apps.games.models import Game
        from django.utils import timezone
        import datetime
        thirty_days_ago = timezone.now().date() - datetime.timedelta(days=30)
        return obj.games.filter(date__gte=thirty_days_ago).count()


class InviteLinkSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = InviteLink
        fields = ("id", "token", "invite_url", "group_name", "created_at", "expires_at", "is_active", "max_uses", "use_count", "is_valid")
        read_only_fields = ("id", "token", "created_at", "use_count", "is_valid", "group_name")

    def get_invite_url(self, obj):
        frontend_url = settings.FRONTEND_URL
        return f"{frontend_url}/invite/{obj.token}"


class InviteInfoSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    group_description = serializers.CharField(source="group.description", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = InviteLink
        fields = ("group_name", "group_description", "member_count", "is_valid")

    def get_member_count(self, obj):
        return obj.group.memberships.count()
