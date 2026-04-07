import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetCollections } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const REWARD_ICONS: Record<string, string> = {
  gold: "💰", xp: "✨", aa_point: "⚡", item: "📦",
};

const DIFFICULTY_STYLE: Record<string, { label: string; border: string; text: string; badge: string }> = {
  normal:    { label: "Normal",    border: "border-slate-700", text: "text-slate-300",  badge: "border-slate-600 text-slate-400" },
  expert:    { label: "Expert",    border: "border-blue-700/60", text: "text-blue-300", badge: "border-blue-700/60 text-blue-400" },
  legendary: { label: "Legendary", border: "border-purple-700/60", text: "text-purple-300", badge: "border-purple-700/60 text-purple-400" },
  mythical:  { label: "Mythical",  border: "border-red-700/60", text: "text-red-300",   badge: "border-red-700/60 text-red-400" },
};

const SLOT_ICONS: Record<string, string> = {
  head: "🪖", shoulder: "🛡️", chest: "🧥", wrist: "🪬", legs: "👖", feet: "👟",
};

type GearSetEntry = {
  id: string;
  dungeonId: string;
  dungeonName: string;
  difficulty: string;
  setNameTemplate: string;
  piecesTotal: number;
  piecesOwned: number;
  piecesEquipped: number;
  pieces: Array<{ slot: string; dropFloor: number; owned: boolean; equipped: boolean }>;
  bonuses: Array<{ piecesRequired: number; description: string; active: boolean; isProc: boolean; procName?: string }>;
};

function GearSetCard({ set }: { set: GearSetEntry }) {
  const style = DIFFICULTY_STYLE[set.difficulty] ?? DIFFICULTY_STYLE.normal;
  const pct = Math.round((set.piecesOwned / Math.max(1, set.piecesTotal)) * 100);
  const isComplete = set.piecesOwned >= set.piecesTotal;

  return (
    <Card className={cn("border transition-all", isComplete ? "border-amber-600/50 bg-amber-950/10" : style.border, "bg-card/40")}>
      <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-2.5 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-semibold truncate", isComplete ? "text-amber-400" : style.text)}>
                {isComplete && "✓ "}{set.setNameTemplate}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0 capitalize", style.badge)}>
                {style.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{set.dungeonName}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-slate-300">{set.piecesOwned}/{set.piecesTotal}</div>
            <div className="text-[10px] text-slate-600">{pct}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isComplete ? "bg-amber-600" : "bg-slate-600")}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Piece slots */}
        <div className="flex flex-wrap gap-1.5">
          {set.pieces.map(p => (
            <div
              key={p.slot}
              title={`${p.slot} — Floor ${p.dropFloor}${p.equipped ? " (equipped)" : p.owned ? " (owned)" : " (not found)"}`}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border",
                p.equipped ? "border-amber-600/70 bg-amber-900/30 text-amber-300"
                  : p.owned  ? "border-green-700/60 bg-green-900/20 text-green-400"
                  : "border-slate-700/40 bg-slate-800/20 text-slate-600"
              )}
            >
              <span>{SLOT_ICONS[p.slot] ?? "◇"}</span>
              <span className="capitalize">{p.slot}</span>
              {p.equipped && <span className="text-amber-500">E</span>}
            </div>
          ))}
        </div>

        {/* Set bonuses */}
        <div className="space-y-1">
          {set.bonuses.map((b, i) => (
            <div key={i} className={cn("flex items-start gap-1.5 text-[11px]", b.active ? "" : "opacity-40")}>
              <span className={cn("shrink-0 mt-0.5", b.active ? (b.isProc ? "text-amber-400" : "text-green-400") : "text-slate-600")}>
                {b.active ? (b.isProc ? "⚡" : "✓") : "○"}
              </span>
              <div className="min-w-0">
                <span className={cn("text-[10px] font-mono mr-1 text-slate-500")}>({b.piecesRequired}pc)</span>
                <span className={b.active ? "text-slate-300" : "text-slate-600"}>{b.description}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CollectionsPage() {
  const { data: collections, isLoading } = useGetCollections();
  const gearSetsQ = useQuery<{ sets: GearSetEntry[] }>({
    queryKey: ["gear-sets"],
    queryFn: () => fetch(apiUrl("/api/gear-sets")).then(r => r.json()),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const completed = collections?.filter((c: any) => c.completed).length ?? 0;
  const total = collections?.length ?? 0;

  const gearSets = gearSetsQ.data?.sets ?? [];
  const setsByDungeon: Record<string, GearSetEntry[]> = {};
  for (const s of gearSets) {
    if (!setsByDungeon[s.dungeonId]) setsByDungeon[s.dungeonId] = [];
    setsByDungeon[s.dungeonId].push(s);
  }
  const dungeonOrder = ["blackburrow", "ruins_of_varsoon", "nektropos_castle", "permafrost_keep", "soluseks_eye"];
  const setsCompleted = gearSets.filter(s => s.piecesOwned >= s.piecesTotal).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Collections</h1>
        <p className="text-slate-400 text-sm mt-1">Complete sets and earn rewards — or hunt for legendary dungeon gear</p>
      </div>

      <Tabs defaultValue="item-sets">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="item-sets" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300 text-slate-400 text-xs">
            Item Collections
            <span className="ml-1.5 text-[10px] text-slate-500">{completed}/{total}</span>
          </TabsTrigger>
          <TabsTrigger value="gear-sets" className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300 text-slate-400 text-xs">
            Dungeon Gear Sets
            <span className="ml-1.5 text-[10px] text-slate-500">{setsCompleted}/{gearSets.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Item Collections ─────────────────────────────────────────────── */}
        <TabsContent value="item-sets" className="mt-4">
          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-green-400">✓ {completed} completed</span>
            <span className="text-slate-500">{total - completed} remaining</span>
          </div>

          <div className="space-y-4">
            {collections?.map((collection: any) => {
              const foundCount = collection.pieces?.filter((p: any) => p.found).length ?? 0;
              const totalPieces = collection.pieces?.length ?? 0;
              const pct = Math.round((foundCount / Math.max(1, totalPieces)) * 100);

              return (
                <Card key={collection.id} className={cn("border", collection.completed ? "border-amber-600/50 bg-amber-950/10" : "border-slate-800 bg-card/40")}>
                  <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className={cn("text-sm", collection.completed ? "text-amber-400" : "text-slate-200")}>
                          {collection.completed && "✓ "}{collection.name}
                        </CardTitle>
                        <p className="text-xs text-slate-500">{collection.zone}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-300">{foundCount}/{totalPieces}</div>
                        <div className="text-xs text-slate-600">{pct}% complete</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-3">{collection.description}</p>
                    <div className="h-1.5 rounded-full bg-slate-800 mb-4 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", collection.completed ? "bg-amber-600" : "bg-slate-600")} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                      {collection.pieces?.map((piece: any) => (
                        <div key={piece.id} className={cn("p-2 rounded-lg border text-xs text-center transition-all",
                          piece.found ? "border-amber-600/50 bg-amber-900/20 text-amber-300" : "border-slate-800 bg-slate-900/30 text-slate-600"
                        )}>
                          <div className="mb-0.5">{piece.found ? "✓" : "?"}</div>
                          <div className={piece.found ? "text-amber-400" : ""}>{piece.found ? piece.name : "???"}</div>
                          {!piece.found && <div className="text-slate-700 text-[10px]">{piece.dropZone}</div>}
                        </div>
                      ))}
                    </div>
                    <div className={cn("flex items-center gap-2 text-xs p-2 rounded border",
                      collection.completed ? "border-amber-600/30 bg-amber-900/10 text-amber-400" : "border-slate-800 text-slate-500"
                    )}>
                      <span>{REWARD_ICONS[collection.reward] ?? "🎁"}</span>
                      <span>Reward: {collection.rewardValue.toLocaleString()} {collection.reward}</span>
                      {collection.completed && <span className="ml-auto text-green-400">✓ Claimed</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Dungeon Gear Sets ─────────────────────────────────────────────── */}
        <TabsContent value="gear-sets" className="mt-4">
          {gearSetsQ.isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4 text-sm">
                <span className="text-amber-400">🛡️ {setsCompleted} sets complete</span>
                <span className="text-slate-500">{gearSets.length - setsCompleted} in progress</span>
              </div>

              {dungeonOrder.map(dungeonId => {
                const sets = setsByDungeon[dungeonId];
                if (!sets || sets.length === 0) return null;
                const dungeonName = sets[0].dungeonName;
                const dungeonComplete = sets.filter(s => s.piecesOwned >= s.piecesTotal).length;
                return (
                  <div key={dungeonId}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <h2 className="text-base font-serif font-semibold text-slate-200">{dungeonName}</h2>
                      <span className="text-xs text-slate-500">{dungeonComplete}/{sets.length} sets complete</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sets.map(s => <GearSetCard key={s.id} set={s} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
