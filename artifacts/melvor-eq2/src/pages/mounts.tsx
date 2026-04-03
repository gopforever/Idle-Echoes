import * as React from "react";
import { useGetMounts, useEquipMount, getGetMountsQueryKey, getGetCharacterQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MOUNT_TYPE_ICONS: Record<string, string> = {
  ground: "🐴", flying: "🦅", aquatic: "🐟",
};

const SOURCE_LABELS: Record<string, string> = {
  shop: "Merchant", rare_drop: "Rare Drop", faction_qeynos: "Qeynos Faction",
  faction_freeport: "Freeport Faction", faction_neriak: "Neriak Faction",
  achievement: "Achievement",
};

export default function MountsPage() {
  const { data: mounts, isLoading } = useGetMounts();
  const equipMount = useEquipMount();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const ownedMounts = mounts?.filter((m: any) => m.owned) ?? [];
  const lockedMounts = mounts?.filter((m: any) => !m.owned) ?? [];

  const handleEquip = (mountId: string) => {
    equipMount.mutate({ mountId }, {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getGetMountsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        setMessage(data?.message ?? "Mount equipped!");
        setTimeout(() => setMessage(null), 3000);
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Mounts</h1>
        <p className="text-slate-400 text-sm mt-1">Your trusty companions — speed across Norrath in style</p>
        <p className="text-xs text-slate-500 mt-1">{ownedMounts.length} owned • {lockedMounts.length} to collect</p>
      </div>

      {message && <div className="p-2 rounded bg-amber-900/30 border border-amber-700 text-amber-300 text-sm">{message}</div>}

      {ownedMounts.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Your Mounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ownedMounts.map((mount: any) => (
              <Card key={mount.id} className={cn("border transition-all", mount.equipped ? "border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/30" : "border-slate-700 bg-slate-900/30")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MOUNT_TYPE_ICONS[mount.type] ?? "🐴"}</span>
                        <div>
                          <div className={cn("font-bold text-sm", mount.equipped ? "text-amber-400" : "text-slate-200")}>{mount.name}
                            {mount.equipped && <span className="ml-2 text-xs bg-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded">Equipped</span>}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">{mount.type} • +{mount.speedBonus}% speed</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{mount.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEquip(mount.id)}
                      disabled={mount.equipped || equipMount.isPending}
                      variant={mount.equipped ? "secondary" : "outline"}
                      className={cn("text-xs", !mount.equipped && "border-amber-700 hover:border-amber-600 text-amber-400")}
                    >
                      {mount.equipped ? "Riding" : "Equip"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Available Mounts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lockedMounts.map((mount: any) => (
          <Card key={mount.id} className="border-slate-800 bg-slate-900/20 opacity-70">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{MOUNT_TYPE_ICONS[mount.type] ?? "🐴"}</span>
                <div>
                  <div className="font-semibold text-sm text-slate-300">{mount.name}</div>
                  <div className="text-xs text-slate-500">Lv {mount.level} • +{mount.speedBonus}% speed</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-2">{mount.description}</p>
              <div className="text-xs text-slate-600">
                Source: {SOURCE_LABELS[mount.source] ?? mount.source}
                {mount.buyPrice > 0 && ` • 💰 ${mount.buyPrice.toLocaleString()}g`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ownedMounts.length === 0 && lockedMounts.length === 0 && (
        <div className="text-center text-slate-500 py-8">No mounts available yet</div>
      )}
    </div>
  );
}
