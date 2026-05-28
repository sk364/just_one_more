"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { notificationsApi } from "@/lib/api/notifications";
import { groupsApi } from "@/lib/api/groups";
import { gamesApi } from "@/lib/api/games";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellOff, CheckCheck, Send } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Notification } from "@/types/models";

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const typeColors: Record<string, string> = {
    reminder: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    game_starting_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    cancellation: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    payment_reminder: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    custom: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  const typeLabels: Record<string, string> = {
    reminder: "Reminder",
    game_starting_soon: "Starting soon",
    cancellation: "Cancelled",
    payment_reminder: "Payment",
    custom: "Custom",
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        n.is_read
          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          : "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[n.notification_type] ?? typeColors.custom}`}>
            {typeLabels[n.notification_type] ?? n.notification_type}
          </span>
          {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
        </div>
        <p className="font-medium text-sm text-slate-900 dark:text-white">{n.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
        {n.game_title && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{n.game_title}</p>
        )}
        <p className="text-xs text-slate-400 mt-1.5">
          {n.sent_at
            ? formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })
            : formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
      {!n.is_read && (
        <button
          onClick={() => onRead(n.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors flex-shrink-0"
          title="Mark as read"
        >
          <CheckCheck className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function SendNotificationForm() {
  const [gameId, setGameId] = useState("");
  const [type, setType] = useState("custom");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: groups = [] } = useQuery({ queryKey: ["groups"], queryFn: groupsApi.list });
  const [selectedGroup, setSelectedGroup] = useState("");

  const { data: games = [] } = useQuery({
    queryKey: ["games", { group: selectedGroup }],
    queryFn: () => gamesApi.list({ group: selectedGroup }),
    enabled: !!selectedGroup,
  });

  const sendMutation = useMutation({
    mutationFn: () => notificationsApi.sendPush({ game_id: gameId, notification_type: type, title, body }),
    onSuccess: () => {
      toast.success("Notification sent!");
      setTitle("");
      setBody("");
    },
    onError: () => toast.error("Failed to send notification."),
  });

  const inputClass = "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <Send className="w-4 h-4 text-indigo-500" />
        Send Notification
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Group</label>
          <select className={inputClass} value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setGameId(""); }}>
            <option value="">Select group…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Game *</label>
          <select className={inputClass} value={gameId} onChange={(e) => setGameId(e.target.value)} disabled={!selectedGroup}>
            <option value="">Select game…</option>
            {games.map((g) => <option key={g.id} value={g.id}>{g.title} ({g.date})</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Type</label>
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="custom">Custom</option>
          <option value="reminder">Reminder</option>
          <option value="payment_reminder">Payment reminder</option>
          <option value="cancellation">Cancellation</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Title (optional)</label>
        <input className={inputClass} placeholder="Leave blank for default" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Message (optional)</label>
        <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Leave blank for default" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <Button onClick={() => sendMutation.mutate()} loading={sendMutation.isPending} disabled={!gameId}>
        <Send className="w-4 h-4" />
        Send Push Notification
      </Button>
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read.");
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="primary">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Send notification form (admin use) */}
      <SendNotificationForm />

      {/* Notification list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">History</h2>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : notifications.length === 0 ? (
          <EmptyState icon={<BellOff className="w-8 h-8" />} title="No notifications" description="You'll see game reminders and updates here." />
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} n={n} onRead={(id) => markReadMutation.mutate(id)} />
          ))
        )}
      </div>
    </div>
  );
}
