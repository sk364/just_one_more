"use client";

import { Button } from "@/components/ui/Button";
import { gamesApi } from "@/lib/api/games";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, DollarSign, MapPin, Users, Zap } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RSVPPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: game, isLoading, error } = useQuery({
    queryKey: ["rsvp", token],
    queryFn: () => gamesApi.getByRsvpToken(token),
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => gamesApi.joinByRsvpToken(token),
    onSuccess: (data) => {
      toast.success(data.detail || "Joined the game!");
      queryClient.invalidateQueries({ queryKey: ["games"] });
      if (game) router.push(`/games/${game.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to join.";
      toast.error(msg);
    },
  });

  const handleJoin = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/rsvp/${token}`);
      return;
    }
    joinMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="animate-pulse text-slate-400">Loading game details…</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Game not found</h1>
          <p className="text-slate-500 mt-1">This link may be invalid or the game may have been removed.</p>
        </div>
      </div>
    );
  }

  const hasCost = parseFloat(game.cost_per_player) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col">
      <header className="px-6 py-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-white">Just One More</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-8">
              <p className="text-indigo-200 text-sm mb-1">{game.group_name}</p>
              <h1 className="text-2xl font-bold text-white">{game.title}</h1>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Calendar className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span>{formatDate(game.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span>{formatTime(game.start_time)}{game.end_time && ` – ${formatTime(game.end_time)}`}</span>
                </div>
                {game.location && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <MapPin className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span>{game.location}</span>
                  </div>
                )}
                {hasCost && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <DollarSign className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span>{formatCurrency(game.cost_per_player, game.currency)} per player</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Users className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span>
                    {game.confirmed_count} player{game.confirmed_count !== 1 ? "s" : ""} in
                    {game.max_players ? ` (max ${game.max_players})` : ""}
                    {game.is_full && " — Game is full, join waitlist"}
                  </span>
                </div>
              </div>

              {game.notes && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-400">
                  {game.notes}
                </div>
              )}

              {game.status === "cancelled" ? (
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 text-center">
                  <p className="text-rose-600 dark:text-rose-400 font-medium">This game has been cancelled.</p>
                </div>
              ) : game.my_rsvp_status === "confirmed" ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium">✓ You&apos;re confirmed for this game!</p>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={handleJoin} loading={joinMutation.isPending}>
                  {game.is_full ? "Join Waitlist" : "Join Game"}
                  {!isAuthenticated && " (sign in required)"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
