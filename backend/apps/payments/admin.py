from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user", "game", "amount", "status", "marked_by", "marked_at")
    list_filter = ("status",)
    search_fields = ("user__email", "game__title")
    readonly_fields = ("id", "created_at", "updated_at")
