from django.contrib import admin

from .models import Game, GameParticipant, Waitlist


class GameParticipantInline(admin.TabularInline):
    model = GameParticipant
    extra = 0
    readonly_fields = ("joined_at", "updated_at")


class WaitlistInline(admin.TabularInline):
    model = Waitlist
    extra = 0
    readonly_fields = ("position", "joined_at")


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "date", "start_time", "status", "confirmed_count", "max_players")
    list_filter = ("status", "date", "group")
    search_fields = ("title", "location")
    readonly_fields = ("id", "rsvp_token", "created_at", "updated_at")
    inlines = [GameParticipantInline, WaitlistInline]

    def confirmed_count(self, obj):
        return obj.confirmed_count
