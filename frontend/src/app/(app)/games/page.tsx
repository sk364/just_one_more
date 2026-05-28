"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { gamesApi } from "@/lib/api/games";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { getStatusColor } from "@/lib/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Zap } from "lucide-react";
import Link from "next/link";

export default function GamesPage() {
  const { data: games, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => gamesApi.list(),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Games</h1>
        <Link href="/games/new">
          <Button size="sm"><Plus className="w-4 h-4" /> New Game</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}</div>
      ) : games?.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="No games yet"
          description="Create your first game and share the RSVP link with your team."
          action={<Link href="/games/new"><Button><Plus className="w-4 h-4" /> Create a Game</Button></Link>}
        />
      ) : (
        <motion.div
          className="space-y-3"
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
        >
          {games?.map((game) => (
            <motion.div
              key={game.id}
              variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
            >
              <Link href={`/games/${game.id}`}>
                <Card hover className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white flex-shrink-0">
                      <span className="text-lg font-bold leading-none">{new Date(game.date).getDate()}</span>
                      <span className="text-xs uppercase">{new Date(game.date).toLocaleString("default", { month: "short" })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white">{game.title}</span>
                        <Badge variant={getStatusColor(game.status)} size="sm">{game.status}</Badge>
                        {game.my_rsvp_status === "confirmed" && (
                          <Badge variant="success">You&apos;re in</Badge>
                        )}
                        {game.my_rsvp_status === "waitlisted" && (
                          <Badge variant="info">Waitlisted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatTime(game.start_time)}
                        {game.end_time && ` – ${formatTime(game.end_time)}`}
                        {game.location && ` • ${game.location}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{game.group_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                        {game.confirmed_count}{game.max_players ? `/${game.max_players}` : ""}
                      </p>
                      <p className="text-xs text-slate-400">in</p>
                      {game.waitlist_count > 0 && (
                        <p className="text-xs text-cyan-600">+{game.waitlist_count} waiting</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
