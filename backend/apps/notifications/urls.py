from django.urls import path

from .views import (
    MarkAllReadView,
    MarkNotificationReadView,
    NotificationListView,
    PushSubscribeView,
    PushUnsubscribeView,
    SendPushView,
    UnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("push/subscribe/", PushSubscribeView.as_view(), name="push-subscribe"),
    path("push/unsubscribe/", PushUnsubscribeView.as_view(), name="push-unsubscribe"),
    path("push/send/", SendPushView.as_view(), name="push-send"),
]
