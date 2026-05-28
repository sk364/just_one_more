"use client";

import { Button } from "@/components/ui/Button";
import { groupsApi } from "@/lib/api/groups";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Users, Zap } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const { data: info, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => groupsApi.getInviteInfo(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => groupsApi.acceptInvite(token),
    onSuccess: (data) => {
      toast.success(`Joined "${info?.group_name}"!`);
      router.push(`/groups/${data.group_id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to accept invite.";
      toast.error(msg);
    },
  });

  const handleAccept = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/invite/${token}`);
      return;
    }
    acceptMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col">
      <header className="px-6 py-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-white">Just One More</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>

          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-3/4 mx-auto mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
            </div>
          ) : !info?.is_valid ? (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Invite</h1>
              <p className="text-slate-500 mt-2 text-sm">This invite link has expired or been revoked.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">You&apos;re invited to</h1>
              <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{info.group_name}</h2>
              {info.group_description && (
                <p className="text-slate-500 text-sm mt-2">{info.group_description}</p>
              )}
              <p className="text-slate-400 text-sm mt-2">{info.member_count} members</p>

              <Button className="w-full mt-6" size="lg" onClick={handleAccept} loading={acceptMutation.isPending}>
                Accept Invite
                {!isAuthenticated && " (sign in required)"}
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
