from django.urls import path

from .views import (
    GroupAttendanceView,
    GroupGameCountView,
    GroupSummaryView,
    GroupTopPlayersView,
    OverviewView,
)

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="analytics-overview"),
    path("groups/<uuid:group_id>/attendance/", GroupAttendanceView.as_view(), name="analytics-attendance"),
    path("groups/<uuid:group_id>/top-players/", GroupTopPlayersView.as_view(), name="analytics-top-players"),
    path("groups/<uuid:group_id>/game-count/", GroupGameCountView.as_view(), name="analytics-game-count"),
    path("groups/<uuid:group_id>/summary/", GroupSummaryView.as_view(), name="analytics-summary"),
]
