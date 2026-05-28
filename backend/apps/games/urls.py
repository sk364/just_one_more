from django.urls import path

from .views import (
    AdminMoveParticipantView,
    CancelGameView,
    DeleteTeamSuggestionView,
    GameDetailView,
    GameListCreateView,
    GameParticipantsView,
    GameTeamSuggestionsView,
    GameTeamsView,
    GameWaitlistView,
    PublicGameRSVPInfoView,
    PublicJoinGameView,
    RSVPView,
)

urlpatterns = [
    path("", GameListCreateView.as_view(), name="game-list-create"),
    path("<uuid:pk>/", GameDetailView.as_view(), name="game-detail"),
    path("<uuid:pk>/rsvp/", RSVPView.as_view(), name="game-rsvp"),
    path("<uuid:pk>/participants/", GameParticipantsView.as_view(), name="game-participants"),
    path("<uuid:pk>/participants/<uuid:user_id>/move/", AdminMoveParticipantView.as_view(), name="game-participant-move"),
    path("<uuid:pk>/waitlist/", GameWaitlistView.as_view(), name="game-waitlist"),
    path("<uuid:pk>/cancel/", CancelGameView.as_view(), name="game-cancel"),
    path("<uuid:pk>/teams/", GameTeamsView.as_view(), name="game-teams"),
    path("<uuid:pk>/teams/suggestions/", GameTeamSuggestionsView.as_view(), name="game-team-suggestions"),
    path("<uuid:pk>/teams/suggestions/<uuid:suggestion_id>/", DeleteTeamSuggestionView.as_view(), name="game-team-suggestion-delete"),
    path("rsvp/<str:token>/", PublicGameRSVPInfoView.as_view(), name="rsvp-info"),
    path("rsvp/<str:token>/join/", PublicJoinGameView.as_view(), name="rsvp-join"),
]
