import * as React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetCombatState, useStartCombat, getGetCombatStateQueryKey } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CombatHud } from "@/components/game/combat-hud";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Enemy {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  hp?: number;
  isBoss?: boolean;
  description?: string;
}

interface ScaledEnemy {
  id: string;
  enemy: Enemy;
}

interface FloorProgress {
  normalKills: number;
  floorKills: number;
  normalsRequired: number;
  miniBossDefeated: boolean;
  mainBossDefeated: boolean;
  floorClear: boolean;
  totalFloors: number;
  percentComplete: number;
}

interface DungeonRun {
  id: number;
  dungeonId: string;
  difficulty: string;
  currentFloor: number;
  normalKills: number;
  floorKills: number;
  miniBossDefeated: boolean;
  mainBossDefeated: boolean;
  status: string;
  completed: boolean;
  abandoned: boolean;
  lootEarned: Array<{ floor: number; items: LootItem[] }>;
  currentFloorEnemies: string[];
}

interface LootItem {
  id?: string;
  itemId?: string;
  name?: string;
  level?: number;
  rarity?: string;
  slot?: string;
}

interface CurrentFloor {
  floorNumber: number;
  name: string;
  description: string;
  normalsRequired: number;
  miniBossId: string;
  enemyIds?: string[];
}

interface PartyMemberInfo {
  ghostId: number;
  hp: number;
  maxHp: number;
  status: "active" | "downed" | "revived";
  damageDone: number;
  healingDone: number;
  saveCount: number;
  role: "Tank" | "Healer" | "DPS";
  classIcon?: string;
  ghost: {
    id: number;
    name: string;
    class: string;
    archetype: string;
    level: number;
    race: string;
  } | null;
}

interface RunState {
  active: boolean;
  run?: DungeonRun;
  dungeon?: { id: string; name: string; zone: string } | null;
  currentFloor?: CurrentFloor | null;
  scaledEnemies?: ScaledEnemy[];
  remainingEnemies?: ScaledEnemy[];
  progress?: FloorProgress;
  party?: PartyMemberInfo[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFF_LABEL: Record<string, string> = {
  normal: "Normal", expert: "Expert", legendary: "Legendary", mythical: "Mythical",
};
const DIFF_COLOR: Record<string, string> = {
  normal: "text-slate-300", expert: "text-green-300", legendary: "text-blue-300", mythical: "text-orange-300",
};

function rarityColor(rarity?: string) {
  switch (rarity) {
    case "legendary": return "text-orange-400 border-orange-700 bg-orange-950/30";
    case "epic":      return "text-purple-400 border-purple-700 bg-purple-950/30";
    case "rare":      return "text-blue-400 border-blue-700 bg-blue-950/30";
    case "uncommon":  return "text-green-400 border-green-700 bg-green-950/30";
    default:          return "text-slate-300 border-slate-700 bg-slate-800/40";
  }
}

function roleIcon(role: string): string {
  if (role === "Tank") return "🛡️";
  if (role === "Healer") return "💚";
  return "⚔️";
}

// ─── Party HUD ────────────────────────────────────────────────────────────────

function PartyHud({ party }: { party: PartyMemberInfo[] }) {
  if (!party || party.length === 0) return null;

  return (
    <div className="px-4 py-3 rounded-lg bg-slate-800/40 border border-slate-700/50 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Party</p>
      {party.map(member => {
        const hpPct = Math.max(0, Math.min(100, (member.hp / Math.max(1, member.maxHp)) * 100));
        const isDowned = member.status === "downed";
        const isRevived = member.status === "revived";

        return (
          <div key={member.ghostId} className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all",
            isDowned
              ? "border-red-800/40 bg-red-950/20 opacity-60"
              : "border-slate-700/40 bg-slate-800/30",
          )}>
            {/* Class portrait / icon */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border",
              isDowned ? "border-red-800/40 bg-red-950/20" : "border-slate-600/50 bg-slate-700/50",
            )}>
              {member.classIcon ?? roleIcon(member.role)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-xs font-medium truncate", isDowned ? "text-red-400" : "text-slate-200")}>
                  {member.ghost?.name ?? `Ghost #${member.ghostId}`}
                </span>
                {member.ghost && (
                  <span className="text-[9px] text-slate-500 truncate hidden sm:block">{member.ghost.class}</span>
                )}
                <span className={cn(
                  "text-[9px] px-1 py-0.5 rounded border shrink-0",
                  isDowned
                    ? "border-red-700/50 text-red-400 bg-red-950/30"
                    : isRevived
                      ? "border-yellow-700/50 text-yellow-400 bg-yellow-950/30"
                      : "border-slate-700/50 text-slate-500",
                )}>
                  {isDowned ? "Downed" : isRevived ? "Revived" : member.role}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isDowned ? "bg-red-800" : hpPct > 50 ? "bg-green-600" : hpPct > 25 ? "bg-yellow-600" : "bg-red-600",
                    )}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-mono shrink-0">
                  {member.hp}/{member.maxHp}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Floor Progress Panel ─────────────────────────────────────────────────────

function FloorProgressPanel({
  runState,
  onFightEnemy,
  combatActive,
  activeCombatEnemyId,
}: {
  runState: RunState;
  onFightEnemy: (id: string) => void;
  combatActive: boolean;
  activeCombatEnemyId?: string;
}) {
  const { run, progress, remainingEnemies = [], currentFloor, dungeon, party = [] } = runState;
  if (!run || !progress) return null;

  const kills = progress.normalKills;
  const needed = progress.normalsRequired;
  const totalFloors = progress.totalFloors;
  const isLastFloor = run.currentFloor === totalFloors;
  const killPct = Math.min(100, (kills / Math.max(1, needed)) * 100);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Dungeon header */}
      <div className="px-4 py-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-serif font-bold text-amber-400">{dungeon?.name ?? "Blackburrow"}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{dungeon?.zone}</p>
          </div>
          <span className={cn("text-xs font-bold capitalize", DIFF_COLOR[run.difficulty] ?? "text-slate-400")}>
            {DIFF_LABEL[run.difficulty] ?? run.difficulty}
          </span>
        </div>
      </div>

      {/* Party HUD */}
      {party.length > 0 && <PartyHud party={party} />}

      {/* Floor progress */}
      <div className="px-4 py-3 rounded-lg bg-slate-800/40 border border-slate-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Floor <span className="text-amber-400">{run.currentFloor}</span> / {totalFloors}
          </span>
          <span className="text-[10px] text-slate-500">{progress.percentComplete}% complete</span>
        </div>

        {/* Floor number track */}
        <div className="flex gap-1">
          {Array.from({ length: totalFloors }, (_, i) => {
            const fn = i + 1;
            const done = fn < run.currentFloor;
            const current = fn === run.currentFloor;
            return (
              <div key={fn} className={cn(
                "flex-1 h-2 rounded-full transition-all",
                done    ? "bg-amber-600" :
                current ? "bg-amber-400 animate-pulse" :
                          "bg-slate-700"
              )} />
            );
          })}
        </div>

        {/* Current floor info */}
        {currentFloor && (
          <div>
            <p className="text-[10px] text-amber-500 font-bold">{currentFloor.name}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{currentFloor.description}</p>
          </div>
        )}

        {/* Kill counter */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Kills</span>
            <span className="text-slate-300 font-mono">{kills}/{needed}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${killPct}%` }} />
          </div>
        </div>

        {/* Boss status */}
        <div className="flex gap-2 text-[10px]">
          <span className={cn("px-2 py-0.5 rounded border", progress.miniBossDefeated ? "bg-green-950/40 border-green-700/50 text-green-400" : "bg-slate-800/40 border-slate-700/50 text-slate-500")}>
            {progress.miniBossDefeated ? "✓" : "○"} Mini-Boss
          </span>
          {isLastFloor && (
            <span className={cn("px-2 py-0.5 rounded border", progress.mainBossDefeated ? "bg-amber-950/40 border-amber-700/50 text-amber-400" : "bg-slate-800/40 border-slate-700/50 text-slate-500")}>
              {progress.mainBossDefeated ? "✓" : "○"} Final Boss
            </span>
          )}
        </div>
      </div>

      {/* Enemy list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Floor Enemies</p>

        {remainingEnemies.length === 0 && (
          <div className="text-center py-6 text-slate-600">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-xs">All enemies defeated</p>
          </div>
        )}

        {remainingEnemies.map(({ id, enemy }) => {
          const isActive = activeCombatEnemyId === id;
          const isMini = id === currentFloor?.miniBossId;
          const isMain = !isMini && (enemy as { isBoss?: boolean }).isBoss;

          return (
            <button
              key={id}
              onClick={() => onFightEnemy(id)}
              disabled={combatActive}
              title={combatActive ? "Finish current combat first" : `Fight ${enemy.name}`}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all",
                isActive
                  ? "border-red-700/60 bg-red-950/30"
                  : isMain
                    ? "border-orange-700/50 bg-orange-950/20 hover:bg-orange-950/40"
                    : isMini
                      ? "border-purple-700/50 bg-purple-950/20 hover:bg-purple-950/40"
                      : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/70",
                combatActive && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
            >
              <div className="text-xl shrink-0">
                {isMain ? "👑" : isMini ? "💀" : "🐺"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isMain ? "text-orange-300" : isMini ? "text-purple-300" : "text-slate-200"
                  )}>
                    {enemy.name}
                  </span>
                  {(isMini || isMain) && (
                    <span className={cn(
                      "text-[9px] px-1 py-0.5 rounded border shrink-0",
                      isMain ? "border-orange-700/50 text-orange-400" : "border-purple-700/50 text-purple-400"
                    )}>
                      {isMain ? "BOSS" : "MINI"}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">Lv {enemy.level} · {enemy.maxHp} HP</div>
              </div>
              {isActive ? (
                <span className="text-[10px] text-red-400 animate-pulse shrink-0">⚔️ Fighting</span>
              ) : (
                <span className="text-[10px] text-slate-600 shrink-0">Fight →</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dungeon Complete Modal ───────────────────────────────────────────────────

function DungeonCompleteModal({
  lootEarned,
  dungeonName,
  xpEarned,
  goldEarned,
  party,
  onClaim,
}: {
  lootEarned: Array<{ floor: number; items: LootItem[] }>;
  dungeonName: string;
  xpEarned: number;
  goldEarned: number;
  party?: PartyMemberInfo[];
  onClaim: () => void;
}) {
  const allItems = lootEarned.flatMap(l => l.items);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-700/50 rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900/80 to-amber-950 px-6 py-5 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-2xl font-serif font-bold text-amber-300">{dungeonName} Conquered!</h2>
          <p className="text-sm text-amber-600 mt-1">All floors cleared — glory awaits!</p>
        </div>

        {/* XP & Gold summary */}
        <div className="flex items-center justify-center gap-6 px-6 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">+{xpEarned.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">XP Earned</div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-400">+{goldEarned.toLocaleString()}g</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Gold Value</div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-slate-300">{allItems.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Items</div>
          </div>
        </div>

        {/* Party contributions */}
        {party && party.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-3">Ghost Contributions</p>
            <div className="space-y-2">
              {party.map(member => (
                <div key={member.ghostId} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/30">
                  <div className="text-lg shrink-0">
                    {member.role === "Tank" ? "🛡️" : member.role === "Healer" ? "💚" : "⚔️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200">{member.ghost?.name ?? `Ghost #${member.ghostId}`}</p>
                    <p className="text-[10px] text-slate-500">{member.ghost?.class} · Lv {member.ghost?.level}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-red-400 font-mono">{member.damageDone} dmg</div>
                    {member.healingDone > 0 && (
                      <div className="text-[10px] text-green-400 font-mono">{member.healingDone} heal</div>
                    )}
                    {member.saveCount > 0 && (
                      <div className="text-[10px] text-amber-400">×{member.saveCount} saves</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loot */}
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-3">
            Loot Earned ({allItems.length} items)
          </p>
          {allItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No items earned.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {allItems.map((item, idx) => {
                const name = item.name ?? item.itemId ?? "Unknown Item";
                const rarity = item.rarity ?? "common";
                return (
                  <div
                    key={idx}
                    className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border", rarityColor(rarity))}
                  >
                    <span className="text-xl shrink-0">🗡️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">
                        {rarity} {item.level ? `· Lv ${item.level}` : ""} {item.slot ? `· ${item.slot}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Claim button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClaim}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-900/30"
          >
            Claim & Exit Dungeon
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Floor Complete Banner ────────────────────────────────────────────────────

function FloorCompleteBanner({
  floor,
  isLastFloor,
  isAdvancing,
  onContinue,
}: {
  floor: number;
  isLastFloor: boolean;
  isAdvancing: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={cn(
        "border rounded-2xl px-10 py-8 text-center shadow-2xl max-w-sm w-full mx-4",
        isLastFloor
          ? "bg-amber-950/90 border-amber-700/60"
          : "bg-green-950/90 border-green-700/60"
      )}>
        <div className="text-5xl mb-3">{isLastFloor ? "🏆" : "✅"}</div>
        <p className={cn("text-2xl font-serif font-bold", isLastFloor ? "text-amber-300" : "text-green-300")}>
          {isLastFloor ? "Final Floor Clear!" : `Floor ${floor} Complete!`}
        </p>
        <p className={cn("text-sm mt-2 mb-6", isLastFloor ? "text-amber-600" : "text-green-600")}>
          {isLastFloor
            ? "All enemies vanquished. Claim your spoils!"
            : "The path forward is clear. Press on, adventurer."}
        </p>
        <button
          onClick={onContinue}
          disabled={isAdvancing}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-all",
            isAdvancing
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : isLastFloor
                ? "bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/30"
                : "bg-green-700 hover:bg-green-600 text-white"
          )}
        >
          {isAdvancing
            ? "Loading…"
            : isLastFloor
              ? "🏆 Claim Rewards!"
              : "Continue →"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DungeonsRunPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showBanner, setShowBanner] = React.useState(false);
  const [bannerFloor, setBannerFloor] = React.useState(1);
  const [completedRun, setCompletedRun] = React.useState<{
    lootEarned: Array<{ floor: number; items: LootItem[] }>;
    dungeonName: string;
    xpEarned: number;
    goldEarned: number;
    party?: PartyMemberInfo[];
  } | null>(null);

  const [autoCombat, setAutoCombat] = React.useState(true);

  const { data: combatState } = useGetCombatState();
  const startCombat = useStartCombat();

  const { data: runState, isLoading } = useQuery<RunState>({
    queryKey: ["dungeon-run-current"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dungeons/run/current"));
      if (!res.ok) throw new Error("Failed to fetch run");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // ── Auto-show floor-complete banner when floor is cleared ──────────────────
  React.useEffect(() => {
    if (runState?.progress?.floorClear && !combatState?.active && !completedRun) {
      setShowBanner(true);
      setBannerFloor(runState.run?.currentFloor ?? 1);
    }
  }, [runState?.progress?.floorClear, combatState?.active, completedRun]);

  // ── Dungeon auto-loop: start next remaining enemy when combat ends ──────────
  const remainingEnemiesRef = React.useRef<ScaledEnemy[]>([]);
  React.useEffect(() => {
    remainingEnemiesRef.current = runState?.remainingEnemies ?? [];
  }, [runState?.remainingEnemies]);

  React.useEffect(() => {
    if (combatState?.active || !autoCombat || startCombat.isPending) return;
    const remaining = remainingEnemiesRef.current;
    if (!remaining || remaining.length === 0) return;
    const nextEnemyId = remaining[0]?.id;
    if (!nextEnemyId) return;
    const timer = setTimeout(() => {
      startCombat.mutate({ data: { enemyId: nextEnemyId } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dungeon-run-current"] }),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [combatState?.active, autoCombat, startCombat.isPending]);

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/dungeons/run/advance"), { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to advance");
      return data;
    },
    onSuccess: (data) => {
      setShowBanner(false);
      if (data.completed) {
        const run = data.run;
        const loot = (run?.lootEarned as Array<{ floor: number; items: LootItem[] }>) ?? [];
        setCompletedRun({
          lootEarned: loot,
          dungeonName: runState?.dungeon?.name ?? run?.dungeonId ?? "Blackburrow",
          xpEarned: data.xpEarned ?? 0,
          goldEarned: data.goldEarned ?? 0,
          party: data.party ?? [],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["dungeon-run-current"] });
      }
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/dungeons/run/abandon"), { method: "POST" });
      if (!res.ok) throw new Error("Failed to abandon");
      return res.json();
    },
    onSuccess: () => {
      navigate("/dungeons");
    },
  });

  const handleFightEnemy = (enemyId: string) => {
    startCombat.mutate(
      { data: { enemyId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() }) }
    );
  };

  // Redirect if no active run — skip when completion screen is showing
  React.useEffect(() => {
    if (!isLoading && runState && !runState.active && !completedRun) {
      navigate("/dungeons");
    }
  }, [isLoading, runState, navigate, completedRun]);

  const combatEnemy = combatState?.enemy as Enemy | undefined;
  const activeCombatEnemyId = combatState?.active ? combatEnemy?.id : undefined;
  const isLastFloor = runState
    ? (runState.run?.currentFloor ?? 1) >= (runState.progress?.totalFloors ?? 5)
    : false;

  // Show completion screen first — must come before the !runState?.active guard
  // so the loot modal is never pre-empted by the poll returning active: false
  if (completedRun) {
    return (
      <DungeonCompleteModal
        lootEarned={completedRun.lootEarned}
        dungeonName={completedRun.dungeonName}
        xpEarned={completedRun.xpEarned}
        goldEarned={completedRun.goldEarned}
        party={completedRun.party}
        onClaim={() => {
          setCompletedRun(null);
          navigate("/dungeons");
        }}
      />
    );
  }

  if (isLoading || !runState?.active) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-800/60 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4">
      {/* Floor-complete banner — shown automatically when floor is cleared */}
      {showBanner && (
        <FloorCompleteBanner
          floor={bannerFloor}
          isLastFloor={isLastFloor}
          isAdvancing={advanceMutation.isPending}
          onContinue={() => advanceMutation.mutate()}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-serif font-bold text-amber-400">
          {runState.dungeon?.name ?? "Blackburrow"} — Floor {runState.run?.currentFloor ?? 1}
        </h1>
        <button
          onClick={() => { if (confirm("Abandon this dungeon run?")) abandonMutation.mutate(); }}
          disabled={abandonMutation.isPending}
          className="text-xs text-slate-600 hover:text-red-400 border border-slate-800 hover:border-red-800/50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Abandon Run
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Floor progress */}
        <Card className="border-slate-800 bg-slate-900/60 overflow-y-auto">
          <CardContent className="p-4 h-full">
            <FloorProgressPanel
              runState={runState}
              onFightEnemy={handleFightEnemy}
              combatActive={!!combatState?.active}
              activeCombatEnemyId={activeCombatEnemyId}
            />
          </CardContent>
        </Card>

        {/* Right: Shared combat HUD — same experience as the Combat page */}
        <div className="min-h-0 flex flex-col">
          <CombatHud
            autoCombat={autoCombat}
            onToggleAutoCombat={() => setAutoCombat(v => !v)}
            locationLabel={
              runState.currentFloor?.name
                ? `${runState.dungeon?.name ?? "Blackburrow"} — ${runState.currentFloor.name}`
                : (runState.dungeon?.name ?? "Blackburrow")
            }
            disableAutoEngage={true}
          />
        </div>
      </div>
    </div>
  );
}
