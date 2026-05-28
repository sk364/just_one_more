from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include([
        path("auth/", include("apps.users.urls")),
        path("groups/", include("apps.groups.urls")),
        path("games/", include("apps.games.urls")),
        path("analytics/", include("apps.analytics.urls")),
        path("notifications/", include("apps.notifications.urls")),
        path("", include("apps.payments.urls")),
    ])),
]
