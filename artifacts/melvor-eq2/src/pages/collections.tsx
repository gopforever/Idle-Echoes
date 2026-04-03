import * as React from "react";
import { useGetCollections } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const REWARD_ICONS: Record<string, string> = {
  gold: "💰", xp: "✨", aa_point: "⚡", item: "📦",
};

export default function CollectionsPage() {
  const { data: collections, isLoading } = useGetCollections();

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const completed = collections?.filter((c: any) => c.completed).length ?? 0;
  const total = collections?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Collections</h1>
        <p className="text-slate-400 text-sm mt-1">Gather rare items scattered across Norrath to complete sets and earn rewards</p>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-green-400">✓ {completed} completed</span>
          <span className="text-slate-500">{total - completed} remaining</span>
        </div>
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

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-slate-800 mb-4 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", collection.completed ? "bg-amber-600" : "bg-slate-600")} style={{ width: `${pct}%` }} />
                </div>

                {/* Pieces grid */}
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

                {/* Reward */}
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
    </div>
  );
}
