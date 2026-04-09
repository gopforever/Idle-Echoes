import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, type WorldEvent } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import EventCard from "@/components/EventCard";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const EVENT_TYPES = ["all", "kill", "boss_kill", "level_up", "zone_travel", "loot"];

function exportCSV(events: WorldEvent[] | undefined) {
  if (!events?.length) return;
  const header = ["id", "playerName", "eventType", "zone", "description", "timestamp"];
  const rows = events.map((e) => [
    e.id,
    e.playerName ?? "",
    e.eventType,
    e.zone ?? "",
    (e.description ?? "").replace(/,/g, ";"),
    e.timestamp ?? e.createdAt ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `events-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Events() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ["worldEvents", 200],
    queryFn: () => api.worldEvents(200),
    refetchInterval: 15_000,
  });

  const zones = useMemo(
    () => [...new Set((events ?? []).map((e) => e.zone).filter(Boolean) as string[])].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    return (events ?? []).filter((e) => {
      if (search && !(e.playerName ?? "").toLowerCase().includes(search.toLowerCase()) && !(e.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (zoneFilter !== "all" && e.zone !== zoneFilter) return false;
      return true;
    });
  }, [events, search, typeFilter, zoneFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>World Events</h2>
          <p className="text-sm text-muted-foreground mt-1">Live feed — auto-refreshes every 15s</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCSV(events)}
          disabled={!events?.length}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search player or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {events?.length ?? 0} events
      </p>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No events match your filters</p>
          )}
        </div>
      )}
    </div>
  );
}
