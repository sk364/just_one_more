import apiClient from "./client";
import type { Game, GameParticipant, Team, TeamSuggestion, WaitlistEntry } from "@/types/models";

export type CreateGameData = {
  group: string;
  title: string;
  sport?: string;
  location?: string;
  location_url?: string;
  date: string;
  start_time: string;
  end_time?: string;
  max_players?: number;
  cost_per_player?: number;
  currency?: string;
  notes?: string;
};

export const gamesApi = {
  list: (params?: { group?: string; status?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<Game[]>("/games/", { params }).then((r) => r.data),

  create: (data: CreateGameData) =>
    apiClient.post<Game>("/games/", data).then((r) => r.data),

  get: (id: string) => apiClient.get<Game>(`/games/${id}/`).then((r) => r.data),

  update: (id: string, data: Partial<CreateGameData>) =>
    apiClient.patch<Game>(`/games/${id}/`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/games/${id}/`).then((r) => r.data),

  rsvp: (id: string, action: "join" | "leave" | "maybe") =>
    apiClient.post(`/games/${id}/rsvp/`, { action }).then((r) => r.data),

  participants: (id: string) =>
    apiClient.get<GameParticipant[]>(`/games/${id}/participants/`).then((r) => r.data),

  waitlist: (id: string) =>
    apiClient.get<WaitlistEntry[]>(`/games/${id}/waitlist/`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post(`/games/${id}/cancel/`).then((r) => r.data),

  getByRsvpToken: (token: string) =>
    apiClient.get<Game>(`/games/rsvp/${token}/`).then((r) => r.data),

  joinByRsvpToken: (token: string) =>
    apiClient.post(`/games/rsvp/${token}/join/`).then((r) => r.data),

  moveParticipant: (gameId: string, userId: string, action: "waitlist" | "confirm") =>
    apiClient.post(`/games/${gameId}/participants/${userId}/move/`, { action }).then((r) => r.data),

  removeParticipant: (gameId: string, userId: string) =>
    apiClient.delete(`/games/${gameId}/participants/${userId}/move/`).then((r) => r.data),

  getTeams: (gameId: string) =>
    apiClient.get<Team[]>(`/games/${gameId}/teams/`).then((r) => r.data),

  saveTeams: (gameId: string, teams: { name: string; member_ids: string[] }[]) =>
    apiClient.put<Team[]>(`/games/${gameId}/teams/`, { teams }).then((r) => r.data),

  clearTeams: (gameId: string) =>
    apiClient.delete(`/games/${gameId}/teams/`).then((r) => r.data),

  getSuggestions: (gameId: string) =>
    apiClient.get<TeamSuggestion[]>(`/games/${gameId}/teams/suggestions/`).then((r) => r.data),

  addSuggestion: (gameId: string, text: string) =>
    apiClient.post<TeamSuggestion>(`/games/${gameId}/teams/suggestions/`, { text }).then((r) => r.data),

  deleteSuggestion: (gameId: string, suggestionId: string) =>
    apiClient.delete(`/games/${gameId}/teams/suggestions/${suggestionId}/`).then((r) => r.data),
};
