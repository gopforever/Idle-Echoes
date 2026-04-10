import * as React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GhostInspect } from "./GhostInspect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RaidPhase {
  phase: number;
  name: string;
  description: string;
  hpThreshold: number;
  abilities: string[];
}

interface Raid {
  id: string;
  name: string;
  zone: string;
  lore: string;
  description: string;
  minLevel: number;
  minGearScore: number;
  bossName: string;
  spriteId: string;
  minPartySize: number;
  maxPartySize: number;
  lootTier: "legendary" | "fabled" | "mythical";
  phaseCount: number;
  phases: RaidPhase[];
  unlocked: boolean;
  gsRequired: number;
}

interface RaidsResponse {
  raids: Raid[];
  playerGearScore: number;
  playerLevel: number;
}

interface GhostSuggestion {
  id: number;
  name: string;
  race: string;
  class: string;
  archetype: string;
  level: number;
  zone: string;
  killCount: number;
  role: "Tank" | "Healer" | "DPS";
  levelOk: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gsBadgeColor(gs: number) {
  if (gs >= 500) return "bg-orange-900 text-orange-300 border-orange-700";
  if (gs >= 400) return "bg-purple-900 text-purple-300 border-purple-700";
  if (gs >= 300) return "bg-blue-900 text-blue-300 border-blue-700";
  return "bg-slate-800 text-slate-400 border-slate-700";
}

function lootTierColor(tier: string) {
  if (tier === "mythical") return "bg-orange-900/60 text-orange-300 border-orange-700/50";
  if (tier === "fabled") return "bg-purple-900/60 text-purple-300 border-purple-700/50";
  return "bg-blue-900/60 text-blue-300 border-blue-700/50";
}

function roleIcon(role: string): string {
  if (role === "Tank") return "🛡️";
  if (role === "Healer") return "💚";
  return "⚔️";
}

function roleBadge(role: string): string {
  if (role === "Tank") return "bg-blue-900/60 text-blue-300 border-blue-700/50";
  if (role === "Healer") return "bg-green-900/60 text-green-300 border-green-700/50";
  return "bg-red-900/60 text-red-300 border-red-700/50";
}

// ─── GhostCard ────────────────────────────────────────────────────────────────

function GhostCard({
  ghost,
  selected,
  onToggle,
  maxReached,
  onInspect,
}: {
  ghost: GhostSuggestion;
  selected: boolean;
  onToggle: () => void;
  maxReached: boolean;
  onInspect?: (id: number) => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={!selected && maxReached}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
        selected
          ? "border-red-600/60 bg-red-950/30 ring-1 ring-red-600/30 cursor-pointer"
          : maxReached
            ? "border-slate-700/30 bg-slate-800/20 opacity-50 cursor-not-allowed"
            : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/70 cursor-pointer",
      )}
    >
      <div className="text-2xl shrink-0">{roleIcon(ghost.role)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-sm font-medium text-slate-200 truncate hover:text-red-300 cursor-pointer"
            onClick={e => { e.stopPropagation(); onInspect?.(ghost.id); }}
          >{ghost.name}</span>
          <span className={cn("text-[9px] px-1 py-0.5 rounded border shrink-0", roleBadge(ghost.role))}>
            {ghost.role}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">Lv {ghost.level} {ghost.race} {ghost.class}</div>
      </div>
      <div className="shrink-0">
        {selected ? (
          <span className="text-[10px] text-red-400 font-bold">✓ Added</span>
        ) : (
          <span className="text-[10px] text-slate-600">+ Add</span>
        )}
      </div>
    </button>
  );
}

// ─── RaidCard ─────────────────────────────────────────────────────────────────

function RaidCard({ raid, playerGS, playerLevel, onInspectGhost }: { raid: Raid; playerGS: number; playerLevel: number; onInspectGhost?: (id: number) => void }) {
  const [, navigate] = useLocation();
  const [selectedGhosts, setSelectedGhosts] = React.useState<number[]>([]);
  const [showPhases, setShowPhases] = React.useState(false);

  const { data: suggestionsData } = useQuery<{ suggestions: GhostSuggestion[] }>({
    queryKey: ["raid-party-suggestions", raid.id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/raids/party-suggestions?raidId=${encodeURIComponent(raid.id)}`));
      if (!res.ok) throw new Error("Failed to load ghosts");
      return res.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async (ghostIds: number[]) => {
      const res = await fetch(apiUrl(`/api/raids/${encodeURIComponent(raid.id)}/start`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghostIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start raid");
      return data;
    },
    onSuccess: () => navigate("/dungeons/raids/run"),
  });

  const abandonActiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/raids/active"), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to abandon raid");
      return data;
    },
    onSuccess: () => startMutation.reset(),
  });

  const unlocked = raid.unlocked;
  const maxGhosts = raid.maxPartySize - 1;
  const minGhosts = raid.minPartySize - 1;
  const suggestions = suggestionsData?.suggestions ?? [];

  function toggleGhost(id: number) {
    setSelectedGhosts(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id].slice(0, maxGhosts)
    );
  }

  return (
    <Card className={cn(
      "border bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-red-950/10",
      unlocked ? "border-red-900/40" : "border-slate-800/40 opacity-75",
    )}>
      <CardHeader className={cn(
        "border-b py-4 px-5",
        unlocked ? "border-red-900/30 bg-red-950/10" : "border-slate-800/30 bg-slate-800/10",
      )}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className={cn(
              "text-lg font-serif",
              unlocked ? "text-red-400" : "text-slate-500",
            )}>
              {raid.name}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">📍 {raid.zone} · {raid.bossName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", lootTierColor(raid.lootTier))}>
              {raid.lootTier.toUpperCase()} loot
            </span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", gsBadgeColor(raid.gsRequired))}>
              GS {raid.gsRequired}+
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Description + lore */}
        <div className="flex gap-4">
          <div className={cn(
            "w-28 h-24 rounded-lg border flex items-center justify-center shrink-0 text-5xl shadow-inner",
            unlocked ? "border-red-900/40 bg-red-950/20" : "border-slate-800/40 bg-slate-800/20",
          )}>
            ⚔️
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-relaxed">{raid.description}</p>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed italic">{raid.lore.slice(0, 180)}{raid.lore.length > 180 ? "…" : ""}</p>
          </div>
        </div>

        {/* Requirements */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className={cn("px-2 py-0.5 rounded border", playerLevel >= raid.minLevel ? "bg-green-950/40 border-green-700/50 text-green-400" : "bg-red-950/40 border-red-700/50 text-red-400")}>
            Min Level {raid.minLevel} {playerLevel >= raid.minLevel ? "✓" : "✗"}
          </span>
          <span className={cn("px-2 py-0.5 rounded border", playerGS >= raid.gsRequired ? "bg-green-950/40 border-green-700/50 text-green-400" : "bg-red-950/40 border-red-700/50 text-red-400")}>
            GS {raid.gsRequired}+ {playerGS >= raid.gsRequired ? "✓" : "✗"}
          </span>
          <span className="px-2 py-0.5 rounded border border-slate-700/50 text-slate-400">
            {raid.minPartySize}–{raid.maxPartySize} players
          </span>
          <span className="px-2 py-0.5 rounded border border-slate-700/50 text-slate-400">
            {raid.phaseCount} phases
          </span>
        </div>

        {/* Phases */}
        <div>
          <button
            onClick={() => setShowPhases(v => !v)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold hover:text-slate-300 transition-colors"
          >
            Boss Phases {showPhases ? "▲" : "▼"}
          </button>
          {showPhases && (
            <div className="mt-2 space-y-2">
              {raid.phases.map(phase => (
                <div key={phase.phase} className="px-3 py-2.5 rounded-lg bg-slate-800/30 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/50 text-red-400 font-bold">
                      Phase {phase.phase}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{phase.name}</span>
                    <span className="text-[9px] text-slate-500 ml-auto">Below {phase.hpThreshold}% HP</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{phase.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {phase.abilities.map(ab => (
                      <span key={ab} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-700/50">
                        {ab}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Party formation */}
        {unlocked && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Assemble Party</p>
              <span className="text-[10px] text-slate-500">
                {selectedGhosts.length}/{maxGhosts} ghosts
                {selectedGhosts.length < minGhosts && (
                  <span className="text-red-400 ml-1">(min {minGhosts} required)</span>
                )}
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {suggestions.map(ghost => (
                <GhostCard
                  key={ghost.id}
                  ghost={ghost}
                  selected={selectedGhosts.includes(ghost.id)}
                  onToggle={() => toggleGhost(ghost.id)}
                  maxReached={selectedGhosts.length >= maxGhosts && !selectedGhosts.includes(ghost.id)}
                  onInspect={onInspectGhost}
                />
              ))}
            </div>
            {selectedGhosts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedGhosts.map(id => {
                  const g = suggestions.find(s => s.id === id);
                  if (!g) return null;
                  return (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/40 border border-red-700/40 text-red-300">
                      {roleIcon(g.role)} {g.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {startMutation.isError && (
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded px-3 py-2 space-y-2">
            <div>{(startMutation.error as Error).message}</div>
            {(startMutation.error as Error).message === "You already have an active raid run" && (
              <button
                onClick={() => abandonActiveMutation.mutate()}
                disabled={abandonActiveMutation.isPending}
                className="text-xs bg-red-900/60 hover:bg-red-800/60 border border-red-700/60 text-red-300 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {abandonActiveMutation.isPending ? "Abandoning…" : "Abandon Active Raid"}
              </button>
            )}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => startMutation.mutate(selectedGhosts)}
          disabled={!unlocked || startMutation.isPending || selectedGhosts.length < minGhosts}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-sm transition-all",
            unlocked && !startMutation.isPending && selectedGhosts.length >= minGhosts
              ? "bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/30"
              : "bg-slate-800 text-slate-600 cursor-not-allowed",
          )}
        >
          {startMutation.isPending
            ? "Entering raid…"
            : !unlocked
              ? `🔒 Requires GS ${raid.gsRequired}+ / Level ${raid.minLevel}+`
              : selectedGhosts.length < minGhosts
                ? `Need ${minGhosts - selectedGhosts.length} more ghost${minGhosts - selectedGhosts.length > 1 ? "s" : ""}`
                : `⚔️ Begin ${raid.name} (${selectedGhosts.length + 1} players)`}
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaidsPage() {
  const [, navigate] = useLocation();
  const [inspectGhostId, setInspectGhostId] = React.useState<number | null>(null);

  const { data, isLoading, error } = useQuery<RaidsResponse>({
    queryKey: ["raids-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/raids"));
      if (!res.ok) throw new Error("Failed to load raids");
      return res.json();
    },
  });

  const playerGS = data?.playerGearScore ?? 0;
  const playerLevel = data?.playerLevel ?? 1;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-800/60 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-400 text-sm">Failed to load raids.</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {inspectGhostId !== null && (
        <GhostInspect ghostId={inspectGhostId} onClose={() => setInspectGhostId(null)} />
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dungeons")} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              ← Dungeons
            </button>
            <span className="text-slate-700">/</span>
            <h1 className="text-2xl font-serif font-bold text-red-400">Raids</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Epic multi-phase encounters for coordinated groups</p>
        </div>
        <div className={cn("text-xs px-2 py-1 rounded border font-mono", gsBadgeColor(playerGS))}>
          Your GS: <span className="font-bold">{playerGS}</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-lg px-4 py-3 text-[11px] text-red-300/80 leading-relaxed">
        <strong className="text-red-300">Raids</strong> are the pinnacle of group content — assemble a party of 4–6 adventurers (you + ghost companions) to tackle legendary bosses across 3 escalating phases. Each phase changes the boss's tactics. Defeat all phases to claim the finest loot in Norrath.
      </div>

      {/* Raid cards */}
      {data?.raids.map(raid => (
        <RaidCard key={raid.id} raid={raid} playerGS={playerGS} playerLevel={playerLevel} onInspectGhost={setInspectGhostId} />
      ))}

      {data?.raids.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">⚔️</div>
          <p>No raids available yet.</p>
        </div>
      )}
    </div>
  );
}
