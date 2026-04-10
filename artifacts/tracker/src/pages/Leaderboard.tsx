import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { formatNumber, classColor } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import RankBadge from "@/components/RankBadge";
import PlayerBadge from "@/components/PlayerBadge";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

function LeaderList({ data, isLoading, isError, refetch, columns }: {
  data: Array<Record<string, unknown>> | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  columns: Array<{ key: string; label: string; format?: (v: unknown) => string }>;
}) {
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!data?.length) return <p className="text-xs text-muted-foreground text-center py-8">No data</p>;

  return (
    <div className="space-y-1.5">
      {data.map((entry, i) => {
        const name = String(entry.name ?? "Unknown");
        const cls = String(entry.class ?? "");
        const color = classColor(cls);
        const isGhost = entry.type === "ghost";
        return (
          <motion.div
            key={String(entry.id ?? i)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 rounded-lg px-4 py-3 border"
            style={{ background: "#111827", borderColor: "#1f2937" }}
          >
            <RankBadge rank={i + 1} />
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback style={{ background: color + "33", color }}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <PlayerBadge playerType={isGhost ? "ghost" : "human"} classArchetype={cls} />
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0">
              {columns.map((col) => (
                <div key={col.key} className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground">{col.label}</p>
                  <p className="font-semibold text-foreground">
                    {col.format ? col.format(entry[col.key]) : formatNumber(entry[col.key] as number | null | undefined)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const overview = useQuery({ queryKey: ["lb-overview"], queryFn: api.leaderboardOverview, refetchInterval: 60_000 });
  const kills = useQuery({ queryKey: ["lb-kills"], queryFn: api.leaderboardKills, refetchInterval: 60_000 });
  const dungeons = useQuery({ queryKey: ["lb-dungeons"], queryFn: api.leaderboardDungeons, refetchInterval: 60_000 });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>Leaderboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Top players across all categories</p>
      </div>

      <Tabs defaultValue="overall">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="dungeons">Dungeons</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <LeaderList
            data={overview.data as Array<Record<string, unknown>> | undefined}
            isLoading={overview.isLoading}
            isError={overview.isError}
            refetch={() => void overview.refetch()}
            columns={[
              { key: "level", label: "Level" },
              { key: "killCount", label: "Kills" },
            ]}
          />
        </TabsContent>

        <TabsContent value="combat">
          <LeaderList
            data={kills.data as Array<Record<string, unknown>> | undefined}
            isLoading={kills.isLoading}
            isError={kills.isError}
            refetch={() => void kills.refetch()}
            columns={[
              { key: "killCount", label: "Kills" },
              { key: "bossKills", label: "Boss Kills" },
            ]}
          />
        </TabsContent>

        <TabsContent value="dungeons">
          <LeaderList
            data={dungeons.data as Array<Record<string, unknown>> | undefined}
            isLoading={dungeons.isLoading}
            isError={dungeons.isError}
            refetch={() => void dungeons.refetch()}
            columns={[
              { key: "dungeonsCompleted", label: "Dungeons" },
              { key: "heroicCompletions", label: "Heroic" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
