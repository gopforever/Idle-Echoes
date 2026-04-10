import { useQuery } from "@tanstack/react-query";
import { Users, Sword, Crown, Coins } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import EventCard from "@/components/EventCard";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 10_000,
  });

  const { data: players, isLoading: loadingPlayers, isError: playersError, refetch: refetchPlayers } = useQuery({
    queryKey: ["worldPlayers"],
    queryFn: api.worldPlayers,
    refetchInterval: 30_000,
  });

  const { data: events, isLoading: loadingEvents, isError: eventsError, refetch: refetchEvents } = useQuery({
    queryKey: ["worldEvents", 20],
    queryFn: () => api.worldEvents(20),
    refetchInterval: 15_000,
  });

  const isOnline = health?.status === "ok" || health?.status === "healthy" || health?.status === "running";

  const totalKills = players?.reduce((s, p) => s + (p.killCount ?? 0), 0) ?? 0;
  const totalBossKills = players?.reduce((s, p) => s + (p.bossKills ?? 0), 0) ?? 0;
  const totalGold = players?.reduce((s, p) => s + (p.totalGoldEarned ?? 0), 0) ?? 0;

  // Zone heatmap data
  const zoneMap: Record<string, number> = {};
  for (const p of players ?? []) {
    if (p.zone) zoneMap[p.zone] = (zoneMap[p.zone] ?? 0) + 1;
  }
  const zoneData = Object.entries(zoneMap)
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Cinzel, serif" }}>
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live overview of Melvor EQ2</p>
        </div>
        <div className="flex items-center gap-2">
          {health ? (
            <Badge
              className="text-[10px]"
              style={{
                background: isOnline ? "#16a34a22" : "#dc262622",
                color: isOnline ? "#4ade80" : "#f87171",
                border: `1px solid ${isOnline ? "#16a34a" : "#dc2626"}`,
              }}
            >
              {isOnline ? "● ONLINE" : "● OFFLINE"}
            </Badge>
          ) : (
            <Skeleton className="h-5 w-20" />
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingPlayers ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : playersError ? (
          <div className="col-span-4">
            <ErrorState message="Could not load player data" onRetry={() => void refetchPlayers()} />
          </div>
        ) : (
          <>
            <StatCard title="Ghost Players" value={players?.length ?? 0} icon={Users} subtitle="Active adventurers" />
            <StatCard title="Total Kills" value={formatNumber(totalKills)} icon={Sword} glowColor="#ef4444" subtitle="All-time" />
            <StatCard title="Boss Kills" value={formatNumber(totalBossKills)} icon={Crown} glowColor="#f59e0b" subtitle="Elite targets" />
            <StatCard title="Gold in Economy" value={formatNumber(totalGold)} icon={Coins} glowColor="#eab308" subtitle="Across all players" />
          </>
        )}
      </div>

      {/* Zone Heatmap + Events */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Zone bar chart */}
        <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1f2937" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Cinzel, serif" }}>Zone Population</h3>
          {loadingPlayers ? (
            <Skeleton className="h-48" />
          ) : zoneData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No zone data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={zoneData} margin={{ top: 4, right: 4, bottom: 24, left: 0 }}>
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} width={28} />
                <RTooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {zoneData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#d97706" : "#92400e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Live Events feed */}
        <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1f2937" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Cinzel, serif" }}>Live World Feed</h3>
          {loadingEvents ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : eventsError ? (
            <ErrorState message="Could not load events" onRetry={() => void refetchEvents()} />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(events ?? []).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
              {(events ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No events yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
