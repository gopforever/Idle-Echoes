import * as React from "react";
import { useGetZones, useTravelToZone, useGetCharacter, getGetCharacterQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ZONE_EMOJIS: Record<string, string> = {
  commonlands: "🌾", antonica: "🌿", thundering_steppes: "⛈️",
  nektulos_forest: "🌑", enchanted_lands: "✨", zek: "⚔️",
  everfrost: "❄️", lavastorm: "🌋", lesser_faydark: "🌸", feerrott: "🌿",
};

const CONTINENT_COLORS: Record<string, string> = {
  Antonica: "border-sky-800 bg-sky-950/30",
  Commonlands: "border-orange-800 bg-orange-950/30",
  Faydwer: "border-emerald-800 bg-emerald-950/30",
  Kunark: "border-red-800 bg-red-950/30",
  Velious: "border-blue-800 bg-blue-950/30",
  Planes: "border-purple-800 bg-purple-950/30",
};

export default function ZonesPage() {
  const { data: zones, isLoading } = useGetZones();
  const { data: character } = useGetCharacter();
  const travelToZone = useTravelToZone();
  const queryClient = useQueryClient();

  const [travelMessage, setTravelMessage] = React.useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const handleTravel = (zoneId: string) => {
    travelToZone.mutate({ zoneId }, {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        setTravelMessage(data?.message ?? "Traveled!");
        setTimeout(() => setTravelMessage(null), 3000);
      },
      onError: () => setTravelMessage("Travel failed"),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Zones of Norrath</h1>
        <p className="text-slate-400 text-sm mt-1">Explore the lands — defeat enemies, gather loot, and uncover secrets</p>
        {travelMessage && (
          <div className="mt-2 p-2 rounded bg-amber-900/30 border border-amber-700 text-amber-300 text-sm">{travelMessage}</div>
        )}
      </div>

      {/* Group by continent */}
      {["Antonica", "Commonlands", "Faydwer", "Kunark", "Velious", "Planes"].map(continent => {
        const continentZones = zones?.filter((z: any) => z.continent === continent) ?? [];
        if (continentZones.length === 0) return null;

        return (
          <div key={continent}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">{continent}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {continentZones.map((zone: any) => {
                const isCurrentZone = character?.zone?.toLowerCase().replace(/\s/g, "_") === zone.id ||
                  character?.zone === zone.name;
                const isLocked = !zone.unlocked;
                const emoji = ZONE_EMOJIS[zone.id] ?? "🗺️";

                return (
                  <Card
                    key={zone.id}
                    className={cn(
                      "border transition-all",
                      isCurrentZone ? "border-amber-500 bg-amber-900/10 ring-1 ring-amber-500/30" :
                      isLocked ? "border-slate-800 bg-slate-900/30 opacity-60" :
                      `${CONTINENT_COLORS[continent] ?? "border-slate-800"}`
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{emoji}</span>
                            <h3 className={cn("font-bold text-sm", isCurrentZone ? "text-amber-400" : isLocked ? "text-slate-600" : "text-slate-200")}>
                              {zone.name}
                              {isCurrentZone && <span className="ml-2 text-xs bg-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded">Current</span>}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{zone.description}</p>
                          <div className="flex gap-3 text-xs text-slate-500">
                            <span>Lv {zone.minLevel}–{zone.maxLevel}</span>
                            <span>👹 {zone.enemyCount} enemies</span>
                            {zone.bossCount > 0 && <span>💀 {zone.bossCount} bosses</span>}
                          </div>
                        </div>
                        <div className="ml-3">
                          {isLocked ? (
                            <div className="text-xs text-slate-600 bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                              🔒 Lv {zone.minLevel}
                            </div>
                          ) : isCurrentZone ? (
                            <Button size="sm" variant="outline" disabled className="border-amber-700 text-amber-400 text-xs">
                              Here
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTravel(zone.id)}
                              disabled={travelToZone.isPending}
                              className="border-slate-700 hover:border-amber-600 text-xs"
                            >
                              Travel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
