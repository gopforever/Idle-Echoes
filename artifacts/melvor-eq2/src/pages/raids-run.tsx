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
  isRaidBoss?: boolean;
}

interface RaidPhase {
  phase: number;
  name: string;
  description: string;
  hpThreshold: number;
  abilities: string[];
  damageMultiplier: number;
  hpMultiplier: number;
}

interface RaidRun {
  id: number;
  raidId: string;
  currentPhase: number;
  totalPhases: number;
  bossDefeated: boolean;
  status: string;
  completed: boolean;
  abandoned: boolean;
  lootEarned: string[];
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

interface LootItem {
  id?: string;
  name?: string;
  level?: number;
  rarity?: string;
  slot?: string;
}

interface RaidRunState {
  active: boolean;
  run?: RaidRun;
  raid?: { id: string; name: string; bossName: string; zone: string; totalPhases: number } | null;
  currentPhase?: RaidPhase | null;
  nextPhase?: RaidPhase | null;
  scaledBoss?: Enemy | null;
  party?: PartyMemberInfo[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleIcon(role: string): string {
  if (role === "Tank") return "🛡️";
  if (role === "Healer") return "💚";
  return "⚔️";
}

function rarityColor(rarity?: string) {
  switch (rarity) {
    case "mythical":  return "text-orange-400 border-orange-700 bg-orange-950/30";
    case "fabled":    return "text-purple-400 border-purple-700 bg-purple-950/30";
    case "legendary": return "text-yellow-400 border-yellow-700 bg-yellow-950/30";
    case "rare":      return "text-blue-400 border-blue-700 bg-blue-950/30";
    case "uncommon":  return "text-green-400 border-green-700 bg-green-950/30";
    default:          return "text-slate-300 border-slate-700 bg-slate-800/40";
  }
}

// ─── Party HUD ────────────────────────────────────────────────────────────────

function PartyHud({ party }: { party: PartyMemberInfo[] }) {
  if (!party || party.length === 0) return null;

  return (
    <div className="px-4 py-3 rounded-lg bg-slate-800/40 border border-slate-700/50 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Raid Party</p>
      {party.map(member => {
        const hpPct = Math.max(0, Math.min(100, (member.hp / Math.max(1, member.maxHp)) * 100));
        const isDowned = member.status === "downed";
        return (
          <div key={member.ghostId} className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all",
            isDowned ? "border-red-800/40 bg-red-950/20 opacity-60" : "border-slate-700/40 bg-slate-800/30",
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
                  isDowned ? "border-red-700/50 text-red-400" : "border-slate-700/50 text-slate-500",
                )}>
                  {isDowned ? "Downed" : member.role}
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
                <span className="text-[9px] text-slate-500 font-mono shrink-0">{member.hp}/{member.maxHp}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Phase Panel ──────────────────────────────────────────────────────────────

function PhasePanelComponent({
  runState,
  onFightBoss,
  combatActive,
  activeCombatEnemyId,
}: {
  runState: RaidRunState;
  onFightBoss: (id: string) => void;
  combatActive: boolean;
  activeCombatEnemyId?: string;
}) {
  const { run, raid, currentPhase, scaledBoss, party = [] } = runState;
  if (!run || !raid) return null;

  const bossId = scaledBoss?.id ?? "raid_boss";
  const isActive = activeCombatEnemyId === bossId;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Raid header */}
      <div className="px-4 py-3 rounded-lg bg-red-950/20 border border-red-900/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-serif font-bold text-red-400">{raid.name}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">📍 {raid.zone} · {raid.bossName}</p>
          </div>
          <span className="text-xs font-bold text-red-300">RAID</span>
        </div>
      </div>

      {/* Party HUD */}
      {party.length > 0 && <PartyHud party={party} />}

      {/* Phase progress */}
      <div className="px-4 py-3 rounded-lg bg-slate-800/40 border border-slate-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Phase <span className="text-red-400">{run.currentPhase}</span> / {run.totalPhases}
          </span>
          <span className="text-[10px] text-slate-500">
            {Math.round((run.currentPhase / run.totalPhases) * 100)}% complete
          </span>
        </div>

        {/* Phase track */}
        <div className="flex gap-1">
          {Array.from({ length: run.totalPhases }, (_, i) => {
            const ph = i + 1;
            const done = ph < run.currentPhase;
            const current = ph === run.currentPhase;
            return (
              <div key={ph} className={cn(
                "flex-1 h-2 rounded-full transition-all",
                done    ? "bg-red-700" :
                current ? "bg-red-400 animate-pulse" :
                          "bg-slate-700"
              )} />
            );
          })}
        </div>

        {/* Current phase info */}
        {currentPhase && (
          <div>
            <p className="text-[10px] text-red-400 font-bold">{currentPhase.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{currentPhase.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {currentPhase.abilities.map(ab => (
                <span key={ab} className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/30 border border-red-700/40 text-red-400">
                  {ab}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Boss encounter */}
      <div className="flex-1 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Raid Boss</p>
        {scaledBoss && (
          <button
            onClick={() => onFightBoss(bossId)}
            disabled={combatActive}
            title={combatActive ? "Finish current combat first" : `Fight ${scaledBoss.name}`}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all",
              isActive
                ? "border-red-700/60 bg-red-950/40"
                : "border-red-700/40 bg-red-950/20 hover:bg-red-950/40",
              combatActive && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <div className="text-3xl shrink-0">👑</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-red-300 truncate">{scaledBoss.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-700/50 text-red-400 shrink-0">
                  RAID BOSS
                </span>
              </div>
              <div className="text-[10px] text-slate-500">Lv {scaledBoss.level} · {scaledBoss.maxHp?.toLocaleString()} HP · Phase {run.currentPhase}</div>
            </div>
            {isActive ? (
              <span className="text-[10px] text-red-400 animate-pulse shrink-0">⚔️ Fighting</span>
            ) : (
              <span className="text-[10px] text-slate-600 shrink-0">Fight →</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Raid Complete Modal ──────────────────────────────────────────────────────

function RaidCompleteModal({
  raidName,
  bossName,
  lootIds,
  xpEarned,
  goldEarned,
  party,
  onClaim,
}: {
  raidName: string;
  bossName: string;
  lootIds: string[];
  xpEarned: number;
  goldEarned: number;
  party?: PartyMemberInfo[];
  onClaim: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-red-700/50 rounded-2xl shadow-2xl shadow-red-900/30 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-950 via-red-900/80 to-red-950 px-6 py-5 text-center">
          <div className="text-5xl mb-2">⚔️</div>
          <h2 className="text-2xl font-serif font-bold text-red-300">{bossName} Defeated!</h2>
          <p className="text-sm text-red-600 mt-1">{raidName} conquered by your party!</p>
        </div>

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
            <div className="text-lg font-bold text-slate-300">{lootIds.length}</div>
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

        {/* Loot list (ids only — simplified) */}
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-3">
            Raid Loot ({lootIds.length} items)
          </p>
          {lootIds.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No items earned.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {lootIds.map((id, idx) => {
                // Parse procedural item IDs: proc_zone_slot_rarity_timestamp
                const parts = id.split("_");
                const isProcedural = parts[0] === "proc";
                const VALID_RARITIES = ["common","uncommon","rare","legendary","fabled","mythical"];
                const VALID_SLOTS = ["primary","secondary","head","chest","shoulder","back","wrist","hands","waist","legs","feet","neck","ear","ring"];
                const SLOT_ICONS: Record<string, string> = {
                  primary: "⚔️", secondary: "⚔️",
                  head: "🛡️", chest: "🛡️",
                  material: "✨",
                };
                const rarity = isProcedural
                  ? (parts.find(p => VALID_RARITIES.includes(p)) ?? "legendary")
                  : "legendary";
                const slot = isProcedural
                  ? (parts.find(p => VALID_SLOTS.includes(p)) ?? "gear")
                  : "material";
                const displayName = isProcedural
                  ? `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`
                  : id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const icon = SLOT_ICONS[slot] ?? "💎";
                return (
                  <div key={idx} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border", rarityColor(rarity))}>
                    <span className="text-lg shrink-0">{icon}</span>
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <span className="text-[9px] ml-auto shrink-0 uppercase tracking-widest opacity-70">{rarity}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClaim}
            className="w-full py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-900/30"
          >
            Claim Raid Rewards
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase Complete Banner ────────────────────────────────────────────────────

function PhaseCompleteBanner({
  phase,
  totalPhases,
  isAdvancing,
  onContinue,
}: {
  phase: number;
  totalPhases: number;
  isAdvancing: boolean;
  onContinue: () => void;
}) {
  const isFinal = phase >= totalPhases;
  const [countdown, setCountdown] = React.useState(isFinal ? null : 2);

  React.useEffect(() => {
    if (isFinal || countdown === null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isFinal]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={cn(
        "border rounded-2xl px-10 py-8 text-center shadow-2xl max-w-sm w-full mx-4",
        isFinal ? "bg-red-950/90 border-red-700/60" : "bg-slate-900/90 border-slate-700/60",
      )}>
        <div className="text-5xl mb-3">{isFinal ? "⚔️" : "✅"}</div>
        <p className={cn("text-2xl font-serif font-bold", isFinal ? "text-red-300" : "text-slate-300")}>
          {isFinal ? "Boss Defeated!" : `Phase ${phase} Complete!`}
        </p>
        <p className={cn("text-sm mt-2 mb-6", isFinal ? "text-red-600" : "text-slate-500")}>
          {isFinal
            ? "The raid boss has fallen!"
            : isAdvancing
              ? "Advancing…"
              : `${totalPhases - phase} phase${totalPhases - phase > 1 ? "s" : ""} remain. Advancing in ${countdown ?? 0}s…`}
        </p>
        <button
          onClick={onContinue}
          disabled={isAdvancing}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-all",
            isAdvancing
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : isFinal
                ? "bg-red-700 hover:bg-red-600 text-white"
                : "bg-slate-600 hover:bg-slate-500 text-white",
          )}
        >
          {isAdvancing ? "Loading…" : isFinal ? "⚔️ Claim Raid Rewards!" : "Next Phase →"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaidsRunPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showBanner, setShowBanner] = React.useState(false);
  const [completedRun, setCompletedRun] = React.useState<{
    raidName: string;
    bossName: string;
    lootIds: string[];
    xpEarned: number;
    goldEarned: number;
    party?: PartyMemberInfo[];
  } | null>(null);

  const [autoCombat, setAutoCombat] = React.useState(true);
  const { data: combatState } = useGetCombatState();
  const startCombat = useStartCombat();

  const { data: runState, isLoading } = useQuery<RaidRunState>({
    queryKey: ["raid-run-current"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/raids/run/current"));
      if (!res.ok) throw new Error("Failed to fetch raid run");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const bossId = runState?.scaledBoss?.id ?? "raid_boss";

  // Show the phase-complete / raid-complete banner when bossDefeated is confirmed and combat is idle
  React.useEffect(() => {
    if (!runState?.run?.bossDefeated) return;
    if (!combatState?.active && !completedRun) {
      setShowBanner(true);

      // Auto-advance non-final phases after 2 seconds
      const isFinalPhase = (runState.run?.currentPhase ?? 1) >= (runState.run?.totalPhases ?? 3);
      if (!isFinalPhase) {
        const timer = setTimeout(() => {
          advanceMutation.mutate();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [runState?.run?.bossDefeated, combatState?.active, completedRun]);

  // When combat becomes inactive, immediately refetch runState so bossDefeated is fresh
  // before the auto-combat timer below can fire — prevents re-engaging a dead boss.
  const prevCombatActive = React.useRef(combatState?.active);
  React.useEffect(() => {
    if (prevCombatActive.current && !combatState?.active) {
      queryClient.invalidateQueries({ queryKey: ["raid-run-current"] });
    }
    prevCombatActive.current = combatState?.active;
  }, [combatState?.active, queryClient]);

  const combatEnemy = combatState?.enemy as Enemy | undefined;
  const combatEnemyId = combatState?.active ? combatEnemy?.id : undefined;

  React.useEffect(() => {
    if (combatState?.active || !autoCombat || startCombat.isPending) return;
    if (!runState?.scaledBoss || runState.run?.bossDefeated) return;
    // Use a delay longer than the invalidation + refetch round-trip so bossDefeated
    // is guaranteed fresh before we try to re-engage.
    const timer = setTimeout(() => {
      startCombat.mutate({ data: { enemyId: bossId } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["raid-run-current"] }),
      });
    }, 3500);
    return () => clearTimeout(timer);
  }, [combatState?.active, autoCombat, startCombat.isPending, runState?.run?.bossDefeated]);

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/raids/run/phase-advance"), { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to advance phase");
      return data;
    },
    onSuccess: (data) => {
      setShowBanner(false);
      if (data.completed) {
        setCompletedRun({
          raidName: runState?.raid?.name ?? "Raid",
          bossName: runState?.raid?.bossName ?? "Boss",
          lootIds: data.lootEarned ?? [],
          xpEarned: data.xpEarned ?? 0,
          goldEarned: data.goldEarned ?? 0,
          party: data.party ?? [],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["raid-run-current"] });
      }
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/raids/run/abandon"), { method: "POST" });
      if (!res.ok) throw new Error("Failed to abandon");
      return res.json();
    },
    onSuccess: () => navigate("/dungeons/raids"),
  });

  const handleFightBoss = (enemyId: string) => {
    startCombat.mutate(
      { data: { enemyId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() }) }
    );
  };

  React.useEffect(() => {
    if (!isLoading && runState && !runState.active) {
      navigate("/dungeons/raids");
    }
  }, [isLoading, runState, navigate]);

  if (isLoading || !runState?.active) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-800/60 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (completedRun) {
    return (
      <RaidCompleteModal
        raidName={completedRun.raidName}
        bossName={completedRun.bossName}
        lootIds={completedRun.lootIds}
        xpEarned={completedRun.xpEarned}
        goldEarned={completedRun.goldEarned}
        party={completedRun.party}
        onClaim={() => {
          setCompletedRun(null);
          navigate("/dungeons/raids");
        }}
      />
    );
  }

  const currentPhase = runState.run?.currentPhase ?? 1;
  const totalPhases = runState.run?.totalPhases ?? 3;
  const bossDefeated = runState.run?.bossDefeated ?? false;

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4">
      {showBanner && (
        <PhaseCompleteBanner
          phase={currentPhase}
          totalPhases={totalPhases}
          isAdvancing={advanceMutation.isPending}
          onContinue={() => advanceMutation.mutate()}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-serif font-bold text-red-400">
          {runState.raid?.name ?? "Raid"} — Phase {currentPhase}/{totalPhases}
        </h1>
        <button
          onClick={() => { if (confirm("Abandon this raid run?")) abandonMutation.mutate(); }}
          disabled={abandonMutation.isPending}
          className="text-xs text-slate-600 hover:text-red-400 border border-slate-800 hover:border-red-800/50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Abandon Raid
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Phase panel */}
        <Card className="border-slate-800 bg-slate-900/60 overflow-y-auto">
          <CardContent className="p-4 h-full">
            <PhasePanelComponent
              runState={runState}
              onFightBoss={handleFightBoss}
              combatActive={!!combatState?.active}
              activeCombatEnemyId={combatEnemyId}
            />
          </CardContent>
        </Card>

        {/* Right: Combat HUD */}
        <div className="min-h-0 flex flex-col">
          <CombatHud
            autoCombat={autoCombat}
            onToggleAutoCombat={() => setAutoCombat(v => !v)}
            locationLabel={
              `${runState.raid?.name ?? "Raid"} — Phase ${currentPhase}: ${runState.currentPhase?.name ?? ""}`
            }
            disableAutoEngage={true}
          />
        </div>
      </div>
    </div>
  );
}
