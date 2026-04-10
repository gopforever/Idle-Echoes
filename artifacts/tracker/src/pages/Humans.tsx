import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { api, type LeaderboardEntry } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import RankBadge from "@/components/RankBadge";
import PlayerBadge from "@/components/PlayerBadge";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function Humans() {
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);

  const { data: overview, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leaderboardOverview"],
    queryFn: api.leaderboardOverview,
    refetchInterval: 60_000,
  });

  const is401 = isError && (error instanceof Error) && error.message.includes("401");

  const humans = (overview ?? []).filter((p) => p.type === "player");

  if (is401) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">Login to the game first</p>
        <p className="text-sm text-muted-foreground">Human player data requires authentication.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>Human Players</h2>
        <p className="text-sm text-muted-foreground mt-1">Real characters from the leaderboard</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2937" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "#1f2937", background: "#0d0d14" }}>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Kills</TableHead>
                <TableHead>Boss K.</TableHead>
                <TableHead>Dungeons</TableHead>
                <TableHead>Heroic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {humans.map((p, i) => (
                <TableRow key={p.id} onClick={() => setSelected(p)} style={{ borderColor: "#1f2937" }}>
                  <TableCell><RankBadge rank={i + 1} /></TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <PlayerBadge playerType="human" classArchetype={p.class} />
                  </TableCell>
                  <TableCell>{p.level ?? "—"}</TableCell>
                  <TableCell style={{ color: "#ef4444" }}>{formatNumber(p.killCount)}</TableCell>
                  <TableCell style={{ color: "#f59e0b" }}>{formatNumber(p.bossKills)}</TableCell>
                  <TableCell>{p.dungeonsCompleted ?? 0}</TableCell>
                  <TableCell>{p.heroicCompletions ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {humans.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No human players found</p>
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Cinzel, serif" }}>{selected.name}</DialogTitle>
                <DialogDescription>
                  <PlayerBadge playerType="human" classArchetype={selected.class} level={selected.level} />
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Class: </span><span>{selected.class ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Level: </span><span>{selected.level ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Kills: </span><span className="text-red-400 font-semibold">{formatNumber(selected.killCount)}</span></div>
                <div><span className="text-muted-foreground">Boss Kills: </span><span className="text-amber-400 font-semibold">{formatNumber(selected.bossKills)}</span></div>
                <div><span className="text-muted-foreground">Dungeons: </span><span>{selected.dungeonsCompleted ?? 0}</span></div>
                <div><span className="text-muted-foreground">Heroic: </span><span>{selected.heroicCompletions ?? 0}</span></div>
                <div><span className="text-muted-foreground">Raids: </span><span>{selected.raidsCompleted ?? 0}</span></div>
                <div><span className="text-muted-foreground">Highest Phase: </span><span>{selected.highestPhase ?? 0}</span></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
