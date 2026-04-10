import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { SpriteImage, computeItemGS, isGearType } from "@/components/game/item-icon";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExamineItem {
  id?: string;
  name: string;
  rarity: string;
  type?: string;
  slot?: string;
  level?: number;
  stats?: Record<string, number>;
  description?: string;
  sellPrice?: number;
  spriteId?: string;
  zone?: string;
  noSell?: boolean;
}

function examineItemIsNoSell(_item: ExamineItem): boolean {
  return false;
}

// ── Styling helpers ────────────────────────────────────────────────────────────

const RARITY_TEXT: Record<string, string> = {
  common:    "text-slate-300",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  legendary: "text-purple-400",
  fabled:    "text-orange-400",
  mythical:  "text-red-400",
};

const RARITY_BORDER: Record<string, string> = {
  common:    "border-slate-600",
  uncommon:  "border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.3)]",
  rare:      "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.35)]",
  legendary: "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]",
  fabled:    "border-orange-500 shadow-[0_0_14px_rgba(234,88,12,0.45)]",
  mythical:  "border-red-500 shadow-[0_0_16px_rgba(220,38,38,0.5)]",
};

const RARITY_BG: Record<string, string> = {
  common:    "from-slate-900 to-slate-950",
  uncommon:  "from-green-950/40 to-slate-950",
  rare:      "from-blue-950/40 to-slate-950",
  legendary: "from-purple-950/40 to-slate-950",
  fabled:    "from-orange-950/40 to-slate-950",
  mythical:  "from-red-950/40 to-slate-950",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare",
  legendary: "Legendary", fabled: "Fabled", mythical: "Mythical",
};

const STAT_LABELS: Record<string, string> = {
  strength: "Strength", agility: "Agility", stamina: "Stamina",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
  attackRating: "Attack Rating", defenseRating: "Defense Rating",
  mitigation: "Mitigation", avoidance: "Avoidance",
  critChance: "Crit Chance", critBonus: "Crit Bonus",
  haste: "Haste", weaponDamageMin: "Damage Min",
  weaponDamageMax: "Damage Max", weaponDelay: "Delay",
  health: "Health", power: "Power",
};

const SLOT_LABEL: Record<string, string> = {
  primary: "Primary Weapon", secondary: "Offhand", head: "Head", neck: "Neck",
  shoulder: "Shoulders", chest: "Chest", back: "Back", wrist: "Wrist",
  hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet",
  earLeft: "Left Ear", earRight: "Right Ear", ear: "Ear",
  ringLeft: "Left Ring", ringRight: "Right Ring", ring: "Ring", finger: "Ring",
  charm: "Charm", ranged: "Ranged",
};

// ── ExamineDialog ──────────────────────────────────────────────────────────────

interface ExamineDialogProps {
  item: ExamineItem | null;
  open: boolean;
  onClose: () => void;
}

export function ExamineDialog({ item, open, onClose }: ExamineDialogProps) {
  if (!item) return null;

  const rarity    = item.rarity ?? "common";
  const level     = item.level ?? 0;
  const type      = item.type ?? "";
  const slot      = item.slot ?? "";
  const gs        = computeItemGS(level, rarity, slot);
  const hasGS     = isGearType(type) && gs > 0;
  const hasStats  = isGearType(type) && item.stats && Object.keys(item.stats).length > 0;
  const slotLabel = SLOT_LABEL[slot] ?? slot;

  const typeLabel = type
    ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")
    : "";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className={cn(
        "max-w-sm p-0 overflow-hidden border bg-gradient-to-b",
        RARITY_BORDER[rarity] ?? RARITY_BORDER.common,
        RARITY_BG[rarity] ?? RARITY_BG.common,
        "text-slate-200"
      )}>
        <DialogHeader className="px-0 pt-0">
          <DialogDescription className="sr-only">
            Item details for {item.name}
          </DialogDescription>
          {/* Item header */}
          <div className="flex items-start gap-4 p-4 border-b border-slate-800/60 bg-slate-900/60">
            <div className={cn(
              "w-16 h-16 shrink-0 rounded-lg border-2 flex items-center justify-center bg-slate-900/80",
              RARITY_BORDER[rarity] ?? RARITY_BORDER.common
            )}>
              <SpriteImage spriteId={item.spriteId} slot={slot} type={type} size={48} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <DialogTitle className={cn("text-base font-bold leading-tight", RARITY_TEXT[rarity] ?? "text-slate-200")}>
                {item.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide",
                  rarity === "common"    ? "bg-slate-800 text-slate-400" :
                  rarity === "uncommon"  ? "bg-green-950 text-green-400" :
                  rarity === "rare"      ? "bg-blue-950 text-blue-400" :
                  rarity === "legendary" ? "bg-purple-950 text-purple-400" :
                  rarity === "fabled"    ? "bg-orange-950 text-orange-400" :
                                           "bg-red-950 text-red-400"
                )}>
                  {RARITY_LABEL[rarity] ?? rarity}
                </span>
                {hasGS && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    GS {gs}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Type / slot / level row */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {typeLabel && <span className="capitalize">{typeLabel}</span>}
              {slotLabel && <><span className="text-slate-700">·</span><span>{slotLabel}</span></>}
              {level > 0 && <><span className="text-slate-700">·</span><span>Level {level}</span></>}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm italic text-slate-400 leading-relaxed border-l-2 border-slate-700/60 pl-3">
                {item.description}
              </p>
            )}

            {/* Stats */}
            {hasStats && (
              <div>
                <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">
                  Item Stats
                </div>
                <div className="space-y-1">
                  {Object.entries(item.stats!).map(([stat, val]) => {
                    if (!val) return null;
                    const label = STAT_LABELS[stat] ?? stat.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                    return (
                      <div key={stat} className="flex justify-between items-center py-0.5 border-b border-slate-800/50 last:border-0">
                        <span className="text-sm text-slate-400">{label}</span>
                        <span className="text-sm text-green-400 font-bold tabular-nums">+{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drop source */}
            {item.zone && (
              <div className="text-xs text-slate-600 bg-slate-900/60 rounded px-3 py-2 border border-slate-800/50">
                <span className="text-slate-500">Dropped in:</span>{" "}
                <span className="text-slate-300">{item.zone}</span>
              </div>
            )}

            {/* Sell price */}
            {item.sellPrice != null && item.sellPrice > 0 && (
              <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-800/60">
                <span className="text-slate-500">Sell Price</span>
                <span className="text-amber-400 font-bold">{item.sellPrice.toLocaleString()}g</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
