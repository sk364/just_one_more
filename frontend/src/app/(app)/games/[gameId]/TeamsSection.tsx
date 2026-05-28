"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gamesApi } from "@/lib/api/games";
import { useAuthStore } from "@/store/authStore";
import type { GameParticipant } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Pencil, Plus, Send, Trash2, Users, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  gameId: string;
  confirmedPlayers: GameParticipant[];
}

const TEAM_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
];

const TEAM_BORDER_COLORS = [
  "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/20",
  "border-rose-400 bg-rose-50/60 dark:bg-rose-900/20",
  "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20",
  "border-amber-400 bg-amber-50/60 dark:bg-amber-900/20",
  "border-purple-400 bg-purple-50/60 dark:bg-purple-900/20",
  "border-cyan-400 bg-cyan-50/60 dark:bg-cyan-900/20",
];

export function TeamsSection({ gameId, confirmedPlayers }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTeamNames, setDraftTeamNames] = useState<string[]>(["Team A", "Team B"]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [suggestionText, setSuggestionText] = useState("");
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});
  const suggestionRef = useRef<HTMLInputElement>(null);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", gameId],
    queryFn: () => gamesApi.getTeams(gameId),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["teams", gameId, "suggestions"],
    queryFn: () => gamesApi.getSuggestions(gameId),
  });

  const saveTeamsMutation = useMutation({
    mutationFn: () => {
      const teamsPayload = draftTeamNames
        .map((name, idx) => ({
          name,
          member_ids: confirmedPlayers
            .filter((p) => assignments[p.user.id] === String(idx))
            .map((p) => p.user.id),
        }))
        .filter((t) => t.name.trim());
      return gamesApi.saveTeams(gameId, teamsPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", gameId] });
      setIsEditing(false);
      toast.success("Teams saved.");
    },
    onError: () => toast.error("Failed to save teams."),
  });

  const clearTeamsMutation = useMutation({
    mutationFn: () => gamesApi.clearTeams(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", gameId] });
      toast.success("Teams cleared.");
    },
  });

  const addSuggestionMutation = useMutation({
    mutationFn: () => gamesApi.addSuggestion(gameId, suggestionText.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", gameId, "suggestions"] });
      setSuggestionText("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to add suggestion.";
      toast.error(msg);
    },
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: (suggestionId: string) => gamesApi.deleteSuggestion(gameId, suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", gameId, "suggestions"] });
    },
  });

  const startEditing = () => {
    if (teams.length > 0) {
      setDraftTeamNames(teams.map((t) => t.name));
      const a: Record<string, string> = {};
      teams.forEach((team, idx) => {
        team.members.forEach((m) => { a[m.user.id] = String(idx); });
      });
      setAssignments(a);
    } else {
      setDraftTeamNames(["Team A", "Team B"]);
      setAssignments({});
    }
    dragCounters.current = {};
    setIsEditing(true);
  };

  const addTeam = () => setDraftTeamNames((prev) => [...prev, `Team ${String.fromCharCode(65 + prev.length)}`]);

  const removeTeam = (idx: number) => {
    setDraftTeamNames((prev) => prev.filter((_, i) => i !== idx));
    setAssignments((prev) => {
      const updated: Record<string, string> = {};
      Object.entries(prev).forEach(([uid, tidx]) => {
        const n = Number(tidx);
        if (n < idx) updated[uid] = tidx;
        else if (n > idx) updated[uid] = String(n - 1);
      });
      return updated;
    });
  };

  const handleDragEnter = (target: string) => {
    dragCounters.current[target] = (dragCounters.current[target] ?? 0) + 1;
    setDragOverTarget(target);
  };

  const handleDragLeave = (target: string) => {
    dragCounters.current[target] = (dragCounters.current[target] ?? 1) - 1;
    if (dragCounters.current[target] <= 0) {
      dragCounters.current[target] = 0;
      setDragOverTarget((prev) => (prev === target ? null : prev));
    }
  };

  const handleDrop = (target: string) => {
    if (!draggingUserId) return;
    if (target === "unassigned") {
      setAssignments((prev) => { const n = { ...prev }; delete n[draggingUserId]; return n; });
    } else {
      setAssignments((prev) => ({ ...prev, [draggingUserId]: target }));
    }
    dragCounters.current = {};
    setDraggingUserId(null);
    setDragOverTarget(null);
  };

  if (isEditing) {
    const playersInTeam = (idx: number) =>
      confirmedPlayers.filter((p) => assignments[p.user.id] === String(idx));
    const unassigned = confirmedPlayers.filter(
      (p) => assignments[p.user.id] === undefined || assignments[p.user.id] === ""
    );

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Form Teams</h2>
          <div className="flex gap-2">
            {draftTeamNames.length < 6 && (
              <Button variant="ghost" size="sm" onClick={addTeam}>
                <Plus className="w-3.5 h-3.5" /> Add team
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => saveTeamsMutation.mutate()} loading={saveTeamsMutation.isPending}>Save</Button>
          </div>
        </div>

        {/* Unassigned pool */}
        {unassigned.length > 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => handleDragEnter("unassigned")}
            onDragLeave={() => handleDragLeave("unassigned")}
            onDrop={(e) => { e.preventDefault(); handleDrop("unassigned"); }}
            className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
              dragOverTarget === "unassigned"
                ? "border-slate-400 bg-slate-100 dark:bg-slate-700"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Unassigned</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((p) => (
                <div
                  key={p.user.id}
                  draggable
                  onDragStart={() => setDraggingUserId(p.user.id)}
                  onDragEnd={() => { setDraggingUserId(null); setDragOverTarget(null); dragCounters.current = {}; }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 select-none transition-opacity ${
                    draggingUserId === p.user.id ? "opacity-30" : ""
                  }`}
                >
                  <Avatar name={p.user.display_name} src={p.user.avatar_url} size="sm" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.user.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team columns */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {draftTeamNames.map((name, idx) => {
            const isOver = dragOverTarget === String(idx);
            return (
              <div
                key={idx}
                className={`flex-shrink-0 w-[calc(50%-6px)] min-w-[140px] rounded-xl border-2 transition-colors ${
                  isOver
                    ? TEAM_BORDER_COLORS[idx % TEAM_BORDER_COLORS.length]
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => handleDragEnter(String(idx))}
                onDragLeave={() => handleDragLeave(String(idx))}
                onDrop={(e) => { e.preventDefault(); handleDrop(String(idx)); }}
              >
                {/* Team name input */}
                <div className={`px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TEAM_COLORS[idx % TEAM_COLORS.length]}`}>
                    {idx + 1}
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setDraftTeamNames((prev) => prev.map((n, i) => i === idx ? e.target.value : n))}
                    className="flex-1 text-sm font-semibold bg-transparent outline-none text-slate-900 dark:text-white min-w-0"
                    placeholder={`Team ${idx + 1}`}
                  />
                  {draftTeamNames.length > 1 && (
                    <button onClick={() => removeTeam(idx)} className="text-slate-300 hover:text-rose-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Players */}
                <div className="p-2 space-y-1.5 min-h-[120px]">
                  {playersInTeam(idx).map((p) => (
                    <div
                      key={p.user.id}
                      draggable
                      onDragStart={() => setDraggingUserId(p.user.id)}
                      onDragEnd={() => { setDraggingUserId(null); setDragOverTarget(null); dragCounters.current = {}; }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-700/60 select-none transition-opacity ${
                        draggingUserId === p.user.id ? "opacity-30" : ""
                      }`}
                    >
                      <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <Avatar name={p.user.display_name} src={p.user.avatar_url} size="sm" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{p.user.display_name}</span>
                    </div>
                  ))}
                  {playersInTeam(idx).length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4" /> Teams
        </h2>
        <div className="flex gap-2">
          {teams.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50" onClick={() => clearTeamsMutation.mutate()} loading={clearTeamsMutation.isPending}>
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            </>
          )}
          {teams.length === 0 && (
            <Button size="sm" onClick={startEditing}>
              <Users className="w-3.5 h-3.5" /> Form Teams
            </Button>
          )}
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">No teams yet. Be the first to form teams!</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {teams.map((team, idx) => (
            <Card key={team.id} className="p-3">
              <p className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${TEAM_COLORS[idx % TEAM_COLORS.length]}`}>
                {team.name}
              </p>
              <ul className="space-y-1.5">
                {team.members.length === 0 ? (
                  <li className="text-xs text-slate-400 italic">No players</li>
                ) : (
                  team.members.map((m) => (
                    <li key={m.user.id} className="flex items-center gap-2">
                      <Avatar name={m.user.display_name} src={m.user.avatar_url} size="sm" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{m.user.display_name}</span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {teams.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Suggestions</p>
          {suggestions.length === 0 && (
            <p className="text-xs text-slate-400 italic">No suggestions yet.</p>
          )}
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Avatar name={s.suggested_by.display_name} src={s.suggested_by.avatar_url} size="sm" />
              <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                <span className="font-medium text-xs text-slate-500 dark:text-slate-400">{s.suggested_by.display_name} · </span>
                {s.text}
              </div>
              {s.suggested_by.id === user?.id && (
                <button onClick={() => deleteSuggestionMutation.mutate(s.id)} className="text-slate-300 hover:text-rose-400 mt-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              ref={suggestionRef}
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && suggestionText.trim()) addSuggestionMutation.mutate(); }}
              placeholder="Suggest a change…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              size="sm"
              onClick={() => addSuggestionMutation.mutate()}
              disabled={!suggestionText.trim()}
              loading={addSuggestionMutation.isPending}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
