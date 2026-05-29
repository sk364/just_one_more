import pytest
from conftest import (
    UserFactory, GameParticipantFactory, NotificationFactory, PushSubscriptionFactory,
)
from apps.notifications.models import Notification, PushSubscription


@pytest.mark.django_db
class TestNotificationList:
    url = "/api/v1/notifications/"

    def test_returns_own_notifications_only(self, auth_client, user):
        NotificationFactory(recipient=user)
        NotificationFactory()  # belongs to another user
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMarkRead:
    def test_mark_notification_read(self, auth_client, user):
        notif = NotificationFactory(recipient=user, is_read=False)
        resp = auth_client.patch(f"/api/v1/notifications/{notif.id}/read/")
        assert resp.status_code == 200
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_cannot_mark_other_users_notification(self, auth_client, user):
        other_notif = NotificationFactory(is_read=False)
        resp = auth_client.patch(f"/api/v1/notifications/{other_notif.id}/read/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestMarkAllRead:
    def test_marks_all_unread_as_read(self, auth_client, user):
        NotificationFactory(recipient=user, is_read=False)
        NotificationFactory(recipient=user, is_read=False)
        resp = auth_client.post("/api/v1/notifications/mark-all-read/")
        assert resp.status_code == 200
        assert Notification.objects.filter(recipient=user, is_read=False).count() == 0

    def test_does_not_affect_other_users(self, auth_client, user):
        other_notif = NotificationFactory(is_read=False)
        auth_client.post("/api/v1/notifications/mark-all-read/")
        other_notif.refresh_from_db()
        assert other_notif.is_read is False


@pytest.mark.django_db
class TestUnreadCount:
    url = "/api/v1/notifications/unread-count/"

    def test_returns_correct_count(self, auth_client, user):
        NotificationFactory(recipient=user, is_read=False)
        NotificationFactory(recipient=user, is_read=False)
        NotificationFactory(recipient=user, is_read=True)
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        assert resp.json()["count"] == 2

    def test_zero_when_all_read(self, auth_client, user):
        NotificationFactory(recipient=user, is_read=True)
        resp = auth_client.get(self.url)
        assert resp.json()["count"] == 0


@pytest.mark.django_db
class TestPushSubscribe:
    url = "/api/v1/notifications/push/subscribe/"

    def test_creates_subscription(self, auth_client, user):
        resp = auth_client.post(self.url, {
            "endpoint": "https://fcm.googleapis.com/wp/test123",
            "p256dh_key": "BMIPadntest",
            "auth_key": "authtest",
            "user_agent": "TestBrowser/1.0",
        })
        assert resp.status_code == 201
        assert PushSubscription.objects.filter(user=user).exists()

    def test_upserts_existing_subscription(self, auth_client, user):
        PushSubscriptionFactory(user=user, endpoint="https://fcm.googleapis.com/wp/existing")
        resp = auth_client.post(self.url, {
            "endpoint": "https://fcm.googleapis.com/wp/existing",
            "p256dh_key": "BMIPadnmeEborM1s2wENn2t5MR4BEupdated",
            "auth_key": "nk6zJNupdated",
            "user_agent": "TestBrowser/2.0",
        })
        assert resp.status_code == 201
        assert PushSubscription.objects.filter(user=user).count() == 1

    def test_unauthenticated_cannot_subscribe(self, api_client):
        resp = api_client.post(self.url, {
            "endpoint": "https://fcm.googleapis.com/wp/test",
            "p256dh_key": "key",
            "auth_key": "auth",
        })
        assert resp.status_code == 401


@pytest.mark.django_db
class TestPushUnsubscribe:
    url = "/api/v1/notifications/push/unsubscribe/"

    def test_deletes_subscription(self, auth_client, user):
        sub = PushSubscriptionFactory(user=user)
        resp = auth_client.delete(self.url, {"endpoint": sub.endpoint})
        assert resp.status_code == 204
        assert not PushSubscription.objects.filter(user=user).exists()

    def test_ignores_unknown_endpoint(self, auth_client):
        resp = auth_client.delete(self.url, {"endpoint": "https://unknown.endpoint/"})
        assert resp.status_code == 204


@pytest.mark.django_db
class TestSendPush:
    def test_admin_can_send_notification(self, auth_client, game, member_user):
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        resp = auth_client.post("/api/v1/notifications/push/send/", {
            "game_id": str(game.id),
            "notification_type": "custom",
            "title": "Hey team",
            "body": "Game is on!",
        })
        assert resp.status_code == 200
        assert Notification.objects.filter(recipient=member_user).exists()

    def test_member_cannot_send_notification(self, member_client, game):
        resp = member_client.post("/api/v1/notifications/push/send/", {
            "game_id": str(game.id),
            "notification_type": "reminder",
        })
        assert resp.status_code == 403

    def test_invalid_game_id_returns_404(self, auth_client):
        import uuid
        resp = auth_client.post("/api/v1/notifications/push/send/", {
            "game_id": str(uuid.uuid4()),
            "notification_type": "reminder",
        })
        assert resp.status_code == 404


@pytest.mark.django_db
class TestCeleryTasks:
    def test_cancellation_creates_notifications_for_confirmed_participants(self, game, member_user):
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        from apps.notifications.tasks import send_cancellation_notification
        send_cancellation_notification(str(game.id))
        assert Notification.objects.filter(
            recipient=member_user, notification_type=Notification.TYPE_CANCELLATION
        ).exists()

    def test_reminder_targets_members_without_rsvp(self, game, member_user):
        # member_user has no RSVP
        from apps.notifications.tasks import send_game_reminder
        send_game_reminder(str(game.id))
        assert Notification.objects.filter(
            recipient=member_user, notification_type=Notification.TYPE_REMINDER
        ).exists()

    def test_payment_reminder_targets_pending_payments(self, game, member_user):
        GameParticipantFactory(game=game, user=member_user, rsvp_status="confirmed")
        from apps.payments.models import Payment
        Payment.objects.create(game=game, user=member_user, amount="10.00", status="pending")
        from apps.notifications.tasks import send_payment_reminder
        send_payment_reminder(str(game.id))
        assert Notification.objects.filter(
            recipient=member_user, notification_type=Notification.TYPE_PAYMENT_REMINDER
        ).exists()

    def test_nonexistent_game_id_does_not_raise(self):
        import uuid
        from apps.notifications.tasks import send_cancellation_notification
        # Should return silently, not raise
        send_cancellation_notification(str(uuid.uuid4()))
