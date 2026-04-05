import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiUrl } from "@/lib/api";
import { Lock } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GatheringNode {
  id: string;
  name: string;
  description: string;
  skillId: string;
  requiredLevel: number;
  xpPerGather: number;
  gatherTimeSeconds: number;
  yields: Array<{ itemId: string; baseQuantity: number; weight: number }>;
  rareYield?: { itemId: string; quantity: number };
  icon: string;
  skillLevel: number;
  unlocked: boolean;
  rareChance: number;
  yieldBonus: number;
}

interface GatheringSession {
  skillId: string;
  nodeId: string;
  nodeName: string;
  nodeIcon: string;
  gatherTimeSeconds: number;
  skillLevel: number;
  nextTickIn: number;
  totalGathered: number;
}

interface GatheringStatus {
  sessions: GatheringSession[];
  yields: Array<{
    skillId: string;
    nodeId: string;
    items: Array<{ itemId: string; quantity: number }>;
    rareItemIds: string[];
  }>;
}

const SKILL_META: Record<string, { label: string; icon: string; color: string }> = {
  mining:       { label: "Mining",       icon: "⛏️",  color: "text-orange-400"  },
  woodcutting:  { label: "Woodcutting",  icon: "🪓",  color: "text-green-400"   },
  fishing:      { label: "Fishing",      icon: "🎣",  color: "text-blue-400"    },
  herbalism:    { label: "Herbalism",    icon: "🌿",  color: "text-emerald-400" },
  foraging:     { label: "Foraging",     icon: "🫐",  color: "text-lime-400"    },
  skinning:     { label: "Skinning",     icon: "🐾",  color: "text-amber-600"   },
  prospecting:  { label: "Prospecting",  icon: "🔍",  color: "text-cyan-400"    },
  archaeology:  { label: "Archaeology",  icon: "🏛️",  color: "text-yellow-600"  },
};

const SKILL_ORDER = ["mining", "woodcutting", "fishing", "herbalism", "foraging", "skinning", "prospecting", "archaeology"];

// ─── API Hooks ─────────────────────────────────────────────────────────────────

function useGatheringNodes() {
  return useQuery<GatheringNode[]>({
    queryKey: ["gathering", "nodes"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/gathering/nodes"));
      if (!res.ok) throw new Error("Failed to fetch nodes");
      return res.json();
    },
    staleTime: 30000,
  });
}

function useGatheringStatus() {
  return useQuery<GatheringStatus>({
    queryKey: ["gathering", "status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/gathering/status"));
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 3000,
  });
}

function useStartGathering() {
  return useMutation({
    mutationFn: async ({ skillId, nodeId }: { skillId: string; nodeId: string }) => {
      const res = await fetch(apiUrl("/api/gathering/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, nodeId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start");
      }
      return res.json();
    },
  });
}

function useStopGathering() {
  return useMutation({
    mutationFn: async ({ skillId }: { skillId: string }) => {
      const res = await fetch(apiUrl("/api/gathering/stop"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      if (!res.ok) throw new Error("Failed to stop");
      return res.json();
    },
  });
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  activeNodeId,
  session,
  onStart,
  onStop,
  isPending,
}: {
  node: GatheringNode;
  activeNodeId?: string;
  session?: GatheringSession;
  onStart: () => void;
  onStop: () => void;
  isPending: boolean;
}) {
  const isActive = activeNodeId === node.id;
  const isLocked = !node.unlocked;

  const baseQty = node.yields.reduce((s, y) => s + y.baseQuantity, 0);
  const bonusPct = node.yieldBonus;
  const rareChancePct = (node.rareChance * 100).toFixed(1);
  const avgYieldPerGather = baseQty * (1 + bonusPct / 100);
  const yieldPerHour = Math.round(avgYieldPerGather * (3600 / node.gatherTimeSeconds));
  const xpPerHour = Math.round(node.xpPerGather * (3600 / node.gatherTimeSeconds));

  const tickProgress = React.useMemo(() => {
    if (!isActive || !session) return 0;
    const elapsed = session.gatherTimeSeconds - session.nextTickIn;
    return Math.min(100, (elapsed / session.gatherTimeSeconds) * 100);
  }, [isActive, session]);

  return (
    <Card className={`relative transition-all border ${
      isActive
        ? "border-primary/60 shadow-[0_0_18px_rgba(245,158,11,0.18)] bg-primary/5"
        : isLocked
        ? "border-slate-800/50 opacity-60 bg-card/20"
        : "border-slate-800 bg-card/40 hover:border-slate-700"
    } backdrop-blur`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded bg-slate-900 border ${isLocked ? "border-slate-800" : "border-slate-700"} relative`}>
              {node.icon}
              {isLocked && (
                <div className="absolute -top-1.5 -right-1.5 bg-slate-900 rounded-full p-0.5">
                  <Lock className="w-3 h-3 text-slate-500" />
                </div>
              )}
            </div>
            <div>
              <div className={`font-bold text-sm ${isLocked ? "text-slate-500" : "text-slate-200"}`}>{node.name}</div>
              <div className="text-[11px] text-slate-400">{node.description}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={`text-[10px] ${isLocked ? "text-slate-500 border-slate-700" : "text-primary border-primary/30"}`}>
              Req Lv {node.requiredLevel}
            </Badge>
            <span className={`text-[10px] ${isLocked ? "text-red-500/70" : "text-slate-400"}`}>
              Your Lv {node.skillLevel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="text-slate-400">
            <span className="text-slate-500">Yield: </span>
            <span className="text-slate-300">{baseQty}× {node.yields[0]?.itemId.replace(/_/g, " ")}</span>
            {bonusPct > 0 && <span className="text-blue-400 ml-1">(+{bonusPct}%)</span>}
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">Time: </span>
            <span className="text-slate-300">{node.gatherTimeSeconds}s/gather</span>
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">XP: </span>
            <span className="text-green-400">+{node.xpPerGather} xp</span>
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">XP/hr: </span>
            <span className="text-green-300">{xpPerHour.toLocaleString()}</span>
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">Yield/hr: </span>
            <span className="text-blue-300">{yieldPerHour.toLocaleString()}</span>
          </div>
          {node.rareYield && (
            <div className="text-slate-400">
              <span className="text-slate-500">Rare: </span>
              <span className={node.rareChance > 0 ? "text-yellow-400" : "text-slate-600"}>
                {node.rareChance > 0 ? `${rareChancePct}% ${node.rareYield.itemId.replace(/_/g, " ")}` : "Skill 50+ to unlock"}
              </span>
            </div>
          )}
        </div>

        {isActive && session && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="text-primary animate-pulse">Gathering…</span>
              <span>Next in {session.nextTickIn}s · {session.totalGathered} gathered</span>
            </div>
            <Progress value={tickProgress} className="h-1.5 bg-slate-900 [&>div]:bg-primary" />
          </div>
        )}

        <div className="pt-1">
          {isLocked ? (
            <Button size="sm" variant="ghost" disabled className="w-full text-slate-600 text-[11px]">
              Requires Level {node.requiredLevel}
            </Button>
          ) : isActive ? (
            <Button size="sm" variant="destructive" onClick={onStop} disabled={isPending} className="w-full text-[11px]">
              Stop Gathering
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onStart} disabled={isPending} className="w-full text-[11px]">
              {activeNodeId ? "Switch Here" : "Start Gathering"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function GatheringPage() {
  const queryClient = useQueryClient();
  const { data: nodes, isLoading: nodesLoading } = useGatheringNodes();
  const { data: status } = useGatheringStatus();
  const startMutation = useStartGathering();
  const stopMutation = useStopGathering();

  const [recentYields, setRecentYields] = React.useState<Array<{ itemId: string; qty: number; rare: boolean; ts: number }>>([]);

  React.useEffect(() => {
    if (!status?.yields) return;
    const newEntries: typeof recentYields = [];
    for (const yieldGroup of status.yields) {
      for (const item of yieldGroup.items) {
        newEntries.push({
          itemId: item.itemId,
          qty: item.quantity,
          rare: yieldGroup.rareItemIds.includes(item.itemId),
          ts: Date.now(),
        });
      }
    }
    if (newEntries.length > 0) {
      setRecentYields(prev => [...newEntries, ...prev].slice(0, 15));
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  }, [status?.yields, queryClient]);

  const activeSessionMap = React.useMemo(() => {
    const map = new Map<string, GatheringSession>();
    for (const s of status?.sessions ?? []) {
      map.set(s.skillId, s);
    }
    return map;
  }, [status?.sessions]);

  const handleStart = (skillId: string, nodeId: string) => {
    startMutation.mutate({ skillId, nodeId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["gathering"] });
      },
    });
  };

  const handleStop = (skillId: string) => {
    stopMutation.mutate({ skillId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["gathering"] });
      },
    });
  };

  const groupedNodes = React.useMemo(() => {
    const groups: Record<string, GatheringNode[]> = {};
    for (const node of nodes ?? []) {
      if (!groups[node.skillId]) groups[node.skillId] = [];
      groups[node.skillId].push(node);
    }
    return groups;
  }, [nodes]);

  if (nodesLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-lg bg-slate-800/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-200">Gathering</h1>
          <p className="text-sm text-slate-400 mt-0.5">Harvest resources from Norrath's wilderness</p>
        </div>
        {activeSessionMap.size > 0 && (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
            {activeSessionMap.size} active session{activeSessionMap.size > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="mining">
            <TabsList className="bg-slate-900 border border-slate-800 w-full flex-wrap h-auto gap-y-1 p-1">
              {SKILL_ORDER.map(skillId => {
                const meta = SKILL_META[skillId];
                const session = activeSessionMap.get(skillId);
                return (
                  <TabsTrigger key={skillId} value={skillId} className="flex-1 basis-[23%] text-xs gap-1">
                    <span>{meta.icon}</span>
                    <span className="hidden sm:inline">{meta.label}</span>
                    {session && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {SKILL_ORDER.map(skillId => {
              const meta = SKILL_META[skillId];
              const skillNodes = groupedNodes[skillId] ?? [];
              const session = activeSessionMap.get(skillId);

              return (
                <TabsContent key={skillId} value={skillId} className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.icon} {meta.label}</span>
                    {session && (
                      <span className="text-xs text-slate-400">
                        — gathering at <span className="text-primary">{session.nodeName}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skillNodes.map(node => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        activeNodeId={session?.nodeId}
                        session={session?.nodeId === node.id ? session : undefined}
                        onStart={() => handleStart(skillId, node.id)}
                        onStop={() => handleStop(skillId)}
                        isPending={startMutation.isPending || stopMutation.isPending}
                      />
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-card/40 backdrop-blur p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Yields</h3>
            {recentYields.length === 0 ? (
              <div className="text-xs text-slate-500 italic">Nothing gathered yet. Start at a node!</div>
            ) : (
              <ul className="space-y-1.5">
                {recentYields.map((y, i) => (
                  <li key={i} className={`text-xs flex items-center gap-2 ${y.rare ? "text-yellow-400" : "text-slate-300"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${y.rare ? "bg-yellow-400" : "bg-primary"}`} />
                    <span>+{y.qty}× {y.itemId.replace(/_/g, " ")}</span>
                    {y.rare && <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/30 px-1 py-0">RARE</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-card/40 backdrop-blur p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Yield Bonuses</h3>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div>+10% yield per <span className="text-slate-300">25 skill levels</span> (probabilistic)</div>
              <div>Rare chance unlocks at <span className="text-slate-300">level 50</span></div>
              <div>Rare cap: <span className="text-yellow-400">15%</span> at level 80</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
