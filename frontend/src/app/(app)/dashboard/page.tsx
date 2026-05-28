"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { gamesApi } from "@/lib/api/games";
import { analyticsApi } from "@/lib/api/analytics";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { getStatusColor } from "@/lib/utils/formatters";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Calendar, Trophy, Users, Zap } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ["games", "upcoming"],
    queryFn: () => gamesApi.list({ date_from: new Date().toISOString().split("T")[0] }),
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.overview,
  });

  const upcomingGames = games?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Good {getGreeting()},{" "}
          <span className="text-indigo-600 dark:text-indigo-400">{user?.display_name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here's what's happening with your games</p>
      </div>

      {/* Stats */}
      {stats && (
        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            { label: "Groups", value: stats.total_groups, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Games Played", value: stats.total_games_played, icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Upcoming", value: stats.upcoming_games, icon: Calendar, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "This Month", value: stats.recent_games, icon: BarChart3, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <motion.div key={label} variants={item}>
              <Card className="p-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Upcoming Games */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming Games</h2>
          <Link href="/games" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">View all</Link>
        </div>

        {gamesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : upcomingGames.length === 0 ? (
          <Card className="p-8 text-center">
            <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No upcoming games</p>
            <Link href="/games/new" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mt-1 inline-block">
              Schedule one →
            </Link>
          </Card>
        ) : (
          <motion.div variants={container} initial="initial" animate="animate" className="space-y-3">
            {upcomingGames.map((game) => (
              <motion.div key={game.id} variants={item}>
                <Link href={`/games/${game.id}`}>
                  <Card hover className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">{game.title}</span>
                          <Badge variant={getStatusColor(game.status)}>{game.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {formatDate(game.date)} at {formatTime(game.start_time)}
                          {game.location && ` • ${game.location}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{game.group_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {game.confirmed_count}{game.max_players ? `/${game.max_players}` : ""}
                        </span>
                        <span className="text-xs text-slate-400">players</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
