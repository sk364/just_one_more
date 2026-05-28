export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: User;
  member_count: number;
  my_role: "admin" | "member" | null;
  recent_games_count?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMembership {
  id: string;
  user: User;
  role: "admin" | "member";
  joined_at: string;
}

export interface InviteLink {
  id: string;
  token: string;
  invite_url: string;
  group_name: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  use_count: number;
  is_valid: boolean;
}

export type GameStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type RSVPStatus = "confirmed" | "declined" | "maybe" | "waitlisted";

export interface Game {
  id: string;
  group: string;
  group_name: string;
  title: string;
  sport: string;
  location: string;
  location_url: string;
  date: string;
  start_time: string;
  end_time: string | null;
  max_players: number | null;
  cost_per_player: string;
  currency: string;
  notes: string;
  status: GameStatus;
  rsvp_token: string;
  rsvp_url: string;
  created_by: User;
  confirmed_count: number;
  waitlist_count: number;
  my_rsvp_status: RSVPStatus | null;
  is_full: boolean;
  is_admin: boolean;
  participants_list?: GameParticipant[];
  waitlist_list?: WaitlistEntry[];
  created_at: string;
  updated_at: string;
}

export interface GameParticipant {
  id: string;
  user: User;
  rsvp_status: "confirmed" | "declined" | "maybe";
  joined_at: string;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  user: User;
  position: number;
  joined_at: string;
}

export type PaymentStatus = "pending" | "paid" | "waived";

export interface Payment {
  id: string;
  game: string;
  game_title: string;
  game_date: string;
  user: User;
  amount: string;
  currency: string;
  status: PaymentStatus;
  marked_by: User | null;
  marked_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSummary {
  total_amount: string;
  paid_amount: string;
  pending_amount: string;
  waived_amount: string;
  paid_count: number;
  pending_count: number;
  waived_count: number;
  currency: string;
}

export interface Notification {
  id: string;
  game: string | null;
  game_title: string | null;
  notification_type: "reminder" | "game_starting_soon" | "cancellation" | "payment_reminder" | "custom";
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface TeamMember {
  user: User;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  created_by: User;
  created_at: string;
}

export interface TeamSuggestion {
  id: string;
  suggested_by: User;
  text: string;
  created_at: string;
}

export interface AttendanceRecord {
  user__id: string;
  user__display_name: string;
  user__avatar_url: string;
  games_played: number;
}

export interface GroupSummary {
  total_games: number;
  completed_games: number;
  cancelled_games: number;
  total_members: number;
  avg_attendance: number;
}

export interface OverviewStats {
  total_groups: number;
  total_games_played: number;
  upcoming_games: number;
  recent_games: number;
}
