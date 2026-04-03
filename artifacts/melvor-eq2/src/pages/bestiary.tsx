import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

interface BestiaryEntry {
  enemyId: string;
  name: string;
  level: number;
  zone: string;
  killCount: number;
  firstKillAt: string;
  lastKillAt: string;
  loreUnlocked: boolean;
}

interface BestiaryResponse {
  entries: BestiaryEntry[];
  totalDiscovered: number;
  totalEnemies: number;
}

interface BestiaryEntryDetail {
  enemyId: string;
  name: string;
  level: number;
  zone: string;
  killCount: number;
  firstKillAt: string | null;
  lastKillAt: string | null;
  loreUnlocked: boolean;
  description: string | null;
  abilities: Record<string, unknown>[] | null;
  resistances: Record<string, number> | null;
  lootTable: Record<string, unknown>[] | null;
}

const ZONE_COLORS: Record<string, string> = {
  "Commonlands": "text-yellow-400",
  "Antonica": "text-green-400",
  "The Thundering Steppes": "text-sky-400",
  "Enchanted Lands": "text-purple-400",
  "Everfrost Peaks": "text-cyan-300",
  "Lavastorm Mountains": "text-red-400",
  "Nektulos Forest": "text-emerald-500",
  "Zek, the Orcish Wastes": "text-orange-400",
  "Lesser Faydark": "text-lime-400",
  "Feerrott": "text-teal-400",
};

const TYPE_ICONS: Record<string, string> = {
  humanoid: "🧟",
  beast: "🐺",
  undead: "💀",
  elemental: "🔥",
  construct: "⚙️",
  dragon: "🐉",
};

function EnemyDetailModal({
  entry,
  onClose,
}: {
  entry: BestiaryEntry;
  onClose: () => void;
}) {
  const detailQ = useQuery<BestiaryEntryDetail>({
    queryKey: ["bestiary", entry.enemyId],
    queryFn: () =>
      fetch(apiUrl(`/api/bestiary/${entry.enemyId}`)).then((r) => r.json()),
  });

  const detail = detailQ.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg border-amber-800/50 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-amber-400 font-serif">{entry.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Lv {entry.level}</span>
                <span className="text-xs text-slate-600">·</span>
                <span className={cn("text-xs", ZONE_COLORS[entry.zone] ?? "text-slate-400")}>
                  {entry.zone}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {detailQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              {/* Kill stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {entry.killCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Total Kills</div>
                </div>
                <div className="bg-slate-800/60 rounded p-3 text-center">
                  <div className={cn("text-sm font-bold", entry.loreUnlocked ? "text-green-400" : "text-slate-500")}>
                    {entry.loreUnlocked ? "✓ Unlocked" : `${entry.killCount}/10`}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Lore</div>
                </div>
              </div>

              {!entry.loreUnlocked && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Lore unlock progress</span>
                    <span>{entry.killCount}/10</span>
                  </div>
                  <Progress
                    value={Math.min(100, (entry.killCount / 10) * 100)}
                    className="h-1.5 bg-slate-800"
                    indicatorClassName="bg-amber-700"
                  />
                </div>
              )}

              {/* Lore description */}
              {detail?.description && (
                <div className="bg-slate-800/40 rounded p-3 border border-amber-900/30">
                  <p className="text-xs text-slate-300 italic leading-relaxed">
                    {detail.description}
                  </p>
                </div>
              )}

              {/* Resistances */}
              {detail?.resistances && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-2 font-bold">
                    Resistances
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(detail.resistances).map(([dmgType, val]) => (
                      <span
                        key={dmgType}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded border",
                          val > 0
                            ? "border-green-800 text-green-400 bg-green-950/20"
                            : val < 0
                              ? "border-red-800 text-red-400 bg-red-950/20"
                              : "border-slate-700 text-slate-500",
                        )}
                      >
                        {dmgType}: {val > 0 ? "+" : ""}
                        {val}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Abilities */}
              {detail?.abilities && detail.abilities.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-2 font-bold">
                    Abilities
                  </div>
                  <div className="space-y-1.5">
                    {detail.abilities.map((ab, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs bg-slate-800/40 rounded p-2"
                      >
                        <span className="shrink-0">{String(ab.icon ?? "⚡")}</span>
                        <div>
                          <span className="text-slate-200 font-medium">{String(ab.name ?? "")}</span>
                          <span className="text-slate-500 ml-1.5">{String(ab.description ?? "")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loot table */}
              {detail?.lootTable && detail.lootTable.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-2 font-bold">
                    Loot Table
                  </div>
                  <div className="space-y-1">
                    {detail.lootTable.map((loot, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[10px] text-slate-400"
                      >
                        <span>{String(loot.itemId ?? "")}</span>
                        <span className="text-slate-500">
                          {Math.round(Number(loot.dropChance ?? 0) * 100)}% drop
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* First / last kill timestamps */}
              {entry.firstKillAt && (
                <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-3 space-y-0.5">
                  <div>
                    First kill:{" "}
                    {new Date(entry.firstKillAt).toLocaleDateString()}
                  </div>
                  <div>
                    Last kill:{" "}
                    {new Date(entry.lastKillAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BestiaryPage() {
  const bestiaryQ = useQuery<BestiaryResponse>({
    queryKey: ["bestiary"],
    queryFn: () => fetch(apiUrl("/api/bestiary")).then((r) => r.json()),
  });

  const [selectedEnemy, setSelectedEnemy] = React.useState<BestiaryEntry | null>(null);
  const [zoneFilter, setZoneFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"killCount" | "level" | "name" | "lastKill">("killCount");

  const data = bestiaryQ.data;
  const entries = data?.entries ?? [];

  const zones = React.useMemo(
    () => ["all", ...Array.from(new Set(entries.map((e) => e.zone))).sort()],
    [entries],
  );

  const filtered = React.useMemo(() => {
    let list = [...entries];
    if (zoneFilter !== "all") list = list.filter((e) => e.zone === zoneFilter);
    list.sort((a, b) => {
      if (sortBy === "killCount") return b.killCount - a.killCount;
      if (sortBy === "level") return b.level - a.level;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "lastKill")
        return new Date(b.lastKillAt).getTime() - new Date(a.lastKillAt).getTime();
      return 0;
    });
    return list;
  }, [entries, zoneFilter, sortBy]);

  const discoveryPct = data
    ? Math.round((data.totalDiscovered / Math.max(1, data.totalEnemies)) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Bestiary</h1>
        <p className="text-slate-400 text-sm mt-1">
          Enemies encountered in your travels across Norrath
        </p>
      </div>

      {/* Discovery progress */}
      <Card className="border-slate-800 bg-card/40">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Enemies Discovered</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {data?.totalDiscovered ?? 0} / {data?.totalEnemies ?? 0}
            </span>
          </div>
          <Progress
            value={discoveryPct}
            className="h-2 bg-slate-800"
            indicatorClassName="bg-amber-600"
          />
          <div className="text-[10px] text-slate-600">{discoveryPct}% of all enemies discovered</div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Zone filter */}
        <div className="flex flex-wrap gap-1.5">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] border transition-colors",
                zoneFilter === zone
                  ? "border-amber-600 text-amber-400 bg-amber-900/20"
                  : "border-slate-700 text-slate-500 hover:text-slate-300",
              )}
            >
              {zone === "all" ? "All Zones" : zone}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-600">Sort:</span>
          {(
            [
              ["killCount", "Most Kills"],
              ["level", "Level"],
              ["name", "Name"],
              ["lastKill", "Recent"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={cn(
                "px-2 py-1 rounded text-[11px] border transition-colors",
                sortBy === val
                  ? "border-amber-600 text-amber-400 bg-amber-900/20"
                  : "border-slate-700 text-slate-500 hover:text-slate-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {bestiaryQ.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-8 text-center text-slate-500">
            No enemies discovered yet — go battle in the zones of Norrath!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((entry) => (
            <button
              key={entry.enemyId}
              onClick={() => setSelectedEnemy(entry)}
              className="text-left group"
            >
              <Card
                className={cn(
                  "border-slate-800 bg-card/40 hover:border-amber-800/50 hover:bg-slate-800/60 transition-all",
                  entry.loreUnlocked && "ring-1 ring-amber-900/40",
                )}
              >
                <CardContent className="p-3 space-y-2">
                  {/* Enemy icon / type */}
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{TYPE_ICONS["beast"]}</span>
                    {entry.loreUnlocked && (
                      <span className="text-[9px] text-amber-500 font-bold">LORE</span>
                    )}
                  </div>
                  {/* Name */}
                  <div>
                    <div className="text-xs font-semibold text-slate-200 leading-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {entry.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-amber-600 font-bold">
                        Lv {entry.level}
                      </span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span
                        className={cn(
                          "text-[10px] truncate",
                          ZONE_COLORS[entry.zone] ?? "text-slate-500",
                        )}
                      >
                        {entry.zone}
                      </span>
                    </div>
                  </div>
                  {/* Kill count */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">Kills</span>
                    <span className="text-[11px] font-bold text-slate-300 tabular-nums">
                      {entry.killCount.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedEnemy && (
        <EnemyDetailModal
          entry={selectedEnemy}
          onClose={() => setSelectedEnemy(null)}
        />
      )}
    </div>
  );
}
