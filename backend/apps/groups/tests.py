import pytest
from django.utils import timezone
from datetime import timedelta
from conftest import UserFactory, GroupFactory, GroupMembershipFactory, InviteLinkFactory
from apps.groups.models import GroupMembership, InviteLink


@pytest.mark.django_db
class TestGroupListCreate:
    url = "/api/v1/groups/"

    def test_create_group_makes_creator_admin(self, auth_client, user):
        resp = auth_client.post(self.url, {"name": "My Group", "description": "Test"})
        assert resp.status_code == 201
        assert GroupMembership.objects.filter(
            user=user, role=GroupMembership.ROLE_ADMIN
        ).exists()

    def test_list_returns_only_user_groups(self, auth_client, user, db):
        g1 = GroupFactory(created_by=user)
        GroupMembershipFactory(group=g1, user=user, role="admin")
        GroupFactory()  # another group user is not in
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        ids = [g["id"] for g in resp.json()]
        assert str(g1.id) in ids
        assert len(ids) == 1

    def test_unauthenticated_cannot_create(self, api_client):
        resp = api_client.post(self.url, {"name": "X"})
        assert resp.status_code == 401


@pytest.mark.django_db
class TestGroupDetail:
    def test_admin_can_update_group(self, auth_client, group):
        resp = auth_client.patch(f"/api/v1/groups/{group.id}/", {"name": "Renamed"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed"

    def test_member_cannot_update_group(self, member_client, group):
        resp = member_client.patch(f"/api/v1/groups/{group.id}/", {"name": "X"})
        assert resp.status_code == 403

    def test_admin_can_delete_group(self, auth_client, group):
        resp = auth_client.delete(f"/api/v1/groups/{group.id}/")
        assert resp.status_code == 204

    def test_non_member_cannot_view_group(self, api_client, group):
        other = UserFactory()
        api_client.force_authenticate(user=other)
        resp = api_client.get(f"/api/v1/groups/{group.id}/")
        assert resp.status_code in (403, 404)


@pytest.mark.django_db
class TestGroupMembers:
    def test_admin_can_remove_member(self, auth_client, group, member_user):
        resp = auth_client.delete(f"/api/v1/groups/{group.id}/members/{member_user.id}/")
        assert resp.status_code == 204
        assert not GroupMembership.objects.filter(group=group, user=member_user).exists()

    def test_member_cannot_remove_other_member(self, member_client, group, member_user):
        other = UserFactory()
        GroupMembershipFactory(group=group, user=other, role="member")
        resp = member_client.delete(f"/api/v1/groups/{group.id}/members/{other.id}/")
        assert resp.status_code == 403

    def test_admin_cannot_remove_creator(self, auth_client, group, user):
        resp = auth_client.delete(f"/api/v1/groups/{group.id}/members/{user.id}/")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestUpdateMemberRole:
    def test_creator_can_promote_member_to_admin(self, auth_client, group, member_user):
        resp = auth_client.patch(
            f"/api/v1/groups/{group.id}/members/{member_user.id}/role/",
            {"role": "admin"},
        )
        assert resp.status_code == 200
        assert GroupMembership.objects.get(group=group, user=member_user).role == "admin"

    def test_non_creator_admin_cannot_promote(self, group, member_user, api_client):
        # promote member_user to admin first, but not creator
        membership = GroupMembership.objects.get(group=group, user=member_user)
        membership.role = "admin"
        membership.save()
        other_member = UserFactory()
        GroupMembershipFactory(group=group, user=other_member, role="member")
        api_client.force_authenticate(user=member_user)
        resp = api_client.patch(
            f"/api/v1/groups/{group.id}/members/{other_member.id}/role/",
            {"role": "admin"},
        )
        assert resp.status_code == 403

    def test_creator_cannot_change_own_role(self, auth_client, group, user):
        resp = auth_client.patch(
            f"/api/v1/groups/{group.id}/members/{user.id}/role/",
            {"role": "member"},
        )
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLeaveGroup:
    def test_member_can_leave(self, member_client, group, member_user):
        resp = member_client.delete(f"/api/v1/groups/{group.id}/leave/")
        assert resp.status_code == 204
        assert not GroupMembership.objects.filter(group=group, user=member_user).exists()

    def test_creator_cannot_leave(self, auth_client, group):
        resp = auth_client.delete(f"/api/v1/groups/{group.id}/leave/")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestInviteLink:
    def test_admin_can_generate_invite(self, auth_client, group):
        resp = auth_client.post(f"/api/v1/groups/{group.id}/invite/")
        assert resp.status_code == 201
        assert "token" in resp.json()

    def test_member_cannot_generate_invite(self, member_client, group):
        resp = member_client.post(f"/api/v1/groups/{group.id}/invite/")
        assert resp.status_code == 403

    def test_invite_info_is_public(self, api_client, group):
        invite = InviteLinkFactory(group=group, created_by=group.created_by)
        resp = api_client.get(f"/api/v1/groups/invite/{invite.token}/info/")
        assert resp.status_code == 200
        assert resp.json()["group_name"] == group.name

    def test_accept_invite_adds_membership(self, api_client, group, db):
        invite = InviteLinkFactory(group=group, created_by=group.created_by)
        new_user = UserFactory()
        api_client.force_authenticate(user=new_user)
        resp = api_client.post(f"/api/v1/groups/invite/{invite.token}/accept/")
        assert resp.status_code in (200, 201)
        assert GroupMembership.objects.filter(group=group, user=new_user).exists()

    def test_accept_invite_increments_use_count(self, api_client, group, db):
        invite = InviteLinkFactory(group=group, created_by=group.created_by)
        new_user = UserFactory()
        api_client.force_authenticate(user=new_user)
        api_client.post(f"/api/v1/groups/invite/{invite.token}/accept/")
        invite.refresh_from_db()
        assert invite.use_count == 1

    def test_expired_invite_is_rejected(self, api_client, group, db):
        invite = InviteLinkFactory(
            group=group,
            created_by=group.created_by,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        new_user = UserFactory()
        api_client.force_authenticate(user=new_user)
        resp = api_client.post(f"/api/v1/groups/invite/{invite.token}/accept/")
        assert resp.status_code == 400

    def test_maxed_out_invite_is_rejected(self, api_client, group, db):
        invite = InviteLinkFactory(
            group=group,
            created_by=group.created_by,
            max_uses=1,
            use_count=1,
        )
        new_user = UserFactory()
        api_client.force_authenticate(user=new_user)
        resp = api_client.post(f"/api/v1/groups/invite/{invite.token}/accept/")
        assert resp.status_code == 400

    def test_already_member_accept_is_idempotent(self, auth_client, group, user):
        invite = InviteLinkFactory(group=group, created_by=group.created_by)
        resp = auth_client.post(f"/api/v1/groups/invite/{invite.token}/accept/")
        # already a member — should not error
        assert resp.status_code in (200, 400)
        assert GroupMembership.objects.filter(group=group, user=user).count() == 1
