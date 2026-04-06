import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import {
  useGetInventory,
  useGetCharacter,
  useEquipItem,
  useSellItem,
  useUnequipItem,
  getGetInventoryQueryKey,
  getGetCharacterQueryKey,
  getGetCharacterStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SpriteImage, ItemTooltipContent, computeItemGS, isGearType } from "@/components/game/item-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ExamineDialog, type ExamineItem } from "@/components/game/examine-dialog";
import { Package, Sword, ShieldCheck, Gem, Boxes, X, TrendingUp, TrendingDown, Minus, ChevronRight, ShoppingBag, Pin, BarChart2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface ItemStats { [key: string]: number }
interface CraftedMeta {
  craftedBy?: string;
  resourceQuality?: number;
  experimentFocus?: string;
  isCritical?: boolean;
  recipeTier?: string;
  isOneOfAKind?: boolean;
}
interface InventoryItem {
  id: string; name: string; slot: string; type: string;
  level: number; rarity: string; stats: ItemStats;
  sellPrice: number; quantity?: number; description?: string;
  spriteId?: string; quality?: number; craftedMeta?: CraftedMeta;
  itemData?: Record<string, unknown>;
  noSell?: boolean;
}

function inventoryItemIsNoSell(item: InventoryItem): boolean {
  return item.noSell === true || item.rarity === "fabled" || item.rarity === "mythical";
}
type GearMap = Record<string, InventoryItem>;

// ── Constants ─────────────────────────────────────────────────────────────────

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string; text: string; badge: string }> = {
  common:    { border: "border-slate-700",    glow: "",                                       label: "Common",    text: "text-slate-300",   badge: "bg-slate-800 text-slate-400" },
  uncommon:  { border: "border-green-700",    glow: "shadow-[0_0_10px_rgba(34,197,94,0.2)]", label: "Uncommon",  text: "text-green-400",   badge: "bg-green-950 text-green-400" },
  rare:      { border: "border-blue-700",     glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",label: "Rare",     text: "text-blue-400",    badge: "bg-blue-950 text-blue-400" },
  legendary: { border: "border-purple-700",   glow: "shadow-[0_0_14px_rgba(168,85,247,0.3)]",label: "Legendary", text: "text-purple-400",  badge: "bg-purple-950 text-purple-400" },
  fabled:    { border: "border-orange-600",   glow: "shadow-[0_0_16px_rgba(234,88,12,0.35)]",label: "Fabled",   text: "text-orange-400",  badge: "bg-orange-950 text-orange-400" },
  mythical:  { border: "border-red-600",      glow: "shadow-[0_0_18px_rgba(220,38,38,0.4)]", label: "Mythical", text: "text-red-400",     badge: "bg-red-950 text-red-400" },
};

const SLOT_ICONS: Record<string, string> = {
  primary: "⚔️", secondary: "🛡️", head: "🪖", neck: "📿",
  shoulder: "🩺", chest: "🧥", back: "🎒", wrist: "⌚",
  hands: "🧤", waist: "🎗️", legs: "👖", feet: "👢",
  ear: "💎", ring: "💍",
};

const DISPLAY_SLOTS = [
  ["ear", "head", "ear"],
  ["neck", "shoulder", "back"],
  ["chest", "wrist", "hands"],
  ["waist", "legs", "feet"],
  ["ring", "primary", "secondary"],
];

const STAT_LABELS: Record<string, string> = {
  strength: "STR", agility: "AGI", stamina: "STA", intelligence: "INT",
  wisdom: "WIS", charisma: "CHA", attackRating: "ATK", defenseRating: "DEF",
  mitigation: "MIT", avoidance: "AVD", critChance: "Crit%", critBonus: "Crit Bonus",
  haste: "Haste", weaponDamageMin: "DMG Min", weaponDamageMax: "DMG Max",
  weaponDelay: "Delay",
};

const TABS = [
  { id: "all",       label: "All",        icon: Boxes },
  { id: "weapon",    label: "Weapons",    icon: Sword },
  { id: "armor",     label: "Armor",      icon: ShieldCheck },
  { id: "accessory", label: "Accessories",icon: Gem },
  { id: "material",  label: "Materials",  icon: Package },
  { id: "overview",  label: "Overview",   icon: BarChart2 },
];

// ── Gear endpoint (direct fetch, not in generated client) ─────────────────────

const GEAR_KEY = ["inventory", "gear"];
async function fetchGear(): Promise<GearMap> {
  const res = await fetch(apiUrl("/api/inventory/gear"));
  if (!res.ok) throw new Error("Failed to load gear");
  return res.json();
}

// ── Gathering Bag endpoint ─────────────────────────────────────────────────────

const GATHERING_BAG_KEY = ["gathering-bag"];
async function fetchGatheringBag(): Promise<{ items: InventoryItem[] }> {
  const res = await fetch(apiUrl("/api/gathering-bag"));
  if (!res.ok) throw new Error("Failed to load gathering bag");
  return res.json();
}

// ── Gathering bag + pins queries ───────────────────────────────────────────────

interface GatheringBagItem { itemId: string; quantity: number; itemData?: Record<string, unknown> }
interface PinnedRecipeIngredient { itemId: string; quantity: number }
interface PinnedRecipe { id: string; name: string; ingredients: PinnedRecipeIngredient[] }

const BAG_KEY = ["gathering", "bag"];
async function fetchBagItems(): Promise<GatheringBagItem[]> {
  const res = await fetch(apiUrl("/api/gathering/bag"));
  if (!res.ok) return [];
  const data = await res.json() as { items: GatheringBagItem[] };
  return data.items ?? [];
}

const PINS_KEY = ["crafting", "pins"];
async function fetchPins(): Promise<string[]> {
  const res = await fetch(apiUrl("/api/crafting/pins"));
  if (!res.ok) return [];
  const data = await res.json() as { pinned: string[] };
  return data.pinned ?? [];
}

const RECIPES_KEY = ["crafting", "known-recipes"];
async function fetchKnownRecipes(): Promise<PinnedRecipe[]> {
  const res = await fetch(apiUrl("/api/crafting/known-recipes"));
  if (!res.ok) return [];
  return res.json() as Promise<PinnedRecipe[]>;
}

// ── Stat delta helper ─────────────────────────────────────────────────────────

function statDeltas(item: InventoryItem, equipped: InventoryItem | undefined) {
  const allKeys = new Set([
    ...Object.keys(item.stats),
    ...(equipped ? Object.keys(equipped.stats) : []),
  ]);
  const deltas: { key: string; label: string; mine: number; theirs: number; delta: number }[] = [];
  allKeys.forEach(k => {
    const mine   = item.stats[k]    ?? 0;
    const theirs = equipped?.stats[k] ?? 0;
    if (mine !== 0 || theirs !== 0) deltas.push({ key: k, label: STAT_LABELS[k] ?? k, mine, theirs, delta: mine - theirs });
  });
  return deltas.filter(d => d.mine !== 0 || d.theirs !== 0);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: string }) {
  const s = RARITY_STYLES[rarity] ?? RARITY_STYLES.common;
  return <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide", s.badge)}>{s.label}</span>;
}

function GearSlot({ slot, item, onClick }: { slot: string; item?: InventoryItem; onClick?: () => void }) {
  const rs = item ? (RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common) : null;
  const gs = item ? computeItemGS(item.level, item.rarity, item.slot ?? slot) : 0;
  const showGS = item != null && isGearType(item.type) && gs > 0;

  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all overflow-hidden relative",
        "hover:scale-105 active:scale-95",
        item
          ? cn("bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-pointer", rs!.border, rs!.glow)
          : "bg-slate-900/20 border-slate-800/40 border-dashed cursor-default"
      )}
    >
      {item ? (
        <>
          <SpriteImage spriteId={item.spriteId} slot={slot} type={item.type} size={34} />
          <span className={cn("text-[8px] font-bold leading-none truncate w-full text-center px-0.5 -mt-0.5", rs!.text)}>
            {item.name.length > 8 ? item.name.slice(0, 7) + "…" : item.name}
          </span>
          {showGS && (
            <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
              GS {gs}
            </span>
          )}
        </>
      ) : (
        <span className="text-slate-700 text-sm">{SLOT_ICONS[slot] ?? slot[0]?.toUpperCase()}</span>
      )}
    </button>
  );

  if (!item) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
        <ItemTooltipContent item={item} />
      </TooltipContent>
    </Tooltip>
  );
}

function ItemCell({
  item, selected, onClick, onExamine, onEquip,
}: {
  item: InventoryItem; selected: boolean; onClick: () => void;
  onExamine?: () => void; onEquip?: () => void;
}) {
  const rs = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  const gs = computeItemGS(item.level, item.rarity, item.slot ?? undefined);
  const showGS = isGearType(item.type) && gs > 0;
  const isEquipable = item.type !== "material" && item.type !== "quest" && item.type !== "consumable" && item.type !== "crafting_material";
  const noSell = inventoryItemIsNoSell(item);

  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all relative overflow-hidden",
        "hover:scale-105 active:scale-95 cursor-pointer",
        rs.border, rs.glow,
        selected ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-950" : "",
        "bg-gradient-to-b from-slate-800/70 to-slate-900/80"
      )}
    >
      <SpriteImage spriteId={item.spriteId} slot={item.slot} type={item.type} size={32} />
      <span className={cn("text-[8px] font-semibold leading-none w-full text-center px-0.5 truncate -mt-0.5", rs.text)}>
        {item.name.length > 9 ? item.name.slice(0, 8) + "…" : item.name}
      </span>
      {item.quantity && item.quantity > 1 && (
        <span className="absolute top-0.5 right-0.5 text-[9px] font-black text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">×{item.quantity}</span>
      )}
      {showGS && (
        <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
          GS {gs}
        </span>
      )}
      {noSell && (
        <span className="absolute top-0.5 left-0.5 text-[6px] font-black px-0.5 py-0 rounded leading-none bg-red-950/90 text-red-400 border border-red-800/60 uppercase tracking-tight">
          NO-DROP
        </span>
      )}
    </button>
  );

  const withTooltip = (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
        <ItemTooltipContent item={item} />
      </TooltipContent>
    </Tooltip>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>{withTooltip}</ContextMenuTrigger>
      <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
        {isEquipable && onEquip && (
          <ContextMenuItem
            className="cursor-pointer focus:bg-slate-800 focus:text-slate-100"
            onSelect={onEquip}
          >
            Equip
          </ContextMenuItem>
        )}
        {isEquipable && onEquip && <ContextMenuSeparator className="bg-slate-700/50" />}
        <ContextMenuItem
          className="cursor-pointer focus:bg-slate-800 focus:text-slate-100"
          onSelect={onExamine}
        >
          Examine
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EmptyCell() {
  return <div className="aspect-square rounded-lg border border-dashed border-slate-800/40 bg-slate-900/10" />;
}

function ComparisonPanel({ item, equipped, onEquip, onSell, onUse, onDeposit, onClose, equipPending, sellPending, usePending, depositPending }: {
  item: InventoryItem; equipped?: InventoryItem;
  onEquip: () => void; onSell: () => void; onUse: () => void; onDeposit: () => void; onClose: () => void;
  equipPending: boolean; sellPending: boolean; usePending: boolean; depositPending: boolean;
}) {
  const rs  = RARITY_STYLES[item.rarity]        ?? RARITY_STYLES.common;
  const ers = equipped ? (RARITY_STYLES[equipped.rarity] ?? RARITY_STYLES.common) : null;
  const deltas = statDeltas(item, equipped);
  const isEquipable = item.type !== "material" && item.type !== "quest" && item.type !== "consumable";
  const isProcedural = item.id?.startsWith("proc_") || item.id?.startsWith("named_");
  const noSell = inventoryItemIsNoSell(item);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
      className="w-72 shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className={cn("px-4 py-3 border-b border-slate-800/60 flex items-start justify-between gap-2", `bg-gradient-to-r from-slate-900 to-slate-950`)}>
        <div className="min-w-0 flex-1">
          <div className={cn("font-bold text-sm leading-tight truncate", rs.text)}>{item.name}</div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <RarityBadge rarity={item.rarity} />
            {isProcedural && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-amber-950 text-amber-400">Loot Drop</span>}
            <span className="text-[10px] text-slate-600 capitalize">{item.slot} · Lv {item.level}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-700 hover:text-slate-400 transition-colors mt-0.5 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Item icon + description */}
      <div className="px-4 py-3 flex gap-3 border-b border-slate-800/40">
        <div className={cn("w-14 h-14 shrink-0 rounded-lg border-2 flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80", rs.border, rs.glow)}>
          <SpriteImage spriteId={item.spriteId} slot={item.slot} type={item.type} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          {item.description
            ? <p className="text-xs italic text-slate-500 leading-relaxed">{item.description}</p>
            : <p className="text-xs italic text-slate-700">No description.</p>
          }
          {noSell
            ? <div className="text-xs text-red-400 mt-1.5 font-bold uppercase tracking-wide">No-Drop</div>
            : <div className="text-xs text-amber-600 mt-1.5 font-medium">Sell: {item.sellPrice}g</div>
          }
        </div>
      </div>

      {/* Quality display (materials) */}
      {(() => {
        const q = item.quality ?? (item.itemData?.quality as number | undefined);
        if (q != null && (item.type === "material" || item.type === "crafting_material" || item.type === "recipe_scroll")) {
          const qColor = q >= 75 ? "text-green-400" : q >= 50 ? "text-yellow-400" : "text-red-400";
          const qLabel = q >= 90 ? "Pristine" : q >= 75 ? "Excellent" : q >= 55 ? "Good" : q >= 35 ? "Average" : "Poor";
          const barColor = q >= 75 ? "bg-green-500" : q >= 50 ? "bg-yellow-500" : "bg-red-500";
          return (
            <div className="px-4 py-2 flex items-center gap-3 border-b border-slate-800/40 bg-slate-900/40">
              <span className="text-xs text-slate-500">Quality</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${q}%` }} />
              </div>
              <span className={`text-xs font-bold ${qColor} tabular-nums`}>{q}/100</span>
              <span className={`text-xs ${qColor}`}>{qLabel}</span>
            </div>
          );
        }
        return null;
      })()}

      {/* Crafted metadata */}
      {item.craftedMeta && (
        <div className="px-4 py-2 border-b border-slate-800/40 bg-slate-900/20 space-y-1">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Handcrafted</div>
          <div className="flex flex-wrap gap-1">
            {item.craftedMeta.craftedBy && (
              <span className="text-[10px] text-slate-400">by <span className="text-slate-300 font-medium">{item.craftedMeta.craftedBy}</span></span>
            )}
            {item.craftedMeta.recipeTier && (
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border",
                item.craftedMeta.recipeTier === "mythic" ? "bg-amber-950/60 text-amber-300 border-amber-600/50"
                  : item.craftedMeta.recipeTier === "expert" ? "bg-blue-950/60 text-blue-300 border-blue-700/50"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              )}>
                {item.craftedMeta.recipeTier.charAt(0).toUpperCase() + item.craftedMeta.recipeTier.slice(1)}
              </span>
            )}
            {item.craftedMeta.experimentFocus && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-primary/80 border border-slate-700 capitalize">
                {item.craftedMeta.experimentFocus} focus
              </span>
            )}
            {item.craftedMeta.resourceQuality != null && (
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border bg-slate-900",
                item.craftedMeta.resourceQuality >= 75 ? "text-green-400 border-green-800/50"
                  : item.craftedMeta.resourceQuality >= 50 ? "text-yellow-400 border-yellow-800/50"
                  : "text-red-400 border-red-800/50"
              )}>
                Q:{item.craftedMeta.resourceQuality}
              </span>
            )}
            {item.craftedMeta.isCritical && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-600/50 font-bold">Critical</span>
            )}
            {item.craftedMeta.isOneOfAKind && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/70 text-amber-300 border border-amber-500/50 font-bold">ONE OF A KIND</span>
            )}
          </div>
        </div>
      )}

      {/* Stat comparison */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-2">
          {equipped && (
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
              vs. <span className={cn("font-bold", ers!.text)}>{equipped.name}</span>
            </div>
          )}
          {deltas.length > 0 ? (
            <div className="space-y-0.5">
              {deltas.map(({ key, label, mine, theirs, delta }) => {
                const icon = delta > 0
                  ? <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />
                  : delta < 0
                  ? <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
                  : <Minus className="w-3 h-3 text-slate-600 shrink-0" />;
                const valColor = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-slate-500";
                return (
                  <div key={key} className="flex items-center gap-2 py-1 border-b border-slate-900 last:border-0">
                    {icon}
                    <span className="text-xs text-slate-500 flex-1">{label}</span>
                    <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{mine}</span>
                    {equipped && (
                      <>
                        <span className="text-xs text-slate-700">→</span>
                        <span className={cn("text-xs tabular-nums w-8 text-right font-medium", valColor)}>
                          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "="}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-700 italic py-2">No stats.</div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-800/60 flex flex-col gap-2">
        <div className="flex gap-2">
          {isEquipable && (
            <Button
              size="sm"
              onClick={onEquip}
              disabled={equipPending}
              className="flex-1 h-8 text-xs bg-amber-700 hover:bg-amber-600 text-white border-0"
            >
              {equipPending ? "Equipping…" : "Equip"}
            </Button>
          )}
          {item.type === "consumable" && (
            <Button
              size="sm"
              onClick={onUse}
              disabled={usePending}
              className="flex-1 h-8 text-xs bg-green-800 hover:bg-green-700 text-white border-0"
            >
              {usePending ? "Using…" : "Use"}
            </Button>
          )}
          {noSell ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled
                    className="w-full h-8 text-xs opacity-40 cursor-not-allowed"
                  >
                    No-Drop
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                This item is No-Drop and cannot be sold.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={onSell}
              disabled={sellPending}
              className="flex-1 h-8 text-xs"
            >
              {sellPending ? "Selling…" : `Sell ${item.sellPrice}g`}
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={onDeposit}
          disabled={depositPending}
          className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 border-0"
        >
          {depositPending ? "Depositing…" : "🏦 Deposit to Bank"}
        </Button>
      </div>
    </motion.div>
  );
}

function GearDetailPanel({ slot, item, onUnequip, unequipPending, onClose }: {
  slot: string; item: InventoryItem;
  onUnequip: () => void; unequipPending: boolean; onClose: () => void;
}) {
  const rs = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
      className="w-72 shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
    >
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-start justify-between gap-2 bg-slate-900/60">
        <div className="min-w-0 flex-1">
          <div className={cn("font-bold text-sm leading-tight truncate", rs.text)}>{item.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <RarityBadge rarity={item.rarity} />
            <span className="text-[10px] text-slate-600 capitalize">{slot} slot · Lv {item.level}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-700 hover:text-slate-400 transition-colors mt-0.5 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 flex gap-3 border-b border-slate-800/40">
        <div className={cn("w-14 h-14 shrink-0 rounded-lg border-2 flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80", rs.border, rs.glow)}>
          <SpriteImage spriteId={item.spriteId} slot={slot} type={item.type} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          {item.description
            ? <p className="text-xs italic text-slate-500 leading-relaxed">{item.description}</p>
            : <p className="text-xs italic text-slate-700">Currently equipped.</p>
          }
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-0.5">
          {Object.entries(item.stats ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5 border-b border-slate-900 last:border-0">
              <span className="text-xs text-slate-500">{STAT_LABELS[k] ?? k}</span>
              <span className="text-xs text-amber-400 tabular-nums font-medium">+{v}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-slate-800/60">
        <Button
          size="sm"
          variant="outline"
          onClick={onUnequip}
          disabled={unequipPending}
          className="w-full h-8 text-xs border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
        >
          {unequipPending ? "Unequipping…" : "Unequip → Inventory"}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { data: inventory, isLoading } = useGetInventory();
  const { data: character } = useGetCharacter();
  const { data: gear } = useQuery({ queryKey: GEAR_KEY, queryFn: fetchGear });
  const { data: gatheringBag, isLoading: bagLoading } = useQuery({ queryKey: GATHERING_BAG_KEY, queryFn: fetchGatheringBag });
  const { data: bagItems = [] } = useQuery({ queryKey: BAG_KEY, queryFn: fetchBagItems, staleTime: 10000 });
  const { data: pinnedIds = [] } = useQuery({ queryKey: PINS_KEY, queryFn: fetchPins, staleTime: 30000 });
  const { data: knownRecipes = [] } = useQuery({ queryKey: RECIPES_KEY, queryFn: fetchKnownRecipes, staleTime: 30000 });

  const equipItem   = useEquipItem();
  const sellItem    = useSellItem();
  const unequipItem = useUnequipItem();

  const [mainView, setMainView]             = React.useState<"inventory" | "gathering-bag">("inventory");
  const [activeTab, setActiveTab]           = React.useState("all");
  const [overviewFilter, setOverviewFilter] = React.useState("");
  const [overviewSort, setOverviewSort]     = React.useState<"qty" | "name">("qty");
  const [filter, setFilter]                 = React.useState("");
  const [selectedItem, setSelectedItem]     = React.useState<InventoryItem | null>(null);
  const [selectedGearSlot, setSelectedGearSlot] = React.useState<string | null>(null);
  const [useItemPending, setUseItemPending]     = React.useState(false);
  const [depositPending, setDepositPending]     = React.useState(false);
  const [sellAllPending, setSellAllPending]     = React.useState(false);
  const [sellAllDialogOpen, setSellAllDialogOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [examineItem, setExamineItem]   = React.useState<ExamineItem | null>(null);
  const [examineOpen, setExamineOpen]   = React.useState(false);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: GEAR_KEY });
    queryClient.invalidateQueries({ queryKey: GATHERING_BAG_KEY });
  };

  const handleEquip = (item: InventoryItem) => {
    equipItem.mutate({ data: { itemId: item.id, slot: item.slot } }, { onSuccess: () => { invalidate(); setSelectedItem(null); } });
  };

  const handleSell = (item: InventoryItem) => {
    sellItem.mutate({ data: { itemId: item.id, quantity: item.quantity || 1 } }, { onSuccess: () => { invalidate(); setSelectedItem(null); } });
  };

  const handleDeposit = async (item: InventoryItem) => {
    setDepositPending(true);
    try {
      const r = await fetch(apiUrl("/api/bank/deposit-item"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, quantity: item.quantity ?? 1 }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`Deposited ${item.name} to bank`);
        invalidate();
        queryClient.invalidateQueries({ queryKey: ["bank"] });
        setSelectedItem(null);
      } else {
        showToast(d.error ?? "Could not deposit item");
      }
    } finally { setDepositPending(false); }
  };

  const handleUse = async (item: InventoryItem) => {
    setUseItemPending(true);
    try {
      const r = await fetch(apiUrl("/api/inventory/use"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`Used ${item.name}: +${d.healthGain ?? 0} HP${d.powerGain ? ` +${d.powerGain} Power` : ""}`);
        invalidate();
        setSelectedItem(null);
      } else {
        showToast(d.error ?? "Could not use item");
      }
    } finally { setUseItemPending(false); }
  };

  const handleSellAll = () => setSellAllDialogOpen(true);

  const confirmSellAll = async () => {
    setSellAllDialogOpen(false);
    setSellAllPending(true);
    try {
      const r = await fetch(apiUrl("/api/inventory/sell-all"), { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        showToast(`Sold ${d.itemCount} items for ${d.goldEarned.toLocaleString()}g`);
        invalidate();
        setSelectedItem(null);
      } else {
        showToast(d.error ?? "Could not sell all");
      }
    } finally { setSellAllPending(false); }
  };

  const handleUnequip = (slot: string) => {
    unequipItem.mutate({ data: { slot } }, { onSuccess: () => { invalidate(); setSelectedGearSlot(null); } });
  };

  const handleGearSlotClick = (slot: string) => {
    if (!gear?.[slot]) return;
    setSelectedItem(null);
    setSelectedGearSlot(prev => prev === slot ? null : slot);
  };

  const handleItemClick = (item: InventoryItem) => {
    setSelectedGearSlot(null);
    setSelectedItem(prev => prev?.id === item.id ? null : item);
  };

  const handleExamineItem = (item: InventoryItem) => {
    setExamineItem(item as ExamineItem);
    setExamineOpen(true);
  };

  if (isLoading || !inventory) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  const allItems = (inventory.items ?? []) as InventoryItem[];
  const gatheringBagTabItems = (gatheringBag?.items ?? []) as InventoryItem[];

  // Compute combined totals (inventory + gathering bag) for materials overview
  const combinedMap = new Map<string, { name: string; itemId: string; invQty: number; bagQty: number; total: number; type: string }>();
  for (const item of allItems) {
    const existing = combinedMap.get(item.id);
    if (existing) {
      existing.invQty += item.quantity ?? 1;
      existing.total += item.quantity ?? 1;
    } else {
      combinedMap.set(item.id, { name: item.name, itemId: item.id, invQty: item.quantity ?? 1, bagQty: 0, total: item.quantity ?? 1, type: item.type });
    }
  }
  for (const bagItem of bagItems) {
    const itemData = bagItem.itemData as Record<string, unknown> | undefined;
    const name = (itemData?.name as string | undefined) ?? bagItem.itemId.replace(/_/g, " ");
    const type = (itemData?.type as string | undefined) ?? "material";
    const existing = combinedMap.get(bagItem.itemId);
    if (existing) {
      existing.bagQty += bagItem.quantity;
      existing.total += bagItem.quantity;
    } else {
      combinedMap.set(bagItem.itemId, { name, itemId: bagItem.itemId, invQty: 0, bagQty: bagItem.quantity, total: bagItem.quantity, type });
    }
  }

  // Required item IDs for pinned recipes
  const pinnedRecipes = pinnedIds.map(id => knownRecipes.find(r => r.id === id)).filter(Boolean) as PinnedRecipe[];
  const pinnedItemIds = new Set(pinnedRecipes.flatMap(r => r.ingredients.map(i => i.itemId)));

  const overviewRows = [...combinedMap.values()]
    .filter(r => !overviewFilter || r.name.toLowerCase().includes(overviewFilter.toLowerCase()))
    .sort((a, b) => overviewSort === "qty" ? b.total - a.total : a.name.localeCompare(b.name));

  const filteredItems = allItems.filter(item => {
    const matchesTab = activeTab === "all" || item.type === activeTab || (activeTab === "armor" && ["armor", "shield"].includes(item.type));
    const matchesFilter = !filter || item.name.toLowerCase().includes(filter.toLowerCase()) || item.type.toLowerCase().includes(filter.toLowerCase());
    return matchesTab && matchesFilter;
  });

  const filteredBagItems = gatheringBagTabItems.filter(item =>
    !filter || item.name.toLowerCase().includes(filter.toLowerCase()) || item.type.toLowerCase().includes(filter.toLowerCase())
  );

  const padded = [...filteredItems];
  while (padded.length < Math.max(inventory.maxSlots, 40)) padded.push(null as unknown as InventoryItem);

  const equippedInSlot = selectedItem ? gear?.[selectedItem.slot] : undefined;
  const gearSlotItem   = selectedGearSlot ? gear?.[selectedGearSlot] : undefined;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto" style={{ height: "calc(100vh - 8.5rem)" }}>

      {/* ── Equipment panel (hidden while viewing gathering bag) ── */}
      {mainView === "inventory" && (
        <div className="w-52 shrink-0 flex flex-col gap-3">
          <Card className="flex-1 bg-slate-950/80 border-slate-800 overflow-hidden flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-800/50 bg-slate-900/40">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Equipment
              </div>
              {character && <div className="text-[10px] text-slate-600 mt-0.5">{character.name}</div>}
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3">
              {DISPLAY_SLOTS.map((row, ri) => (
                <div key={ri} className="flex gap-2 justify-center">
                  {row.map((slot, ci) => {
                    const isDup = ri === 0 && slot === "ear" && ci === 2;
                    const item = isDup ? gear?.["ear2"] : gear?.[slot];
                    return (
                      <GearSlot
                        key={`${ri}-${ci}`}
                        slot={slot}
                        item={item}
                        onClick={() => handleGearSlotClick(isDup ? "ear2" : slot)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-slate-800/40 text-center text-[10px] text-slate-700">
              Click equipped item to unequip
            </div>
          </Card>
        </div>
      )}

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <Card className="flex-1 bg-card/30 border-slate-800 flex flex-col overflow-hidden">
          {/* View switcher header */}
          <div className="px-4 py-2.5 border-b border-slate-800/50 bg-slate-900/40 flex items-center gap-3 shrink-0">
            <div className="flex gap-1 bg-slate-900/60 rounded-lg p-0.5">
              <button
                onClick={() => { setMainView("inventory"); setSelectedItem(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  mainView === "inventory"
                    ? "bg-amber-900/40 text-amber-400 border border-amber-800/40"
                    : "text-slate-600 hover:text-slate-400"
                )}
              >
                <Package className="w-3 h-3" />
                Inventory
                <span className="text-[10px] text-slate-600 font-normal">{inventory.usedSlots}/{inventory.maxSlots}</span>
              </button>
              <button
                onClick={() => { setMainView("gathering-bag"); setSelectedItem(null); setSelectedGearSlot(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  mainView === "gathering-bag"
                    ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/40"
                    : "text-slate-600 hover:text-slate-400"
                )}
              >
                <ShoppingBag className="w-3 h-3" />
                Gathering Bag
                <span className="text-[10px] text-slate-600 font-normal">{gatheringBagTabItems.length}</span>
              </button>
            </div>
            <div className="flex-1" />
            {mainView === "inventory" && (
              <>
                <div className="text-xs text-amber-500 font-bold">💰 {(character?.gold ?? 0).toLocaleString()}g</div>
                <Input
                  placeholder="Search items…"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="h-7 w-40 bg-slate-900 border-slate-700 text-xs"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleSellAll}
                  disabled={sellAllPending || allItems.length === 0}
                  className="h-7 text-[10px] px-2 shrink-0"
                  title="Sell all inventory items"
                >
                  {sellAllPending ? "Selling…" : "Sell All"}
                </Button>
              </>
            )}
            {mainView === "gathering-bag" && (
              <Input
                placeholder="Search items…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-7 w-40 bg-slate-900 border-slate-700 text-xs"
              />
            )}
          </div>

          {mainView === "inventory" && (
            <>
              {/* Item-type tabs */}
              <div className="flex gap-0.5 px-3 py-2 border-b border-slate-800/30 bg-slate-900/20 shrink-0">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeTab === tab.id
                          ? "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                          : "text-slate-600 hover:text-slate-400 hover:bg-slate-800/40"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Grid / Overview */}
              {activeTab === "overview" ? (
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Input
                        placeholder="Search materials…"
                        value={overviewFilter}
                        onChange={e => setOverviewFilter(e.target.value)}
                        className="h-7 w-40 bg-slate-900 border-slate-700 text-xs"
                      />
                      <button
                        onClick={() => setOverviewSort("qty")}
                        className={cn("text-[10px] px-2 py-1 rounded border transition-all", overviewSort === "qty" ? "bg-amber-900/40 text-amber-300 border-amber-700" : "bg-transparent text-slate-500 border-slate-700 hover:text-slate-300")}
                      >By Qty</button>
                      <button
                        onClick={() => setOverviewSort("name")}
                        className={cn("text-[10px] px-2 py-1 rounded border transition-all", overviewSort === "name" ? "bg-amber-900/40 text-amber-300 border-amber-700" : "bg-transparent text-slate-500 border-slate-700 hover:text-slate-300")}
                      >By Name</button>
                      {pinnedItemIds.size > 0 && (
                        <span className="text-[10px] text-amber-400 ml-auto flex items-center gap-1">
                          <Pin className="w-3 h-3" /> = required by pinned recipes
                        </span>
                      )}
                    </div>
                    {overviewRows.length === 0 ? (
                      <div className="text-xs text-slate-500 italic text-center py-8">No materials found.</div>
                    ) : (
                      <div className="space-y-1">
                        {overviewRows.map((row, i) => {
                          const isPinned = pinnedItemIds.has(row.itemId);
                          return (
                            <div key={i} className={cn("flex items-center justify-between px-3 py-2 rounded text-xs", isPinned ? "bg-amber-950/20 border border-amber-500/20" : "bg-slate-900/40 border border-slate-800/40")}>
                              <div className="flex items-center gap-2 min-w-0">
                                {isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                                <span className="text-slate-200 truncate">{row.name}</span>
                                <span className="text-slate-600 text-[10px] shrink-0">{row.type}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {row.invQty > 0 && <span className="text-slate-400 text-[10px]">{row.invQty} inv</span>}
                                {row.bagQty > 0 && <span className="text-blue-400 text-[10px] flex items-center gap-0.5">{row.bagQty}<Package className="w-2.5 h-2.5 inline" /></span>}
                                <span className="text-slate-100 font-medium w-10 text-right">{row.total}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 xl:grid-cols-9 gap-2">
                  {padded.map((item, i) =>
                    item ? (
                      <ItemCell
                        key={item.id + i}
                        item={item}
                        selected={selectedItem?.id === item.id}
                        onClick={() => handleItemClick(item)}
                        onEquip={() => handleEquip(item)}
                        onExamine={() => handleExamineItem(item)}
                      />
                    ) : (
                      <EmptyCell key={`empty-${i}`} />
                    )
                  )}
                </div>
              </ScrollArea>
              )}
            </>
          )}

          {mainView === "gathering-bag" && (
            <>
              {/* Gathering bag info bar */}
              <div className="px-4 py-1.5 border-b border-slate-800/30 bg-emerald-950/20 shrink-0">
                <p className="text-[10px] text-slate-600">
                  Items gathered from the world land here. Crafting automatically draws from this bag.
                </p>
              </div>
              {/* Gathering bag grid */}
              <ScrollArea className="flex-1">
                {bagLoading ? (
                  <div className="p-4 grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 xl:grid-cols-9 gap-2">
                    {Array.from({ length: 18 }).map((_, i) => <EmptyCell key={i} />)}
                  </div>
                ) : filteredBagItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-700">
                    <ShoppingBag className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs">Your gathering bag is empty.</span>
                    <span className="text-[10px] mt-1 opacity-60">Start gathering to fill it up!</span>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 xl:grid-cols-9 gap-2">
                    {filteredBagItems.map((item, i) => (
                      <ItemCell
                        key={item.id + i}
                        item={item}
                        selected={selectedItem?.id === item.id}
                        onClick={() => handleItemClick(item)}
                        onExamine={() => handleExamineItem(item)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </Card>
      </div>

      {/* ── Side panel (comparison or gear detail) ── */}
      {/* Sell All confirmation dialog */}
      <AlertDialog open={sellAllDialogOpen} onOpenChange={setSellAllDialogOpen}>
        <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Sell All Items?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will sell all {allItems.length} item{allItems.length !== 1 ? "s" : ""} in your inventory for gold. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSellAll} className="bg-red-800 hover:bg-red-700 text-white border-0">
              Sell All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {selectedItem && (
          <ComparisonPanel
            key="comparison"
            item={selectedItem}
            equipped={equippedInSlot}
            onEquip={() => handleEquip(selectedItem)}
            onSell={() => handleSell(selectedItem)}
            onUse={() => handleUse(selectedItem)}
            onDeposit={() => handleDeposit(selectedItem)}
            onClose={() => setSelectedItem(null)}
            equipPending={equipItem.isPending}
            sellPending={sellItem.isPending}
            usePending={useItemPending}
            depositPending={depositPending}
          />
        )}
        {selectedGearSlot && gearSlotItem && !selectedItem && (
          <GearDetailPanel
            key="gear-detail"
            slot={selectedGearSlot}
            item={gearSlotItem}
            onUnequip={() => handleUnequip(selectedGearSlot)}
            unequipPending={unequipItem.isPending}
            onClose={() => setSelectedGearSlot(null)}
          />
        )}
      </AnimatePresence>

      <ExamineDialog
        item={examineItem}
        open={examineOpen}
        onClose={() => setExamineOpen(false)}
      />
    </div>
  );
}
