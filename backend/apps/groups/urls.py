from django.urls import path

from .views import (
    AcceptInviteView,
    GroupDetailView,
    GroupListCreateView,
    GroupMembersView,
    InviteInfoView,
    InviteLinkView,
    LeaveGroupView,
    RemoveMemberView,
    UpdateMemberRoleView,
)

urlpatterns = [
    path("", GroupListCreateView.as_view(), name="group-list-create"),
    path("<uuid:pk>/", GroupDetailView.as_view(), name="group-detail"),
    path("<uuid:pk>/members/", GroupMembersView.as_view(), name="group-members"),
    path("<uuid:pk>/members/<uuid:user_id>/", RemoveMemberView.as_view(), name="remove-member"),
    path("<uuid:pk>/members/<uuid:user_id>/role/", UpdateMemberRoleView.as_view(), name="update-member-role"),
    path("<uuid:pk>/leave/", LeaveGroupView.as_view(), name="leave-group"),
    path("<uuid:pk>/invite/", InviteLinkView.as_view(), name="invite-link"),
    path("invite/<str:token>/info/", InviteInfoView.as_view(), name="invite-info"),
    path("invite/<str:token>/accept/", AcceptInviteView.as_view(), name="accept-invite"),
]
