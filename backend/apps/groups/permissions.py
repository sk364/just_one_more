from rest_framework import permissions

from .models import GroupMembership


class IsGroupAdmin(permissions.BasePermission):
    """Allows access only to group admins."""

    def has_object_permission(self, request, view, obj):
        return GroupMembership.objects.filter(
            group=obj, user=request.user, role=GroupMembership.ROLE_ADMIN
        ).exists()


class IsGroupMember(permissions.BasePermission):
    """Allows access to group members (admin or member)."""

    def has_object_permission(self, request, view, obj):
        return GroupMembership.objects.filter(group=obj, user=request.user).exists()
