import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { useGetCharacterStats, useGetCombatState, DUNGEON_GS_GATE } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SpriteImage, ItemTooltipContent } from "@/components/game/item-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ExamineDialog, type ExamineItem } from "@/components/game/examine-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClassAbility {
  id: string; name: string; description: string;
  type: string; damageType?: string; powerCost: number; cooldown: number;
  damage?: number; healAmount?: number; effect?: string;
  icon: string; levelRequired: number;
}

interface Profile {
  id: string; name: string; race: string; class: string; archetype: string;
  alignment: string; level: number; xp: number; xpToNextLevel: number;
  aaPoints: number; aaPointsSpent: number; gold: number;
  health: number; maxHealth: number; power: number; maxPower: number;
  baseStats: Record<string, number>; gear: Record<string, EquippedItem | null>;
  zone: string; activeMount: string | null;
  autoLoop: boolean; autoHeal: boolean; isMeditating: boolean;
  totalPlayTime: number; killCount: number; deathCount: number;
  totalGoldEarned: number;
  createdAt: string;
  raceDef: {
    id: string; name: string; description: string; lore: string;
    bonuses: Record<string, number>; racialAbility: string;
    racialAbilityDesc: string; startingZone: string; allowedAlignments: string[];
  };
  classDef: {
    id: string; name: string; archetype: string; subclassOf?: string;
    description: string; lore: string; primaryStat: string; armorType: string;
    role: string; statBonuses: Record<string, number>; abilities: ClassAbility[];
  };
  statBreakdown: Record<string, { base: number; race: number; class: number; total: number }>;
  heroicCompletions: number;
}

interface EquippedItem {
  id: string; name: string; type: string; slot: string; rarity: string;
  spriteId?: string; stats?: Record<string, number>; description?: string;
  level?: number; sellPrice?: number; zone?: string;
}

interface Skill {
  id: string; name: string; description: string; category: string;
  level: number; xp: number; xpToNextLevel: number; icon: string; maxLevel: number;
}

interface Faction {
  id: string; name: string; description: string; standing: number;
  standingTitle: string; perks: string[]; zone: string;
}

interface Achievement { id: string; name: string; description?: string; completed: boolean; icon?: string; }

interface DungeonKillStat {
  id: string; name: string; zone: string; isRaid: boolean; totalFloors: number;
  runsStarted: number;
  normalKills: number; miniBossKills: number; mainBossKills: number;
  completions: number; firstClearAt: string | null;
}

interface ComputedStats {
  attackRating: number; defenseRating: number; mitigation: number; avoidance: number;
  critChance: number; critBonus: number; haste: number; dps: number;
  totalPower: number; spellCritChance: number; spellCritBonus: number;
  weaponDamageMin: number; weaponDamageMax: number; mountSpeedBonus: number;
}

interface AANode {
  id: string; name: string; description: string; maxRank: number;
  pointsPerRank: number; effect: string; effectValue: number;
  icon: string; currentRank: number;
}

interface AATab { id: string; name: string; nodes: AANode[]; }

interface AATree {
  totalPoints: number; spentPoints: number; availablePoints: number; tabs: AATab[];
}

// ─── Static lookup tables ────────────────────────────────────────────────────

const ARCHETYPE_STYLE: Record<string, string> = {
  Fighter: "text-red-400 border-red-800/60 bg-red-950/30",
  Scout:   "text-green-400 border-green-800/60 bg-green-950/30",
  Mage:    "text-blue-400 border-blue-800/60 bg-blue-950/30",
  Priest:  "text-amber-400 border-amber-800/60 bg-amber-950/30",
};
const ROLE_STYLE: Record<string, string> = {
  tank:    "text-red-300 bg-red-950/40 border-red-800/50",
  dps:     "text-orange-300 bg-orange-950/40 border-orange-800/50",
  healer:  "text-green-300 bg-green-950/40 border-green-800/50",
  support: "text-purple-300 bg-purple-950/40 border-purple-800/50",
  hybrid:  "text-cyan-300 bg-cyan-950/40 border-cyan-800/50",
};
const ARMOR_STYLE: Record<string, string> = {
  plate:   "text-slate-200",
  chain:   "text-yellow-400",
  leather: "text-amber-600",
  cloth:   "text-blue-300",
};
const ALIGN_STYLE: Record<string, string> = {
  Qeynos:   "text-sky-400 border-sky-800/50",
  Freeport: "text-red-400 border-red-800/50",
  Neutral:  "text-slate-400 border-slate-700/50",
};
const ABILITY_TYPE_STYLE: Record<string, string> = {
  combatArt: "text-orange-300 border-orange-800/50 bg-orange-950/20",
  spell:     "text-blue-300 border-blue-800/50 bg-blue-950/20",
  heroicArt: "text-amber-300 border-amber-800/50 bg-amber-950/20",
  proc:      "text-purple-300 border-purple-800/50 bg-purple-950/20",
};
const STAT_LABELS: Record<string, string> = {
  strength: "Strength", agility: "Agility", stamina: "Stamina",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};
const STAT_ICONS: Record<string, string> = {
  strength: "⚔️", agility: "🏃", stamina: "❤️",
  intelligence: "🔮", wisdom: "✨", charisma: "💫",
};
const STAT_DRIVEN: Record<string, string> = {
  strength:     "Melee damage, carry weight, attack rating",
  agility:      "Avoidance, ranged damage, haste",
  stamina:      "Max health, physical endurance",
  intelligence: "Spell damage, max power, magic skills",
  wisdom:       "Healing power, max power, divine skills",
  charisma:     "Faction standing, merchant prices, bard songs",
};
const SKILL_ICONS: Record<string, string> = {
  sword: "⚔️", shield: "🛡️", wand: "🪄", bow: "🏹",
  pickaxe: "⛏️", axe: "🪓", fish: "🎣", herb: "🌿",
  hammer: "🔨", anvil: "⚒️", needle: "🧵", flask: "⚗️",
  book: "📖", lute: "🎵", scroll: "📜", pot: "🫙",
  lotus: "🧘",
  dual_swords: "⚔️", parry: "🗡️", lightning: "⚡", paw: "🐾",
  mushroom: "🍄", hide: "🦌", map: "🗺️", shovel: "🪛",
  enchant: "✨", saw: "🪚", leather: "🧥",
  bandage: "🩹", eye: "👁️", coin: "🪙", rune: "🔷",
};
const CAT_LABELS: Record<string, string> = {
  combat: "⚔️ Combat", gathering: "⛏️ Gathering", crafting: "🔨 Crafting", support: "✨ Support",
};

// Naked base values before any race/class bonuses
const BASE_NAKED: Record<string, number> = {
  strength: 15, agility: 12, stamina: 14, intelligence: 10, wisdom: 10, charisma: 8,
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtTime(seconds: number) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SignedBonus({ val }: { val: number }) {
  if (val === 0) return <span className="text-slate-500">—</span>;
  if (val > 0)   return <span className="text-green-400">+{val}</span>;
  return <span className="text-red-400">{val}</span>;
}

function standingColor(title: string) {
  if (title === "Ally")         return "text-green-400";
  if (title === "Amiable")      return "text-emerald-400";
  if (title === "Kindly")       return "text-lime-400";
  if (title === "Warmly")       return "text-yellow-400";
  if (title === "Indifferent")  return "text-slate-400";
  if (title === "Apprehensive") return "text-orange-400";
  if (title === "Dubious")      return "text-orange-500";
  if (title === "Threatening")  return "text-red-400";
  if (title === "Hostile")      return "text-red-600";
  return "text-slate-400";
}
function standingBarColor(standing: number) {
  if (standing >= 5000)  return "bg-green-500";
  if (standing >= 0)     return "bg-yellow-500";
  if (standing >= -5000) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// ─── Character Portrait ───────────────────────────────────────────────────────

const ARMOR_SLOTS_PORTRAIT = ["chest", "shoulder", "head", "hands", "legs", "feet", "back"] as const;

function CharacterPortrait({
  armorType: classArmorType,
  gear,
}: {
  armorType: string;
  gear: Record<string, EquippedItem | null>;
}) {
  const [portrait, setPortrait] = React.useState<string | null>(null);
  const [detectedArmorType, setDetectedArmorType] = React.useState(classArmorType);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Changes only when equipped armor slot IDs change — triggers portrait re-fetch.
  const gearTierSignature = React.useMemo(() => {
    return ARMOR_SLOTS_PORTRAIT.map(s => gear[s]?.id ?? "").join("|");
  }, [gear]);

  const fetchPortrait = React.useCallback(async (bust = false) => {
    setLoading(true);
    setError(false);
    try {
      if (bust) {
        // Clear the server-side lore_cache entry so a new portrait is generated
        await fetch(apiUrl("/api/character/portrait/refresh"), { method: "POST" });
      }
      const res = await fetch(apiUrl("/api/character/portrait"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { portrait?: string; armorType?: string };
      if (data.portrait) setPortrait(data.portrait);
      // Use the server-detected armor tier (derived from actual equipped gear)
      if (data.armorType) setDetectedArmorType(data.armorType);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever equipped armor tier changes (new chest/helm/legs equipped)
  React.useEffect(() => {
    fetchPortrait();
  }, [fetchPortrait, gearTierSignature]);

  // Frame color varies by detected armor tier — visual feedback for gear type
  const frameColor = detectedArmorType === "plate"   ? "border-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.25)]"
    : detectedArmorType === "chain"   ? "border-yellow-600 shadow-[0_0_16px_rgba(202,138,4,0.25)]"
    : detectedArmorType === "leather" ? "border-amber-700 shadow-[0_0_14px_rgba(180,83,9,0.2)]"
    :                                   "border-blue-700  shadow-[0_0_14px_rgba(37,99,235,0.2)]";

  const placeholderEmoji = detectedArmorType === "plate"   ? "⚔️"
    : detectedArmorType === "chain"   ? "🪖"
    : detectedArmorType === "leather" ? "🏹"
    :                                   "🔮";

  return (
    <div className="relative shrink-0 group">
      <div className={cn(
        "w-24 h-24 rounded-lg border-2 overflow-hidden bg-slate-800/80 relative",
        frameColor
      )}>
        {/* Loading overlay — shown while AI portrait is generating */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/80 z-10">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[8px] text-amber-500/80">Painting...</span>
          </div>
        )}

        {/* Portrait image (base64 data-URL from the AI generation + DB cache) */}
        {portrait && !loading && (
          <img
            src={portrait}
            alt="Character portrait"
            className="w-full h-full object-cover object-top"
          />
        )}

        {/* Placeholder shown before portrait loads or on error */}
        {!portrait && !loading && (
          <div className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-1",
            error ? "text-red-400/60" : "text-slate-500"
          )}>
            <span className="text-4xl">{placeholderEmoji}</span>
            {error && <span className="text-[8px]">Tap 🔄</span>}
          </div>
        )}

        {/* Vignette overlay on loaded portrait */}
        {portrait && !loading && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Refresh/regenerate button — hover/focus to reveal (touch-accessible) */}
      <button
        onClick={() => fetchPortrait(true)}
        disabled={loading}
        title="Regenerate portrait (clears cache)"
        aria-label="Regenerate portrait"
        className={cn(
          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border border-slate-600",
          "bg-slate-800 text-[10px] flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 focus:opacity-100 touch:opacity-100 transition-opacity",
          "hover:bg-slate-700 focus:bg-slate-700 disabled:opacity-30",
          "shadow-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
        )}
      >
        🔄
      </button>
    </div>
  );
}

function IdentityHeader({
  p,
  isMeditating,
  regenPerTick,
  onToggleMeditate,
  isInCombat,
  medLoading,
}: {
  p: Profile;
  isMeditating: boolean;
  regenPerTick: { hp: number; pwr: number } | null;
  onToggleMeditate: () => void;
  isInCombat: boolean;
  medLoading: boolean;
}) {
  const xpPct  = Math.min(100, (p.xp / Math.max(1, p.xpToNextLevel)) * 100);
  const hpPct  = Math.min(100, (p.health / Math.max(1, p.maxHealth)) * 100);
  const pwrPct = Math.min(100, (p.power / Math.max(1, p.maxPower)) * 100);
  const kdr    = (p.deathCount ?? 0) > 0 ? ((p.killCount ?? 0) / (p.deathCount ?? 0)).toFixed(2) : (p.killCount ?? 0).toFixed(2);
  const archStyle = ARCHETYPE_STYLE[p.archetype] ?? "text-slate-300 border-slate-700";

  return (
    <Card className="border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-amber-950/20">
      <CardContent className="p-5">
        <div className="flex flex-wrap gap-6 items-start">
          {/* Portrait */}
          <CharacterPortrait armorType={p.classDef.armorType} gear={p.gear} />

          {/* Identity + bars */}
          <div className="flex-1 min-w-[180px]">
            <h2 className="text-2xl font-serif font-bold text-amber-400">{p.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 bg-slate-800/40">
                {p.raceDef.name}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", archStyle)}>
                {p.classDef.subclassOf ? `${p.classDef.subclassOf} → ` : ""}{p.class}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", ALIGN_STYLE[p.alignment] ?? "text-slate-400 border-slate-700")}>
                {p.alignment === "Qeynos" ? "🛡️" : p.alignment === "Freeport" ? "⚔️" : "⚖️"} {p.alignment}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">
                📍 {p.zone}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { label: `Level ${p.level} XP`, cur: p.xp, max: p.xpToNextLevel, pct: xpPct, bar: "bg-amber-600" },
                { label: "❤️ Health", cur: p.health, max: p.maxHealth, pct: hpPct, bar: "bg-green-600" },
                { label: "🔮 Power",  cur: p.power,  max: p.maxPower,  pct: pwrPct, bar: "bg-blue-600" },
              ].map(({ label, cur, max, pct, bar }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                    <span>{label}</span>
                    <span>{cur.toLocaleString()} / {max.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Meditate button — only shown when out of combat */}
            {!isInCombat && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={onToggleMeditate}
                  disabled={medLoading}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                    isMeditating
                      ? "border-teal-600/70 bg-teal-950/50 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)] animate-pulse"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-teal-700/50 hover:text-teal-400",
                    medLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className={cn("text-sm", isMeditating && "animate-pulse")}>🧘</span>
                  {isMeditating ? "Meditating…" : "Meditate"}
                </button>
                {isMeditating && regenPerTick && (
                  <span className="text-[10px] text-teal-400/70">
                    +{regenPerTick.hp} HP / +{regenPerTick.pwr} Power per tick
                  </span>
                )}
                {!isMeditating && regenPerTick && (
                  <span className="text-[10px] text-slate-600">
                    Passive: +{regenPerTick.hp} HP / +{regenPerTick.pwr} Pwr / tick
                  </span>
                )}
              </div>
            )}
            {isInCombat && (
              <div className="mt-3 text-[10px] text-slate-600 italic">Meditation paused — in combat</div>
            )}
          </div>

          {/* Quick stats — includes K/D and playtime */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Level",    val: String(p.level),             color: "text-slate-200" },
              { label: "Gold",     val: p.gold.toLocaleString(),      color: "text-amber-400" },
              { label: "AA",       val: String(p.aaPoints ?? 0),           color: "text-purple-400" },
              { label: "Kills",    val: (p.killCount ?? 0).toLocaleString(), color: "text-red-400" },
              { label: "Deaths",   val: (p.deathCount ?? 0).toLocaleString(),color: "text-slate-500" },
              { label: "K/D",      val: kdr,                          color: "text-orange-300" },
              { label: "Playtime", val: fmtTime(p.totalPlayTime ?? 0),     color: "text-slate-300" },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center min-w-[48px]">
                <div className={cn("text-lg font-bold", color)}>{val}</div>
                <div className="text-[10px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaperDoll({
  gear,
  onUnequip,
  onExamine,
}: {
  gear: Record<string, EquippedItem | null>;
  onUnequip?: (slot: string) => void;
  onExamine?: (item: ExamineItem) => void;
}) {
  const leftSlots  = ["earLeft","head","neck","shoulder","chest","back"];
  const rightSlots = ["earRight","wrist","hands","waist","legs","feet"];
  const SLOT_LABELS: Record<string, string> = {
    earLeft: "Ear L", earRight: "Ear R", head: "Head", neck: "Neck",
    shoulder: "Shoulder", chest: "Chest", back: "Back",
    wrist: "Wrist", hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet",
    ringLeft: "Ring L", ringRight: "Ring R", primary: "Primary",
    secondary: "Offhand", ranged: "Ranged", charm: "Charm",
  };

  const SLOT_TO_INV: Record<string, string> = {
    earLeft: "ear", earRight: "ear", head: "head", neck: "neck",
    shoulder: "shoulder", chest: "chest", back: "back", wrist: "wrist",
    hands: "hands", waist: "waist", legs: "legs", feet: "feet",
    ringLeft: "ring", ringRight: "ring", primary: "primary",
    secondary: "secondary", ranged: "ranged", charm: "charm",
  };

  const RARITY_BORDER_CLASS: Record<string, string> = {
    common: "border-slate-600", uncommon: "border-green-600 shadow-[0_0_6px_rgba(34,197,94,0.3)]",
    rare: "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]",
    legendary: "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]",
    fabled: "border-orange-500 shadow-[0_0_12px_rgba(234,88,12,0.45)]",
    mythical: "border-red-500 shadow-[0_0_14px_rgba(220,38,38,0.5)]",
  };

  const SlotBox = ({ slot }: { slot: string }) => {
    const item = gear[slot];
    const rarity = item?.rarity ?? "common";
    const borderClass = item ? (RARITY_BORDER_CLASS[rarity] ?? RARITY_BORDER_CLASS.common) : "border-slate-700/40";

    const box = (
      <div className={cn(
        "w-14 h-10 rounded border-2 flex items-center justify-center transition-colors overflow-hidden",
        item
          ? cn("bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-pointer hover:brightness-110", borderClass)
          : "bg-slate-800/10 border-dashed"
      )}>
        {item ? (
          <SpriteImage
            spriteId={item.spriteId}
            slot={SLOT_TO_INV[slot] ?? slot}
            type={item.type}
            size={28}
          />
        ) : <span className="text-slate-700 text-xs">—</span>}
      </div>
    );

    if (!item) return box;

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <Tooltip>
            <TooltipTrigger asChild>{box}</TooltipTrigger>
            <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl z-50">
              <ItemTooltipContent item={{ ...item, slot: SLOT_TO_INV[slot] ?? slot }} />
            </TooltipContent>
          </Tooltip>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
          <ContextMenuItem
            className="cursor-pointer focus:bg-slate-800 focus:text-slate-100"
            onSelect={() => onUnequip?.(slot)}
          >
            Unequip
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-slate-700/50" />
          <ContextMenuItem
            className="cursor-pointer focus:bg-slate-800 focus:text-slate-100"
            onSelect={() => onExamine?.({ ...item, slot: SLOT_TO_INV[slot] ?? slot })}
          >
            Examine
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="relative flex justify-center items-start py-4 min-h-[480px]">
      <div className="relative w-full max-w-[420px] h-[460px]">
        {/* Silhouette */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg viewBox="0 0 100 200" className="h-[360px] w-[180px] fill-slate-700/25">
            <ellipse cx="50" cy="18" rx="12" ry="14" />
            <path d="M30 40 Q25 55 22 90 L35 90 L38 65 L62 65 L65 90 L78 90 Q75 55 70 40 Z" />
            <rect x="38" y="90" width="24" height="50" rx="2" />
            <path d="M38 140 L44 140 L42 195 L30 195 Z" />
            <path d="M62 140 L56 140 L58 195 L70 195 Z" />
          </svg>
        </div>

        {/* Left slots */}
        <div className="absolute left-0 top-0 flex flex-col gap-2">
          {leftSlots.map(slot => (
            <div key={slot} className="flex items-center gap-1">
              <SlotBox slot={slot} />
              <span className="text-[9px] text-slate-600 w-12">{SLOT_LABELS[slot]}</span>
            </div>
          ))}
        </div>

        {/* Right slots */}
        <div className="absolute right-0 top-0 flex flex-col gap-2 items-end">
          {rightSlots.map(slot => (
            <div key={slot} className="flex items-center gap-1">
              <span className="text-[9px] text-slate-600 w-12 text-right">{SLOT_LABELS[slot]}</span>
              <SlotBox slot={slot} />
            </div>
          ))}
        </div>

        {/* Bottom — weapons + rings */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
          {["ringLeft","primary","secondary","ringRight"].map(slot => (
            <div key={slot} className="flex flex-col items-center gap-0.5">
              <SlotBox slot={slot} />
              <span className="text-[9px] text-slate-600">{SLOT_LABELS[slot]}</span>
            </div>
          ))}
        </div>

        {/* Extra */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6">
          {["ranged","charm"].map(slot => (
            <div key={slot} className="flex flex-col items-center gap-0.5">
              <SlotBox slot={slot} />
              <span className="text-[9px] text-slate-600">{SLOT_LABELS[slot]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBreakdownRow({ stat, p }: { stat: string; p: Profile }) {
  // Formula per task: base = total - race bonus - class bonus
  const total      = p.baseStats[stat] ?? 0;
  const raceBonus  = p.raceDef.bonuses[stat] ?? 0;
  const classBonus = p.classDef.statBonuses[stat] ?? 0;
  const base       = total - raceBonus - classBonus; // derived base (includes gear)

  // For the segmented bar we treat positive/negative bonuses separately
  const MAX_BAR = 50;
  const clamp = (v: number) => Math.min(100, Math.max(0, (Math.abs(v) / MAX_BAR) * 100));
  const basePct  = clamp(base);
  const racePct  = clamp(raceBonus);
  const classPct = clamp(classBonus);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{STAT_ICONS[stat]}</span>
          <div>
            <span className="text-sm font-medium text-slate-200">{STAT_LABELS[stat]}</span>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{STAT_DRIVEN[stat]}</p>
          </div>
        </div>
        <span className="text-lg font-bold text-amber-300">{total}</span>
      </div>

      {/* Source labels */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500">
          Base <span className="text-slate-300">{base}</span>
        </span>
        {raceBonus !== 0 && (
          <span className="text-slate-500">Race <SignedBonus val={raceBonus} /></span>
        )}
        {classBonus !== 0 && (
          <span className="text-slate-500">Class <SignedBonus val={classBonus} /></span>
        )}
      </div>

      {/* Segmented source bar */}
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex gap-px">
        {/* Base segment (slate) */}
        <div className="h-full rounded-l-full bg-slate-500 transition-all" style={{ width: `${basePct}%` }} />
        {/* Race segment (green positive / red negative) */}
        {raceBonus !== 0 && (
          <div
            className={cn("h-full transition-all", raceBonus > 0 ? "bg-green-500" : "bg-red-500")}
            style={{ width: `${racePct}%` }}
          />
        )}
        {/* Class segment (blue positive / orange negative) */}
        {classBonus !== 0 && (
          <div
            className={cn("h-full rounded-r-full transition-all", classBonus > 0 ? "bg-blue-500" : "bg-orange-500")}
            style={{ width: `${classPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function AbilityCard({ ab }: { ab: ClassAbility }) {
  const typeStyle = ABILITY_TYPE_STYLE[ab.type] ?? "text-slate-300 border-slate-700 bg-slate-800/20";
  const typeLabel = ab.type === "combatArt" ? "Combat Art" : ab.type === "heroicArt" ? "Heroic Art" : ab.type === "proc" ? "Proc" : "Spell";
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
      <div className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center rounded-md bg-slate-800/60 border border-slate-700">
        {ab.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="font-medium text-slate-200 text-sm">{ab.name}</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", typeStyle)}>{typeLabel}</span>
          {ab.damageType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-800/20 capitalize">
              {ab.damageType}
            </span>
          )}
          {ab.levelRequired > 1 && (
            <span className="text-[10px] text-slate-600 ml-auto">Lvl {ab.levelRequired}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-1.5">{ab.description}</p>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span>💧 {ab.powerCost} power</span>
          <span>⏱️ {ab.cooldown}s cooldown</span>
          {ab.damage && <span>💥 {ab.damage}% weapon dmg</span>}
          {ab.healAmount && <span>💚 Heals {(ab.healAmount * 100).toFixed(0)}% HP</span>}
          {ab.effect && <span>✨ {ab.effect.replace(/_/g, " ")}</span>}
        </div>
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const pct = Math.min(100, (skill.xp / Math.max(1, skill.xpToNextLevel)) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span>{SKILL_ICONS[skill.icon] ?? "📊"}</span> {skill.name}
        </span>
        <span className="text-slate-400">Lv {skill.level} <span className="text-slate-600">/ {skill.maxLevel}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-400 transition-all"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-600 leading-none">{skill.description}</p>
    </div>
  );
}

// ─── AI Chronicle Card ────────────────────────────────────────────────────────

function AiChronicleCard({ characterId }: { characterId: string }) {
  const [lore, setLore] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState(false);

  const fetchLore = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/character/lore"));
      const data = await res.json();
      setLore(data.lore ?? null);
    } catch {
      setLore("The chronicles of this hero are lost to time...");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  return (
    <Card className="border-amber-900/40 bg-gradient-to-br from-amber-950/20 to-slate-900/80">
      <CardHeader className="border-b border-amber-900/30 bg-amber-950/10 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-amber-400">✨ AI Chronicle — Your Legend</CardTitle>
          <button
            onClick={fetchLore}
            disabled={loading}
            className="text-xs px-3 py-1 rounded border border-amber-700/50 text-amber-500 hover:bg-amber-900/20 transition-colors disabled:opacity-50"
          >
            {loading ? "Writing..." : fetched ? "Refresh" : "Generate Chronicle"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {!fetched && !loading && (
          <div className="text-center py-4 text-slate-500 text-sm">
            <div className="text-2xl mb-2">📜</div>
            Click "Generate Chronicle" to have the AI Game Master write your hero's legend
          </div>
        )}
        {loading && (
          <div className="space-y-2">
            <div className="h-4 bg-amber-950/40 rounded animate-pulse w-full" />
            <div className="h-4 bg-amber-950/40 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-amber-950/40 rounded animate-pulse w-4/6" />
          </div>
        )}
        {lore && !loading && (
          <div className="space-y-4 border-l-2 border-amber-700/50 pl-4">
            {lore.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-sm text-amber-200/80 leading-relaxed italic">
                {para.trim()}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────


export default function CharacterSheet() {
  const queryClient = useQueryClient();
  const profileQ = useQuery<Profile>({
    queryKey: ["character", "profile"],
    queryFn: () => fetch(apiUrl("/api/character/profile")).then(r => r.json()),
    refetchInterval: 10_000,
  });
  const statsQ = useGetCharacterStats();
  const skillsQ = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: () => fetch(apiUrl("/api/skills")).then(r => r.json()),
    refetchInterval: 10_000,
  });
  const factionsQ = useQuery<Faction[]>({
    queryKey: ["factions"],
    queryFn: () => fetch(apiUrl("/api/factions")).then(r => r.json()),
    refetchInterval: 30_000,
  });
  const achQ = useQuery<Achievement[]>({
    queryKey: ["achievements"],
    queryFn: () => fetch(apiUrl("/api/achievements")).then(r => r.json()),
    refetchInterval: 30_000,
  });
  const aaQ = useQuery<AATree>({
    queryKey: ["aa", "tree"],
    queryFn: () => fetch(apiUrl("/api/aa/tree")).then(r => r.json()),
    refetchInterval: 30_000,
  });
  const dungeonStatsQ = useQuery<DungeonKillStat[]>({
    queryKey: ["dungeons", "kill-stats"],
    queryFn: () => fetch(apiUrl("/api/dungeons/kill-stats")).then(r => r.json()),
    refetchInterval: 30_000,
  });
  const { data: combatState } = useGetCombatState();
  const isInCombat = !!(combatState as { active?: boolean } | undefined)?.active;

  // Local meditation state (optimistic) — initialized from server once profile loads
  const [localMeditating, setLocalMeditating] = React.useState<boolean | null>(null);

  const isMeditating = localMeditating !== null ? localMeditating : (profileQ.data?.isMeditating ?? false);

  // Derive regen-per-tick purely from cached profile stats + meditation skill level
  // (no side-effectful API call needed — formula mirrors server logic)
  const regenPerTick = React.useMemo<{ hp: number; pwr: number } | null>(() => {
    if (!profileQ.data) return null;
    const bs = (profileQ.data.baseStats ?? {}) as { wisdom?: number; stamina?: number; intelligence?: number };
    const wisdom = bs.wisdom ?? 10;
    const stamina = bs.stamina ?? 14;
    const intelligence = bs.intelligence ?? 10;
    const baseHpPerSec = 0.5 + wisdom * 0.03 + stamina * 0.02;
    const basePwrPerSec = 0.3 + intelligence * 0.03 + wisdom * 0.02;
    const medLevel = (Array.isArray(skillsQ.data) ? skillsQ.data : []).find((s: Skill) => s.id === "meditation")?.level ?? 1;
    const medMult = isMeditating ? (1 + medLevel * 0.05) : 1;
    return {
      hp:  parseFloat((baseHpPerSec  * medMult * 3).toFixed(1)),
      pwr: parseFloat((basePwrPerSec * medMult * 3).toFixed(1)),
    };
  }, [profileQ.data, skillsQ.data, isMeditating]);

  // Invalidate skills when meditating to keep XP display fresh
  React.useEffect(() => {
    if (!isMeditating) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    }, 6000);
    return () => clearInterval(id);
  }, [isMeditating, queryClient]);

  // Mutation to toggle meditate
  const toggleMed = useMutation({
    mutationFn: (val: boolean) =>
      fetch(apiUrl("/api/character/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMeditating: val }),
      }).then(r => r.json()),
    onMutate: (val) => {
      const previous = localMeditating !== null ? localMeditating : (profileQ.data?.isMeditating ?? false);
      setLocalMeditating(val);
      return { previous };
    },
    onError: (_err, _val, context) => {
      if (context) setLocalMeditating(context.previous);
    },
    onSuccess: (data) => {
      // Reconcile local state from server truth to prevent drift
      if (data?.isMeditating !== undefined) setLocalMeditating(data.isMeditating);
      queryClient.invalidateQueries({ queryKey: ["character", "profile"] });
    },
  });

  // When combat starts, cancel meditation
  React.useEffect(() => {
    if (isInCombat && isMeditating) {
      toggleMed.mutate(false);
    }
  }, [isInCombat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Examine dialog state
  const [examineItem, setExamineItem] = React.useState<ExamineItem | null>(null);
  const [examineOpen, setExamineOpen] = React.useState(false);

  const handleExamine = (item: ExamineItem) => {
    setExamineItem(item);
    setExamineOpen(true);
  };

  const handleUnequipFromPaperdoll = async (slot: string) => {
    try {
      await fetch(apiUrl("/api/inventory/unequip"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      queryClient.invalidateQueries({ queryKey: ["character", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["character", "stats"] });
    } catch (_e) { /* silent */ }
  };

  if (profileQ.isLoading || statsQ.isLoading) {
    return <Skeleton className="h-[700px] w-full rounded-xl" />;
  }
  if (!profileQ.data) return null;

  const p = profileQ.data;
  const stats = statsQ.data as (ComputedStats & { gearScore?: number }) | undefined;

  const skillsList: Skill[] = Array.isArray(skillsQ.data) ? skillsQ.data : [];
  const factions: Faction[] = Array.isArray(factionsQ.data) ? factionsQ.data : [];
  const achievements: Achievement[] = Array.isArray(achQ.data) ? achQ.data : [];
  const aaTree: AATree | undefined = aaQ.data;

  const dungeonKillStats: DungeonKillStat[] = Array.isArray(dungeonStatsQ.data) ? dungeonStatsQ.data : [];

  const earnedCount = achievements.filter(a => a.completed).length;
  const kdr = (p.deathCount ?? 0) > 0 ? ((p.killCount ?? 0) / (p.deathCount ?? 0)).toFixed(2) : (p.killCount ?? 0).toFixed(2);
  const totalAA = (p.aaPoints ?? 0) + (p.aaPointsSpent ?? 0);

  const skillsByCategory: Record<string, Skill[]> = {};
  for (const s of skillsList) {
    if (!skillsByCategory[s.category]) skillsByCategory[s.category] = [];
    skillsByCategory[s.category].push(s);
  }

  // All invested AA nodes across all tabs
  const investedNodes: { tab: string; node: AANode }[] = [];
  for (const tab of aaTree?.tabs ?? []) {
    for (const node of tab.nodes) {
      if (node.currentRank > 0) {
        investedNodes.push({ tab: tab.name, node });
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <IdentityHeader
        p={p}
        isMeditating={isMeditating}
        regenPerTick={regenPerTick}
        onToggleMeditate={() => toggleMed.mutate(!isMeditating)}
        isInCombat={isInCombat}
        medLoading={toggleMed.isPending}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-5 bg-slate-900/60 border border-slate-800 h-10">
          {[
            { value: "overview",    label: "Overview" },
            { value: "attributes",  label: "Attributes" },
            { value: "lore",        label: "Lore" },
            { value: "progression", label: "Progression" },
            { value: "profile",     label: "Profile" },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Paper Doll */}
            <Card className="lg:col-span-2 bg-card/40 backdrop-blur border-slate-800">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-slate-200">Equipment — Paper Doll</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <PaperDoll
                  gear={p.gear}
                  onUnequip={handleUnequipFromPaperdoll}
                  onExamine={handleExamine}
                />
              </CardContent>
            </Card>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Quick combat stats */}
              {stats && (
                <Card className="bg-card/40 border-slate-800">
                  <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                    <CardTitle className="text-sm text-slate-200">⚡ At a Glance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {/* Gear Score badge row */}
                    {stats.gearScore !== undefined && (() => {
                      const gs = stats.gearScore ?? 0;
                      const gsBadge = gs >= DUNGEON_GS_GATE.mythical
                        ? "bg-orange-950/40 border-orange-700/60 text-orange-300"
                        : gs >= DUNGEON_GS_GATE.legendary
                          ? "bg-blue-950/40 border-blue-700/60 text-blue-300"
                          : gs >= DUNGEON_GS_GATE.expert
                            ? "bg-green-950/40 border-green-700/60 text-green-300"
                            : "bg-slate-800/40 border-slate-700/50 text-slate-400";
                      return (
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500">Gear Score</span>
                          <span className={cn("font-bold px-2 py-0.5 rounded border text-xs font-mono", gsBadge)}>
                            {gs}
                          </span>
                        </div>
                      );
                    })()}
                    {[
                      { label: "DPS",          val: stats.dps.toFixed(1),                     color: "text-red-400" },
                      { label: "Attack",        val: String(stats.attackRating),               color: "text-orange-400" },
                      { label: "Defense",       val: String(stats.defenseRating),              color: "text-blue-400" },
                      { label: "Mitigation",    val: `${stats.mitigation}%`,                  color: "text-slate-300" },
                      { label: "Avoidance",     val: `${stats.avoidance}%`,                   color: "text-slate-300" },
                      { label: "Crit Chance",   val: `${stats.critChance}%`,                  color: "text-amber-400" },
                      { label: "Haste",         val: `${stats.haste}%`,                       color: "text-green-400" },
                      { label: "Weapon Dmg",    val: `${stats.weaponDamageMin}–${stats.weaponDamageMax}`, color: "text-orange-300" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-slate-500">{label}</span>
                        <span className={cn("font-medium", color)}>{val}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Mount */}
              <Card className="bg-card/40 border-slate-800">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                  <CardTitle className="text-sm text-slate-200">🐴 Mount</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {p.activeMount ? (
                    <div className="text-sm text-slate-200">{p.activeMount.replace(/_/g, " ")}</div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">No mount equipped — visit the Mounts page</div>
                  )}
                </CardContent>
              </Card>

              {/* Class Summary */}
              <Card className="bg-card/40 border-slate-800">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                  <CardTitle className="text-sm text-slate-200">🧙 Class Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {[
                    { label: "Archetype",  val: p.archetype,           valClass: ARCHETYPE_STYLE[p.archetype]?.split(" ")[0] ?? "text-slate-300" },
                    { label: "Subclass of",val: p.classDef.subclassOf ?? "—", valClass: "text-slate-300" },
                    { label: "Armor",      val: p.classDef.armorType,  valClass: cn("capitalize", ARMOR_STYLE[p.classDef.armorType] ?? "text-slate-300") },
                    { label: "Primary",    val: p.classDef.primaryStat,valClass: "text-amber-300 capitalize" },
                  ].map(({ label, val, valClass }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-500">{label}</span>
                      <span className={valClass}>{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Role</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", ROLE_STYLE[p.classDef.role] ?? "text-slate-300 border-slate-700")}>
                      {p.classDef.role}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── ATTRIBUTES ───────────────────────────────────────────────────── */}
        <TabsContent value="attributes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Primary Stats — frontend-computed breakdown */}
            <Card className="bg-card/40 border-slate-800">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-slate-200">Primary Attributes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {["strength","agility","stamina","intelligence","wisdom","charisma"].map(stat => (
                  <StatBreakdownRow key={stat} stat={stat} p={p} />
                ))}
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-500 mb-1">Bar legend</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-2 rounded bg-slate-500" />
                    <span className="text-slate-500">Base</span>
                    <span>= total − race − class</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-2 rounded bg-green-500" />
                    <span className="text-green-400">Race +</span>
                    <span>/ <span className="inline-block w-3 h-2 rounded bg-red-500 align-middle" /> <span className="text-red-400">Race −</span></span>
                    <span>from {p.raceDef.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-2 rounded bg-blue-500" />
                    <span className="text-blue-400">Class +</span>
                    <span>/ <span className="inline-block w-3 h-2 rounded bg-orange-500 align-middle" /> <span className="text-orange-400">Class −</span></span>
                    <span>from {p.class}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Derived combat stats */}
            <div className="space-y-4">
              {stats && (
                <>
                  <Card className="bg-card/40 border-slate-800">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                      <CardTitle className="text-sm text-red-400">⚔️ Offense</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {[
                        { label: "Attack Rating",  val: stats.attackRating },
                        { label: "DPS",            val: stats.dps.toFixed(1) },
                        { label: "Weapon Damage",  val: `${stats.weaponDamageMin}–${stats.weaponDamageMax}` },
                        { label: "Crit Chance",    val: `${stats.critChance}%` },
                        { label: "Crit Bonus",     val: `${stats.critBonus}%` },
                        { label: "Haste",          val: `${stats.haste}%` },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium text-orange-300">{val}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/40 border-slate-800">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                      <CardTitle className="text-sm text-blue-400">🛡️ Defense</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {[
                        { label: "Defense Rating", val: stats.defenseRating },
                        { label: "Mitigation",     val: `${stats.mitigation}%` },
                        { label: "Avoidance",      val: `${stats.avoidance}%` },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium text-blue-300">{val}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/40 border-slate-800">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                      <CardTitle className="text-sm text-purple-400">🔮 Spells & Vitals</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {[
                        { label: "Spell Crit Chance", val: `${stats.spellCritChance}%` },
                        { label: "Spell Crit Bonus",  val: `${stats.spellCritBonus}%` },
                        { label: "Total Power",       val: stats.totalPower.toLocaleString() },
                        { label: "Max Health",        val: p.maxHealth.toLocaleString() },
                        { label: "Max Power",         val: p.maxPower.toLocaleString() },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium text-purple-300">{val}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── LORE ─────────────────────────────────────────────────────────── */}
        <TabsContent value="lore">
          <div className="space-y-4 mt-4">
            {/* AI Chronicle */}
            <AiChronicleCard characterId={p.id} />

            {/* Race Card */}
            <Card className="border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-800/20">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-amber-300">🌍 Race: {p.raceDef.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Portrait + meta */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-xl border-2 border-amber-800/50 bg-amber-950/20 flex items-center justify-center text-5xl shadow-inner">
                      🧙
                    </div>
                    <div className="text-center space-y-1">
                      <div className="font-serif font-bold text-amber-400">{p.raceDef.name}</div>
                      <div className="text-xs text-slate-400 italic">{p.raceDef.description}</div>
                    </div>
                    <div className="w-full space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Starting Zone</span>
                        <span className="text-slate-300">{p.raceDef.startingZone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Alignments</span>
                        <span className="text-slate-300">{p.raceDef.allowedAlignments.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lore + racial ability + stat grid */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lore</h4>
                      <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-amber-800/40 pl-3">
                        {p.raceDef.lore}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Racial Ability</h4>
                      <div className="p-3 rounded-lg border border-amber-800/40 bg-amber-950/20 flex gap-3">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-md bg-amber-900/30 border border-amber-700/40 shrink-0">
                          ✨
                        </div>
                        <div>
                          <div className="font-medium text-amber-300">{p.raceDef.racialAbility}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{p.raceDef.racialAbilityDesc}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Racial Stat Bonuses</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {["strength","agility","stamina","intelligence","wisdom","charisma"].map(stat => (
                          <div key={stat} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-slate-800/40 border border-slate-700/40">
                            <span className="text-slate-500 uppercase text-[10px]">{stat.slice(0, 3)}</span>
                            <SignedBonus val={p.raceDef.bonuses[stat] ?? 0} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Card */}
            <Card className={cn("border-slate-800 bg-gradient-to-br from-slate-900/80",
              p.archetype === "Fighter" ? "to-red-950/10" :
              p.archetype === "Scout"   ? "to-green-950/10" :
              p.archetype === "Mage"    ? "to-blue-950/10" : "to-amber-950/10")}>
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200">⚔️ Class: {p.classDef.name}</CardTitle>
                  <div className="flex gap-1.5">
                    <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", ROLE_STYLE[p.classDef.role] ?? "text-slate-300 border-slate-700")}>
                      {p.classDef.role}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded border capitalize border-slate-700 bg-slate-800/20", ARMOR_STYLE[p.classDef.armorType] ?? "text-slate-300")}>
                      {p.classDef.armorType}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Archetype chain */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn("px-2 py-0.5 rounded border text-xs", ARCHETYPE_STYLE[p.archetype] ?? "border-slate-700 text-slate-300")}>
                    {p.archetype}
                  </span>
                  {p.classDef.subclassOf && (
                    <>
                      <span className="text-slate-600">→</span>
                      <span className="px-2 py-0.5 rounded border border-slate-700 text-xs text-slate-300 bg-slate-800/30">
                        {p.classDef.subclassOf}
                      </span>
                    </>
                  )}
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded border border-amber-700/60 text-xs text-amber-300 bg-amber-950/20 font-medium">
                    {p.classDef.name}
                  </span>
                </div>

                {/* Lore */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lore</h4>
                  <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                    {p.classDef.lore}
                  </p>
                </div>

                {/* Class stat bonuses */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class Stat Bonuses</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(p.classDef.statBonuses).map(([stat, val]) => (
                      <div key={stat} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-slate-800/40 border border-slate-700/40">
                        <span className="text-slate-500 uppercase text-[10px]">{stat.slice(0, 3)}</span>
                        <SignedBonus val={val as number} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scrollable ability list */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Class Abilities</h4>
                  <div className="h-[360px] overflow-y-scroll space-y-2 pr-1 scrollbar-thin">
                    {p.classDef.abilities.map(ab => (
                      <AbilityCard key={ab.id} ab={ab} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PROGRESSION ──────────────────────────────────────────────────── */}
        <TabsContent value="progression">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Skills */}
            <div className="space-y-4">
              {Object.entries(skillsByCategory).map(([cat, skills]) => (
                <Card key={cat} className="bg-card/40 border-slate-800">
                  <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                    <CardTitle className="text-sm text-slate-200">{CAT_LABELS[cat] ?? cat}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {skills.map(s => <SkillRow key={s.id} skill={s} />)}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right: AA + Achievements + Factions */}
            <div className="space-y-4">
              {/* AA + Achievement summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/40 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{p.aaPoints ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-1">AA Points</div>
                    <div className="text-xs text-slate-600 mt-1">{p.aaPointsSpent ?? 0} spent · {totalAA} total</div>
                    {totalAA > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-purple-600" style={{ width: `${((p.aaPointsSpent ?? 0) / Math.max(1, totalAA)) * 100}%` }} />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-card/40 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">{earnedCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Achievements</div>
                    <div className="text-xs text-slate-600 mt-1">of {achievements.length} total</div>
                    {achievements.length > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-amber-600" style={{ width: `${(earnedCount / achievements.length) * 100}%` }} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AA Mini Node Breakdown */}
              <Card className="bg-card/40 border-slate-800">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                  <CardTitle className="text-sm text-purple-300">🌟 AA Investments</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {investedNodes.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">
                      No AA points spent yet — visit the AA Tree to invest
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {investedNodes.map(({ tab, node }) => (
                        <div key={node.id} className="flex items-center gap-2 p-2 rounded-md border border-purple-900/40 bg-purple-950/10">
                          <span className="text-lg">{node.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-purple-300">{node.name}</span>
                              <span className="text-xs text-purple-500">{node.currentRank}/{node.maxRank}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-600">{tab}</span>
                              <div className="flex-1 h-1 rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-purple-600"
                                  style={{ width: `${(node.currentRank / Math.max(1, node.maxRank)) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Factions */}
              <Card className="bg-card/40 border-slate-800">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                  <CardTitle className="text-sm text-slate-200">🏛️ Faction Standings</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {factions.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No faction data</div>
                  )}
                  {factions.map(f => {
                    const pct = Math.max(0, Math.min(100, ((f.standing + 10000) / 20000) * 100));
                    return (
                      <div key={f.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-300">{f.name}</span>
                          <span className={cn("font-medium", standingColor(f.standingTitle))}>{f.standingTitle}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <div className={cn("h-full rounded-full transition-all", standingBarColor(f.standing))} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-600">{f.standing.toLocaleString()} · {f.zone}</div>
                        {f.perks.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {f.perks.slice(0, 2).map((perk, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-slate-500">
                                {perk}
                              </span>
                            ))}
                            {f.perks.length > 2 && (
                              <span className="text-[10px] text-slate-600">+{f.perks.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Dungeon & Raid Progress */}
              <Card className="bg-card/40 border-slate-800">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                  <CardTitle className="text-sm text-slate-200">🏰 Dungeon & Raid Progress</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {dungeonKillStats.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No dungeon runs completed yet</div>
                  )}
                  {dungeonKillStats.map(d => {
                    const hasActivity = d.runsStarted > 0 || d.normalKills > 0 || d.miniBossKills > 0 || d.mainBossKills > 0 || d.completions > 0;
                    const cleared = d.completions > 0;

                    // Per-dungeon/raid achievement IDs relevant to this entry
                    const dungeonAchIds = [
                      `clear_${d.id}`,
                      `master_${d.id}`,
                    ];
                    const dungeonAchs = achievements.filter(a => dungeonAchIds.includes(a.id));

                    return (
                      <div key={d.id} className={cn(
                        "rounded-lg border p-2.5 transition-colors",
                        cleared
                          ? d.isRaid
                            ? "border-orange-800/50 bg-orange-950/20"
                            : "border-amber-800/40 bg-amber-950/10"
                          : hasActivity
                            ? "border-slate-700/50 bg-slate-800/20"
                            : "border-slate-800/30 bg-slate-900/10 opacity-50"
                      )}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{d.isRaid ? "⚡" : "🏰"}</span>
                            <span className="text-xs font-medium text-slate-200">{d.name}</span>
                            {d.isRaid && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-orange-900/50 border border-orange-700/40 text-orange-300">RAID</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {cleared && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-medium",
                                d.completions >= 5
                                  ? "bg-purple-900/50 border border-purple-700/40 text-purple-300"
                                  : "bg-amber-900/50 border border-amber-700/40 text-amber-300"
                              )}>
                                {d.completions}x cleared
                              </span>
                            )}
                            {!cleared && hasActivity && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400">In progress</span>
                            )}
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-500 mb-1">{d.zone}</div>
                        {hasActivity && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {d.runsStarted > 0 && (
                              <span className="text-[10px] text-slate-400">
                                <span className="text-slate-500">Runs:</span> {d.runsStarted}
                              </span>
                            )}
                            {d.normalKills > 0 && (
                              <span className="text-[10px] text-slate-400">
                                <span className="text-slate-500">Kills:</span> {d.normalKills.toLocaleString()}
                              </span>
                            )}
                            {d.miniBossKills > 0 && (
                              <span className="text-[10px] text-slate-400">
                                <span className="text-slate-500">Mini:</span> {d.miniBossKills}
                              </span>
                            )}
                            {d.mainBossKills > 0 && (
                              <span className="text-[10px] text-amber-400/80">
                                <span className="text-slate-500">Boss:</span> {d.mainBossKills}
                              </span>
                            )}
                            {d.firstClearAt && (
                              <span className="text-[9px] text-slate-600">
                                First clear: {new Date(d.firstClearAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                        {dungeonAchs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-800/40">
                            {dungeonAchs.map(a => (
                              <span
                                key={a.id}
                                title={a.description ?? a.name}
                                className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded border font-medium transition-colors",
                                  a.completed
                                    ? "bg-green-900/40 border-green-700/50 text-green-300"
                                    : "bg-slate-800/30 border-slate-700/30 text-slate-500"
                                )}
                              >
                                {a.icon && <span className="mr-0.5">{a.icon}</span>}
                                {a.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── PROFILE ──────────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Combat Career */}
            <Card className="bg-card/40 border-slate-800">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-red-400">⚔️ Combat Career</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="text-2xl font-bold text-red-400">{(p.killCount ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Total Kills</div>
                  </div>
                  <div className="flex-1 text-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="text-2xl font-bold text-slate-500">{(p.deathCount ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Deaths</div>
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <div className="text-2xl font-bold text-amber-300">{kdr}</div>
                  <div className="text-xs text-slate-500">Kill / Death Ratio</div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-slate-500">Heroic Opportunities</span>
                  <span className="text-amber-400 font-medium">{p.heroicCompletions ?? 0} completed</span>
                </div>
              </CardContent>
            </Card>

            {/* Time & Economy */}
            <Card className="bg-card/40 border-slate-800">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-amber-400">💰 Time & Economy</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="text-xl font-bold text-amber-400">{p.gold.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Gold on Hand</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/40 border border-amber-900/30">
                    <div className="text-xl font-bold text-amber-600">{(p.totalGoldEarned ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Total Gold Earned</div>
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <div className="text-2xl font-bold text-slate-300">{fmtTime(p.totalPlayTime ?? 0)}</div>
                  <div className="text-xs text-slate-500">Total Playtime</div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-slate-500">Current Zone</span>
                  <span className="text-slate-300">{p.zone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Character Vitals */}
            <Card className="bg-card/40 border-slate-800">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-blue-400">📋 Character Vitals</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {[
                  { label: "Name",         val: p.name },
                  { label: "Race",         val: p.raceDef.name },
                  { label: "Class",        val: p.class },
                  { label: "Archetype",    val: p.archetype },
                  { label: "Alignment",    val: p.alignment },
                  { label: "Level",        val: String(p.level) },
                  { label: "AA Spent",     val: String(p.aaPointsSpent ?? 0) },
                  { label: "Zone",         val: p.zone },
                  { label: "Created",      val: fmtDate(p.createdAt) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-300 font-medium">{val}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Progression Snapshot */}
            <Card className="bg-card/40 border-slate-800 md:col-span-2 lg:col-span-3">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                <CardTitle className="text-sm text-purple-400">📈 Skill Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {skillsList.slice(0, 6).map(s => (
                    <div key={s.id} className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
                      <div className="text-xl">{SKILL_ICONS[s.icon] ?? "📊"}</div>
                      <div className="text-sm font-bold text-slate-200 mt-1">{s.level}</div>
                      <div className="text-[10px] text-slate-500">{s.name}</div>
                      <div className="mt-1 h-1 rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{ width: `${Math.max(2, Math.min(100, (s.xp / Math.max(1, s.xpToNextLevel)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ExamineDialog
        item={examineItem}
        open={examineOpen}
        onClose={() => setExamineOpen(false)}
      />
    </div>
  );
}
