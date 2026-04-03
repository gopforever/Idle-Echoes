import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Gem, Shield, Sword, Sparkles, Info, X, CheckCircle2, Package } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Adornment = {
  id: string; name: string; description: string;
  color: "white" | "yellow" | "red";
  stat: string; value: number; slotType: string; level: number;
  owned: number; appliedTo: string | null;
};

type AppliedAdornment = {
  gearSlot: string; slotIndex: number; adornmentId: string;
  adornment: Adornment | null;
};

// ── Style maps ────────────────────────────────────────────────────────────────

const ADORN_COLOR: Record<string, {
  border: string; bg: string; gem: string; badge: string; glow: string; label: string;
}> = {
  white: {
    border: "border-slate-500", bg: "bg-slate-900/60", gem: "text-slate-300",
    badge: "bg-slate-800 border-slate-600 text-slate-300",
    glow: "shadow-[0_0_16px_rgba(148,163,184,0.2)]", label: "White",
  },
  yellow: {
    border: "border-amber-600", bg: "bg-amber-950/30", gem: "text-amber-400",
    badge: "bg-amber-900/40 border-amber-700 text-amber-300",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.25)]", label: "Yellow",
  },
  red: {
    border: "border-red-600", bg: "bg-red-950/30", gem: "text-red-400",
    badge: "bg-red-900/40 border-red-700 text-red-300",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.25)]", label: "Red",
  },
};

const GEAR_SLOTS = [
  { id: "head",      label: "Head",      icon: "🪖" },
  { id: "shoulders", label: "Shoulders", icon: "🦺" },
  { id: "chest",     label: "Chest",     icon: "👘" },
  { id: "hands",     label: "Hands",     icon: "🧤" },
  { id: "legs",      label: "Legs",      icon: "👖" },
  { id: "feet",      label: "Feet",      icon: "👢" },
  { id: "mainhand",  label: "Main Hand", icon: "⚔️" },
  { id: "offhand",   label: "Off Hand",  icon: "🛡️" },
  { id: "neck",      label: "Neck",      icon: "📿" },
  { id: "ring",      label: "Ring",      icon: "💍" },
  { id: "waist",     label: "Waist",     icon: "🪢" },
  { id: "back",      label: "Back",      icon: "🎒" },
];

const SLOT_TYPE_MAP: Record<string, string[]> = {
  armor:  ["head", "shoulders", "chest", "hands", "legs", "feet", "waist", "back"],
  weapon: ["mainhand", "offhand"],
  any:    GEAR_SLOTS.map(s => s.id),
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const CATALOG_KEY = ["adornments", "catalog"];
const APPLIED_KEY = ["adornments", "applied"];

function fetchCatalog(): Promise<Adornment[]> {
  return fetch(apiUrl("/api/adornments/catalog")).then(r => r.json());
}
function fetchApplied(): Promise<AppliedAdornment[]> {
  return fetch(apiUrl("/api/adornments/applied")).then(r => r.json());
}
function applyAdornment(body: { adornmentId: string; gearSlot: string }) {
  return fetch(apiUrl("/api/adornments/apply"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(r => r.json());
}
function removeAdornment(gearSlot: string) {
  return fetch(apiUrl("/api/adornments/remove"), {
    method: "DELETE", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gearSlot }),
  }).then(r => r.json());
}

// ── Stat display helper ───────────────────────────────────────────────────────

function formatStat(stat: string, value: number) {
  const pct = stat.toLowerCase().includes("chance") || stat.toLowerCase().includes("percent");
  return `+${value}${pct ? "%" : ""} ${stat.replace(/([A-Z])/g, " $1").trim()}`;
}

// ── Gem icon ─────────────────────────────────────────────────────────────────

function GemIcon({ color, size = "md" }: { color: string; size?: "sm" | "md" | "lg" }) {
  const gem = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];
  const icons = { white: "🔷", yellow: "🔶", red: "💎" };
  return <span className={gem}>{icons[color as keyof typeof icons] ?? "💠"}</span>;
}

// ── Adornment Card ────────────────────────────────────────────────────────────

function AdornmentCard({
  adorn, onApply, selected, onSelect,
}: {
  adorn: Adornment;
  onApply: (adorn: Adornment) => void;
  selected: boolean;
  onSelect: (adorn: Adornment) => void;
}) {
  const c = ADORN_COLOR[adorn.color] ?? ADORN_COLOR.white;
  const owned = adorn.owned > 0;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(adorn)}
      className={cn(
        "relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 select-none",
        c.border, c.bg,
        owned ? c.glow : "opacity-50 grayscale",
        selected && "ring-2 ring-white/20 ring-offset-2 ring-offset-slate-950",
        !owned && "cursor-default"
      )}
    >
      {/* Color tier badge */}
      <div className={cn("absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide", c.badge)}>
        {c.label}
      </div>

      {/* Header */}
      <div className="flex items-start gap-2 pr-12">
        <GemIcon color={adorn.color} size="md" />
        <div className="min-w-0 flex-1">
          <div className={cn("text-xs font-bold leading-tight", owned ? "text-slate-100" : "text-slate-600")}>{adorn.name}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Level {adorn.level} req.</div>
        </div>
      </div>

      {/* Stat bonus */}
      <div className={cn(
        "mt-2 text-xs font-bold px-2 py-1 rounded inline-block",
        owned ? c.badge : "bg-slate-800 border border-slate-700 text-slate-600"
      )}>
        {formatStat(adorn.stat, adorn.value)}
      </div>

      {/* Slot type */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {adorn.slotType === "weapon" ? <Sword className="w-3 h-3 text-slate-600" /> : <Shield className="w-3 h-3 text-slate-600" />}
          <span className="text-[10px] text-slate-600 capitalize">{adorn.slotType}</span>
        </div>
        {adorn.appliedTo && (
          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> {adorn.appliedTo}
          </span>
        )}
      </div>

      {/* Owned / apply */}
      {owned ? (
        <Button
          size="sm"
          onClick={e => { e.stopPropagation(); onApply(adorn); }}
          className={cn(
            "mt-2 w-full h-7 text-[11px] border-0",
            adorn.color === "red"    ? "bg-red-700/80 hover:bg-red-600 text-white" :
            adorn.color === "yellow" ? "bg-amber-700/80 hover:bg-amber-600 text-white" :
            "bg-slate-700 hover:bg-slate-600 text-white"
          )}
        >
          Apply × {adorn.owned}
        </Button>
      ) : (
        <div className="mt-2 w-full h-7 flex items-center justify-center text-[10px] text-slate-700 italic">
          Not in inventory
        </div>
      )}
    </motion.div>
  );
}

// ── Applied Slot Row ──────────────────────────────────────────────────────────

function SlotRow({ slot, applied, onRemove, removing }: {
  slot: typeof GEAR_SLOTS[number];
  applied: AppliedAdornment | undefined;
  onRemove: (gearSlot: string) => void;
  removing: boolean;
}) {
  const adorn = applied?.adornment;
  const c = adorn ? ADORN_COLOR[adorn.color] ?? ADORN_COLOR.white : null;

  return (
    <div className={cn(
      "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
      c ? cn("border-l-4", c.border, c.bg) : "border-slate-800/60 bg-slate-900/20"
    )}>
      <span className="text-lg shrink-0">{slot.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">{slot.label}</div>
        {adorn ? (
          <div className="flex items-center gap-1 mt-0.5">
            <GemIcon color={adorn.color} size="sm" />
            <span className={cn("text-xs font-medium truncate", c?.gem)}>{adorn.name}</span>
          </div>
        ) : (
          <div className="text-xs text-slate-700 italic mt-0.5">Empty</div>
        )}
      </div>
      {adorn && (
        <div className="shrink-0 flex items-center gap-2">
          <span className={cn("text-[10px] font-bold", c?.gem)}>
            {formatStat(adorn.stat, adorn.value)}
          </span>
          <button
            onClick={() => onRemove(slot.id)}
            disabled={removing}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Apply Dialog ──────────────────────────────────────────────────────────────

function ApplyDialog({
  adorn, open, onClose, onApply, applying,
}: {
  adorn: Adornment | null;
  open: boolean;
  onClose: () => void;
  onApply: (slot: string) => void;
  applying: boolean;
}) {
  if (!adorn) return null;
  const c = ADORN_COLOR[adorn.color] ?? ADORN_COLOR.white;
  const eligibleSlots = SLOT_TYPE_MAP[adorn.slotType] ?? SLOT_TYPE_MAP.any;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GemIcon color={adorn.color} size="md" />
            <span>Apply {adorn.name}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Choose a gear slot to apply this adornment. Any existing adornment in that slot will be replaced.
          </DialogDescription>
        </DialogHeader>

        {/* Adornment info */}
        <div className={cn("flex items-center gap-3 p-3 rounded-lg border", c.border, c.bg)}>
          <GemIcon color={adorn.color} size="lg" />
          <div>
            <div className="font-bold text-sm text-slate-100">{adorn.name}</div>
            <div className={cn("text-sm font-bold mt-0.5", c.gem)}>{formatStat(adorn.stat, adorn.value)}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{adorn.description}</div>
          </div>
        </div>

        {/* Slot picker */}
        <div className="space-y-1 mt-1">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Eligible Slots</div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
            {GEAR_SLOTS.filter(s => eligibleSlots.includes(s.id)).map(slot => (
              <Button
                key={slot.id}
                size="sm"
                variant="outline"
                disabled={applying}
                onClick={() => onApply(slot.id)}
                className="h-9 justify-start gap-2 border-slate-800 bg-slate-900/60 hover:border-amber-700/60 hover:bg-amber-950/20 text-slate-300 hover:text-amber-300 text-xs"
              >
                <span>{slot.icon}</span> {slot.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdornmentsPage() {
  const queryClient = useQueryClient();
  const { data: catalog = [], isLoading } = useQuery({ queryKey: CATALOG_KEY, queryFn: fetchCatalog });
  const { data: applied = [] } = useQuery({ queryKey: APPLIED_KEY, queryFn: fetchApplied });

  const [selected, setSelected] = React.useState<Adornment | null>(null);
  const [applyTarget, setApplyTarget] = React.useState<Adornment | null>(null);
  const [filter, setFilter] = React.useState<"all" | "white" | "yellow" | "red" | "owned">("all");
  const [toast, setToast] = React.useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CATALOG_KEY });
    queryClient.invalidateQueries({ queryKey: APPLIED_KEY });
  };

  const applyMutation = useMutation({
    mutationFn: applyAdornment,
    onSuccess: (data) => {
      invalidate();
      setApplyTarget(null);
      showToast(data.message ?? "Adornment applied!", true);
    },
    onError: () => showToast("Failed to apply adornment", false),
  });

  const removeMutation = useMutation({
    mutationFn: removeAdornment,
    onSuccess: () => { invalidate(); showToast("Adornment removed", true); },
    onError: () => showToast("Failed to remove adornment", false),
  });

  const appliedMap = new Map(applied.map(a => [a.gearSlot, a]));

  const filtered = catalog.filter(a => {
    if (filter === "owned") return a.owned > 0;
    if (filter === "all") return true;
    return a.color === filter;
  });

  const totalOwned = catalog.filter(a => a.owned > 0).length;
  const totalApplied = applied.length;

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 max-w-7xl mx-auto" style={{ height: "calc(100vh - 8.5rem)" }}>

      {/* ── Left: Applied slots ── */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        {/* Summary */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gem className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Adornments</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xl font-black text-amber-400">{totalOwned}</div>
              <div className="text-[10px] text-slate-600">Owned</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xl font-black text-emerald-400">{totalApplied}</div>
              <div className="text-[10px] text-slate-600">Applied</div>
            </div>
          </div>
          {totalOwned === 0 && (
            <div className="text-[10px] text-slate-700 mt-3 leading-relaxed border-t border-slate-800 pt-2 italic">
              Find adornments as loot or purchase them from the Shop.
            </div>
          )}
        </div>

        {/* Gear slots */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 shrink-0">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Applied to Gear</div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {GEAR_SLOTS.map(slot => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  applied={appliedMap.get(slot.id)}
                  onRemove={(s) => removeMutation.mutate(s)}
                  removing={removeMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ── Right: Catalog ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Header + filters */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-serif font-bold text-purple-400">Adornments</h1>
            <p className="text-xs text-slate-500 mt-0.5">Socket gem-like enhancements into your gear to boost stats</p>
          </div>
          <div className="flex gap-1.5">
            {(["all", "owned", "white", "yellow", "red"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize",
                  filter === f
                    ? f === "white"  ? "border-slate-500 bg-slate-800 text-slate-200" :
                      f === "yellow" ? "border-amber-600 bg-amber-950/50 text-amber-300" :
                      f === "red"    ? "border-red-600 bg-red-950/50 text-red-300" :
                      f === "owned"  ? "border-emerald-700 bg-emerald-950/30 text-emerald-400" :
                      "border-slate-600 bg-slate-800/60 text-slate-200"
                    : "border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700"
                )}
              >
                {f === "white" ? "🔷 White" : f === "yellow" ? "🔶 Yellow" : f === "red" ? "💎 Red" : f === "owned" ? "📦 Owned" : "All"}
                {f === "owned" && totalOwned > 0 && (
                  <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded-full bg-emerald-800/60 text-emerald-400 font-bold">{totalOwned}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1"><span>🔷</span> White — Common stat boosts (armor)</div>
          <div className="flex items-center gap-1"><span>🔶</span> Yellow — Advanced combat bonuses (weapon/armor)</div>
          <div className="flex items-center gap-1"><span>💎</span> Red — Powerful end-game enhancements (any slot)</div>
        </div>

        {/* Catalog grid */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-700">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm italic">No adornments found.</p>
              {filter === "owned" && <p className="text-xs mt-1">Earn adornments from combat loot or the shop.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
              {filtered.map(adorn => (
                <AdornmentCard
                  key={adorn.id}
                  adorn={adorn}
                  selected={selected?.id === adorn.id}
                  onSelect={a => setSelected(prev => prev?.id === a.id ? null : a)}
                  onApply={a => setApplyTarget(a)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Info panel when card selected */}
        <AnimatePresence>
          {selected && selected.owned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn("p-4 rounded-xl border-2 shrink-0", ADORN_COLOR[selected.color]?.border, ADORN_COLOR[selected.color]?.bg)}
            >
              <div className="flex items-start gap-3">
                <GemIcon color={selected.color} size="lg" />
                <div className="flex-1">
                  <div className="font-bold text-slate-100">{selected.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 italic">{selected.description}</div>
                  <div className={cn("mt-2 text-sm font-bold", ADORN_COLOR[selected.color]?.gem)}>
                    {formatStat(selected.stat, selected.value)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">Owned</div>
                  <div className="text-2xl font-black text-slate-200">{selected.owned}</div>
                  {selected.appliedTo && (
                    <div className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" /> Applied: {selected.appliedTo}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Apply dialog ── */}
      <ApplyDialog
        adorn={applyTarget}
        open={!!applyTarget}
        onClose={() => setApplyTarget(null)}
        applying={applyMutation.isPending}
        onApply={(slot) => {
          if (!applyTarget) return;
          applyMutation.mutate({ adornmentId: applyTarget.id, gearSlot: slot });
        }}
      />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-sm font-medium shadow-xl",
              toast.ok ? "bg-purple-950/90 border-purple-700 text-purple-300" : "bg-red-950/90 border-red-800 text-red-400"
            )}
          >
            {toast.ok ? "💎" : "⚠️"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
