import pytest
from conftest import (
    UserFactory, GroupMembershipFactory,
    GameParticipantFactory, PaymentFactory,
)
from apps.payments.models import Payment


@pytest.mark.django_db
class TestGamePaymentsList:
    def test_returns_payments_for_confirmed_participants(self, auth_client, game, member_user):
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        game.cost_per_player = "15.00"
        game.save()
        PaymentFactory(game=game, user=member_user, amount="15.00")
        resp = auth_client.get(f"/api/v1/games/{game.id}/payments/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["user"]["id"] == str(member_user.id)

    def test_backfills_missing_payment_records(self, auth_client, game, member_user):
        game.cost_per_player = "10.00"
        game.save()
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        # no Payment record yet
        assert not Payment.objects.filter(game=game, user=member_user).exists()
        auth_client.get(f"/api/v1/games/{game.id}/payments/")
        assert Payment.objects.filter(game=game, user=member_user).exists()

    def test_does_not_backfill_when_cost_zero(self, auth_client, game, member_user):
        game.cost_per_player = "0.00"
        game.save()
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        auth_client.get(f"/api/v1/games/{game.id}/payments/")
        assert not Payment.objects.filter(game=game, user=member_user).exists()

    def test_non_member_cannot_view_payments(self, api_client, game):
        outsider = UserFactory()
        api_client.force_authenticate(user=outsider)
        resp = api_client.get(f"/api/v1/games/{game.id}/payments/")
        assert resp.status_code in (403, 404)


@pytest.mark.django_db
class TestUpdatePayment:
    def test_member_can_mark_payment_paid(self, member_client, game, member_user):
        payment = PaymentFactory(game=game, user=member_user, status="pending")
        resp = member_client.patch(
            f"/api/v1/games/{game.id}/payments/{member_user.id}/",
            {"status": "paid"},
        )
        assert resp.status_code == 200
        payment.refresh_from_db()
        assert payment.status == Payment.STATUS_PAID

    def test_marking_paid_sets_marked_by(self, member_client, game, member_user, user):
        payment = PaymentFactory(game=game, user=member_user, status="pending")
        member_client.patch(
            f"/api/v1/games/{game.id}/payments/{member_user.id}/",
            {"status": "paid"},
        )
        payment.refresh_from_db()
        assert payment.marked_by is not None
        assert payment.marked_at is not None

    def test_can_set_waived(self, auth_client, game, member_user):
        payment = PaymentFactory(game=game, user=member_user, status="pending")
        resp = auth_client.patch(
            f"/api/v1/games/{game.id}/payments/{member_user.id}/",
            {"status": "waived"},
        )
        assert resp.status_code == 200
        payment.refresh_from_db()
        assert payment.status == Payment.STATUS_WAIVED

    def test_invalid_status_rejected(self, auth_client, game, member_user):
        PaymentFactory(game=game, user=member_user)
        resp = auth_client.patch(
            f"/api/v1/games/{game.id}/payments/{member_user.id}/",
            {"status": "invalid_status"},
        )
        assert resp.status_code == 400

    def test_non_member_cannot_update(self, api_client, game, member_user):
        PaymentFactory(game=game, user=member_user)
        outsider = UserFactory()
        api_client.force_authenticate(user=outsider)
        resp = api_client.patch(
            f"/api/v1/games/{game.id}/payments/{member_user.id}/",
            {"status": "paid"},
        )
        assert resp.status_code in (403, 404)


@pytest.mark.django_db
class TestPaymentSummary:
    def test_summary_totals(self, auth_client, game, member_user, user):
        PaymentFactory(game=game, user=member_user, amount="10.00", status="paid")
        PaymentFactory(game=game, user=user, amount="10.00", status="pending")
        resp = auth_client.get(f"/api/v1/games/{game.id}/payments/summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert str(data["paid_amount"]) == "10.00"
        assert str(data["pending_amount"]) == "10.00"
        assert data["paid_count"] == 1
        assert data["pending_count"] == 1
