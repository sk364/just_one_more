from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Group, GroupMembership, InviteLink
from .permissions import IsGroupAdmin, IsGroupMember
from .serializers import (
    GroupDetailSerializer,
    GroupMembershipSerializer,
    GroupSerializer,
    InviteInfoSerializer,
    InviteLinkSerializer,
)


class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user).distinct()

    def get_serializer_context(self):
        return {"request": self.request}


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupDetailSerializer

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user).distinct()

    def get_serializer_context(self):
        return {"request": self.request}

    def update(self, request, *args, **kwargs):
        group = self.get_object()
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only admins can update group details."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only admins can delete a group."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class GroupMembersView(generics.ListAPIView):
    serializer_class = GroupMembershipSerializer

    def get_queryset(self):
        group = get_object_or_404(
            Group, pk=self.kwargs["pk"], memberships__user=self.request.user
        )
        return group.memberships.select_related("user").all()


class RemoveMemberView(APIView):
    def delete(self, request, pk, user_id):
        group = get_object_or_404(Group, pk=pk)
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only admins can remove members."}, status=status.HTTP_403_FORBIDDEN)
        if str(group.created_by_id) == str(user_id):
            return Response({"detail": "Cannot remove the group creator."}, status=status.HTTP_400_BAD_REQUEST)
        membership = get_object_or_404(GroupMembership, group=group, user_id=user_id)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateMemberRoleView(APIView):
    def patch(self, request, pk, user_id):
        group = get_object_or_404(Group, pk=pk)
        if str(group.created_by_id) != str(request.user.id):
            return Response({"detail": "Only the group creator can assign admin privileges."}, status=status.HTTP_403_FORBIDDEN)
        if str(user_id) == str(request.user.id):
            return Response({"detail": "Cannot change your own role."}, status=status.HTTP_400_BAD_REQUEST)
        if str(user_id) == str(group.created_by_id):
            return Response({"detail": "Cannot change the group creator's role."}, status=status.HTTP_400_BAD_REQUEST)
        role = request.data.get("role")
        if role not in (GroupMembership.ROLE_ADMIN, GroupMembership.ROLE_MEMBER):
            return Response({"detail": "Invalid role. Use 'admin' or 'member'."}, status=status.HTTP_400_BAD_REQUEST)
        membership = get_object_or_404(GroupMembership, group=group, user_id=user_id)
        membership.role = role
        membership.save()
        return Response(GroupMembershipSerializer(membership).data)


class LeaveGroupView(APIView):
    def delete(self, request, pk):
        group = get_object_or_404(Group, pk=pk, memberships__user=request.user)
        if str(group.created_by_id) == str(request.user.id):
            return Response({"detail": "Group creator cannot leave. Transfer ownership or delete the group."}, status=status.HTTP_400_BAD_REQUEST)
        GroupMembership.objects.filter(group=group, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteLinkView(APIView):
    def get(self, request, pk):
        group = get_object_or_404(Group, pk=pk, memberships__user=request.user)
        invite = group.invite_links.filter(is_active=True).first()
        if not invite:
            return Response({"detail": "No active invite link. Generate one first."}, status=status.HTTP_404_NOT_FOUND)
        return Response(InviteLinkSerializer(invite, context={"request": request}).data)

    def post(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only admins can generate invite links."}, status=status.HTTP_403_FORBIDDEN)
        group.invite_links.update(is_active=False)
        invite = InviteLink.objects.create(group=group, created_by=request.user)
        return Response(InviteLinkSerializer(invite, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        if not GroupMembership.objects.filter(group=group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only admins can revoke invite links."}, status=status.HTTP_403_FORBIDDEN)
        group.invite_links.update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteInfoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(InviteLink, token=token)
        return Response(InviteInfoSerializer(invite).data)


class AcceptInviteView(APIView):
    def post(self, request, token):
        invite = get_object_or_404(InviteLink, token=token)
        if not invite.is_valid:
            return Response({"detail": "This invite link is no longer valid."}, status=status.HTTP_400_BAD_REQUEST)
        if GroupMembership.objects.filter(group=invite.group, user=request.user).exists():
            return Response({"detail": "You are already a member of this group.", "group_id": str(invite.group.id)}, status=status.HTTP_200_OK)
        GroupMembership.objects.create(group=invite.group, user=request.user, role=GroupMembership.ROLE_MEMBER)
        invite.use_count += 1
        invite.save()
        return Response({"detail": "Joined group successfully.", "group_id": str(invite.group.id)}, status=status.HTTP_201_CREATED)
