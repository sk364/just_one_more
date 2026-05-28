import json
import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _send_push_to_user(user, title, body, data=None):
    """Send a push notification to all subscriptions of a user."""
    from .models import PushSubscription

    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured. Skipping push notification.")
        return

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush not installed. Skipping push notification.")
        return

    subscriptions = PushSubscription.objects.filter(user=user)
    payload = json.dumps({"title": title, "body": body, "data": data or {}})

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh_key, "auth": sub.auth_key},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": settings.VAPID_EMAIL,
                    "aud": "/".join(sub.endpoint.split("/")[:3]),
                },
                ttl=86400,
            )
            sub.last_used_at = timezone.now()
            sub.save(update_fields=["last_used_at"])
        except Exception as exc:
            logger.error(f"Failed to send push to {sub.endpoint}: {exc}")
            if "expired" in str(exc).lower() or "unsubscribed" in str(exc).lower():
                sub.delete()


def _create_notification(recipient, notification_type, title, body, game=None, data=None):
    from .models import Notification
    return Notification.objects.create(
        recipient=recipient,
        game=game,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data or {},
        sent_at=timezone.now(),
    )


@shared_task(name="notifications.send_cancellation_notification")
def send_cancellation_notification(game_id):
    from apps.games.models import Game, GameParticipant
    from .models import Notification

    try:
        game = Game.objects.select_related("group").get(pk=game_id)
    except Game.DoesNotExist:
        return

    title = f"Game Cancelled: {game.title}"
    body = f"The game on {game.date.strftime('%A, %d %b')} has been cancelled."
    participants = game.participants.filter(
        rsvp_status=GameParticipant.STATUS_CONFIRMED
    ).select_related("user")

    for participant in participants:
        notif = _create_notification(
            recipient=participant.user,
            notification_type=Notification.TYPE_CANCELLATION,
            title=title,
            body=body,
            game=game,
            data={"game_id": str(game.id)},
        )
        _send_push_to_user(participant.user, title, body, data={"game_id": str(game.id), "url": f"/games/{game.id}"})


@shared_task(name="notifications.send_game_reminder")
def send_game_reminder(game_id):
    from apps.games.models import Game, GameParticipant
    from .models import Notification

    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return

    title = f"Reminder: {game.title}"
    body = f"Your game is tomorrow at {game.start_time.strftime('%H:%M')} at {game.location or 'TBD'}."
    members = game.group.memberships.select_related("user").all()

    for membership in members:
        user = membership.user
        has_rsvp = game.participants.filter(user=user).exists()
        if not has_rsvp:
            _create_notification(
                recipient=user,
                notification_type=Notification.TYPE_REMINDER,
                title=title,
                body=f"Don't forget to RSVP for tomorrow's game! {game.title}",
                game=game,
                data={"game_id": str(game.id), "rsvp_url": f"/rsvp/{game.rsvp_token}"},
            )
            _send_push_to_user(user, title, f"Don't forget to RSVP for tomorrow's game!", data={"game_id": str(game.id), "url": f"/games/{game.id}"})


@shared_task(name="notifications.send_game_starting_soon")
def send_game_starting_soon(game_id):
    from apps.games.models import Game, GameParticipant
    from .models import Notification

    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return

    title = f"Starting Soon: {game.title}"
    body = f"Your game starts in 15 minutes at {game.location or 'TBD'}!"
    participants = game.participants.filter(
        rsvp_status=GameParticipant.STATUS_CONFIRMED
    ).select_related("user")

    for participant in participants:
        _create_notification(
            recipient=participant.user,
            notification_type=Notification.TYPE_GAME_STARTING_SOON,
            title=title,
            body=body,
            game=game,
            data={"game_id": str(game.id)},
        )
        _send_push_to_user(participant.user, title, body, data={"game_id": str(game.id), "url": f"/games/{game.id}"})


@shared_task(name="notifications.send_payment_reminder")
def send_payment_reminder(game_id):
    from apps.games.models import Game
    from apps.payments.models import Payment
    from .models import Notification

    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return

    pending_payments = Payment.objects.filter(
        game=game, status=Payment.STATUS_PENDING
    ).select_related("user")

    title = f"Payment Reminder: {game.title}"
    for payment in pending_payments:
        body = f"You have an outstanding payment of {payment.amount} {game.currency} for {game.title}."
        _create_notification(
            recipient=payment.user,
            notification_type=Notification.TYPE_PAYMENT_REMINDER,
            title=title,
            body=body,
            game=game,
            data={"game_id": str(game.id), "amount": str(payment.amount), "currency": game.currency},
        )
        _send_push_to_user(payment.user, title, body, data={"game_id": str(game.id), "url": f"/games/{game.id}"})


@shared_task(name="notifications.send_custom_notification")
def send_custom_notification(game_id, title, body, sender_id):
    from apps.games.models import Game, GameParticipant
    from .models import Notification

    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return

    participants = game.participants.filter(
        rsvp_status=GameParticipant.STATUS_CONFIRMED
    ).select_related("user")

    for participant in participants:
        _create_notification(
            recipient=participant.user,
            notification_type=Notification.TYPE_CUSTOM,
            title=title,
            body=body,
            game=game,
            data={"game_id": str(game.id)},
        )
        _send_push_to_user(participant.user, title, body, data={"game_id": str(game.id), "url": f"/games/{game.id}"})
