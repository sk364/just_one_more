"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { groupsApi } from "@/lib/api/groups";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Shield, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  const { data: group, isLoading } = useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => groupsApi.get(groupId),
  });

  const { data: members } = useQuery({
    queryKey: ["groups", groupId, "members"],
    queryFn: () => groupsApi.members(groupId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: { name: group?.name || "", description: group?.description || "" },
  });

  const isAdmin = members?.find((m) => m.user.id === user?.id)?.role === "admin";
  const isCreator = group?.created_by?.id === user?.id;

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => groupsApi.update(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group updated!");
    },
    onError: () => toast.error("Failed to update group."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group deleted.");
      router.push("/groups");
    },
    onError: () => toast.error("Failed to delete group."),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "members"] });
      toast.success("Member removed.");
      setConfirmRemove(null);
    },
    onError: () => toast.error("Failed to remove member."),
  });

  const roleToggleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      groupsApi.updateMemberRole(groupId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "members"] });
      toast.success("Role updated.");
    },
    onError: () => toast.error("Failed to update role."),
  });

  if (isLoading || !group) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Group Settings</h1>
      </div>

      {/* Edit group */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white">Group Info</h2>
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
            <Input label="Group name *" error={errors.name?.message} {...register("name")} />
            <Textarea label="Description" placeholder="What is this group for?" {...register("description")} />
            <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
          </form>
        </motion.div>
      )}

      {/* Members */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Members ({members?.length ?? 0})
        </h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {members?.map((m) => (
            <li key={m.user.id} className="flex items-center gap-3 py-3">
              <Avatar name={m.user.display_name} src={m.user.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {m.user.display_name}
                  {m.user.id === user?.id && (
                    <span className="ml-1 text-xs text-slate-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {m.user.id === group?.created_by?.id && (
                  <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Group creator" />
                )}
                <Badge variant={m.role === "admin" ? "warning" : "default"} size="sm">
                  {m.role}
                </Badge>
              </div>
              {isAdmin && m.user.id !== user?.id && m.user.id !== group?.created_by?.id && (
                <div className="flex items-center gap-1">
                  {isCreator && (
                    <button
                      onClick={() =>
                        roleToggleMutation.mutate({
                          userId: m.user.id,
                          role: m.role === "admin" ? "member" : "admin",
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title={m.role === "admin" ? "Demote to member" : "Promote to admin"}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmRemove({ userId: m.user.id, name: m.user.display_name })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    title="Remove member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Danger zone */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 space-y-3"
        >
          <h2 className="font-semibold text-rose-600 dark:text-rose-400">Danger Zone</h2>
          <p className="text-sm text-slate-500">
            Deleting this group will remove all games, members, and data permanently.
          </p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4" />
            Delete Group
          </Button>
        </motion.div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This will permanently remove all games, members, and associated data.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Member"
        description={`Remove ${confirmRemove?.name} from this group? They will lose access to all group games.`}
        confirmLabel="Remove"
        onConfirm={() => confirmRemove && removeMemberMutation.mutate(confirmRemove.userId)}
        onCancel={() => setConfirmRemove(null)}
        loading={removeMemberMutation.isPending}
      />
    </div>
  );
}
