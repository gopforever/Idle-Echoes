import * as React from "react";
import {
  useGetAATree, useSpendAAPoint,
  getGetAATreeQueryKey, getGetCharacterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lock, Zap, ChevronRight, Star, AlertTriangle } from "lucide-react";

// ── Style maps ───────────────────────────────────────────────────────────────

const TAB_META: Record<string, { label: string; color: string; accent: string; glow: string; dot: string }> = {
  // Archetype tabs
  fighter_offense:      { label: "Fighter",     color: "border-red-700 bg-red-950/30",      accent: "text-red-400",    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",    dot: "bg-red-500" },
  scout_offense:        { label: "Scout",        color: "border-green-700 bg-green-950/30",  accent: "text-green-400",  glow: "shadow-[0_0_20px_rgba(34,197,94,0.2)]",    dot: "bg-green-500" },
  mage_offense:         { label: "Mage",         color: "border-blue-700 bg-blue-950/30",    accent: "text-blue-400",   glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",   dot: "bg-blue-500" },
  priest_offense:       { label: "Priest",       color: "border-amber-700 bg-amber-950/30",  accent: "text-amber-400",  glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",   dot: "bg-amber-500" },
  general:              { label: "General",      color: "border-slate-700 bg-slate-900/30",  accent: "text-slate-300",  glow: "",                                          dot: "bg-slate-500" },
  tradeskill:           { label: "Tradeskill",   color: "border-teal-700 bg-teal-950/30",    accent: "text-teal-400",   glow: "shadow-[0_0_20px_rgba(20,184,166,0.2)]",   dot: "bg-teal-500" },
};

// Class tab colors (keyed by classId)
const CLASS_TAB_META: Record<string, { color: string; accent: string; dot: string; glow: string }> = {
  guardian:     { color: "border-blue-800 bg-blue-950/40",    accent: "text-blue-300",   dot: "bg-blue-400",   glow: "shadow-[0_0_20px_rgba(96,165,250,0.2)]" },
  berserker:    { color: "border-red-800 bg-red-950/40",      accent: "text-red-300",    dot: "bg-red-400",    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]" },
  paladin:      { color: "border-yellow-700 bg-yellow-950/40",accent: "text-yellow-300", dot: "bg-yellow-400", glow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]" },
  shadowknight: { color: "border-purple-800 bg-purple-950/40",accent: "text-purple-300", dot: "bg-purple-400", glow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]" },
  monk:         { color: "border-orange-700 bg-orange-950/40",accent: "text-orange-300", dot: "bg-orange-400", glow: "shadow-[0_0_20px_rgba(251,146,60,0.2)]" },
  bruiser:      { color: "border-rose-800 bg-rose-950/40",    accent: "text-rose-300",   dot: "bg-rose-400",   glow: "shadow-[0_0_20px_rgba(251,113,133,0.2)]" },
  ranger:       { color: "border-green-700 bg-green-950/40",  accent: "text-green-300",  dot: "bg-green-400",  glow: "shadow-[0_0_20px_rgba(74,222,128,0.2)]" },
  assassin:     { color: "border-slate-700 bg-slate-900/40",  accent: "text-slate-300",  dot: "bg-slate-400",  glow: "" },
  swashbuckler: { color: "border-cyan-700 bg-cyan-950/40",    accent: "text-cyan-300",   dot: "bg-cyan-400",   glow: "shadow-[0_0_20px_rgba(34,211,238,0.2)]" },
  brigand:      { color: "border-zinc-700 bg-zinc-900/40",    accent: "text-zinc-300",   dot: "bg-zinc-400",   glow: "" },
  troubador:    { color: "border-indigo-700 bg-indigo-950/40",accent: "text-indigo-300", dot: "bg-indigo-400", glow: "shadow-[0_0_20px_rgba(129,140,248,0.2)]" },
  dirge:        { color: "border-violet-800 bg-violet-950/40",accent: "text-violet-300", dot: "bg-violet-400", glow: "shadow-[0_0_20px_rgba(167,139,250,0.2)]" },
  wizard:       { color: "border-blue-700 bg-blue-950/40",    accent: "text-blue-300",   dot: "bg-blue-400",   glow: "shadow-[0_0_20px_rgba(96,165,250,0.2)]" },
  warlock:      { color: "border-purple-700 bg-purple-950/40",accent: "text-purple-300", dot: "bg-purple-400", glow: "shadow-[0_0_20px_rgba(192,132,252,0.2)]" },
  conjuror:     { color: "border-orange-700 bg-orange-950/40",accent: "text-orange-300", dot: "bg-orange-400", glow: "shadow-[0_0_20px_rgba(251,146,60,0.2)]" },
  necromancer:  { color: "border-stone-700 bg-stone-900/40",  accent: "text-stone-300",  dot: "bg-stone-400",  glow: "" },
  coercer:      { color: "border-pink-700 bg-pink-950/40",    accent: "text-pink-300",   dot: "bg-pink-400",   glow: "shadow-[0_0_20px_rgba(244,114,182,0.2)]" },
  illusionist:  { color: "border-fuchsia-700 bg-fuchsia-950/40",accent:"text-fuchsia-300",dot:"bg-fuchsia-400",glow:"shadow-[0_0_20px_rgba(232,121,249,0.2)]" },
  templar:      { color: "border-amber-600 bg-amber-950/40",  accent: "text-amber-300",  dot: "bg-amber-400",  glow: "shadow-[0_0_20px_rgba(251,191,36,0.2)]" },
  inquisitor:   { color: "border-red-700 bg-red-950/40",      accent: "text-red-300",    dot: "bg-red-400",    glow: "shadow-[0_0_20px_rgba(248,113,113,0.2)]" },
  mystic:       { color: "border-teal-700 bg-teal-950/40",    accent: "text-teal-300",   dot: "bg-teal-400",   glow: "shadow-[0_0_20px_rgba(45,212,191,0.2)]" },
  defiler:      { color: "border-emerald-800 bg-emerald-950/40",accent:"text-emerald-300",dot:"bg-emerald-400",glow:"shadow-[0_0_20px_rgba(52,211,153,0.2)]" },
  warden:       { color: "border-lime-700 bg-lime-950/40",    accent: "text-lime-300",   dot: "bg-lime-400",   glow: "shadow-[0_0_20px_rgba(163,230,53,0.2)]" },
  fury:         { color: "border-sky-700 bg-sky-950/40",      accent: "text-sky-300",    dot: "bg-sky-400",    glow: "shadow-[0_0_20px_rgba(56,189,248,0.2)]" },
};

const PRESTIGE_META = { color: "border-yellow-500 bg-yellow-950/30", accent: "text-yellow-400", dot: "bg-yellow-500", glow: "shadow-[0_0_24px_rgba(234,179,8,0.3)]" };
const DEFAULT_META  = { label: "Tree", color: "border-slate-700 bg-slate-900/30", accent: "text-slate-300", glow: "", dot: "bg-slate-500" };

function getTabMeta(tab: any) {
  if (tab.tabType === "prestige") return PRESTIGE_META;
  if (tab.tabType === "class" || tab.tabType === "tradeskill") {
    return CLASS_TAB_META[tab.classId ?? tab.id] ?? DEFAULT_META;
  }
  return TAB_META[tab.id] ?? DEFAULT_META;
}

// ── Node types ───────────────────────────────────────────────────────────────

type AANode = {
  id: string; name: string; description: string;
  maxRank: number; pointsPerRank: number;
  effect: string; effectValue: number; effectPerRank: number;
  requires: string[]; row: number; col: number;
  icon: string; currentRank: number;
  prestigePath?: "left" | "right";
};

function nodeState(node: AANode, allNodes: AANode[], availablePoints: number, chosenPath?: string | null): "locked" | "available" | "partial" | "maxed" {
  if (node.currentRank >= node.maxRank) return "maxed";
  // Prestige path lock
  if (node.prestigePath && chosenPath && node.prestigePath !== chosenPath) return "locked";
  const prereqsMet = node.requires.every(reqId => {
    const req = allNodes.find(n => n.id === reqId);
    return req && req.currentRank > 0;
  });
  if (!prereqsMet) return "locked";
  if (node.currentRank > 0) return "partial";
  return availablePoints > 0 ? "available" : "locked";
}

const NODE_STATE_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  locked:    { border: "border-slate-800",    bg: "bg-slate-950/60",   text: "text-slate-700",   glow: "" },
  available: { border: "border-slate-600",    bg: "bg-slate-900/60",   text: "text-slate-300",   glow: "" },
  partial:   { border: "border-amber-700/60", bg: "bg-amber-950/20",   text: "text-amber-300",   glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  maxed:     { border: "border-amber-500",    bg: "bg-amber-950/30",   text: "text-amber-400",   glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]" },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function RankPips({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-0.5 mt-2 flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div key={i} initial={false}
          animate={i < current ? { scale: [1.3, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center",
            i < current ? "bg-amber-600 border-amber-500" : "bg-slate-800 border-slate-700"
          )}
        />
      ))}
      <span className="text-[10px] text-slate-600 ml-1 self-center">{current}/{max}</span>
    </div>
  );
}

function TierConnector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center py-1 relative">
      <div className={cn("w-px h-6 transition-colors duration-500", active ? "bg-amber-600/60" : "bg-slate-800")} />
      <ChevronRight className={cn("w-3 h-3 absolute top-1.5 -translate-x-0.5 rotate-90 transition-colors duration-500", active ? "text-amber-600/60" : "text-slate-800")} />
    </div>
  );
}

function NodeCard({ node, state, selected, onSelect, onSpend, spending, canSpend }: {
  node: AANode; state: "locked" | "available" | "partial" | "maxed";
  selected: boolean; onSelect: () => void;
  onSpend: () => void; spending: boolean; canSpend: boolean;
}) {
  const s = NODE_STATE_STYLES[state];
  const isMaxed = state === "maxed";
  return (
    <motion.div layout whileHover={state !== "locked" ? { scale: 1.02 } : {}} whileTap={state !== "locked" ? { scale: 0.98 } : {}}
      onClick={state !== "locked" ? onSelect : undefined}
      className={cn(
        "relative rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer select-none",
        s.border, s.bg, s.glow,
        selected && "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-slate-950",
        state === "locked" && "cursor-default opacity-50"
      )}
    >
      {state === "locked" && <div className="absolute top-2 right-2"><Lock className="w-3 h-3 text-slate-700" /></div>}
      {isMaxed && <div className="absolute top-2 right-2"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /></div>}
      <div className="flex items-start gap-2 pr-5">
        <span className={cn("text-xl shrink-0 leading-none", state === "locked" && "grayscale")}>{node.icon}</span>
        <div className="min-w-0">
          <div className={cn("text-xs font-bold leading-tight", s.text)}>{node.name}</div>
          <div className="text-[10px] text-slate-600 mt-0.5 leading-tight line-clamp-2">{node.description}</div>
        </div>
      </div>
      {state !== "locked" && node.effectPerRank > 0 && (
        <div className={cn("mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded inline-block",
          isMaxed ? "bg-amber-900/40 text-amber-400" : "bg-slate-800 text-slate-500"
        )}>
          +{node.currentRank > 0 ? node.currentRank * node.effectPerRank : node.effectPerRank}
          {" "}{node.effect.replace(/_/g, " ")}
        </div>
      )}
      <RankPips current={node.currentRank} max={node.maxRank} />
      {!isMaxed && state !== "locked" && (
        <Button size="sm" onClick={e => { e.stopPropagation(); onSpend(); }} disabled={!canSpend || spending}
          className={cn("mt-2 w-full h-6 text-[11px] border-0",
            canSpend ? "bg-amber-700/80 hover:bg-amber-600 text-white" : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
          )}
        >
          {spending ? "…" : `+1 Rank (${node.pointsPerRank}pt)`}
        </Button>
      )}
    </motion.div>
  );
}

function DetailPanel({ node, state, onClose }: { node: AANode; state: string; onClose: () => void }) {
  const s = NODE_STATE_STYLES[state as keyof typeof NODE_STATE_STYLES] ?? NODE_STATE_STYLES.available;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="w-64 shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
    >
      <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{node.icon}</span>
            <div>
              <div className={cn("font-bold text-sm leading-tight", s.text)}>{node.name}</div>
              <div className="text-[10px] text-slate-600 capitalize">{node.effect.replace(/_/g, " ")}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-400 text-lg leading-none">×</button>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-slate-800/40">
        <p className="text-xs text-slate-400 italic leading-relaxed">{node.description}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-2">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Rank Progression</div>
          {Array.from({ length: node.maxRank }, (_, i) => i + 1).map(rank => (
            <div key={rank} className={cn("flex items-center justify-between py-1.5 px-2 rounded-lg text-xs",
              rank <= node.currentRank ? "bg-amber-950/30 border border-amber-800/30" : "bg-slate-900/40 border border-slate-800/30"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                  rank <= node.currentRank ? "border-amber-600 bg-amber-700 text-amber-100" : "border-slate-700 bg-slate-800 text-slate-600"
                )}>{rank}</div>
                <span className={rank <= node.currentRank ? "text-amber-300" : "text-slate-600"}>Rank {rank}</span>
              </div>
              <span className={cn("font-bold tabular-nums", rank <= node.currentRank ? "text-amber-400" : "text-slate-700")}>
                +{rank === 1 ? node.effectValue : node.effectValue + node.effectPerRank * (rank - 1)}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
      {node.requires.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800/40">
          <div className="text-[10px] text-slate-700 uppercase tracking-widest font-semibold mb-1">Requires</div>
          {node.requires.map(r => <div key={r} className="text-[11px] text-slate-500">· {r.replace(/_/g, " ")}</div>)}
        </div>
      )}
    </motion.div>
  );
}

// ── Prestige Tree (special two-path layout) ──────────────────────────────────

function PrestigeTree({ tab, availablePoints, onSpend, spending, selectedNodeId, onSelectNode }: {
  tab: any; availablePoints: number;
  onSpend: (id: string) => void; spending: boolean;
  selectedNodeId: string | null; onSelectNode: (id: string) => void;
}) {
  const chosenPath = tab.chosenPrestigePath as "left" | "right" | null;
  const allNodes: AANode[] = tab.nodes;
  const rows = [1, 2, 3];

  if (tab.isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Lock className="w-8 h-8 text-yellow-700/50" />
        <div className="text-yellow-700 font-semibold text-sm">Prestige Locked</div>
        <div className="text-slate-600 text-xs text-center max-w-xs">
          Spend {tab.prestigeMinSpent ?? 50} total AA points to unlock your prestige specialization.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Path header */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={cn("text-center py-2 px-3 rounded-lg border transition-all",
          chosenPath === "left"  ? "border-yellow-500 bg-yellow-950/40 text-yellow-400 font-bold" :
          chosenPath === "right" ? "border-slate-800 bg-slate-900/20 text-slate-700 line-through" :
          "border-slate-700 bg-slate-900/30 text-slate-400"
        )}>
          <div className="text-xs font-semibold">{tab.prestigeLeftName ?? "Left Path"}</div>
          {!chosenPath && <div className="text-[10px] text-slate-600 mt-0.5">Choose this path</div>}
        </div>
        <div className={cn("text-center py-2 px-3 rounded-lg border transition-all",
          chosenPath === "right" ? "border-yellow-500 bg-yellow-950/40 text-yellow-400 font-bold" :
          chosenPath === "left"  ? "border-slate-800 bg-slate-900/20 text-slate-700 line-through" :
          "border-slate-700 bg-slate-900/30 text-slate-400"
        )}>
          <div className="text-xs font-semibold">{tab.prestigeRightName ?? "Right Path"}</div>
          {!chosenPath && <div className="text-[10px] text-slate-600 mt-0.5">Choose this path</div>}
        </div>
      </div>

      {!chosenPath && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-950/20 border border-yellow-800/30 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
          <span className="text-[11px] text-yellow-700">Investing in a path permanently locks you out of the other.</span>
        </div>
      )}

      {rows.map(row => {
        const rowLeft  = allNodes.filter(n => n.row === row && n.prestigePath === "left").sort((a,b) => a.col - b.col);
        const rowRight = allNodes.filter(n => n.row === row && n.prestigePath === "right").sort((a,b) => a.col - b.col);
        return (
          <div key={row}>
            {row > 1 && <TierConnector active={allNodes.filter(n => n.row === row - 1).some(n => n.currentRank > 0)} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                {rowLeft.map(node => {
                  const st = nodeState(node, allNodes, availablePoints, chosenPath);
                  return (
                    <NodeCard key={node.id} node={node} state={st}
                      selected={selectedNodeId === node.id}
                      onSelect={() => onSelectNode(node.id)}
                      onSpend={() => onSpend(node.id)}
                      spending={spending}
                      canSpend={st !== "locked" && st !== "maxed" && availablePoints >= node.pointsPerRank}
                    />
                  );
                })}
              </div>
              <div className="space-y-2">
                {rowRight.map(node => {
                  const st = nodeState(node, allNodes, availablePoints, chosenPath);
                  return (
                    <NodeCard key={node.id} node={node} state={st}
                      selected={selectedNodeId === node.id}
                      onSelect={() => onSelectNode(node.id)}
                      onSpend={() => onSpend(node.id)}
                      spending={spending}
                      canSpend={st !== "locked" && st !== "maxed" && availablePoints >= node.pointsPerRank}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── XP Ratio Slider ──────────────────────────────────────────────────────────

function XpRatioSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">XP → AA Ratio</span>
        <span className="text-[11px] font-bold text-purple-400">{local}%</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={local}
        onChange={e => setLocal(Number(e.target.value))}
        onMouseUp={() => onChange(local)}
        onTouchEnd={() => onChange(local)}
        className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
      />
      <div className="flex justify-between text-[9px] text-slate-700">
        <span>Level XP: {100 - local}%</span>
        <span>AA XP: {local}%</span>
      </div>
      {local === 100 && (
        <div className="text-[10px] text-amber-600 leading-tight">Level XP halted — all combat XP converts to AA points.</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AATreePage() {
  const { data: aaTree, isLoading } = useGetAATree();
  const spendPoint = useSpendAAPoint();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; ok: boolean } | null>(null);
  const [showRespecConfirm, setShowRespecConfirm] = React.useState(false);

  const setXpRatio = useMutation({
    mutationFn: (ratio: number) =>
      fetch("/api/aa/xp-ratio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratio }),
        credentials: "include",
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAATreeQueryKey() }),
  });

  const doRespec = useMutation({
    mutationFn: () =>
      fetch("/api/aa/respec", {
        method: "POST",
        credentials: "include",
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Respec failed");
        return data;
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getGetAATreeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
      showToast(data.message ?? "AA points refunded!", true);
      setShowRespecConfirm(false);
    },
    onError: (e: any) => {
      showToast(e.message ?? "Respec failed", false);
      setShowRespecConfirm(false);
    },
  });

  React.useEffect(() => {
    if (aaTree?.tabs?.[0] && !activeTab) setActiveTab(aaTree.tabs[0].id);
  }, [aaTree]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSpend = (nodeId: string) => {
    spendPoint.mutate({ data: { nodeId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAATreeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        showToast("AA point invested!", true);
      },
      onError: (e: any) => showToast(e?.response?.data?.error ?? "Not enough AA points", false),
    });
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    </div>
  );

  const tabs = aaTree?.tabs ?? [];
  const currentTab = tabs.find((t: any) => t.id === activeTab);
  const allNodes: AANode[] = (currentTab?.nodes ?? []).map((n: any) => ({ ...n, effect: n.effect ?? "" })) as AANode[];
  const availablePoints: number = aaTree?.availablePoints ?? 0;
  const spentPoints: number    = aaTree?.spentPoints ?? 0;
  const aaXpRatio: number      = (aaTree as any)?.aaXpRatio ?? 0;
  const aaRespecUsed: boolean  = (aaTree as any)?.aaRespecUsed ?? false;
  const tabMeta = getTabMeta(currentTab ?? {});
  const selectedNode  = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : null;
  const selectedState = selectedNode ? nodeState(selectedNode, allNodes, availablePoints, (currentTab as any)?.chosenPrestigePath) : "locked";
  const isPrestigeTab = (currentTab as any)?.tabType === "prestige";

  // Compute stat bonuses across all tabs
  const allTabNodes = (tabs as any[]).flatMap((t: any) => t.nodes as AANode[]);
  const totalBonuses = allTabNodes.filter(n => n.currentRank > 0).reduce((acc: Record<string, number>, n) => {
    const total = n.effectValue + n.effectPerRank * Math.max(0, n.currentRank - 1);
    acc[n.effect] = (acc[n.effect] ?? 0) + total;
    return acc;
  }, {});

  const maxRow = allNodes.reduce((max, n) => Math.max(max, n.row), 3);
  const rows = Array.from({ length: maxRow }, (_, i) => i + 1);
  const tierHasActive = (row: number) => allNodes.filter(n => n.row === row - 1).some(n => n.currentRank > 0);

  // Group tabs by type for the tab bar
  const archetypeTabs = tabs.filter((t: any) => !t.tabType || t.tabType === "archetype");
  const classTabs     = tabs.filter((t: any) => t.tabType === "class");
  const prestigeTabs  = tabs.filter((t: any) => t.tabType === "prestige");
  const tradeskillTabs= tabs.filter((t: any) => t.tabType === "tradeskill");

  function TabButton({ tab }: { tab: any }) {
    const m = getTabMeta(tab);
    const invested = (tab.nodes as AANode[]).filter(n => n.currentRank > 0).length;
    const isLocked = tab.isLocked;
    return (
      <button
        key={tab.id}
        onClick={() => { setActiveTab(tab.id); setSelectedNodeId(null); }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
          activeTab === tab.id
            ? cn("bg-slate-900 text-slate-200 shadow-md", m.color.split(" ")[0])
            : "border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700 bg-slate-950/60",
          isLocked && "opacity-50"
        )}
      >
        {isLocked ? <Lock className="w-2.5 h-2.5 shrink-0 text-yellow-700" /> : <div className={cn("w-2 h-2 rounded-full shrink-0", m.dot)} />}
        <span>{tab.name}</span>
        {invested > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-500 border border-amber-800/40 font-bold">{invested}</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex gap-4 max-w-7xl mx-auto" style={{ height: "calc(100vh - 8.5rem)" }}>

      {/* ── Left: Stats + XP slider + Respec ── */}
      <div className="w-52 shrink-0 flex flex-col gap-3">
        {/* Points */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" /> AA Points
          </div>
          <div className="text-3xl font-black text-purple-400">{availablePoints}</div>
          <div className="text-xs text-slate-600 mt-0.5">available</div>
          <div className="text-[10px] text-slate-700 mt-1">{spentPoints} spent total</div>
          {availablePoints === 0 && (
            <div className="text-[10px] text-slate-700 mt-2 leading-relaxed border-t border-slate-800 pt-2">
              Level 10+ grants 1 AA per level. Set XP ratio below to earn more.
            </div>
          )}
        </div>

        {/* XP Ratio */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <XpRatioSlider
            value={aaXpRatio}
            onChange={ratio => setXpRatio.mutate(ratio)}
          />
        </div>

        {/* Respec */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Respec</div>
          {aaRespecUsed ? (
            <div className="text-[11px] text-slate-700 italic">Respec already used.</div>
          ) : showRespecConfirm ? (
            <div className="space-y-2">
              <div className="text-[11px] text-amber-600 leading-snug">Costs 10,000 gold. All AA investments reset. One-time only.</div>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => doRespec.mutate()} disabled={doRespec.isPending}
                  className="flex-1 h-6 text-[10px] bg-red-900/80 hover:bg-red-800 text-red-200 border-0">
                  {doRespec.isPending ? "…" : "Confirm"}
                </Button>
                <Button size="sm" onClick={() => setShowRespecConfirm(false)}
                  className="flex-1 h-6 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 border-0">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowRespecConfirm(true)}
              className="w-full h-7 text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700">
              Respec (10,000g)
            </Button>
          )}
        </div>

        {/* Active bonuses */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden flex flex-col min-h-0">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">Active Bonuses</div>
          {Object.keys(totalBonuses).length === 0 ? (
            <div className="text-xs text-slate-800 italic text-center pt-4">None yet</div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1.5">
                {Object.entries(totalBonuses).map(([effect, val]) => (
                  <div key={effect} className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-500 capitalize leading-tight">{effect.replace(/_/g, " ")}</span>
                    <span className="text-[10px] font-bold text-amber-400 tabular-nums shrink-0">+{val}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ── Center: Tree ── */}
      <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0">
        {/* Tab bar — grouped */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* Row 1: Archetype + General */}
          <div className="flex gap-1 flex-wrap">
            {archetypeTabs.map((tab: any) => <TabButton key={tab.id} tab={tab} />)}
          </div>
          {/* Row 2: Class + Tradeskill + Prestige */}
          {(classTabs.length > 0 || tradeskillTabs.length > 0 || prestigeTabs.length > 0) && (
            <div className="flex gap-1 flex-wrap">
              {classTabs.map((tab: any) => <TabButton key={tab.id} tab={tab} />)}
              {tradeskillTabs.map((tab: any) => <TabButton key={tab.id} tab={tab} />)}
              {prestigeTabs.map((tab: any) => (
                <TabButton key={tab.id} tab={tab} />
              ))}
            </div>
          )}
        </div>

        {/* Tree canvas */}
        <ScrollArea className="flex-1">
          <div className={cn("rounded-xl border p-5 min-h-full relative", tabMeta.color, tabMeta.glow)}>
            {isPrestigeTab ? (
              <PrestigeTree
                tab={currentTab}
                availablePoints={availablePoints}
                onSpend={handleSpend}
                spending={spendPoint.isPending}
                selectedNodeId={selectedNodeId}
                onSelectNode={id => setSelectedNodeId(prev => prev === id ? null : id)}
              />
            ) : (
              rows.map(row => {
                const rowNodes = allNodes.filter(n => n.row === row);
                if (rowNodes.length === 0) return null;
                const sorted = [...rowNodes].sort((a, b) => a.col - b.col);
                return (
                  <div key={row}>
                    {row > 1 && <TierConnector active={tierHasActive(row)} />}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-slate-800/60" />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-700 font-bold flex items-center gap-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", tabMeta.dot)} />
                        Tier {row}
                      </span>
                      <div className="h-px flex-1 bg-slate-800/60" />
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(sorted.length, 3)}, 1fr)` }}>
                      {sorted.map(node => {
                        const state = nodeState(node, allNodes, availablePoints);
                        const canSpend = state !== "locked" && state !== "maxed" && availablePoints >= node.pointsPerRank;
                        return (
                          <NodeCard key={node.id} node={node} state={state}
                            selected={selectedNodeId === node.id}
                            onSelect={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                            onSpend={() => handleSpend(node.id)}
                            spending={spendPoint.isPending}
                            canSpend={canSpend}
                          />
                        );
                      })}
                      {Array.from({ length: Math.max(0, 3 - sorted.length) }).map((_, i) => (
                        <div key={`pad-${i}`} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {allNodes.length === 0 && !isPrestigeTab && (
              <div className="text-center text-slate-700 py-16 text-sm italic">No abilities in this tree.</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: Detail panel ── */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <DetailPanel key={selectedNode.id} node={selectedNode} state={selectedState} onClose={() => setSelectedNodeId(null)} />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-sm font-medium shadow-xl",
              toast.ok ? "bg-amber-950/90 border-amber-700 text-amber-300" : "bg-red-950/90 border-red-800 text-red-400"
            )}
          >
            {toast.ok ? "✨" : "⚠️"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
