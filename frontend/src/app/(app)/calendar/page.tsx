"use client";

import { Badge } from "@/components/ui/Badge";
import { gamesApi } from "@/lib/api/games";
import { groupsApi } from "@/lib/api/groups";
import { getStatusColor } from "@/lib/utils/formatters";
import type { Game } from "@/types/models";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PILL_COLORS: Record<string, string> = {
  scheduled: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  ongoing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 line-through",
};

function GamePill({ game }: { game: Game }) {
  return (
    <span className={`block text-[10px] font-medium leading-tight px-1.5 py-0.5 rounded-full truncate ${PILL_COLORS[game.status] ?? "bg-slate-100 text-slate-600"}`}>
      {game.title}
    </span>
  );
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: games = [] } = useQuery({
    queryKey: ["games", { date_from: format(monthStart, "yyyy-MM-dd"), date_to: format(monthEnd, "yyyy-MM-dd") }],
    queryFn: () =>
      gamesApi.list({
        date_from: format(monthStart, "yyyy-MM-dd"),
        date_to: format(monthEnd, "yyyy-MM-dd"),
      }),
  });

  const { data: groups = [] } = useQuery({ queryKey: ["groups"], queryFn: groupsApi.list });

  const filteredGames = groupFilter === "all" ? games : games.filter((g) => g.group === groupFilter);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  const gamesForDay = (day: Date) =>
    filteredGames.filter((g) => isSameDay(new Date(g.date), day));

  const selectedGames = selectedDay ? gamesForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>

        <div className="flex items-center gap-2">
          {/* Group filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Month nav */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white px-2 min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayGames = gamesForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                className={`min-h-[80px] p-1.5 text-left border-r border-b border-slate-100 dark:border-slate-700 transition-colors last:border-r-0 focus:outline-none ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                } ${!inMonth ? "opacity-30" : ""}`}
              >
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday(day)
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayGames.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {dayGames.slice(0, 2).map((g) => (
                      <GamePill key={g.id} game={g} />
                    ))}
                    {dayGames.length > 2 && (
                      <span className="text-[10px] text-slate-400 pl-1">+{dayGames.length - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day games */}
      {selectedDay && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {format(selectedDay, "EEEE, MMMM d")}
          </h2>
          {selectedGames.length === 0 ? (
            <p className="text-sm text-slate-400">No games on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedGames.map((game) => (
                <Link key={game.id} href={`/games/${game.id}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{game.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{game.group_name}</p>
                        {game.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {game.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={getStatusColor(game.status)} size="sm">{game.status}</Badge>
                        <span className="text-xs text-slate-500">
                          {game.start_time.slice(0, 5)}
                          {game.end_time && ` – ${game.end_time.slice(0, 5)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { color: "bg-indigo-500", label: "Scheduled" },
          { color: "bg-amber-500", label: "Ongoing" },
          { color: "bg-emerald-500", label: "Completed" },
          { color: "bg-rose-500", label: "Cancelled" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
