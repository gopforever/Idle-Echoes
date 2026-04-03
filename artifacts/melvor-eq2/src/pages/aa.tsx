import * as React from "react";
import {
  useGetAATree, useSpendAAPoint,
  getGetAATreeQueryKey, getGetCharacterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lock, Zap, ChevronRight, Star, Info } from "lucide-react";

// ── Style maps ──────────────────────────────────────────────────────────────

const TAB_META: Record<string, { label: string; color: string; accent: string; glow: string; dot: string }> = {
  fighter_offense: { label: "Fighter", color: "border-red-700 bg-red-950/30",   accent: "text-red-400",    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",     dot: "bg-red-500" },
  scout_offense:   { label: "Scout",   color: "border-green-700 bg-green-950/30",accent: "text-green-400",  glow: "shadow-[0_0_20px_rgba(34,197,94,0.2)]",     dot: "bg-green-500" },
  mage_offense:    { label: "Mage",    color: "border-blue-700 bg-blue-950/30",  accent: "text-blue-400",   glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",    dot: "bg-blue-500" },
  priest_offense:  { label: "Priest",  color: "border-amber-700 bg-amber-950/30",accent: "text-amber-400",  glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",    dot: "bg-amber-500" },
  general:         { label: "General", color: "border-slate-700 bg-slate-900/30",accent: "text-slate-300",  glow: "",                                           dot: "bg-slate-500" },
};

const DEFAULT_META = { label: "Tree", color: "border-slate-700 bg-slate-900/30", accent: "text-slate-300", glow: "", dot: "bg-slate-500" };

// ── Node state helpers ───────────────────────────────────────────────────────

type AANode = {
  id: string; name: string; description: string;
  maxRank: number; pointsPerRank: number;
  effect: string; effectValue: number; effectPerRank: number;
  requires: string[]; row: number; col: number;
  icon: string; currentRank: number;
};

function nodeState(node: AANode, allNodes: AANode[], availablePoints: number): "locked" | "available" | "partial" | "maxed" {
  if (node.currentRank >= node.maxRank) return "maxed";
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

// ── RankPip ──────────────────────────────────────────────────────────────────

function RankPips({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-0.5 mt-2 flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={i < current ? { scale: [1.3, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center",
            i < current
              ? "bg-amber-600 border-amber-500"
              : "bg-slate-800 border-slate-700"
          )}
        />
      ))}
      <span className="text-[10px] text-slate-600 ml-1 self-center">{current}/{max}</span>
    </div>
  );
}

// ── Connector SVG ─────────────────────────────────────────────────────────────

function TierConnector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center py-1 relative">
      <div className={cn("w-px h-6 transition-colors duration-500", active ? "bg-amber-600/60" : "bg-slate-800")} />
      <ChevronRight className={cn("w-3 h-3 absolute top-1.5 -translate-x-0.5 rotate-90 transition-colors duration-500", active ? "text-amber-600/60" : "text-slate-800")} />
    </div>
  );
}

// ── Node Card ─────────────────────────────────────────────────────────────────

function NodeCard({
  node, state, selected, onSelect, onSpend, spending, canSpend, tabMeta
}: {
  node: AANode; state: "locked" | "available" | "partial" | "maxed";
  selected: boolean; onSelect: () => void;
  onSpend: () => void; spending: boolean; canSpend: boolean; tabMeta: typeof DEFAULT_META;
}) {
  const s = NODE_STATE_STYLES[state];
  const isMaxed = state === "maxed";

  return (
    <motion.div
      layout
      whileHover={state !== "locked" ? { scale: 1.02 } : {}}
      whileTap={state !== "locked" ? { scale: 0.98 } : {}}
      onClick={state !== "locked" ? onSelect : undefined}
      className={cn(
        "relative rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer select-none",
        s.border, s.bg, s.glow,
        selected && "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-slate-950",
        state === "locked" && "cursor-default opacity-50"
      )}
    >
      {/* Lock overlay */}
      {state === "locked" && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-slate-700" />
        </div>
      )}

      {/* Maxed badge */}
      {isMaxed && (
        <div className="absolute top-2 right-2">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 pr-5">
        <span className={cn("text-xl shrink-0 leading-none", state === "locked" && "grayscale")}>{node.icon}</span>
        <div className="min-w-0">
          <div className={cn("text-xs font-bold leading-tight", s.text)}>{node.name}</div>
          <div className="text-[10px] text-slate-600 mt-0.5 leading-tight line-clamp-2">{node.description}</div>
        </div>
      </div>

      {/* Effect badge */}
      {state !== "locked" && node.effectPerRank > 0 && (
        <div className={cn(
          "mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded inline-block",
          isMaxed ? "bg-amber-900/40 text-amber-400" : "bg-slate-800 text-slate-500"
        )}>
          +{node.currentRank > 0 ? node.currentRank * node.effectPerRank : node.effectPerRank}
          {node.effect.includes("percent") || node.effect.includes("chance") || node.effect.includes("haste") ? "%" : ""}
          {" "}{node.effect.replace(/_/g, " ")}
        </div>
      )}

      {/* Rank pips */}
      <RankPips current={node.currentRank} max={node.maxRank} />

      {/* Spend button */}
      {!isMaxed && state !== "locked" && (
        <Button
          size="sm"
          onClick={e => { e.stopPropagation(); onSpend(); }}
          disabled={!canSpend || spending}
          className={cn(
            "mt-2 w-full h-6 text-[11px] border-0",
            canSpend
              ? "bg-amber-700/80 hover:bg-amber-600 text-white"
              : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
          )}
        >
          {spending ? "…" : isMaxed ? "Maxed" : `+1 Rank (${node.pointsPerRank}pt)`}
        </Button>
      )}
    </motion.div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, state, onClose }: { node: AANode; state: string; onClose: () => void }) {
  const s = NODE_STATE_STYLES[state as keyof typeof NODE_STATE_STYLES] ?? NODE_STATE_STYLES.available;
  const ranks = Array.from({ length: node.maxRank }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="w-64 shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className={cn("px-4 py-3 border-b border-slate-800/60 bg-slate-900/60")}>
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

      {/* Description */}
      <div className="px-4 py-3 border-b border-slate-800/40">
        <p className="text-xs text-slate-400 italic leading-relaxed">{node.description}</p>
      </div>

      {/* Rank breakdown */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-2">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Rank Progression</div>
          {ranks.map(rank => (
            <div
              key={rank}
              className={cn(
                "flex items-center justify-between py-1.5 px-2 rounded-lg text-xs",
                rank <= node.currentRank ? "bg-amber-950/30 border border-amber-800/30" : "bg-slate-900/40 border border-slate-800/30"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border", rank <= node.currentRank ? "border-amber-600 bg-amber-700 text-amber-100" : "border-slate-700 bg-slate-800 text-slate-600")}>
                  {rank}
                </div>
                <span className={rank <= node.currentRank ? "text-amber-300" : "text-slate-600"}>Rank {rank}</span>
              </div>
              <span className={cn("font-bold tabular-nums", rank <= node.currentRank ? "text-amber-400" : "text-slate-700")}>
                +{rank * node.effectPerRank}
                {node.effect.includes("percent") || node.effect.includes("chance") || node.effect.includes("haste") ? "%" : ""}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Requirements */}
      {node.requires.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800/40">
          <div className="text-[10px] text-slate-700 uppercase tracking-widest font-semibold mb-1">Requires</div>
          {node.requires.map(r => (
            <div key={r} className="text-[11px] text-slate-500">· {r.replace(/_/g, " ")}</div>
          ))}
        </div>
      )}
    </motion.div>
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

  React.useEffect(() => {
    if (aaTree?.tabs?.[0] && !activeTab) setActiveTab(aaTree.tabs[0].id);
  }, [aaTree]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSpend = (nodeId: string) => {
    spendPoint.mutate({ data: { nodeId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAATreeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        showToast("AA point invested!", true);
      },
      onError: (e: any) => {
        showToast(e?.response?.data?.error ?? "Not enough AA points", false);
      },
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
  const allNodes: AANode[] = currentTab?.nodes ?? [];
  const availablePoints: number = aaTree?.availablePoints ?? 0;
  const spentPoints: number = aaTree?.spentPoints ?? 0;
  const tabMeta = TAB_META[activeTab ?? ""] ?? DEFAULT_META;
  const selectedNode = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : null;
  const selectedState = selectedNode ? nodeState(selectedNode, allNodes, availablePoints) : "locked";

  // Compute stat bonuses from all tabs
  const allTabNodes = (aaTree?.tabs ?? []).flatMap((t: any) => t.nodes as AANode[]);
  const totalBonuses = allTabNodes
    .filter(n => n.currentRank > 0)
    .reduce((acc: Record<string, number>, n) => {
      const key = n.effect;
      acc[key] = (acc[key] ?? 0) + n.currentRank * n.effectPerRank;
      return acc;
    }, {});

  // Group nodes by row (tier)
  const rows = [1, 2, 3];
  const tierHasActive = (row: number) =>
    allNodes.filter(n => n.row === row - 1).some(n => n.currentRank > 0);

  return (
    <div className="flex gap-4 max-w-7xl mx-auto" style={{ height: "calc(100vh - 8.5rem)" }}>

      {/* ── Left: Stat summary ── */}
      <div className="w-48 shrink-0 flex flex-col gap-3">
        {/* Points header */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" /> AA Points
          </div>
          <div className="text-3xl font-black text-purple-400">{availablePoints}</div>
          <div className="text-xs text-slate-600 mt-0.5">available</div>
          <div className="text-[10px] text-slate-700 mt-1">{spentPoints} spent total</div>
          {availablePoints === 0 && (
            <div className="text-[10px] text-slate-700 mt-2 leading-relaxed border-t border-slate-800 pt-2">
              Reach level 10+ to earn more AA points
            </div>
          )}
        </div>

        {/* Active bonuses */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden flex flex-col">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">Active Bonuses</div>
          {Object.keys(totalBonuses).length === 0 ? (
            <div className="text-xs text-slate-800 italic text-center pt-4">None yet</div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1.5">
                {Object.entries(totalBonuses).map(([effect, val]) => (
                  <div key={effect} className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-500 capitalize leading-tight">{effect.replace(/_/g, " ")}</span>
                    <span className="text-[10px] font-bold text-amber-400 tabular-nums shrink-0">
                      +{val}{effect.includes("percent") || effect.includes("chance") || effect.includes("haste") ? "%" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ── Center: Tree ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
        {/* Tab bar */}
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {tabs.map((tab: any) => {
            const m = TAB_META[tab.id] ?? DEFAULT_META;
            const tabNodes: AANode[] = tab.nodes;
            const invested = tabNodes.filter(n => n.currentRank > 0).length;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedNodeId(null); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? cn("bg-slate-900 text-slate-200 shadow-md", m.color.split(" ")[0])
                    : "border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700 bg-slate-950/60"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", m.dot)} />
                {tab.name}
                {invested > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-500 border border-amber-800/40 font-bold">
                    {invested}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tree canvas */}
        <ScrollArea className="flex-1">
          <div className={cn("rounded-xl border p-5 min-h-full relative", tabMeta.color)}>
            {rows.map(row => {
              const rowNodes = allNodes.filter(n => n.row === row);
              if (rowNodes.length === 0) return null;
              const sorted = [...rowNodes].sort((a, b) => a.col - b.col);

              return (
                <div key={row}>
                  {/* Tier connector from previous row */}
                  {row > 1 && (
                    <TierConnector active={tierHasActive(row)} />
                  )}

                  {/* Tier label */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-slate-800/60" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-700 font-bold flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-full", tabMeta.dot)} />
                      Tier {row}
                    </span>
                    <div className="h-px flex-1 bg-slate-800/60" />
                  </div>

                  {/* Node row */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(sorted.length, 3)}, 1fr)` }}>
                    {sorted.map(node => {
                      const state = nodeState(node, allNodes, availablePoints);
                      const canSpend = state !== "locked" && state !== "maxed" && availablePoints >= node.pointsPerRank;
                      return (
                        <NodeCard
                          key={node.id}
                          node={node}
                          state={state}
                          selected={selectedNodeId === node.id}
                          onSelect={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                          onSpend={() => handleSpend(node.id)}
                          spending={spendPoint.isPending}
                          canSpend={canSpend}
                          tabMeta={tabMeta}
                        />
                      );
                    })}
                    {/* Pad empty columns so grid is consistent */}
                    {Array.from({ length: Math.max(0, 3 - sorted.length) }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}
                  </div>
                </div>
              );
            })}

            {allNodes.length === 0 && (
              <div className="text-center text-slate-700 py-16 text-sm italic">
                No abilities in this tree for your archetype.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: Detail panel ── */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <DetailPanel
            key={selectedNode.id}
            node={selectedNode}
            state={selectedState}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-sm font-medium shadow-xl",
              toast.ok
                ? "bg-amber-950/90 border-amber-700 text-amber-300"
                : "bg-red-950/90 border-red-800 text-red-400"
            )}
          >
            {toast.ok ? "✨" : "⚠️"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
