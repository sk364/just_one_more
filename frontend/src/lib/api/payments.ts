import apiClient from "./client";
import type { Payment, PaymentSummary } from "@/types/models";

export const paymentsApi = {
  list: (gameId: string) =>
    apiClient.get<Payment[]>(`/games/${gameId}/payments/`).then((r) => r.data),

  update: (gameId: string, userId: string, data: { status?: string; notes?: string }) =>
    apiClient.patch<Payment>(`/games/${gameId}/payments/${userId}/`, data).then((r) => r.data),

  summary: (gameId: string) =>
    apiClient.get<PaymentSummary>(`/games/${gameId}/payments/summary/`).then((r) => r.data),
};
