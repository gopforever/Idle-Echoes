import * as React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DUNGEON_GS_GATE } from "@workspace/api-client-react";
import { GhostInspect } from "./GhostInspect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Difficulty {
  id: string;
  gsRequired: number;
  hpMultiplier: number;
  damageMultiplier: number;
  unlocked: boolean;
}

interface FloorSummary {
  floorNumber: number;
  name: string;
  description: string;
  normalsRequired: number;
  miniBossId: string;
  enemyCount: number;
}

interface Dungeon {
  id: string;
  name: string;
  zone: string;
  description: string;
  lore: string;
  minLevel: number;
  maxLevel: number;
  floorCount: number;
  mainBossId: string;
  difficulties: Difficulty[];
  floors: FloorSummary[];
}

interface DungeonsResponse {
  dungeons: Dungeon[];
  playerGearScore: number;
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

const DIFF_LABELS: Record<string, string> = {
  normal: "Normal", expert: "Expert", legendary: "Legendary", mythical: "Mythical",
};

const DIFF_COLORS: Record<string, { ring: string; label: string; bg: string; badge: string; disabled: string }> = {
  normal:    { ring: "border-slate-600",  label: "text-slate-300",  bg: "hover:bg-slate-800/80 bg-slate-800/40", badge: "bg-slate-700 text-slate-300",  disabled: "opacity-40 cursor-not-allowed" },
  expert:    { ring: "border-green-700",  label: "text-green-300",  bg: "hover:bg-green-950/60 bg-green-950/30", badge: "bg-green-900 text-green-300",  disabled: "opacity-40 cursor-not-allowed" },
  legendary: { ring: "border-blue-700",   label: "text-blue-300",   bg: "hover:bg-blue-950/60 bg-blue-950/30",  badge: "bg-blue-900 text-blue-300",   disabled: "opacity-40 cursor-not-allowed" },
  mythical:  { ring: "border-orange-600", label: "text-orange-300", bg: "hover:bg-orange-950/60 bg-orange-950/30", badge: "bg-orange-900 text-orange-300", disabled: "opacity-40 cursor-not-allowed" },
};

function gsBadgeColor(gs: number) {
  if (gs >= DUNGEON_GS_GATE.mythical)   return "bg-orange-900 text-orange-300 border-orange-700";
  if (gs >= DUNGEON_GS_GATE.legendary)  return "bg-blue-900 text-blue-300 border-blue-700";
  if (gs >= DUNGEON_GS_GATE.expert)     return "bg-green-900 text-green-300 border-green-700";
  return "bg-slate-800 text-slate-400 border-slate-700";
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

// ─── DifficultyButton ─────────────────────────────────────────────────────────

function DifficultyButton({
  diff, playerGS, selected, onClick,
}: {
  diff: Difficulty; playerGS: number; selected: boolean; onClick: () => void;
}) {
  const c = DIFF_COLORS[diff.id] ?? DIFF_COLORS.normal;
  const locked = !diff.unlocked;

  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={locked ? `Requires Gear Score ${diff.gsRequired}` : undefined}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all",
        c.ring, locked ? c.disabled : c.bg,
        selected ? "ring-2 ring-white/20 shadow-lg" : "",
        !locked && "cursor-pointer",
      )}
    >
      <div>
        <span className={cn("text-sm font-bold", c.label)}>{DIFF_LABELS[diff.id]}</span>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {diff.hpMultiplier}× HP · {diff.damageMultiplier}× Dmg
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {diff.gsRequired > 0 ? (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", c.badge)}>
            GS {diff.gsRequired}+
          </span>
        ) : (
          <span className="text-[10px] text-slate-600 italic">No req.</span>
        )}
        {locked && (
          <span className="text-[10px] text-red-400">🔒 Locked</span>
        )}
      </div>
    </button>
  );
}

// ─── GhostCard ────────────────────────────────────────────────────────────────

function GhostCard({
  ghost,
  selected,
  onToggle,
  onInspect,
}: {
  ghost: GhostSuggestion;
  selected: boolean;
  onToggle: () => void;
  onInspect?: (id: number) => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer",
        selected
          ? "border-amber-600/60 bg-amber-950/30 ring-1 ring-amber-600/30"
          : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/70",
      )}
    >
      <div className="text-2xl shrink-0">
        {roleIcon(ghost.role)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-sm font-medium text-slate-200 truncate hover:text-amber-300 cursor-pointer"
            onClick={e => { e.stopPropagation(); onInspect?.(ghost.id); }}
          >{ghost.name}</span>
          <span className={cn("text-[9px] px-1 py-0.5 rounded border shrink-0", roleBadge(ghost.role))}>
            {ghost.role}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          Lv {ghost.level} {ghost.race} {ghost.class}
        </div>
      </div>
      <div className="shrink-0">
        {selected ? (
          <span className="text-[10px] text-amber-400 font-bold">✓ Added</span>
        ) : (
          <span className="text-[10px] text-slate-600">+ Add</span>
        )}
      </div>
    </button>
  );
}

// ─── PartyFormation ───────────────────────────────────────────────────────────

function PartyFormation({
  dungeonId,
  selectedGhosts,
  onToggleGhost,
  onInspectGhost,
}: {
  dungeonId: string;
  selectedGhosts: number[];
  onToggleGhost: (id: number) => void;
  onInspectGhost?: (id: number) => void;
}) {
  const { data, isLoading } = useQuery<{ suggestions: GhostSuggestion[] }>({
    queryKey: ["party-suggestions", dungeonId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/dungeons/${dungeonId}/party-suggestions`));
      if (!res.ok) throw new Error("Failed to load ghosts");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-[10px] text-slate-500 py-2 animate-pulse">Loading ghost suggestions…</div>;
  }

  const suggestions = data?.suggestions ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Form Party</p>
        <span className="text-[10px] text-slate-500">{selectedGhosts.length}/3 ghosts</span>
      </div>
      <div className="text-[10px] text-slate-500 mb-2">
        Add 1–3 ghost companions. Solo runs are also available.
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {suggestions.map(ghost => (
          <GhostCard
            key={ghost.id}
            ghost={ghost}
            selected={selectedGhosts.includes(ghost.id)}
            onInspect={onInspectGhost}
            onToggle={() => {
              if (selectedGhosts.includes(ghost.id) || selectedGhosts.length < 3) {
                onToggleGhost(ghost.id);
              }
            }}
          />
        ))}
      </div>
      {selectedGhosts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedGhosts.map(id => {
            const g = suggestions.find(s => s.id === id);
            if (!g) return null;
            return (
              <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/40 text-amber-300">
                {roleIcon(g.role)} {g.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DungeonCard ─────────────────────────────────────────────────────────────

interface StuckRunInfo {
  stuckDungeonName: string;
  stuckDungeonId: string;
}

function DungeonCard({ dungeon, playerGS, onInspectGhost }: { dungeon: Dungeon; playerGS: number; onInspectGhost?: (id: number) => void }) {
  const [selectedDiff, setSelectedDiff] = React.useState("normal");
  const [selectedGhosts, setSelectedGhosts] = React.useState<number[]>([]);
  const [showParty, setShowParty] = React.useState(false);
  const [stuckRun, setStuckRun] = React.useState<StuckRunInfo | null>(null);
  const [, navigate] = useLocation();

  const abandonMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/dungeons/run/abandon"), { method: "POST" });
      if (!res.ok) throw new Error("Failed to abandon");
      return res.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async ({ difficulty, ghostIds }: { difficulty: string; ghostIds: number[] }) => {
      const res = await fetch(apiUrl(`/api/dungeons/${dungeon.id}/start`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, ghostIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.stuckDungeonName) {
          setStuckRun({ stuckDungeonName: data.stuckDungeonName, stuckDungeonId: data.stuckDungeonId });
        }
        throw new Error(data.error ?? "Failed to start dungeon");
      }
      return data;
    },
    onSuccess: () => navigate("/dungeons/run"),
  });

  async function handleAbandonAndRetry() {
    startMutation.reset();
    try {
      await abandonMutation.mutateAsync();
      setStuckRun(null);
      startMutation.mutate({ difficulty: selectedDiff, ghostIds: selectedGhosts });
    } catch {
    }
  }

  const selectedDiffDef = dungeon.difficulties.find(d => d.id === selectedDiff);
  const canEnter = selectedDiffDef?.unlocked ?? false;

  function toggleGhost(id: number) {
    setSelectedGhosts(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id].slice(0, 3)
    );
  }

  return (
    <Card className="border-amber-900/40 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-amber-950/10">
      <CardHeader className="border-b border-amber-900/30 bg-amber-950/10 py-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-amber-400 font-serif">{dungeon.name}</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">📍 {dungeon.zone} · Levels {dungeon.minLevel}–{dungeon.maxLevel}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">
              {dungeon.floorCount} Floors
            </span>
            <span className="text-[10px] text-slate-600">Min Level {dungeon.minLevel}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Art placeholder + lore */}
        <div className="flex gap-4">
          <div className="w-28 h-24 rounded-lg border border-amber-900/40 bg-amber-950/20 flex items-center justify-center shrink-0 text-5xl shadow-inner">
            🏰
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-relaxed">{dungeon.description}</p>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed italic">{dungeon.lore.slice(0, 200)}{dungeon.lore.length > 200 ? "…" : ""}</p>
          </div>
        </div>

        {/* Floor list */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2">Floors</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
            {dungeon.floors.map(f => (
              <div key={f.floorNumber} className="px-2.5 py-1.5 rounded bg-slate-800/40 border border-slate-800/60">
                <div className="text-[10px] text-amber-500 font-bold">F{f.floorNumber}</div>
                <div className="text-[10px] text-slate-400 leading-tight truncate">{f.name}</div>
                <div className="text-[9px] text-slate-600">{f.enemyCount} enemies</div>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty selection */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2">Choose Difficulty</p>
          <div className="grid grid-cols-2 gap-2">
            {dungeon.difficulties.map(diff => (
              <DifficultyButton
                key={diff.id}
                diff={diff}
                playerGS={playerGS}
                selected={selectedDiff === diff.id}
                onClick={() => { if (diff.unlocked) setSelectedDiff(diff.id); }}
              />
            ))}
          </div>
        </div>

        {/* Party formation panel */}
        <div className="border border-slate-800/60 rounded-lg p-3 bg-slate-800/20">
          <button
            onClick={() => setShowParty(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">👥</span>
              <span className="text-xs font-bold text-slate-300">
                Form Party
                {selectedGhosts.length > 0 && (
                  <span className="ml-1.5 text-amber-400">({selectedGhosts.length} selected)</span>
                )}
              </span>
            </div>
            <span className="text-[10px] text-slate-600">{showParty ? "▲ Hide" : "▼ Show"}</span>
          </button>
          {showParty && (
            <div className="mt-3">
              <PartyFormation
                dungeonId={dungeon.id}
                selectedGhosts={selectedGhosts}
                onToggleGhost={toggleGhost}
                onInspectGhost={onInspectGhost}
              />
            </div>
          )}
        </div>

        {/* Enter button */}
        {stuckRun && (
          <div className="text-xs bg-amber-950/30 border border-amber-700/40 rounded px-3 py-2 space-y-2">
            <p className="text-amber-300">
              You have an active run in <span className="font-bold">{stuckRun.stuckDungeonName}</span>. Abandon it first?
            </p>
            {abandonMutation.isError && (
              <p className="text-red-400">Failed to abandon: {(abandonMutation.error as Error).message}</p>
            )}
            <button
              onClick={handleAbandonAndRetry}
              disabled={abandonMutation.isPending || startMutation.isPending}
              className="text-xs px-3 py-1.5 rounded bg-red-800/60 hover:bg-red-700/60 text-red-200 border border-red-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {abandonMutation.isPending ? "Abandoning…" : "Abandon stuck run & enter"}
            </button>
          </div>
        )}
        {startMutation.isError && !stuckRun && (
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded px-3 py-2">
            {(startMutation.error as Error).message}
          </div>
        )}
        <button
          onClick={() => startMutation.mutate({ difficulty: selectedDiff, ghostIds: selectedGhosts })}
          disabled={!canEnter || startMutation.isPending}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-sm transition-all",
            canEnter && !startMutation.isPending
              ? "bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/30"
              : "bg-slate-800 text-slate-600 cursor-not-allowed",
          )}
        >
          {startMutation.isPending
            ? "Entering dungeon…"
            : selectedGhosts.length > 0
              ? `Enter with Party (${selectedGhosts.length} ghost${selectedGhosts.length > 1 ? "s" : ""}) — ${DIFF_LABELS[selectedDiff]}`
              : `Enter Solo — ${DIFF_LABELS[selectedDiff]}`}
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DungeonsPage() {
  const [activeTab, setActiveTab] = React.useState<"dungeons" | "raids">("dungeons");
  const [, navigate] = useLocation();
  const [inspectGhostId, setInspectGhostId] = React.useState<number | null>(null);

  const { data, isLoading, error } = useQuery<DungeonsResponse>({
    queryKey: ["dungeons-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dungeons"));
      if (!res.ok) throw new Error("Failed to load dungeons");
      return res.json();
    },
  });

  const playerGS = data?.playerGearScore ?? 0;

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
        <div className="text-red-400 text-sm">Failed to load dungeons.</div>
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
          <h1 className="text-2xl font-serif font-bold text-amber-400">Dungeons & Raids</h1>
          <p className="text-sm text-slate-500 mt-0.5">Instanced challenges for the brave of Norrath</p>
        </div>
        <div className="text-right">
          <div className={cn("text-xs px-2 py-1 rounded border font-mono", gsBadgeColor(playerGS))}>
            Your GS: <span className="font-bold">{playerGS}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("dungeons")}
          className={cn(
            "px-5 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px",
            activeTab === "dungeons"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-300",
          )}
        >
          🏰 Dungeons
        </button>
        <button
          onClick={() => { setActiveTab("raids"); navigate("/dungeons/raids"); }}
          className={cn(
            "px-5 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px",
            activeTab === "raids"
              ? "border-red-500 text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-300",
          )}
        >
          ⚔️ Raids
        </button>
      </div>

      {/* Dungeon cards */}
      {data?.dungeons.map(dungeon => (
        <DungeonCard key={dungeon.id} dungeon={dungeon} playerGS={playerGS} onInspectGhost={setInspectGhostId} />
      ))}

      {data?.dungeons.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">🏰</div>
          <p>No dungeons available yet.</p>
        </div>
      )}
    </div>
  );
}
