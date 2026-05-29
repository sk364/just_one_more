import pytest
from datetime import date, timedelta
from conftest import (
    UserFactory, GroupMembershipFactory, GameFactory, GameParticipantFactory,
)
from apps.games.models import Game


@pytest.mark.django_db
class TestGroupAttendance:
    def test_returns_attendance_for_group_members(self, auth_client, group, member_user):
        game = GameFactory(group=group, status="completed")
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        resp = auth_client.get(f"/api/v1/analytics/groups/{group.id}/attendance/")
        assert resp.status_code == 200
        users = [r["user__id"] for r in resp.json()]
        assert str(member_user.id) in users

    def test_non_member_cannot_view(self, api_client, group):
        outsider = UserFactory()
        api_client.force_authenticate(user=outsider)
        resp = api_client.get(f"/api/v1/analytics/groups/{group.id}/attendance/")
        assert resp.status_code in (403, 404)

    def test_date_range_filter(self, auth_client, group, member_user):
        old_game = GameFactory(
            group=group, status="completed",
            date=date.today() - timedelta(days=60)
        )
        GameParticipantFactory(game=old_game, user=member_user, rsvp_status="confirmed")
        resp = auth_client.get(
            f"/api/v1/analytics/groups/{group.id}/attendance/",
            {"date_from": str(date.today() - timedelta(days=30)), "date_to": str(date.today())},
        )
        assert resp.status_code == 200
        # Old game should not be counted
        entry = next((r for r in resp.json() if r["user__id"] == str(member_user.id)), None)
        if entry:
            assert entry["games_played"] == 0


@pytest.mark.django_db
class TestTopPlayers:
    def test_returns_ordered_by_participation(self, auth_client, group, member_user, user):
        game1 = GameFactory(group=group, status="completed")
        game2 = GameFactory(group=group, status="completed")
        GameParticipantFactory(game=game1, user=member_user, rsvp_status="confirmed")
        GameParticipantFactory(game=game2, user=member_user, rsvp_status="confirmed")
        GameParticipantFactory(game=game1, user=user, rsvp_status="confirmed")
        resp = auth_client.get(f"/api/v1/analytics/groups/{group.id}/top-players/")
        assert resp.status_code == 200
        players = resp.json()
        assert len(players) >= 2
        assert players[0]["games_played"] >= players[-1]["games_played"]

    def test_limit_parameter(self, auth_client, group):
        for _ in range(5):
            u = UserFactory()
            GroupMembershipFactory(group=group, user=u, role="member")
        resp = auth_client.get(
            f"/api/v1/analytics/groups/{group.id}/top-players/", {"limit": 2}
        )
        assert resp.status_code == 200
        assert len(resp.json()) <= 2


@pytest.mark.django_db
class TestGroupGameCount:
    def test_returns_games_grouped_by_month(self, auth_client, group):
        GameFactory(group=group, date=date.today(), status="completed")
        GameFactory(group=group, date=date.today(), status="scheduled")
        resp = auth_client.get(f"/api/v1/analytics/groups/{group.id}/game-count/")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        first = resp.json()[0]
        assert "month" in first
        assert "total" in first


@pytest.mark.django_db
class TestGroupSummary:
    def test_summary_includes_all_fields(self, auth_client, group, member_user):
        game = GameFactory(group=group, status="completed")
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        resp = auth_client.get(f"/api/v1/analytics/groups/{group.id}/summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_games" in data
        assert "completed_games" in data
        assert "cancelled_games" in data
        assert "total_members" in data
        assert "avg_attendance" in data

    def test_cancelled_count_correct(self, auth_client, group):
        GameFactory(group=group, status="cancelled")
        GameFactory(group=group, status="completed")
        resp = auth_client.get(f"/api/v1/analytics/groups/{group.id}/summary/")
        data = resp.json()
        assert data["cancelled_games"] == 1
        assert data["completed_games"] == 1
        assert data["total_games"] == 2


@pytest.mark.django_db
class TestOverview:
    url = "/api/v1/analytics/overview/"

    def test_overview_returns_user_stats(self, auth_client, group, game, user):
        GameParticipantFactory(game=game, user=user, rsvp_status="confirmed")
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_groups" in data
        assert "total_games_played" in data
        assert "upcoming_games" in data

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == 401
