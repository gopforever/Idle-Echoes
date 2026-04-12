/**
 * CombatHud — shared combat experience component
 * Renders the full combat view: arena (HP bars, sprites, floating numbers,
 * status effects, heroic panel, ability bar) + combat log.
 * Used by both the standalone Combat page and the Dungeons run page.
 */
import * as React from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import {
  useGetCharacter,
  useGetCombatState,
  useTickCombat,
  useStartCombat,
  useStopCombat,
  useGetCombatLog,
  useGetAbilities,
  getGetCharacterQueryKey,
  getGetCombatStateQueryKey,
  getGetCombatLogQueryKey,
  getGetCharacterStatsQueryKey,
  getGetInventoryQueryKey,
} from "@workspace/api-client-react";
import { SpriteRenderer } from "@/components/game/sprite-renderer";
import { ItemTooltipContent, isGearType, computeItemGS } from "@/components/game/item-icon";
import type { ItemTooltipData } from "@/components/game/item-icon";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Swords, Zap, Shield, Sparkles, CheckCircle2, Trophy, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { useRealtimeCombatLog } from "@/hooks/use-realtime-world";

// ── Domain Types ──────────────────────────────────────────────────────────────

export interface StatusEffect {
  id: string; name: string; icon: string;
  type: "bleed" | "stun" | "slow" | "frenzy" | "absorb" | "life_drain" | "fear" | "buff" | "dot" | "shield";
  remainingTicks: number; value: number; source: "player" | "enemy";
}

export interface FloatNumber {
  id: string; value: number | string;
  type: "hit" | "crit" | "enemy" | "enemyCrit" | "heal" | "miss" | "resist" | "dot" | "aa";
  side: "player" | "enemy";
}

export interface EnemyAbility {
  id: string; name: string; icon: string; description: string;
  triggerType: "every_n_ticks" | "percent_hp" | "once_at_hp" | "on_hit_proc";
  triggerValue: number; unavoidable?: boolean;
  durationTicks: number; cooldownTicks: number; effectValue: number;
}

export interface EnemyData {
  id: string; name: string; level: number; type: string; maxHp: number;
  isBoss: boolean; xpReward: number; attackRating: number; defenseRating: number;
  mitigation: number; avoidance: number; damageMin: number; damageMax: number;
  goldMin: number; goldMax: number; zone: string;
  abilities?: EnemyAbility[];
  resistances?: Record<string, number>;
  lootTable: Array<{ itemId: string; dropChance: number }>;
}

export interface ClassAbility {
  id: string; name: string; icon?: string; description: string;
  cooldown: number; powerCost: number; damageType?: string;
  damage?: number; autocast: boolean; levelRequired: number;
}

export interface HeroicStep {
  stepNumber: number; description: string; triggerType: string;
}

export interface HeroicStateData {
  active: boolean; completions?: number; stepNumber: number;
  bonusType: string; bonusValue: number; chainDescription?: string;
  chainSteps?: HeroicStep[];
}

export interface FloatEvent {
  value: number;
  type: "hit" | "crit" | "enemy" | "enemyCrit" | "heal" | "miss" | "resist" | "dot";
}

export interface PlayerStatsSnapshot {
  attackRating: number; defenseRating: number;
  mitigation: number; avoidance: number; critChance: number; powerRegen: number;
}

export interface TickResponse {
  playerDamageDealt: number; enemyDamageDealt: number;
  playerDied: boolean; enemyDied: boolean;
  isCrit: boolean; isEnemyCrit: boolean;
  aaProcs: string[]; powerRegen: number; powerAfter: number;
  abilityUsedId?: string;
  floatEvents?: FloatEvent[];
  playerStatsSnapshot?: PlayerStatsSnapshot;
  playerStatusEffects: StatusEffect[]; enemyStatusEffects: StatusEffect[];
  combatState?: { activeAABonuses?: string[]; totalPlayerDamage?: number; combatStartMs?: number | null; fightDps?: number };
  /** Per-tick damage breakdown keyed by source ID */
  damageBySource?: Record<string, number>;
  /** Per-tick heal breakdown keyed by source ID */
  healBySource?: Record<string, number>;
  autoLoopStarted?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const LOG_STYLES: Record<string, { color: string; icon: string }> = {
  playerHit:   { color: "text-green-400",  icon: "⚔️" },
  playerCrit:  { color: "text-yellow-300 font-bold", icon: "💥" },
  enemyHit:    { color: "text-red-400",    icon: "🩸" },
  enemyCrit:   { color: "text-red-300 font-bold", icon: "💢" },
  loot:        { color: "text-amber-400",  icon: "💰" },
  xp:          { color: "text-blue-400",   icon: "✨" },
  playerDied:  { color: "text-red-600 font-bold", icon: "💀" },
  enemyDied:   { color: "text-emerald-400 font-bold", icon: "☠️" },
  abilityUsed: { color: "text-purple-400", icon: "🔮" },
  ability:     { color: "text-purple-400", icon: "✨" },
  heroic:      { color: "text-orange-400 font-bold", icon: "⚡" },
  faction:     { color: "text-sky-400",   icon: "🏛️" },
  heal:        { color: "text-emerald-400", icon: "💚" },
  default:     { color: "text-slate-500",  icon: "·" },
};

export const ENEMY_TYPE_ICONS: Record<string, string> = {
  beast: "🐺", humanoid: "👤", undead: "💀", dragon: "🐉",
  construct: "🤖", elemental: "🔥", demon: "👿", goblin: "👺",
};

const BONUS_ICONS: Record<string, string> = {
  damageBonus: "⚔️", aoeDamage: "💥", healBonus: "💚",
  powerReturn: "⚡", critBonus: "🎯", defenseBonus: "🛡️",
};

const TRIGGER_ICONS: Record<string, string> = {
  crush: "🔨", slash: "⚔️", pierce: "🗡️",
  heat: "🔥", cold: "❄️", divine: "✨", any: "✦",
};

const RESIST_COLORS: Record<string, string> = {
  pierce: "text-yellow-400", slash: "text-orange-400", crush: "text-stone-400",
  heat: "text-red-400", cold: "text-blue-400", divine: "text-purple-400", magic: "text-violet-400",
};

const STATUS_COLORS: Record<string, string> = {
  bleed: "border-red-700 bg-red-950/60 text-red-300",
  stun: "border-yellow-700 bg-yellow-950/60 text-yellow-300",
  slow: "border-cyan-700 bg-cyan-950/60 text-cyan-300",
  frenzy: "border-orange-700 bg-orange-950/60 text-orange-300",
  shield: "border-blue-700 bg-blue-950/60 text-blue-300",
  life_drain: "border-purple-700 bg-purple-950/60 text-purple-300",
  fear: "border-gray-700 bg-gray-950/60 text-gray-300",
  buff: "border-green-700 bg-green-950/60 text-green-300",
  dot: "border-rose-700 bg-rose-950/60 text-rose-300",
  absorb: "border-blue-700 bg-blue-950/60 text-blue-300",
};

const AA_PROC_COLORS: Record<string, { color: string; label: string }> = {
  double_attack:    { color: "text-yellow-300 border-yellow-600 bg-yellow-950/80", label: "DOUBLE ATTACK!" },
  extra_attack:     { color: "text-orange-300 border-orange-600 bg-orange-950/80", label: "EXTRA ATTACK!" },
  crit:             { color: "text-yellow-400 border-yellow-500 bg-yellow-950/80", label: "CRITICAL HIT!" },
  spell_crit:       { color: "text-violet-300 border-violet-600 bg-violet-950/80", label: "SPELL CRIT!" },
  cooldown_reduction: { color: "text-cyan-300 border-cyan-600 bg-cyan-950/80", label: "CD REDUCED!" },
};

const FLOAT_COLORS: Record<string, string> = {
  hit: "text-green-400 text-base font-bold",
  crit: "text-yellow-300 text-xl font-black drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]",
  enemy: "text-red-400 text-base font-bold",
  enemyCrit: "text-red-300 text-xl font-black drop-shadow-[0_0_8px_rgba(252,165,165,0.8)]",
  heal: "text-emerald-400 text-sm font-bold",
  miss: "text-slate-400 text-sm italic",
  resist: "text-blue-400 text-sm font-semibold",
  dot: "text-rose-400 text-sm font-semibold",
  aa: "text-amber-300 text-sm font-bold",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FloatingNumber({ fn, onDone }: { fn: FloatNumber; onDone: () => void }) {
  return (
    <motion.div
      key={fn.id}
      className={cn("absolute pointer-events-none select-none z-50 whitespace-nowrap", FLOAT_COLORS[fn.type])}
      style={{ left: "50%", bottom: "100%", transform: "translateX(-50%)" }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -70, opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      {fn.type === "heal" ? "+" : ""}
      {fn.value}
      {fn.type === "miss" ? "Miss" : fn.type === "resist" ? " Resist" : ""}
    </motion.div>
  );
}

function StatusBadges({ effects }: { effects: StatusEffect[] }) {
  if (!effects.length) return null;
  return (
    <div className="flex flex-wrap gap-1 justify-center mt-1">
      {effects.map(eff => (
        <motion.div
          key={eff.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold", STATUS_COLORS[eff.type] ?? STATUS_COLORS.dot)}
        >
          <span>{eff.icon}</span>
          <span>{eff.name}</span>
          {eff.type === "shield" && eff.value > 0 && <span className="opacity-70">({Math.floor(eff.value)})</span>}
          {eff.remainingTicks < 99 && <span className="opacity-60 ml-0.5">{eff.remainingTicks}t</span>}
        </motion.div>
      ))}
    </div>
  );
}

function AAProcFlash({ procs }: { procs: string[] }) {
  const lastProcs = procs.filter(p => p !== "crit");
  if (!lastProcs.length) return null;
  return (
    <AnimatePresence>
      {lastProcs.map((proc, i) => {
        const info = AA_PROC_COLORS[proc];
        if (!info) return null;
        return (
          <motion.div
            key={`${proc}-${i}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold animate-pulse", info.color)}
          >
            {info.label}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

interface LiveStatPanelProps {
  playerStats?: { attackRating: number; defenseRating: number; mitigation: number; avoidance: number; critChance: number };
  enemy?: EnemyData | null;
  aaBonuses?: string[];
  powerRegen?: number;
}

function LiveStatPanel({ playerStats, enemy, aaBonuses, powerRegen }: LiveStatPanelProps) {
  if (!playerStats && !enemy) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 px-4 py-2 border-t border-slate-800/60 bg-slate-950/80 shrink-0"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Activity className="w-3 h-3 text-blue-400" />
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Live Stats</span>
      </div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-0.5 text-[10px]">
        {playerStats?.attackRating !== undefined && (
          <>
            <div className="text-slate-600">ATK Rating</div>
            <div className={cn("font-bold tabular-nums", enemy && playerStats.attackRating > enemy.defenseRating ? "text-green-400" : "text-orange-400")}>
              {playerStats.attackRating}
            </div>
            <div className="text-slate-600">Enemy DEF</div>
            <div className="text-slate-400 tabular-nums font-bold">{enemy?.defenseRating ?? "—"}</div>
          </>
        )}
        {playerStats?.mitigation !== undefined && (
          <>
            <div className="text-slate-600">Mitigation</div>
            <div className="text-blue-400 font-bold tabular-nums">{playerStats.mitigation}%</div>
            <div className="text-slate-600">Avoidance</div>
            <div className="text-blue-400 font-bold tabular-nums">{playerStats.avoidance}%</div>
          </>
        )}
        {playerStats?.critChance !== undefined && (
          <>
            <div className="text-slate-600">Crit Chance</div>
            <div className="text-yellow-400 font-bold tabular-nums">{playerStats.critChance}%</div>
            <div className="text-slate-600">Pwr Regen</div>
            <div className="text-blue-400 font-bold tabular-nums">+{powerRegen ?? 0}/tick</div>
          </>
        )}
        {enemy?.resistances && (
          <>
            <div className="text-slate-600 col-span-4 mt-0.5">Enemy Resistances</div>
            <div className="col-span-4 flex flex-wrap gap-x-3 gap-y-0">
              {Object.entries(enemy.resistances).filter(([, v]) => (v as number) !== 0).map(([type, val]) => (
                <span key={type} className={cn("tabular-nums", (val as number) < 0 ? "text-red-400" : RESIST_COLORS[type] ?? "text-slate-400")}>
                  {type}: <span className="font-bold">{(val as number) > 0 ? "+" : ""}{String(val)}%</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      {aaBonuses && aaBonuses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {aaBonuses.map(b => (
            <span key={b} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400 font-semibold">{b}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const HEROIC_KEY = ["heroic", "state"];

function fetchHeroicState() {
  return fetch(apiUrl("/api/heroic/state")).then(r => r.json());
}

function HeroicPanel({ combatActive }: { combatActive: boolean }) {
  const { data: heroicData } = useQuery<HeroicStateData>({
    queryKey: HEROIC_KEY,
    queryFn: fetchHeroicState,
    refetchInterval: combatActive ? 2000 : 8000,
  });

  if (!heroicData) return null;

  const steps: HeroicStep[] = heroicData.chainSteps ?? [];
  const active: boolean = heroicData.active;
  const completions: number = heroicData.completions ?? 0;
  const bonusIcon = BONUS_ICONS[heroicData.bonusType] ?? "⚡";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative z-10 px-5 py-3 border-t shrink-0 transition-all duration-500",
          active
            ? "border-orange-700/60 bg-orange-950/30 shadow-[inset_0_1px_0_rgba(251,146,60,0.15)]"
            : "border-slate-800/60 bg-slate-950/30"
        )}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <motion.div animate={active ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Sparkles className={cn("w-3.5 h-3.5", active ? "text-orange-400" : "text-slate-700")} />
            </motion.div>
            <span className={cn("text-xs font-bold uppercase tracking-wide", active ? "text-orange-300" : "text-slate-700")}>
              Heroic Opportunity
            </span>
            {active && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/60 border border-orange-700/60 text-orange-400 font-bold animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {completions > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-500">
                <Trophy className="w-3 h-3" />
                <span className="font-bold">{completions}×</span>
              </div>
            )}
            <div className={cn("flex items-center gap-1 text-[10px]", active ? "text-orange-400" : "text-slate-700")}>
              <span>{bonusIcon}</span>
              <span className="font-semibold capitalize">{heroicData.bonusType?.replace(/([A-Z])/g, " $1")}</span>
              <span className="font-bold">+{heroicData.bonusValue}</span>
            </div>
          </div>
        </div>
        <div className={cn("text-[10px] mb-2 italic", active ? "text-orange-500/70" : "text-slate-700")}>
          {heroicData.chainDescription}
        </div>
        <div className="flex items-center gap-2">
          {steps.map((step: HeroicStep, i: number) => {
            const isDone = active && heroicData.stepNumber > i;
            const isCurrent = active && heroicData.stepNumber === i;
            const triggerIcon = TRIGGER_ICONS[step.triggerType] ?? "✦";
            return (
              <React.Fragment key={i}>
                <div className={cn("flex flex-col items-center gap-1 min-w-0",
                  isDone ? "opacity-100" : isCurrent ? "opacity-100" : active ? "opacity-40" : "opacity-25")}>
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-300",
                      isDone ? "border-emerald-600 bg-emerald-900/50 text-emerald-300"
                        : isCurrent ? "border-orange-500 bg-orange-900/50 text-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.4)]"
                          : "border-slate-700 bg-slate-900 text-slate-600"
                    )}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : triggerIcon}
                  </motion.div>
                  <div className={cn("text-[9px] text-center leading-tight max-w-[64px]",
                    isCurrent ? "text-orange-400 font-semibold" : "text-slate-600")}>
                    {isCurrent ? step.description : step.triggerType}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("flex-1 h-px min-w-[16px] transition-colors duration-500",
                    isDone ? "bg-emerald-700" : isCurrent ? "bg-orange-800" : "bg-slate-800")} />
                )}
              </React.Fragment>
            );
          })}
          <div className="h-px w-4 bg-slate-800" />
          <div className={cn("flex flex-col items-center gap-1",
            active && heroicData.stepNumber >= steps.length ? "opacity-100" : "opacity-30")}>
            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm border-amber-700 bg-amber-950/40 text-amber-400">
              {bonusIcon}
            </div>
            <div className="text-[9px] text-amber-700 font-bold text-center">Reward</div>
          </div>
        </div>
        {!active && combatActive && (
          <div className="mt-2 text-[10px] text-slate-700 italic">Combat triggers opportunities automatically!</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function BossNarrationBanner({ bossId, enemyHpPct }: { bossId: string; enemyHpPct: number }) {
  const [narration, setNarration] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<"intro" | "death">("intro");
  const fetchedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const currentPhase = enemyHpPct <= 5 ? "death" : "intro";
    const key = `${bossId}_${currentPhase}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    setPhase(currentPhase);
    fetch(apiUrl(`/api/combat/boss-narration/${encodeURIComponent(bossId)}?phase=${currentPhase}`))
      .then(r => r.json())
      .then(d => setNarration(d.narration ?? null))
      .catch(() => {});
  }, [bossId, enemyHpPct <= 5]);

  if (!narration) return null;
  return (
    <div className={cn(
      "mt-2 p-2 rounded text-[11px] text-center italic leading-snug transition-all",
      phase === "death"
        ? "bg-red-950/40 border border-red-800/50 text-red-300"
        : "bg-purple-950/30 border border-purple-800/40 text-purple-300"
    )}>
      {phase === "death" ? "💀 " : "🔮 "}{narration}
    </div>
  );
}

export function EnemyCard({ enemy, isActive, isInCombat, onFight, isPending }: {
  enemy: EnemyData; isActive: boolean; isInCombat: boolean;
  onFight: (id: string) => void; isPending: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const hasAbilities = (enemy.abilities?.length ?? 0) > 0;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      isActive ? "border-amber-700/60 bg-amber-950/20" :
        enemy.isBoss ? "border-purple-900/60 bg-purple-950/20 hover:border-purple-700/60" :
          "border-slate-800 bg-slate-900/40 hover:border-slate-700"
    )}>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{ENEMY_TYPE_ICONS[enemy.type] ?? "👤"}</span>
          <div className="min-w-0">
            <div className={cn("text-xs font-bold truncate", enemy.isBoss ? "text-purple-300" : isActive ? "text-amber-300" : "text-slate-200")}>
              {enemy.name}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-600">
              <span>Lv {enemy.level}</span>
              {(() => { const stars = enemyStars(enemy.level, enemy.isBoss); return (
                <span className="text-amber-500/80">
                  {"★".repeat(stars)}
                  {"☆".repeat(Math.max(0, 3 - stars))}
                </span>
              ); })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasAbilities && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-slate-600 hover:text-slate-400 transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <Button
            size="sm"
            onClick={() => onFight(enemy.id)}
            disabled={isInCombat || isPending}
            className={cn(
              "h-6 px-2 text-[10px]",
              enemy.isBoss ? "bg-purple-800 hover:bg-purple-700 text-white border-0" : "bg-red-900/60 hover:bg-red-800/60 text-red-300 border border-red-800"
            )}
          >
            {isActive ? "Active" : "Fight"}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && hasAbilities && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-800/60"
          >
            <div className="p-2 space-y-1.5">
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Special Abilities</div>
              {(enemy.abilities ?? []).map((ability: EnemyAbility) => (
                <div key={ability.id} className="flex items-start gap-2 text-[10px]">
                  <span className="text-base leading-none mt-0.5">{ability.icon}</span>
                  <div>
                    <div className="font-bold text-slate-300">{ability.name}
                      {ability.unavoidable && <span className="ml-1 text-red-500 text-[9px]">UNAVOIDABLE</span>}
                    </div>
                    <div className="text-slate-600">{ability.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function ElapsedTimer({ startMs }: { startMs: number }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <div className="text-[9px] text-slate-600 tabular-nums">
      ⏱ {m}m {String(s).padStart(2, "0")}s
    </div>
  );
}

function enemyStars(level: number, isBoss: boolean): number {
  if (isBoss) return 3;
  if (level >= 40) return 2;
  if (level >= 20) return 1;
  return 0;
}

// ── DPS Meter ─────────────────────────────────────────────────────────────────

/** Human-readable labels for built-in (non-ability) damage sources */
const SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  auto_attack:   { label: "Auto Attack",   icon: "⚔️", color: "bg-green-700/80" },
  double_attack: { label: "Double Attack", icon: "⚡", color: "bg-yellow-700/80" },
  extra_attack:  { label: "Extra Attack",  icon: "⚡", color: "bg-yellow-600/80" },
  divine_wrath:  { label: "Divine Wrath",  icon: "✨", color: "bg-purple-700/80" },
  party_bonus:   { label: "Party Bonus",   icon: "👥", color: "bg-sky-700/80" },
};

/** Human-readable labels for built-in heal sources */
const HEAL_SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  lifesteal:   { label: "Lifesteal",   icon: "🩸", color: "bg-rose-700/80" },
  party_heal:  { label: "Party Heal",  icon: "✨", color: "bg-emerald-700/80" },
  auto_heal:   { label: "Auto-Heal",   icon: "💊", color: "bg-emerald-600/80" },
  hp_regen:    { label: "HP Regen",    icon: "💚", color: "bg-green-700/80" },
  auto_potion: { label: "Auto-Potion", icon: "🧪", color: "bg-teal-700/80" },
};

interface DpsMeterProps {
  damageBySource: Record<string, number>;
  healBySource: Record<string, number>;
  abilities: ClassAbility[];
  combatStartMs?: number | null;
}

function DpsMeter({ damageBySource, healBySource, abilities, combatStartMs }: DpsMeterProps) {
  const dmgEntries = Object.entries(damageBySource);
  const healEntries = Object.entries(healBySource);

  if (dmgEntries.length === 0 && healEntries.length === 0) return null;

  const totalDamage = dmgEntries.reduce((sum, [, v]) => sum + v, 0);
  const totalHeal = healEntries.reduce((sum, [, v]) => sum + v, 0);

  if (totalDamage === 0 && totalHeal === 0) return null;

  const elapsedSec = combatStartMs ? Math.max(1, (Date.now() - combatStartMs) / 1000) : null;

  const sortedDmg = dmgEntries
    .map(([sourceId, damage]) => {
      const builtIn = SOURCE_LABELS[sourceId];
      const ability = abilities.find(a => a.id === sourceId);
      return {
        id: sourceId,
        label: builtIn?.label ?? ability?.name ?? sourceId,
        icon: builtIn?.icon ?? ability?.icon ?? "✨",
        color: builtIn?.color ?? "bg-orange-700/80",
        value: damage,
        pct: totalDamage > 0 ? Math.round((damage / totalDamage) * 100) : 0,
        rate: elapsedSec !== null ? Math.round((damage / elapsedSec) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.value - a.value);

  const sortedHeal = healEntries
    .map(([sourceId, heal]) => {
      const builtIn = HEAL_SOURCE_LABELS[sourceId];
      const ability = abilities.find(a => a.id === sourceId);
      return {
        id: sourceId,
        label: builtIn?.label ?? ability?.name ?? sourceId,
        icon: builtIn?.icon ?? ability?.icon ?? "💚",
        color: builtIn?.color ?? "bg-emerald-700/80",
        value: heal,
        pct: totalHeal > 0 ? Math.round((heal / totalHeal) * 100) : 0,
        rate: elapsedSec !== null ? Math.round((heal / elapsedSec) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 px-4 py-2 border-t border-slate-800/60 bg-slate-950/80 shrink-0"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-orange-400" />
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold flex-1">DPS Meter</span>
        {totalDamage > 0 && (
          <span className="text-[9px] text-orange-400 tabular-nums font-bold">
            {totalDamage.toLocaleString()} dmg
          </span>
        )}
        {totalHeal > 0 && (
          <span className="text-[9px] text-emerald-400 tabular-nums font-bold ml-2">
            +{totalHeal.toLocaleString()} heal
          </span>
        )}
      </div>

      {/* Damage rows */}
      {sortedDmg.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {sortedDmg.map(entry => (
            <div key={entry.id} className="flex items-center gap-1.5">
              <span className="text-[11px] w-4 text-center shrink-0 leading-none">{entry.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300 truncate">{entry.label}</span>
                  <span className="tabular-nums text-slate-400 shrink-0 ml-2">
                    {entry.value.toLocaleString()}
                    {entry.rate !== null && (
                      <span className="text-slate-600 ml-1">{entry.rate}/s</span>
                    )}
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", entry.color)}
                    style={{ width: `${entry.pct}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] text-slate-600 tabular-nums w-7 text-right shrink-0">{entry.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Heal rows */}
      {sortedHeal.length > 0 && (
        <div className={cn("space-y-1", sortedDmg.length > 0 ? "mt-2 pt-1.5 border-t border-slate-800/60" : "mt-1.5")}>
          {sortedHeal.map(entry => (
            <div key={entry.id} className="flex items-center gap-1.5">
              <span className="text-[11px] w-4 text-center shrink-0 leading-none">{entry.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-emerald-300 truncate">{entry.label}</span>
                  <span className="tabular-nums text-emerald-400 shrink-0 ml-2">
                    +{entry.value.toLocaleString()}
                    {entry.rate !== null && (
                      <span className="text-slate-600 ml-1">{entry.rate}/s</span>
                    )}
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", entry.color)}
                    style={{ width: `${entry.pct}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] text-slate-600 tabular-nums w-7 text-right shrink-0">{entry.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main CombatHud ─────────────────────────────────────────────────────────────

export interface CombatHudProps {
  autoCombat: boolean;
  onToggleAutoCombat: () => void;
  /** Label shown in the header (defaults to character zone) */
  locationLabel?: string;
  /**
   * When true, disables the built-in auto-reengage timer so the parent can
   * control which enemy to fight next (used in dungeon run context).
   */
  disableAutoEngage?: boolean;
}

export function CombatHud({ autoCombat, onToggleAutoCombat, locationLabel, disableAutoEngage = false }: CombatHudProps) {
  const queryClient = useQueryClient();
  useRealtimeCombatLog();

  const { data: character } = useGetCharacter();
  const { data: combatState } = useGetCombatState();
  const { data: combatLog } = useGetCombatLog();
  const { data: abilities } = useGetAbilities();

  const tickCombat = useTickCombat();
  const startCombat = useStartCombat();
  const stopCombat = useStopCombat();

  const logScrollRef = React.useRef<HTMLDivElement>(null);
  const [floatingNums, setFloatingNums] = React.useState<FloatNumber[]>([]);
  const fnIdRef = React.useRef(0);
  const [lastAaProcs, setLastAaProcs] = React.useState<string[]>([]);
  const aaProcTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [abilityLastUsedTick, setAbilityLastUsedTick] = React.useState<Record<string, number>>({});
  const [lastTickData, setLastTickData] = React.useState<TickResponse | null>(null);
  const [bossClosingLine, setBossClosingLine] = React.useState<{ text: string; outcome: "playerWon" | "bossWon" } | null>(null);
  const closingLineTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEnemyIdRef = React.useRef<string | null>(null);
  const startCombatMutateRef = React.useRef(startCombat.mutate);
  React.useEffect(() => { startCombatMutateRef.current = startCombat.mutate; });
  const [fightDamageBySource, setFightDamageBySource] = React.useState<Record<string, number>>({});
  const [fightHealBySource, setFightHealBySource] = React.useState<Record<string, number>>({});

  const [localAutoPotions, setLocalAutoPotions] = React.useState<boolean | null>(null);
  const [localMeditating, setLocalMeditating] = React.useState<boolean | null>(null);
  const autoPotions = localAutoPotions !== null ? localAutoPotions : ((character as { autoPotions?: boolean } | undefined)?.autoPotions ?? false);
  const isMeditating = localMeditating !== null ? localMeditating : ((character as { isMeditating?: boolean } | undefined)?.isMeditating ?? false);

  const toggleAutoPotions = () => {
    const next = !autoPotions;
    setLocalAutoPotions(next);
    fetch(apiUrl("/api/character/settings"), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoPotions: next }) })
      .then(r => r.json()).then(d => { if (d?.autoPotions !== undefined) setLocalAutoPotions(d.autoPotions); });
  };

  const toggleMeditate = () => {
    if (combatState?.active) return;
    const next = !isMeditating;
    setLocalMeditating(next);
    fetch(apiUrl("/api/character/settings"), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isMeditating: next }) })
      .then(r => r.json()).then(d => { if (d?.isMeditating !== undefined) setLocalMeditating(d.isMeditating); });
  };

  const playerStats = React.useMemo(() => {
    if (lastTickData?.playerStatsSnapshot) return lastTickData.playerStatsSnapshot;
    if (!character) return undefined;
    const bs = character.baseStats as { stamina?: number; agility?: number; strength?: number; intelligence?: number; wisdom?: number } | null;
    const stamina = bs?.stamina ?? 10;
    const agility = bs?.agility ?? 10;
    const strength = bs?.strength ?? 10;
    const level = character.level ?? 1;
    return {
      attackRating: Math.floor(strength * 2.5 + level * 8),
      defenseRating: Math.floor(agility * 1.8 + stamina * 1.2 + level * 5),
      mitigation: Math.floor(stamina * 0.8 + level * 3),
      avoidance: Math.min(70, Math.floor(agility * 0.5 + level * 0.8) + 5),
      critChance: Math.min(50, Math.floor(agility * 0.15 + level * 0.2)),
      powerRegen: Math.max(1, Math.floor((bs?.wisdom ?? 10) * 0.2)),
    };
  }, [character, lastTickData?.playerStatsSnapshot]);

  const activeEnemy = combatState?.enemy as EnemyData | undefined;

  // Keep lastEnemyIdRef updated while in combat so the auto-reengage effect
  // can re-engage the same enemy after the kill clears combatState.enemy.
  React.useEffect(() => {
    if (activeEnemy?.id) {
      lastEnemyIdRef.current = activeEnemy.id;
    }
  }, [activeEnemy?.id]);

  const addFloat = React.useCallback((value: number | string, type: FloatNumber["type"], side: FloatNumber["side"]) => {
    const id = String(fnIdRef.current++);
    setFloatingNums(prev => [...prev, { id, value, type, side }]);
  }, []);
  const removeFloat = React.useCallback((id: string) => {
    setFloatingNums(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleTickSuccess = React.useCallback((data: TickResponse) => {
    setLastTickData(data);
    if (data.floatEvents && data.floatEvents.length > 0) {
      for (const ev of data.floatEvents) {
        const side: FloatNumber["side"] =
          ev.type === "hit" || ev.type === "crit" || ev.type === "miss" || ev.type === "resist"
            ? "enemy" : "player";
        addFloat(ev.type === "miss" ? "MISS" : ev.value, ev.type, side);
      }
    } else {
      if (data.playerDamageDealt > 0) addFloat(data.playerDamageDealt, data.isCrit ? "crit" : "hit", "enemy");
      if (data.enemyDamageDealt > 0) addFloat(data.enemyDamageDealt, data.isEnemyCrit ? "enemyCrit" : "enemy", "player");
    }
    if (data.playerDied) addFloat("💀", "miss", "player");

    // Accumulate per-source damage and healing into session-level totals (persistent across enemies)
    if (data.damageBySource) {
      setFightDamageBySource(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.damageBySource!)) {
          next[k] = (next[k] ?? 0) + v;
        }
        return next;
      });
    }
    if (data.healBySource) {
      setFightHealBySource(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.healBySource!)) {
          next[k] = (next[k] ?? 0) + v;
        }
        return next;
      });
    }

    // Boss closing line: read directly from tick response (synchronous delivery, no polling race)
    if ((data.enemyDied || data.playerDied) && (data as { bossClosingLine?: string }).bossClosingLine) {
      const line = (data as unknown as { bossClosingLine: string; bossClosingOutcome: "playerWon" | "bossWon" }).bossClosingLine;
      const outcome = (data as unknown as { bossClosingOutcome: "playerWon" | "bossWon" }).bossClosingOutcome;
      setBossClosingLine({ text: line, outcome: outcome ?? (data.enemyDied ? "playerWon" : "bossWon") });
      if (closingLineTimerRef.current) clearTimeout(closingLineTimerRef.current);
      closingLineTimerRef.current = setTimeout(() => setBossClosingLine(null), 8000);
    }

    if (data.abilityUsedId && data.combatState) {
      const tick = (data.combatState as { tick?: number }).tick ?? 0;
      setAbilityLastUsedTick(prev => ({ ...prev, [data.abilityUsedId!]: tick }));
    }
    if (data.aaProcs && data.aaProcs.length > 0) {
      setLastAaProcs(data.aaProcs);
      if (aaProcTimerRef.current) clearTimeout(aaProcTimerRef.current);
      aaProcTimerRef.current = setTimeout(() => setLastAaProcs([]), 1500);
    }
    queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCombatLogQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
    queryClient.invalidateQueries({ queryKey: HEROIC_KEY });
  }, [queryClient, addFloat]);

  // Track whether the user has manually scrolled away from the bottom.
  // Using a ref (not state) avoids re-renders on scroll.
  const isLockedToBottom = React.useRef(true);

  // Listen to scroll events to update the lock state
  React.useEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      isLockedToBottom.current = dist < 50;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll only when locked to bottom
  React.useEffect(() => {
    const el = logScrollRef.current;
    if (!el || !isLockedToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [combatLog]);

  // Closing lines are now delivered synchronously in the tick response (bossClosingLine field).
  // No log-polling fallback needed — the handleTickSuccess callback sets bossClosingLine directly.

  // Tick loop
  React.useEffect(() => {
    if (!combatState?.active || tickCombat.isPending) return;
    const interval = setInterval(() => {
      tickCombat.mutate(undefined, { onSuccess: (data) => handleTickSuccess(data as unknown as TickResponse) });
    }, 2000);
    return () => clearInterval(interval);
  }, [combatState?.active, tickCombat.isPending, handleTickSuccess]);

  // Auto-reengage: re-fight same enemy (disabled in dungeon context where parent controls enemies)
  React.useEffect(() => {
    if (disableAutoEngage) return;
    if (!autoCombat || combatState?.active || startCombat.isPending) return;
    // Use current enemy or fall back to last known enemy (enemy is cleared post-kill)
    const enemyId = (combatState.enemy as EnemyData | undefined)?.id ?? lastEnemyIdRef.current;
    if (!enemyId) return;
    const timer = setTimeout(() => {
      // Re-validate inside the callback in case state changed during the delay
      const id = (combatState.enemy as EnemyData | undefined)?.id ?? lastEnemyIdRef.current;
      if (!id) return;
      startCombatMutateRef.current({ data: { enemyId: id } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() }),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [disableAutoEngage, autoCombat, combatState?.active, combatState?.enemy, startCombat.isPending, queryClient]);

  const handleStop = () => {
    stopCombat.mutate(undefined, {
      onSuccess: () => {
        setLastTickData(null);
        setLastAaProcs([]);
        setFightDamageBySource({});
        setFightHealBySource({});
        queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() });
      },
    });
  };

  if (!character || !combatState) return <div className="h-full flex items-center justify-center text-slate-600 text-sm">Loading combat…</div>;

  const playerHpPct = Math.max(0, Math.min(100, (combatState.playerCurrentHp / Math.max(1, character.maxHealth)) * 100));
  const enemyHpPct = activeEnemy ? Math.max(0, Math.min(100, (combatState.enemyCurrentHp / Math.max(1, activeEnemy.maxHp)) * 100)) : 0;
  // When idle (not in active combat), character.power is authoritative — ignore any stale lastTickData
  const playerPowerPct = combatState.active
    ? Math.min(100, ((lastTickData?.powerAfter ?? combatState.playerCurrentPower) / Math.max(1, character.maxPower)) * 100)
    : Math.min(100, (character.power / Math.max(1, character.maxPower)) * 100);
  const currentPower = combatState.active
    ? (lastTickData?.powerAfter ?? Math.floor(combatState.playerCurrentPower))
    : Math.floor(character.power);

  const rawCS = combatState as typeof combatState & { playerStatusEffects?: StatusEffect[]; enemyStatusEffects?: StatusEffect[] };
  const playerStatusEffects: StatusEffect[] = lastTickData?.playerStatusEffects ?? rawCS.playerStatusEffects ?? [];
  const enemyStatusEffects: StatusEffect[] = lastTickData?.enemyStatusEffects ?? rawCS.enemyStatusEffects ?? [];
  const activeAABonuses: string[] = lastTickData?.combatState?.activeAABonuses ?? [];

  // DPS — use server-computed fightDps directly (server computes fresh on every state response)
  // lastTickData.combatState is freshest; polled combatState as fallback
  const fightDps = lastTickData?.combatState?.fightDps ?? combatState.fightDps ?? 0;
  const fightTotalDamage = lastTickData?.combatState?.totalPlayerDamage ?? combatState.totalPlayerDamage ?? 0;

  const label = locationLabel ?? character.zone;

  return (
    <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden">
      {/* ── Arena Card ── */}
      <Card className="shrink-0 bg-slate-950/80 border-slate-800 overflow-hidden relative flex flex-col max-h-[calc(100%-6rem)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,30,50,0.8),rgba(5,5,15,1))]" />

        {/* Header */}
        <div className="relative z-10 px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span className="font-serif font-bold text-slate-200 text-sm">{label}</span>
            {combatState.active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-800 bg-red-950/50 text-red-400 animate-pulse font-bold">COMBAT</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1"><AAProcFlash procs={lastAaProcs} /></div>
            <label className="flex items-center gap-1 cursor-pointer" title="Auto-Combat: automatically re-engage enemies">
              <Switch checked={autoCombat} onCheckedChange={onToggleAutoCombat} id="hud-auto-combat" />
              <span className="text-xs font-medium text-slate-300">Auto</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer" title="Auto-Potions: use health potions from inventory when HP drops below 40%">
              <Switch checked={autoPotions} onCheckedChange={toggleAutoPotions} id="hud-auto-potions" />
              <span className="text-xs font-medium text-slate-400">🧪</span>
            </label>
            {combatState.active ? (
              <Button size="sm" variant="destructive" onClick={handleStop} className="h-6 text-[10px] px-2">Flee</Button>
            ) : (
              <div className="text-[10px] text-slate-600 px-2 py-0.5 rounded border border-slate-800">Idle</div>
            )}
          </div>
        </div>

        {/* Battle field */}
        <div className="relative z-10 flex items-center justify-around px-4 py-3 shrink-0">
          {/* Player side */}
          <div className="flex flex-col items-center gap-1.5 w-36">
            <div className="relative">
              <div className={cn("relative p-2 rounded-xl border border-slate-800/60 bg-slate-900/30", combatState.active && "shadow-[0_0_20px_rgba(239,68,68,0.12)]")}>
                <SpriteRenderer characterClass={character.class} size="combat" className={combatState.active ? "animate-pulse" : ""} />
              </div>
              <AnimatePresence>
                {floatingNums.filter(f => f.side === "player").map(fn => (
                  <FloatingNumber key={fn.id} fn={fn} onDone={() => removeFloat(fn.id)} />
                ))}
              </AnimatePresence>
            </div>
            <div className="w-full space-y-1">
              <div className="text-center text-[11px] font-bold text-slate-200 truncate">{character.name}</div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="text-red-400">❤ HP</span>
                  <span className="tabular-nums">{Math.max(0, Math.floor(combatState.playerCurrentHp))}/{character.maxHealth}</span>
                </div>
                <Progress value={playerHpPct} className="h-1.5 bg-slate-900 rounded-full"
                  indicatorClassName={cn("rounded-full transition-all", playerHpPct < 25 ? "bg-red-600 animate-pulse" : playerHpPct < 50 ? "bg-orange-500" : "bg-green-600")} />
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="text-blue-400">⚡ Power</span>
                  <span className="tabular-nums">{currentPower}/{character.maxPower}</span>
                </div>
                <Progress value={playerPowerPct} className="h-1 bg-slate-900 rounded-full" indicatorClassName="bg-blue-600 rounded-full transition-all" />
              </div>
              <AnimatePresence><StatusBadges effects={playerStatusEffects} /></AnimatePresence>
              {!combatState.active && (
                <button
                  onClick={toggleMeditate}
                  className={cn(
                    "w-full mt-1 h-5 text-[9px] rounded border transition-colors",
                    isMeditating
                      ? "border-blue-700 bg-blue-950/60 text-blue-300 animate-pulse"
                      : "border-slate-800 bg-slate-900/40 text-slate-600 hover:text-blue-400 hover:border-blue-800"
                  )}
                  title="Meditate: regenerate HP/Power while out of combat"
                >
                  {isMeditating ? "🧘 Meditating" : "🧘 Meditate"}
                </button>
              )}
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="text-2xl font-black text-slate-800 font-serif italic select-none">VS</div>
            {combatState.active && <div className="text-[10px] text-slate-600 animate-pulse">Tick {combatState.tick}</div>}
            {(lastTickData?.powerRegen ?? 0) > 0 && (
              <motion.div key={combatState.tick} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] text-blue-500 font-semibold">
                +{lastTickData!.powerRegen} pwr
              </motion.div>
            )}
            {combatState.active && (
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <div className="text-[11px] font-bold text-orange-400 tabular-nums">⚔ {fightDps} DPS</div>
                {fightTotalDamage > 0 && (
                  <div className="text-[9px] text-slate-600 tabular-nums">{Math.round(fightTotalDamage).toLocaleString()} total</div>
                )}
                {(character.killCount ?? 0) > 0 && (
                  <div className="text-[9px] text-slate-500 tabular-nums">☠ {(character.killCount ?? 0).toLocaleString()} kills</div>
                )}
                {(combatState as any).combatStartMs && (
                  <ElapsedTimer startMs={(combatState as any).combatStartMs} />
                )}
              </div>
            )}
          </div>

          {/* Enemy side */}
          <div className="flex flex-col items-center gap-1.5 w-36">
            {activeEnemy ? (
              <>
                <div className="relative">
                  <div className={cn("relative p-2 rounded-xl border bg-slate-900/30",
                    activeEnemy.isBoss ? "border-purple-800/60 shadow-[0_0_20px_rgba(168,85,247,0.12)]" : "border-slate-800/60"
                  )}>
                    <SpriteRenderer enemyType={activeEnemy.type} size="combat" type="enemy" className={combatState.active ? "animate-pulse" : "opacity-70"} />
                    {activeEnemy.isBoss && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded-full bg-purple-900 border border-purple-700 text-purple-300 font-bold whitespace-nowrap">BOSS</div>
                    )}
                  </div>
                  <AnimatePresence>
                    {floatingNums.filter(f => f.side === "enemy").map(fn => (
                      <FloatingNumber key={fn.id} fn={fn} onDone={() => removeFloat(fn.id)} />
                    ))}
                  </AnimatePresence>
                </div>
                <div className="w-full space-y-1">
                  <div className="text-center text-[11px] font-bold text-red-300 truncate">{activeEnemy.name}</div>
                  <div className="text-center text-[10px] text-slate-500">
                    Lv {activeEnemy.level} · {ENEMY_TYPE_ICONS[activeEnemy.type] ?? "👤"} {activeEnemy.type}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span className="text-red-400">HP</span>
                      <span className="tabular-nums">{Math.max(0, Math.floor(combatState.enemyCurrentHp))}/{activeEnemy.maxHp}</span>
                    </div>
                    <Progress value={enemyHpPct} className="h-1.5 bg-slate-900 rounded-full" indicatorClassName="bg-red-700 rounded-full transition-all" />
                  </div>
                  <AnimatePresence><StatusBadges effects={enemyStatusEffects} /></AnimatePresence>
                </div>
              </>
            ) : (
              <div className="text-slate-700 italic text-xs text-center">
                <div className="text-3xl mb-1 opacity-20">⚔️</div>
                <p>Select an enemy</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable secondary content — live stats, DPS, heroic, ability bar */}
        <div className="relative z-10 overflow-y-auto flex-1 min-h-0">

        {/* Boss narration banner — full-width strip below the battle field */}
        {activeEnemy?.isBoss && (
          <div className="relative z-10 px-4 pb-1 shrink-0">
            <BossNarrationBanner bossId={activeEnemy.id} enemyHpPct={enemyHpPct} />
          </div>
        )}

        {/* Live stat panel */}
        {combatState.active && (
          <LiveStatPanel
            playerStats={playerStats}
            enemy={activeEnemy}
            aaBonuses={activeAABonuses}
            powerRegen={lastTickData?.powerRegen}
          />
        )}

        {/* DPS Meter — shows per-source damage and heal breakdown across the session */}
        {(Object.keys(fightDamageBySource).length > 0 || Object.keys(fightHealBySource).length > 0) && (
          <DpsMeter
            damageBySource={fightDamageBySource}
            healBySource={fightHealBySource}
            abilities={(abilities as ClassAbility[]) ?? []}
            combatStartMs={(combatState as any).combatStartMs as number | null | undefined}
          />
        )}

        {/* Boss "Last Words" closing line banner */}
        <AnimatePresence>
          {bossClosingLine && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "relative z-10 mx-3 mb-2 px-4 py-2.5 rounded-lg border text-sm text-center font-serif italic",
                bossClosingLine.outcome === "playerWon"
                  ? "border-amber-800/60 bg-amber-950/40 text-amber-300"
                  : "border-red-900/60 bg-red-950/40 text-red-300"
              )}
            >
              <div className="text-[10px] uppercase tracking-widest font-sans font-bold mb-1 opacity-60">
                {bossClosingLine.outcome === "playerWon" ? "☠️ Last Words" : "💬 Boss speaks"}
              </div>
              "{bossClosingLine.text}"
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heroic Panel */}
        <HeroicPanel combatActive={!!combatState.active} />

        {/* Ability bar */}
        {abilities && abilities.length > 0 && (
          <div className="relative z-10 px-4 py-2.5 border-t border-slate-800/60 bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Class Abilities</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(() => {
                const charLevel = character?.level ?? 1;
                const allAbilities = abilities as ClassAbility[];
                const unlocked = allAbilities.filter(a => a.levelRequired <= charLevel);
                const nextLocked = allAbilities.filter(a => a.levelRequired > charLevel).sort((a, b) => a.levelRequired - b.levelRequired)[0];
                return (
                  <>
                    {unlocked.map((ability) => {
                      const currentTick = (combatState.active && (lastTickData?.combatState as { tick?: number } | undefined)?.tick) ? (lastTickData!.combatState as { tick?: number }).tick! : 0;
                      const lastUsedTick = abilityLastUsedTick[ability.id];
                      const cooldownTicks = Math.max(1, Math.ceil(ability.cooldown / 2));
                      const ticksElapsed = lastUsedTick !== undefined ? currentTick - lastUsedTick : cooldownTicks;
                      const cdProgress = Math.min(1, ticksElapsed / cooldownTicks);
                      const isOnCooldown = combatState.active && cdProgress < 1 && lastUsedTick !== undefined;
                      const R = 10; const CIRC = 2 * Math.PI * R;
                      const sweepOffset = CIRC * cdProgress;
                      return (
                        <div
                          key={ability.id}
                          className={cn(
                            "group relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all cursor-default",
                            isOnCooldown
                              ? "border-purple-600/60 bg-purple-950/30 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                              : "border-slate-800 bg-slate-900/60 hover:border-purple-800/60"
                          )}
                          title={`${ability.name}: ${ability.description}`}
                        >
                          {isOnCooldown && (
                            <svg className="absolute top-0.5 right-0.5 w-4 h-4 -rotate-90 opacity-80 pointer-events-none" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r={R} fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="3" />
                              <circle cx="12" cy="12" r={R} fill="none" stroke="rgb(168,85,247)" strokeWidth="3"
                                strokeDasharray={`${CIRC}`} strokeDashoffset={sweepOffset} strokeLinecap="round"
                                style={{ transition: "stroke-dashoffset 0.4s linear" }} />
                            </svg>
                          )}
                          <span className="text-sm">{ability.icon ?? "✨"}</span>
                          <div>
                            <div className="text-[10px] font-medium text-slate-300 leading-none">{ability.name}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] text-slate-600">{ability.cooldown}s</span>
                              {ability.powerCost > 0 && <span className="text-[9px] text-blue-600">{ability.powerCost}⚡</span>}
                              {isOnCooldown && <span className="text-[9px] text-purple-500">{Math.max(0, cooldownTicks - ticksElapsed)}t</span>}
                            </div>
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-44 p-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-xs text-slate-400">
                            <div className="font-bold text-slate-200 mb-1">{ability.name}</div>
                            <div>{ability.description}</div>
                            {ability.powerCost > 0 && <div className="text-blue-400 mt-1">Power: {ability.powerCost}</div>}
                          </div>
                        </div>
                      );
                    })}
                    {nextLocked && (
                      <div
                        key={nextLocked.id}
                        className="group relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-800/50 bg-slate-900/30 opacity-40 cursor-default"
                        title={`Unlocks at level ${nextLocked.levelRequired}: ${nextLocked.name}`}
                      >
                        <span className="text-sm grayscale">{nextLocked.icon ?? "✨"}</span>
                        <div>
                          <div className="text-[10px] font-medium text-slate-500 leading-none">{nextLocked.name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-amber-700">🔒 Lvl {nextLocked.levelRequired}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-44 p-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-xs text-slate-400">
                          <div className="font-bold text-slate-400 mb-1">🔒 {nextLocked.name}</div>
                          <div>{nextLocked.description}</div>
                          <div className="text-amber-600 mt-1">Unlocks at level {nextLocked.levelRequired}</div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        </div>{/* end scrollable secondary content */}
      </Card>

      {/* ── Combat Log ── */}
      <Card className="flex-1 min-h-0 flex flex-col bg-card/40 border-slate-800 overflow-hidden mt-3">
        <div className="py-2.5 px-4 border-b border-slate-800/50 bg-slate-900/40 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-400">Combat Log</span>
          </div>
          <span className="text-[10px] text-slate-700">{combatLog?.length ?? 0} entries</span>
        </div>
        <div ref={logScrollRef} className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-0.5">
            <AnimatePresence initial={false}>
              {combatLog?.map((entry) => {
                const style = LOG_STYLES[entry.type] ?? LOG_STYLES.default;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn("flex gap-1.5 items-start py-0.5 text-xs border-b border-slate-900/50 last:border-0", style.color)}
                  >
                    <span className="shrink-0 text-[11px] w-4 text-center">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-700 mr-1 text-[10px] tabular-nums">
                        [{new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
                      </span>
                      {entry.type === "loot" && entry.itemData ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default underline decoration-dotted decoration-amber-600/50">
                              {entry.message}
                              {isGearType((entry.itemData.type as string) ?? "") && computeItemGS(Number(entry.itemData.level ?? 0), String(entry.itemData.rarity ?? "common"), String(entry.itemData.slot ?? "")) > 0 && (
                                <span className="ml-1 text-[9px] px-1 py-0.5 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                                  GS {computeItemGS(Number(entry.itemData.level ?? 0), String(entry.itemData.rarity ?? "common"), String(entry.itemData.slot ?? ""))}
                                </span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="p-0 border-slate-700 bg-transparent shadow-xl">
                            <ItemTooltipContent item={entry.itemData as unknown as ItemTooltipData} />
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: entry.message }} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {(!combatLog || combatLog.length === 0) && (
              <div className="text-center text-slate-700 text-xs py-8">No combat activity yet</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
