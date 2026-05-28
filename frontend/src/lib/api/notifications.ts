import apiClient from "./client";
import type { Notification } from "@/types/models";

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>("/notifications/").then((r) => r.data),

  markRead: (id: string) =>
    apiClient.patch<Notification>(`/notifications/${id}/read/`).then((r) => r.data),

  markAllRead: () => apiClient.post("/notifications/mark-all-read/").then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count/").then((r) => r.data),

  subscribePush: (subscription: {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
    user_agent?: string;
  }) => apiClient.post("/notifications/push/subscribe/", subscription).then((r) => r.data),

  unsubscribePush: (endpoint: string) =>
    apiClient.delete("/notifications/push/unsubscribe/", { data: { endpoint } }).then((r) => r.data),

  sendPush: (data: { game_id: string; notification_type: string; title?: string; body?: string }) =>
    apiClient.post("/notifications/push/send/", data).then((r) => r.data),
};
