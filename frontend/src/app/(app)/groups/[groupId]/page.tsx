"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { gamesApi } from "@/lib/api/games";
import { groupsApi } from "@/lib/api/groups";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { getStatusColor } from "@/lib/utils/formatters";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Copy, Link2, Plus, Settings, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"games" | "members">("games");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => groupsApi.get(groupId),
  });

  const { data: games } = useQuery({
    queryKey: ["games", { group: groupId }],
    queryFn: () => gamesApi.list({ group: groupId }),
  });

  const { data: members } = useQuery({
    queryKey: ["groups", groupId, "members"],
    queryFn: () => groupsApi.members(groupId),
  });

  const { data: inviteLink } = useQuery({
    queryKey: ["groups", groupId, "invite"],
    queryFn: () => groupsApi.getInviteLink(groupId),
    retry: false,
  });

  const generateInvite = useMutation({
    mutationFn: () => groupsApi.generateInviteLink(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", groupId, "invite"] }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupsApi.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("You have left the group.");
      router.push("/groups");
    },
  });

  const copyInviteLink = async () => {
    if (inviteLink?.invite_url) {
      await navigator.clipboard.writeText(inviteLink.invite_url);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAdmin = group?.my_role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
          {group.description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{group.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500"><strong>{group.member_count}</strong> members</span>
            {isAdmin && <Badge variant="default">Admin</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isAdmin && (
            <Link href={`/groups/${groupId}/settings`}>
              <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
            </Link>
          )}
          <Link href={`/games/new?group=${groupId}`}>
            <Button size="sm"><Plus className="w-4 h-4" /> Game</Button>
          </Link>
        </div>
      </div>

      {/* Invite Link */}
      {isAdmin && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Invite Link</p>
              {inviteLink ? (
                <p className="text-xs text-slate-500 truncate">{inviteLink.invite_url}</p>
              ) : (
                <p className="text-xs text-slate-500">No active invite link</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {inviteLink ? (
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => generateInvite.mutate()} loading={generateInvite.isPending}>
                  Generate
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(["games", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Games Tab */}
      {activeTab === "games" && (
        <div className="space-y-3">
          {games?.length === 0 ? (
            <EmptyState
              icon={<Zap className="w-8 h-8" />}
              title="No games yet"
              description="Schedule the first game for this group."
              action={isAdmin ? <Link href={`/games/new?group=${groupId}`}><Button size="sm"><Plus className="w-4 h-4" /> Schedule Game</Button></Link> : undefined}
            />
          ) : (
            games?.map((game) => (
              <motion.div key={game.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Link href={`/games/${game.id}`}>
                  <Card hover className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">{game.title}</span>
                          <Badge variant={getStatusColor(game.status)} size="sm">{game.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(game.date)} at {formatTime(game.start_time)}
                          {game.location && ` • ${game.location}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {game.confirmed_count}{game.max_players ? `/${game.max_players}` : ""}
                        </p>
                        <p className="text-xs text-slate-400">in</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-2">
          {members?.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={m.user.display_name} src={m.user.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.user.display_name}</p>
                  <p className="text-xs text-slate-500">{m.user.email}</p>
                </div>
                <Badge variant={m.role === "admin" ? "default" : "muted"}>{m.role}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Leave Group */}
      {!isAdmin && (
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setConfirmLeave(true)}>
            Leave Group
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        title={`Leave "${group.name}"?`}
        description="You will lose access to all games in this group. You can rejoin with an invite link."
        confirmLabel="Leave Group"
        onConfirm={() => leaveMutation.mutate()}
        onCancel={() => setConfirmLeave(false)}
        loading={leaveMutation.isPending}
      />
    </div>
  );
}
