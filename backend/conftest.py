import pytest
from django.utils import timezone
from datetime import date, time, timedelta
import factory
from factory.django import DjangoModelFactory


# ── Factories ────────────────────────────────────────────────────────────────

class UserFactory(DjangoModelFactory):
    class Meta:
        model = "users.User"

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    display_name = factory.Sequence(lambda n: f"User {n}")
    password = factory.PostGenerationMethodCall("set_password", "Password123")
    is_active = True


class GroupFactory(DjangoModelFactory):
    class Meta:
        model = "groups.Group"

    name = factory.Sequence(lambda n: f"Group {n}")
    description = "A test group"
    created_by = factory.SubFactory(UserFactory)


class GroupMembershipFactory(DjangoModelFactory):
    class Meta:
        model = "groups.GroupMembership"

    group = factory.SubFactory(GroupFactory)
    user = factory.SubFactory(UserFactory)
    role = "member"


class InviteLinkFactory(DjangoModelFactory):
    class Meta:
        model = "groups.InviteLink"

    group = factory.SubFactory(GroupFactory)
    created_by = factory.LazyAttribute(lambda o: o.group.created_by)
    is_active = True
    max_uses = None
    use_count = 0
    expires_at = None


class GameFactory(DjangoModelFactory):
    class Meta:
        model = "games.Game"

    group = factory.SubFactory(GroupFactory)
    title = factory.Sequence(lambda n: f"Game {n}")
    sport = "football"
    date = factory.LazyFunction(lambda: date.today() + timedelta(days=7))
    start_time = time(18, 0)
    end_time = time(19, 30)
    max_players = 10
    cost_per_player = "0.00"
    currency = "GBP"
    status = "scheduled"
    created_by = factory.LazyAttribute(lambda o: o.group.created_by)


class GameParticipantFactory(DjangoModelFactory):
    class Meta:
        model = "games.GameParticipant"

    game = factory.SubFactory(GameFactory)
    user = factory.SubFactory(UserFactory)
    rsvp_status = "confirmed"


class WaitlistFactory(DjangoModelFactory):
    class Meta:
        model = "games.Waitlist"

    game = factory.SubFactory(GameFactory)
    user = factory.SubFactory(UserFactory)
    position = 1


class PaymentFactory(DjangoModelFactory):
    class Meta:
        model = "payments.Payment"

    game = factory.SubFactory(GameFactory)
    user = factory.SubFactory(UserFactory)
    amount = "10.00"
    status = "pending"


class PushSubscriptionFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.PushSubscription"

    user = factory.SubFactory(UserFactory)
    endpoint = factory.Sequence(lambda n: f"https://fcm.googleapis.com/wp/sub{n}")
    p256dh_key = "BMIPadnmeEborM1s2wENn2t5MR4BEtest"
    auth_key = "nk6zJNtest"


class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = "notifications.Notification"

    recipient = factory.SubFactory(UserFactory)
    notification_type = "reminder"
    title = "Test notification"
    body = "Test body"
    is_read = False
    sent_at = factory.LazyFunction(timezone.now)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def group(db, user):
    g = GroupFactory(created_by=user)
    GroupMembershipFactory(group=g, user=user, role="admin")
    return g


@pytest.fixture
def member_user(db, group):
    u = UserFactory()
    GroupMembershipFactory(group=group, user=u, role="member")
    return u


@pytest.fixture
def member_client(api_client, member_user):
    api_client.force_authenticate(user=member_user)
    return api_client


@pytest.fixture
def game(db, group):
    return GameFactory(group=group, created_by=group.created_by)
