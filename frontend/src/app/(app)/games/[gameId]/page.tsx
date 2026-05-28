"use client";

import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { gamesApi } from "@/lib/api/games";
import { paymentsApi } from "@/lib/api/payments";
import { formatGameSchedule } from "@/lib/utils/dates";
import { formatCurrency, getRSVPColor } from "@/lib/utils/formatters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Check, ChevronDown, ChevronRight, DollarSign, MapPin, Share2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TeamsSection } from "./TeamsSection";

export default function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: game, isLoading } = useQuery({
    queryKey: ["games", gameId],
    queryFn: () => gamesApi.get(gameId),
  });

  const hasCost = !!game && parseFloat(game.cost_per_player) > 0;

  const { data: payments } = useQuery({
    queryKey: ["payments", gameId],
    queryFn: () => paymentsApi.list(gameId),
    enabled: hasCost,
  });

  const paymentByUserId = Object.fromEntries((payments ?? []).map((p) => [p.user.id, p]));

  const rsvpMutation = useMutation({
    mutationFn: (action: "join" | "leave" | "maybe") => gamesApi.rsvp(gameId, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["payments", gameId] });
      toast.success(data.detail);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update RSVP.";
      toast.error(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => gamesApi.cancel(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", gameId] });
      toast.success("Game cancelled.");
      setConfirmCancel(false);
    },
  });

  const moveParticipantMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: "waitlist" | "confirm" }) =>
      gamesApi.moveParticipant(gameId, userId, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["payments", gameId] });
      toast.success(data.detail);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to move player.";
      toast.error(msg);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (userId: string) => gamesApi.removeParticipant(gameId, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["payments", gameId] });
      toast.success(data.detail);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to remove player.";
      toast.error(msg);
    },
  });

  const updatePayment = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      paymentsApi.update(gameId, userId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", gameId] });
      toast.success("Payment updated.");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update payment.";
      toast.error(msg);
    },
  });

  const shareGame = async () => {
    if (!game?.rsvp_url) return;
    if (navigator.share) {
      await navigator.share({ title: game.title, url: game.rsvp_url });
    } else {
      await navigator.clipboard.writeText(game.rsvp_url);
      toast.success("RSVP link copied!");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-48 w-full" /></div>;
  if (!game) return null;

  const isAdmin = game.is_admin;
  const confirmedPlayers = game.participants_list?.filter((p) => p.rsvp_status === "confirmed") ?? [];

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/groups" className="hover:text-slate-900 dark:hover:text-white transition-colors">Groups</Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <Link href={`/groups/${game.group}`} className="hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-[140px]">{game.group_name}</Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-[160px]">{game.title}</span>
      </nav>

      {/* Hero Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white">{game.title}</h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && game.status === "scheduled" && (
                  <>
                    <Link href={`/games/${gameId}/edit`}>
                      <button className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors">
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-rose-500/80 text-white border border-rose-400/50 hover:bg-rose-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-indigo-100 text-sm col-span-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>{formatGameSchedule(game.date, game.start_time, game.end_time)}</span>
              </div>
              {game.location && (
                <div className="flex items-center gap-2 text-indigo-100 text-sm col-span-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <a href={game.location_url || `https://maps.google.com/?q=${encodeURIComponent(game.location)}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {game.location}
                  </a>
                </div>
              )}
              {hasCost && (
                <div className="flex items-center gap-2 text-indigo-100 text-sm">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span>{formatCurrency(game.cost_per_player, game.currency)} / player</span>
                </div>
              )}
            </div>
            {game.notes && (
              <p className="text-indigo-100 text-sm mt-3 leading-relaxed">{game.notes}</p>
            )}
          </div>

          {/* Player count & RSVP */}
          <CardBody className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{game.confirmed_count}</span>
                {game.max_players && <span className="text-slate-400 text-sm">/{game.max_players}</span>}
                <p className="text-xs text-slate-500">players in</p>
              </div>
              {confirmedPlayers.length > 0 && (
                <AvatarGroup users={confirmedPlayers.map((p) => ({ name: p.user.display_name, src: p.user.avatar_url }))} />
              )}
            </div>

            {game.status === "scheduled" && (
              <div className="flex gap-2 flex-wrap">
                {game.my_rsvp_status === "confirmed" ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => rsvpMutation.mutate("maybe")} loading={rsvpMutation.isPending}>
                      Tentative
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => rsvpMutation.mutate("leave")} loading={rsvpMutation.isPending}>
                      <X className="w-4 h-4" /> Leave
                    </Button>
                  </>
                ) : game.my_rsvp_status === "maybe" ? (
                  <>
                    <Button size="sm" onClick={() => rsvpMutation.mutate("join")} loading={rsvpMutation.isPending}>
                      <Check className="w-4 h-4" /> Confirm
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => rsvpMutation.mutate("leave")} loading={rsvpMutation.isPending}>
                      <X className="w-4 h-4" /> Leave
                    </Button>
                  </>
                ) : game.my_rsvp_status === "waitlisted" ? (
                  <Button variant="danger" size="sm" onClick={() => rsvpMutation.mutate("leave")} loading={rsvpMutation.isPending}>Leave Waitlist</Button>
                ) : (
                  <>
                    <Button onClick={() => rsvpMutation.mutate("join")} loading={rsvpMutation.isPending}>
                      <Check className="w-4 h-4" /> {game.is_full ? "Join Waitlist" : "Join Game"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => rsvpMutation.mutate("maybe")} loading={rsvpMutation.isPending}>
                      Tentative
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={shareGame}>
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Waitlist banner */}
      {game.waitlist_count > 0 && (
        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-4 py-3 text-sm text-cyan-700 dark:text-cyan-300">
          {game.waitlist_count} {game.waitlist_count !== 1 ? "players" : "player"} on the waitlist — they&apos;ll be promoted automatically when a spot opens.
        </div>
      )}

      {/* Players list */}
      <div className="space-y-2">
        {game.participants_list?.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No players yet. Share the game link!</p>
        ) : (
          game.participants_list?.map((p) => {
            const payment = hasCost ? paymentByUserId[p.user.id] : null;
            const isPaid = payment?.status === "paid";
            return (
              <Card key={p.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.user.display_name} src={p.user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.user.display_name}</p>
                  </div>
                  <Badge variant={getRSVPColor(p.rsvp_status)}>
                    {p.rsvp_status === "maybe" ? "Tentative" : p.rsvp_status}
                  </Badge>
                  {hasCost && payment && (
                    <div className={`relative flex items-center rounded-full text-xs font-medium cursor-pointer ${
                      payment.status === "paid"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : payment.status === "waived"
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      <select
                        value={payment.status}
                        onChange={(e) => updatePayment.mutate({ userId: p.user.id, status: e.target.value })}
                        disabled={updatePayment.isPending}
                        className="appearance-none bg-transparent pl-2.5 pr-6 py-1 cursor-pointer outline-none"
                      >
                        <option value="pending">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="waived">Waived</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" />
                    </div>
                  )}
                  {isAdmin && p.rsvp_status === "confirmed" && game.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500 hover:text-amber-600"
                      onClick={() => moveParticipantMutation.mutate({ userId: p.user.id, action: "waitlist" })}
                      loading={moveParticipantMutation.isPending}
                    >
                      → Waitlist
                    </Button>
                  )}
                  {isAdmin && game.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => removeParticipantMutation.mutate(p.user.id)}
                      loading={removeParticipantMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}

        {/* Waitlist */}
        {(game.waitlist_list?.length ?? 0) > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
              Waitlist
            </p>
            {game.waitlist_list?.map((w) => (
              <Card key={w.id} className="px-4 py-3 mb-2 opacity-75">
                <div className="flex items-center gap-3">
                  <Avatar name={w.user.display_name} src={w.user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{w.user.display_name}</p>
                  </div>
                  <Badge variant="info" size="sm">#{w.position}</Badge>
                  {isAdmin && game.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500 hover:text-emerald-600"
                      onClick={() => moveParticipantMutation.mutate({ userId: w.user.id, action: "confirm" })}
                      loading={moveParticipantMutation.isPending}
                    >
                      → Confirm
                    </Button>
                  )}
                  {isAdmin && game.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => removeParticipantMutation.mutate(w.user.id)}
                      loading={removeParticipantMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Teams */}
      {confirmedPlayers.length > 0 && (
        <TeamsSection gameId={gameId} confirmedPlayers={confirmedPlayers} />
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel "${game.title}"?`}
        description="All players will be notified. This action cannot be undone."
        confirmLabel="Cancel Game"
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancel(false)}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
