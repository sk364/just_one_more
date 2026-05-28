import apiClient from "./client";
import type { Group, GroupMembership, InviteLink } from "@/types/models";

export const groupsApi = {
  list: () => apiClient.get<Group[]>("/groups/").then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Group>("/groups/", data).then((r) => r.data),

  get: (id: string) => apiClient.get<Group>(`/groups/${id}/`).then((r) => r.data),

  update: (id: string, data: Partial<Group>) =>
    apiClient.patch<Group>(`/groups/${id}/`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/groups/${id}/`).then((r) => r.data),

  members: (id: string) =>
    apiClient.get<GroupMembership[]>(`/groups/${id}/members/`).then((r) => r.data),

  removeMember: (groupId: string, userId: string) =>
    apiClient.delete(`/groups/${groupId}/members/${userId}/`).then((r) => r.data),

  updateMemberRole: (groupId: string, userId: string, role: "admin" | "member") =>
    apiClient.patch(`/groups/${groupId}/members/${userId}/role/`, { role }).then((r) => r.data),

  leave: (id: string) => apiClient.delete(`/groups/${id}/leave/`).then((r) => r.data),

  getInviteLink: (id: string) =>
    apiClient.get<InviteLink>(`/groups/${id}/invite/`).then((r) => r.data),

  generateInviteLink: (id: string) =>
    apiClient.post<InviteLink>(`/groups/${id}/invite/`).then((r) => r.data),

  revokeInviteLink: (id: string) =>
    apiClient.delete(`/groups/${id}/invite/`).then((r) => r.data),

  getInviteInfo: (token: string) =>
    apiClient.get(`/groups/invite/${token}/info/`).then((r) => r.data),

  acceptInvite: (token: string) =>
    apiClient.post(`/groups/invite/${token}/accept/`).then((r) => r.data),
};
