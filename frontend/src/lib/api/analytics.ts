import apiClient from "./client";
import type { AttendanceRecord, GroupSummary, OverviewStats } from "@/types/models";

export const analyticsApi = {
  overview: () => apiClient.get<OverviewStats>("/analytics/overview/").then((r) => r.data),

  groupAttendance: (groupId: string, params?: { date_from?: string; date_to?: string }) =>
    apiClient.get<AttendanceRecord[]>(`/analytics/groups/${groupId}/attendance/`, { params }).then((r) => r.data),

  topPlayers: (groupId: string, params?: { date_from?: string; date_to?: string; limit?: number }) =>
    apiClient.get<AttendanceRecord[]>(`/analytics/groups/${groupId}/top-players/`, { params }).then((r) => r.data),

  gameCount: (groupId: string, params?: { date_from?: string; date_to?: string }) =>
    apiClient.get(`/analytics/groups/${groupId}/game-count/`, { params }).then((r) => r.data),

  groupSummary: (groupId: string, params?: { date_from?: string; date_to?: string }) =>
    apiClient.get<GroupSummary>(`/analytics/groups/${groupId}/summary/`, { params }).then((r) => r.data),
};
