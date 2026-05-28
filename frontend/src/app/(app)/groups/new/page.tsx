"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { groupsApi } from "@/lib/api/groups";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewGroupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`Group "${group.name}" created!`);
      router.push(`/groups/${group.id}`);
    },
    onError: () => toast.error("Failed to create group. Please try again."),
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/groups">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create a New Group</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5">
          <Input label="Group name" placeholder="e.g. Sunday Football Squad" error={errors.name?.message} {...register("name")} />
          <Textarea label="Description (optional)" placeholder="What's this group about?" {...register("description")} />
          <Button type="submit" className="w-full" loading={isPending}>Create Group</Button>
        </form>
      </motion.div>
    </div>
  );
}
