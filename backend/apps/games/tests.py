import pytest
from datetime import date, timedelta
from conftest import (
    UserFactory, GroupFactory, GroupMembershipFactory,
    GameFactory, GameParticipantFactory, WaitlistFactory,
)
from apps.games.models import Game, GameParticipant, Waitlist
from apps.payments.models import Payment


@pytest.mark.django_db
class TestGameListCreate:
    url = "/api/v1/games/"

    def test_admin_can_create_game(self, auth_client, group):
        resp = auth_client.post(self.url, {
            "group": str(group.id),
            "title": "Friday Footy",
            "sport": "football",
            "date": str(date.today() + timedelta(days=7)),
            "start_time": "18:00:00",
            "max_players": 10,
            "cost_per_player": "5.00",
        })
        assert resp.status_code == 201
        assert resp.json()["title"] == "Friday Footy"

    def test_member_cannot_create_game(self, member_client, group):
        resp = member_client.post(self.url, {
            "group": str(group.id),
            "title": "Game",
            "sport": "football",
            "date": str(date.today() + timedelta(days=7)),
            "start_time": "18:00:00",
        })
        assert resp.status_code == 403

    def test_list_only_returns_user_group_games(self, auth_client, user, group):
        game = GameFactory(group=group)
        other_group = GroupFactory()
        GameFactory(group=other_group)
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        ids = [g["id"] for g in resp.json()]
        assert str(game.id) in ids
        assert len(ids) == 1


@pytest.mark.django_db
class TestGameDetail:
    def test_admin_can_update_game(self, auth_client, game):
        resp = auth_client.patch(f"/api/v1/games/{game.id}/", {"title": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"

    def test_member_cannot_update_game(self, member_client, game):
        resp = member_client.patch(f"/api/v1/games/{game.id}/", {"title": "X"})
        assert resp.status_code == 403

    def test_admin_can_delete_game(self, auth_client, game):
        resp = auth_client.delete(f"/api/v1/games/{game.id}/")
        assert resp.status_code == 204


@pytest.mark.django_db
class TestRSVP:
    def test_member_can_join_game(self, member_client, game, member_user):
        resp = member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "join"})
        assert resp.status_code in (200, 201)
        assert GameParticipant.objects.filter(
            game=game, user=member_user, rsvp_status="confirmed"
        ).exists()

    def test_join_creates_payment_when_cost_set(self, member_client, game, member_user):
        game.cost_per_player = "10.00"
        game.save()
        member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "join"})
        assert Payment.objects.filter(game=game, user=member_user).exists()

    def test_join_no_payment_when_cost_zero(self, member_client, game, member_user):
        game.cost_per_player = "0.00"
        game.save()
        member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "join"})
        assert not Payment.objects.filter(game=game, user=member_user).exists()

    def test_member_can_leave_game(self, member_client, game, member_user):
        GameParticipantFactory(game=game, user=member_user)
        resp = member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "leave"})
        assert resp.status_code == 200
        assert not GameParticipant.objects.filter(game=game, user=member_user).exists()

    def test_member_can_set_maybe(self, member_client, game, member_user):
        resp = member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "maybe"})
        assert resp.status_code == 200
        assert GameParticipant.objects.filter(
            game=game, user=member_user, rsvp_status="maybe"
        ).exists()

    def test_join_full_game_goes_to_waitlist(self, member_client, game, member_user):
        game.max_players = 1
        game.save()
        other = UserFactory()
        GroupMembershipFactory(group=game.group, user=other, role="member")
        GameParticipantFactory(game=game, user=other, rsvp_status="confirmed")
        resp = member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "join"})
        assert resp.status_code == 200
        assert Waitlist.objects.filter(game=game, user=member_user).exists()

    def test_leave_promotes_waitlisted_player(self, auth_client, game, user, member_user):
        game.max_players = 1
        game.save()
        GameParticipantFactory(game=game, user=user, rsvp_status="confirmed")
        WaitlistFactory(game=game, user=member_user, position=1)
        auth_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "leave"})
        assert not Waitlist.objects.filter(game=game, user=member_user).exists()
        assert GameParticipant.objects.filter(
            game=game, user=member_user, rsvp_status="confirmed"
        ).exists()

    def test_invalid_action_rejected(self, member_client, game):
        resp = member_client.post(f"/api/v1/games/{game.id}/rsvp/", {"action": "invalid"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestCancelGame:
    def test_admin_can_cancel_game(self, auth_client, game):
        resp = auth_client.post(f"/api/v1/games/{game.id}/cancel/")
        assert resp.status_code == 200
        game.refresh_from_db()
        assert game.status == Game.STATUS_CANCELLED

    def test_member_cannot_cancel_game(self, member_client, game):
        resp = member_client.post(f"/api/v1/games/{game.id}/cancel/")
        assert resp.status_code == 403

    def test_cancelled_game_cannot_be_cancelled_again(self, auth_client, game):
        game.status = Game.STATUS_CANCELLED
        game.save()
        resp = auth_client.post(f"/api/v1/games/{game.id}/cancel/")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestAdminMoveParticipant:
    def test_admin_can_move_to_confirmed(self, auth_client, game, member_user):
        WaitlistFactory(game=game, user=member_user, position=1)
        resp = auth_client.post(
            f"/api/v1/games/{game.id}/participants/{member_user.id}/move/",
            {"action": "confirm"},
        )
        assert resp.status_code == 200
        assert GameParticipant.objects.filter(
            game=game, user=member_user, rsvp_status="confirmed"
        ).exists()

    def test_admin_can_remove_participant(self, auth_client, game, member_user):
        GameParticipantFactory(game=game, user=member_user)
        resp = auth_client.delete(
            f"/api/v1/games/{game.id}/participants/{member_user.id}/move/"
        )
        assert resp.status_code == 200
        assert not GameParticipant.objects.filter(game=game, user=member_user).exists()
        assert not Waitlist.objects.filter(game=game, user=member_user).exists()

    def test_member_cannot_move_participant(self, member_client, game, member_user):
        other = UserFactory()
        GroupMembershipFactory(group=game.group, user=other, role="member")
        GameParticipantFactory(game=game, user=other)
        resp = member_client.delete(
            f"/api/v1/games/{game.id}/participants/{other.id}/move/"
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestPublicRSVPLink:
    def test_public_game_info_accessible_without_auth(self, api_client, game):
        resp = api_client.get(f"/api/v1/games/rsvp/{game.rsvp_token}/")
        assert resp.status_code == 200
        assert resp.json()["title"] == game.title

    def test_join_via_rsvp_token_adds_to_group(self, api_client, game, db):
        new_user = UserFactory()
        api_client.force_authenticate(user=new_user)
        resp = api_client.post(f"/api/v1/games/rsvp/{game.rsvp_token}/join/")
        assert resp.status_code in (200, 201)
        from apps.groups.models import GroupMembership
        assert GroupMembership.objects.filter(group=game.group, user=new_user).exists()
        assert GameParticipant.objects.filter(game=game, user=new_user).exists()

    def test_invalid_token_returns_404(self, api_client):
        resp = api_client.get("/api/v1/games/rsvp/nonexistenttoken/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestGameProperties:
    def test_confirmed_count(self, game):
        GameParticipantFactory(game=game, rsvp_status="confirmed")
        GameParticipantFactory(game=game, rsvp_status="confirmed")
        GameParticipantFactory(game=game, rsvp_status="maybe")
        assert game.confirmed_count == 2

    def test_is_full_when_at_capacity(self, game):
        game.max_players = 1
        game.save()
        GameParticipantFactory(game=game, rsvp_status="confirmed")
        game.refresh_from_db()
        assert game.is_full is True

    def test_is_not_full_when_no_limit(self, game):
        game.max_players = None
        game.save()
        assert game.is_full is False
