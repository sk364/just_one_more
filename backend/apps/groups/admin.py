from django.contrib import admin

from .models import Group, GroupMembership, InviteLink


class GroupMembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    readonly_fields = ("joined_at",)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "created_by", "member_count", "created_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [GroupMembershipInline]

    def member_count(self, obj):
        return obj.memberships.count()


@admin.register(InviteLink)
class InviteLinkAdmin(admin.ModelAdmin):
    list_display = ("group", "token", "is_active", "use_count", "created_at")
    list_filter = ("is_active",)
    readonly_fields = ("id", "token", "created_at", "use_count")
