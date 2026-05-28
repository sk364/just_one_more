"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { analyticsApi } from "@/lib/api/analytics";
import { groupsApi } from "@/lib/api/groups";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { BarChart2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [dateRange, setDateRange] = useState("3m");

  const dateFrom = format(
    subMonths(new Date(), dateRange === "1m" ? 1 : dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12),
    "yyyy-MM-dd"
  );
  const dateTo = format(new Date(), "yyyy-MM-dd");

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
  });

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) setSelectedGroup(groups[0].id);
  }, [groups, selectedGroup]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics", selectedGroup, "summary", dateFrom],
    queryFn: () => analyticsApi.groupSummary(selectedGroup, { date_from: dateFrom, date_to: dateTo }),
    enabled: !!selectedGroup,
  });

  const { data: topPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ["analytics", selectedGroup, "top-players", dateFrom],
    queryFn: () => analyticsApi.topPlayers(selectedGroup, { date_from: dateFrom, date_to: dateTo, limit: 10 }),
    enabled: !!selectedGroup,
  });

  const { data: gameCount = [], isLoading: gameCountLoading } = useQuery({
    queryKey: ["analytics", selectedGroup, "game-count", dateFrom],
    queryFn: () => analyticsApi.gameCount(selectedGroup, { date_from: dateFrom, date_to: dateTo }),
    enabled: !!selectedGroup,
  });

  if (groupsLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Join or create a group to see analytics.</p>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 focus:outline-none"
          >
            <option value="1m">Last month</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last year</option>
          </select>
        </div>
      </div>

      {!selectedGroup ? null : summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total games" value={summary?.total_games ?? 0} icon={BarChart2} />
            <StatCard label="Completed" value={summary?.completed_games ?? 0} icon={TrendingUp} />
            <StatCard label="Members" value={summary?.total_members ?? 0} icon={Users} />
            <StatCard label="Avg attendance" value={`${Math.round(summary?.avg_attendance ?? 0)}`} icon={Users} />
          </div>

          {/* Games per month chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
              Games per month — {activeGroup?.name}
            </h2>
            {gameCountLoading ? (
              <Skeleton className="h-48" />
            ) : (gameCount as { month: string; count: number }[]).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gameCount as { month: string; count: number }[]} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => format(new Date(v + "-01"), "MMM")}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => format(new Date(v + "-01"), "MMMM yyyy")}
                    contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", fontSize: "12px" }}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(gameCount as { month: string; count: number }[]).map((_, i) => (
                      <Cell key={i} fill="#6366f1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top players */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Top Players</h2>
            {playersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : topPlayers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data for this period.</p>
            ) : (
              <div className="space-y-2">
                {topPlayers.map((player, i) => {
                  const maxGames = topPlayers[0]?.games_played ?? 1;
                  const pct = Math.round((player.games_played / maxGames) * 100);
                  return (
                    <div key={player.user__id} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400 w-4">{i + 1}</span>
                      <Avatar name={player.user__display_name} src={player.user__avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {player.user__display_name}
                          </p>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                            {player.games_played} games
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
