import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Economy() {
  const { data: market, isLoading: loadingMarket, isError: marketError, refetch: refetchMarket } = useQuery({
    queryKey: ["ghostMarket"],
    queryFn: api.ghostMarketDemand,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["worldPlayers"],
    queryFn: api.worldPlayers,
    refetchInterval: 30_000,
  });

  const topGold = (players ?? [])
    .filter((p) => (p.totalGoldEarned ?? 0) > 0)
    .sort((a, b) => (b.totalGoldEarned ?? 0) - (a.totalGoldEarned ?? 0))
    .slice(0, 10)
    .map((p) => ({ name: p.name, gold: p.totalGoldEarned ?? 0 }));

  const totalGold = (players ?? []).reduce((s, p) => s + (p.totalGoldEarned ?? 0), 0);
  const maxHolder = topGold[0];
  const avgGold = players?.length ? totalGold / players.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>Economy</h2>
        <p className="text-sm text-muted-foreground mt-1">Gold distribution and market data</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Gold", value: formatNumber(totalGold), color: "#eab308" },
          { label: "Top Holder", value: maxHolder ? `${maxHolder.name} (${formatNumber(maxHolder.gold)})` : "—", color: "#f59e0b" },
          { label: "Avg per Player", value: formatNumber(Math.round(avgGold)), color: "#d97706" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1f2937" }}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1 truncate" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gold distribution chart */}
      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1f2937" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Cinzel, serif" }}>Top 10 Gold Holders</h3>
        {loadingPlayers ? (
          <Skeleton className="h-48" />
        ) : topGold.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No gold data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topGold} margin={{ top: 4, right: 4, bottom: 28, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v: number) => formatNumber(v)} width={40} />
              <RTooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), "Gold"]}
              />
              <Bar dataKey="gold" radius={[4, 4, 0, 0]}>
                {topGold.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#d97706" : i === 2 ? "#b45309" : "#92400e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ghost Market Demand */}
      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1f2937" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Cinzel, serif" }}>Ghost Market Demand</h3>
        {loadingMarket ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : marketError ? (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">Market data unavailable</p>
            <button
              onClick={() => void refetchMarket()}
              className="text-xs text-amber-400 hover:underline mt-2"
            >
              Retry
            </button>
          </div>
        ) : !market?.length ? (
          <p className="text-xs text-muted-foreground text-center py-8">No market data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "#1f2937", background: "#0d0d14" }}>
                <TableHead>Item</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {market.map((item, i) => (
                <TableRow key={i} style={{ borderColor: "#1f2937" }}>
                  <TableCell className="font-medium">{item.itemName ?? "—"}</TableCell>
                  <TableCell style={{ color: (item.demand ?? 0) > (item.supply ?? 0) ? "#ef4444" : "#22c55e" }}>
                    {item.demand ?? 0}
                  </TableCell>
                  <TableCell>{item.supply ?? 0}</TableCell>
                  <TableCell style={{ color: "#eab308" }}>{formatNumber(item.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
