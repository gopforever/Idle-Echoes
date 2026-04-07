import * as React from "react";
import { cn } from "@/lib/utils";
import { Item, RARITY_GS_MULTIPLIER, SLOT_GS_WEIGHT, computeItemGS, isGearType } from "@workspace/api-client-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Rarity border/glow styles ────────────────────────────────────────────────

const RARITY_BORDER: Record<string, string> = {
  common:    "border-slate-600",
  uncommon:  "border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
  rare:      "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.45)]",
  legendary: "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]",
  fabled:    "border-orange-500 shadow-[0_0_14px_rgba(234,88,12,0.55)]",
  mythical:  "border-red-500 shadow-[0_0_16px_rgba(220,38,38,0.6)]",
};

const RARITY_TEXT: Record<string, string> = {
  common:    "text-slate-400",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  legendary: "text-purple-400",
  fabled:    "text-orange-400",
  mythical:  "text-red-400",
};

const RARITY_BG: Record<string, string> = {
  common:    "bg-slate-800",
  uncommon:  "bg-green-950/60",
  rare:      "bg-blue-950/60",
  legendary: "bg-purple-950/60",
  fabled:    "bg-orange-950/60",
  mythical:  "bg-red-950/60",
};

// Slot/type → fallback emoji when sprite PNG is missing or still loading
const SLOT_EMOJI: Record<string, string> = {
  primary:    "⚔️", secondary: "🛡️", head: "🪖", neck: "📿",
  shoulder:   "🩺", chest: "🧥", back: "🎒", wrist: "⌚",
  hands:      "🧤", waist: "🎗️", legs: "👖", feet: "👢",
  ear:        "💎", earLeft: "💎", earRight: "💎",
  ring:       "💍", ringLeft: "💍", ringRight: "💍", finger: "💍",
  charm: "🌟", ranged: "🏹",
  weapon:     "⚔️", armor: "🛡️", accessory: "💍",
  consumable: "⚗️", material: "🪨", quest: "📜", mount: "🐴",
};

// ─── Gear score helpers re-exported for backward compat with call sites ────────
// Actual implementations live in @workspace/api-client-react/src/gear-score.ts
// (imported above); we just re-export them so any other file that imports from
// item-icon.tsx directly continues to work.
export { RARITY_GS_MULTIPLIER, SLOT_GS_WEIGHT, computeItemGS, isGearType };

// ─── Sprite manifest (fetched once from public/sprites/items/manifest.json) ──

let _manifest: Record<string, string> | null = null;
let _manifestLoading: Promise<Record<string, string>> | null = null;

function loadManifest(): Promise<Record<string, string>> {
  if (_manifest) return Promise.resolve(_manifest);
  if (_manifestLoading) return _manifestLoading;
  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
  _manifestLoading = fetch(`${base}/sprites/items/manifest.json`)
    .then(r => r.ok ? r.json() : {})
    .then((data: Record<string, string>) => { _manifest = data; return data; })
    .catch(() => { _manifest = {}; return {}; });
  return _manifestLoading;
}

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

// ─── SpriteImage ──────────────────────────────────────────────────────────────

export function SpriteImage({
  spriteId, slot, type, size = 32, className,
}: { spriteId?: string; slot?: string; type?: string; size?: number; className?: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!spriteId) { setFailed(true); return; }

    let cancelled = false;
    loadManifest().then(manifest => {
      if (cancelled) return;
      const relativePath = manifest[spriteId] ?? `/sprites/items/${spriteId}.png`;
      setSrc(`${BASE}${relativePath}`);
    });
    return () => { cancelled = true; };
  }, [spriteId]);

  if (failed || !src) {
    const fallback = SLOT_EMOJI[slot ?? ""] ?? SLOT_EMOJI[type ?? ""] ?? "◻";
    return (
      <span
        className={cn("leading-none select-none", className)}
        style={{ fontSize: size * 0.65 }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={spriteId}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      onError={() => setFailed(true)}
      style={{ imageRendering: "auto" }}
    />
  );
}


// ─── ItemTooltipContent ───────────────────────────────────────────────────────
// The inner content of any item tooltip — re-used across all surfaces.

export interface ItemTooltipData {
  name: string;
  rarity: string;
  slot?: string;
  type?: string;
  level?: number;
  description?: string;
  stats?: Record<string, number>;
  sellPrice?: number;
  quality?: number;
  spriteId?: string;
  noSell?: boolean;
  setId?: string;
  setName?: string;
  setPieceSlot?: string;
  setBonuses?: Array<{ piecesRequired: number; description: string; isProc: boolean; procName?: string }>;
}

function itemIsNoSell(item: ItemTooltipData): boolean {
  return item.noSell === true || item.rarity === "fabled" || item.rarity === "mythical";
}

export function ItemTooltipContent({ item }: { item: ItemTooltipData }) {
  const rarityBg   = RARITY_BG[item.rarity]   ?? RARITY_BG.common;
  const rarityText = RARITY_TEXT[item.rarity]  ?? "text-slate-300";

  const level = item.level ?? 0;
  const rarity = item.rarity ?? "common";
  const type = item.type ?? "";
  const gs = computeItemGS(level, rarity, item.slot);
  const hasGS = isGearType(type) && gs > 0;
  const isMaterial = !isGearType(type);

  const hasStats = !isMaterial && item.stats && Object.keys(item.stats).length > 0;
  const qualityVal = item.quality;
  const showQuality = qualityVal != null && qualityVal > 0 && isMaterial;

  const qColor = qualityVal != null
    ? qualityVal >= 75 ? "text-green-400" : qualityVal >= 50 ? "text-yellow-400" : "text-red-400"
    : "text-slate-400";
  const barColor = qualityVal != null
    ? qualityVal >= 75 ? "bg-green-500" : qualityVal >= 50 ? "bg-yellow-500" : "bg-red-500"
    : "bg-slate-500";
  const qLabel = qualityVal != null
    ? qualityVal >= 90 ? "Pristine" : qualityVal >= 75 ? "Excellent" : qualityVal >= 55 ? "Good" : qualityVal >= 35 ? "Average" : "Poor"
    : "";

  return (
    <div className={cn("w-64 p-0 overflow-hidden rounded-md", rarityBg)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/80 to-transparent">
        <div className="w-10 h-10 rounded border border-slate-700 bg-slate-900/60 flex items-center justify-center shrink-0">
          <SpriteImage spriteId={item.spriteId} slot={item.slot} type={type} size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("font-bold text-sm truncate", rarityText)}>{item.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-500 capitalize">
              {item.slot ? `${item.slot} · ` : ""}{type}{level > 0 ? ` · Lv ${level}` : ""}
            </span>
            {hasGS && (
              <span className="text-[9px] px-1.5 py-0 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                GS {gs}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {item.description && (
          <p className="text-[11px] italic text-slate-400 leading-relaxed">{item.description}</p>
        )}

        {/* Quality bar (materials / consumables) */}
        {showQuality && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 shrink-0">Quality</span>
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${qualityVal}%` }} />
            </div>
            <span className={cn("text-[10px] font-bold tabular-nums", qColor)}>{qualityVal}/100</span>
            <span className={cn("text-[10px]", qColor)}>{qLabel}</span>
          </div>
        )}

        {/* Stats grid */}
        {hasStats && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
            {Object.entries(item.stats!).map(([stat, val]) => {
              if (!val) return null;
              const label = stat.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
              return (
                <div key={stat} className="flex justify-between gap-1">
                  <span className="text-slate-500 truncate">{label}</span>
                  <span className="text-green-400 font-medium shrink-0">+{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Set piece info + bonus tiers */}
        {item.setId && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-amber-400 tracking-wide text-center py-0.5 bg-amber-950/40 rounded border border-amber-800/40">
              🛡️ {item.setName ?? "Dungeon Set"} · {item.setPieceSlot ?? item.slot ?? "piece"}
            </div>
            {item.setBonuses && item.setBonuses.length > 0 && (
              <div className="space-y-0.5 pt-0.5">
                {item.setBonuses.map((b, i) => (
                  <div key={i} className="flex items-start gap-1 text-[10px]">
                    <span className={b.isProc ? "text-amber-500 shrink-0" : "text-amber-400/70 shrink-0"}>
                      {b.isProc ? "⚡" : "◆"}
                    </span>
                    <span className="font-mono text-slate-500 shrink-0">({b.piecesRequired}pc)</span>
                    <span className="text-slate-400 leading-tight">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No-Drop warning */}
        {itemIsNoSell(item) && (
          <div className="text-[10px] font-bold text-red-400 tracking-wide uppercase text-center py-0.5 bg-red-950/40 rounded border border-red-900/40">
            No-Drop
          </div>
        )}

        {/* Footer: rarity + sell price */}
        <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-[11px]">
          <span className={cn("capitalize font-semibold", rarityText)}>{rarity}</span>
          {!itemIsNoSell(item) && item.sellPrice != null && item.sellPrice > 0 && (
            <span className="text-amber-400">Sell: {item.sellPrice}g</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ItemIcon ─────────────────────────────────────────────────────────────────

interface ItemIconProps {
  item?: Item;
  emptyText?: string;
  onClick?: () => void;
  className?: string;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ItemIcon({ item, emptyText, onClick, className, showTooltip = true, size = "md" }: ItemIconProps) {
  const dim    = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const imgSz  = size === "sm" ? 28           : size === "lg" ? 52           : 40;

  if (!item) {
    return (
      <div
        onClick={onClick}
        className={cn(
          dim,
          "rounded bg-slate-900/50 border border-slate-700 border-dashed",
          "flex items-center justify-center text-xs text-slate-600",
          "cursor-pointer hover:bg-slate-800/50 transition-colors",
          className
        )}
      >
        {emptyText || ""}
      </div>
    );
  }

  const borderGlow = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;

  const level = item.level ?? 0;
  const gs = computeItemGS(level, item.rarity, item.slot);
  const showGSBadge = isGearType(item.type ?? "") && gs > 0;

  const content = (
    <div
      onClick={onClick}
      className={cn(
        dim,
        "rounded-md border-2 flex items-center justify-center relative",
        "cursor-pointer transition-all duration-150 overflow-hidden",
        "bg-gradient-to-b from-slate-800/80 to-slate-900/80",
        "hover:scale-105 active:scale-95 hover:brightness-110",
        borderGlow,
        className
      )}
    >
      <SpriteImage
        spriteId={item.spriteId}
        slot={item.slot}
        type={item.type}
        size={imgSz}
      />

      {/* Quantity badge */}
      {item.quantity && item.quantity > 1 && (
        <div className="absolute bottom-0 right-0.5 text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none pb-0.5">
          ×{item.quantity}
        </div>
      )}

      {/* GS badge */}
      {showGSBadge && (
        <div className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
          GS {gs}
        </div>
      )}

      {/* Set piece pip — amber shield replaces rarity pip */}
      {(item as unknown as Record<string, unknown>)["setId"] ? (
        <div className="absolute top-0.5 right-0.5 text-[8px] leading-none">🛡️</div>
      ) : (
        <div className={cn(
          "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
          item.rarity === "common"    ? "bg-slate-500"  :
          item.rarity === "uncommon"  ? "bg-green-400"  :
          item.rarity === "rare"      ? "bg-blue-400"   :
          item.rarity === "legendary" ? "bg-purple-400" :
          item.rarity === "fabled"    ? "bg-orange-400" :
          "bg-red-400"
        )} />
      )}
    </div>
  );

  if (!showTooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
        <ItemTooltipContent item={item as unknown as ItemTooltipData} />
      </TooltipContent>
    </Tooltip>
  );
}
