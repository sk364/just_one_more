import apiClient from "./client";
import type { AuthTokens } from "@/types/api";
import type { User } from "@/types/models";

export const authApi = {
  register: (data: { email: string; display_name: string; password: string; password2: string }) =>
    apiClient.post<AuthTokens>("/auth/register/", data).then((r) => r.data),

  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>("/auth/login/", { email, password }).then((r) => r.data),

  logout: (refresh: string) =>
    apiClient.post("/auth/logout/", { refresh }).then((r) => r.data),

  me: () => apiClient.get<User>("/auth/me/").then((r) => r.data),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>("/auth/me/", data).then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post("/auth/password/change/", {
      old_password: oldPassword,
      new_password: newPassword,
    }).then((r) => r.data),
};
