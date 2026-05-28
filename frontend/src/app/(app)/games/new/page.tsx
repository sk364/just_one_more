"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { gamesApi } from "@/lib/api/games";
import { groupsApi } from "@/lib/api/groups";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  group: z.string().uuid("Select a group"),
  title: z.string().min(2, "Game title required"),
  sport: z.string().optional(),
  location: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional(),
  max_players: z.string().optional(),
  cost_per_player: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const defaultGroup = searchParams.get("group") || "";

  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: groupsApi.list });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { group: defaultGroup, currency: "INR", sport: "Football" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: gamesApi.create,
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      toast.success("Game scheduled!");
      router.push(`/games/${game.id}`);
    },
    onError: () => toast.error("Failed to schedule game."),
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/games">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Schedule a Game</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <form onSubmit={handleSubmit((d) => mutate({
          ...d,
          currency: d.currency || "INR",
          end_time: d.end_time || undefined,
          max_players: d.max_players ? parseInt(d.max_players) : undefined,
          cost_per_player: d.cost_per_player ? parseFloat(d.cost_per_player) : undefined,
        }))} className="space-y-4">
          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Group *</label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              {...register("group")}
            >
              <option value="">Select a group...</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {errors.group && <p className="text-xs text-rose-600">{errors.group.message}</p>}
          </div>

          <Input label="Game title *" placeholder="e.g. Sunday 5-a-side" error={errors.title?.message} {...register("title")} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sport</label>
              <select className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" {...register("sport")}>
                <option value="Football">Football</option>
              </select>
            </div>
            <Input label="Location" placeholder="Hyde Park" {...register("location")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" min={new Date().toISOString().split("T")[0]} error={errors.date?.message} {...register("date")} />
            <Input label="Start time *" type="time" error={errors.start_time?.message} {...register("start_time")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="End time" type="time" {...register("end_time")} />
            <Input label="Max players" type="number" min="2" placeholder="Unlimited" {...register("max_players")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Cost per player" type="number" min="0" step="0.01" placeholder="0.00" {...register("cost_per_player")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
              <select className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none" {...register("currency")}>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <Textarea label="Notes" placeholder="Any additional info..." {...register("notes")} />

          <Button type="submit" className="w-full" loading={isPending}>Schedule Game</Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function NewGamePage() {
  return <Suspense><NewGameForm /></Suspense>;
}
