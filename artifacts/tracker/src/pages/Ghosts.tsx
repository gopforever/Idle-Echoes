import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type WorldPlayer } from "@/lib/api";
import { formatNumber, classColor, timeAgo } from "@/lib/utils";
import RankBadge from "@/components/RankBadge";
import PlayerBadge from "@/components/PlayerBadge";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SortKey = "level" | "killCount" | "bossKills" | "totalGoldEarned" | "deathCount";

const statBox = (label: string, value: number | undefined, color: string) => (
  <div
    key={label}
    className="rounded-lg p-3 text-center"
    style={{ background: color + "15", border: `1px solid ${color}30` }}
  >
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-lg font-bold mt-0.5" style={{ color }}>{value ?? 0}</p>
  </div>
);

export default function Ghosts() {
  const [zoneFilter, setZoneFilter] = useState("all");
  const [raceFilter, setRaceFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("killCount");
  const [selected, setSelected] = useState<WorldPlayer | null>(null);

  const { data: players, isLoading, isError, refetch } = useQuery({
    queryKey: ["worldPlayers"],
    queryFn: api.worldPlayers,
    refetchInterval: 30_000,
  });

  const zones = [...new Set((players ?? []).map((p) => p.zone).filter(Boolean) as string[])].sort();
  const races = [...new Set((players ?? []).map((p) => p.race).filter(Boolean) as string[])].sort();
  const classes = [...new Set((players ?? []).map((p) => p.class).filter(Boolean) as string[])].sort();

  const filtered = (players ?? [])
    .filter((p) => zoneFilter === "all" || p.zone === zoneFilter)
    .filter((p) => raceFilter === "all" || p.race === raceFilter)
    .filter((p) => classFilter === "all" || p.class === classFilter)
    .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>Ghost Players</h2>
        <p className="text-sm text-muted-foreground mt-1">AI adventurers in the world</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={raceFilter} onValueChange={setRaceFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Races" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Races</SelectItem>
            {races.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="killCount">Sort: Kills</SelectItem>
            <SelectItem value="bossKills">Sort: Boss Kills</SelectItem>
            <SelectItem value="level">Sort: Level</SelectItem>
            <SelectItem value="totalGoldEarned">Sort: Gold</SelectItem>
            <SelectItem value="deathCount">Sort: Deaths</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>Race / Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Kills</TableHead>
                <TableHead>Boss K.</TableHead>
                <TableHead>Deaths</TableHead>
                <TableHead>Gold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, i) => (
                <TableRow
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{ borderColor: "#1f2937" }}
                >
                  <TableCell><RankBadge rank={i + 1} /></TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <PlayerBadge playerType="ghost" classArchetype={p.class} />
                  </TableCell>
                  <TableCell>{p.level}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.zone ?? "—"}</TableCell>
                  <TableCell style={{ color: "#ef4444" }}>{formatNumber(p.killCount)}</TableCell>
                  <TableCell style={{ color: "#f59e0b" }}>{formatNumber(p.bossKills)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.deathCount ?? 0}</TableCell>
                  <TableCell style={{ color: "#eab308" }}>{formatNumber(p.totalGoldEarned)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No ghost players found</p>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Cinzel, serif" }}>{selected.name}</DialogTitle>
                <DialogDescription>
                  <PlayerBadge playerType="ghost" classArchetype={selected.class} level={selected.level} />
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Base stats */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Base Stats</p>
                  <div className="grid grid-cols-3 gap-2">
                    {statBox("STR", selected.stats?.strength, "#ef4444")}
                    {statBox("AGI", selected.stats?.agility, "#22c55e")}
                    {statBox("STA", selected.stats?.stamina, "#f97316")}
                    {statBox("INT", selected.stats?.intelligence, "#3b82f6")}
                    {statBox("WIS", selected.stats?.wisdom, "#eab308")}
                    {statBox("CHA", selected.stats?.charisma, "#a855f7")}
                  </div>
                </div>
                {/* Combat stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Kills: </span><span className="text-red-400 font-semibold">{formatNumber(selected.killCount)}</span></div>
                  <div><span className="text-muted-foreground">Boss Kills: </span><span className="text-amber-400 font-semibold">{formatNumber(selected.bossKills)}</span></div>
                  <div><span className="text-muted-foreground">Deaths: </span><span>{selected.deathCount ?? 0}</span></div>
                  <div><span className="text-muted-foreground">Gold: </span><span className="text-yellow-400 font-semibold">{formatNumber(selected.totalGoldEarned)}</span></div>
                </div>
                {/* Misc */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Zone: </span><span>{selected.zone ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Alignment: </span><span>{selected.alignment ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Personality: </span><span>{selected.personality ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Generation: </span><span>{selected.generation ?? 1}</span></div>
                  <div><span className="text-muted-foreground">Last Active: </span><span>{timeAgo(selected.lastTickAt)}</span></div>
                  <div><span className="text-muted-foreground">Race: </span><span style={{ color: classColor(selected.race) }}>{selected.race ?? "—"}</span></div>
                </div>
                {selected.inheritedTraits && selected.inheritedTraits.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Inherited Traits</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.inheritedTraits.map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
