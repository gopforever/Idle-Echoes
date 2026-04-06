import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DUNGEON_GS_GATE } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GearItem {
  slot: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
}

interface DungeonClear {
  dungeonId: string;
  bestDifficulty: string;
  clearCount: number;
  lastClearedAt: string;
}

interface RaidClear {
  raidId: string;
  maxPhase: number;
  clearCount: number;
  lastClearedAt: string;
}

interface GhostProfile {
  ghostId: number;
  name: string;
  class: string;
  race: string;
  level: number;
  zone: string;
  killCount: number;
  bossKills: number;
  generation: number;
  parentId: number | null;
  inheritedTraits: string[];
  gearScore: number;
  dungeonClears: DungeonClear[];
  raidClears: RaidClear[];
  gear: GearItem[];
  stats: {
    maxHp: number;
    attackRating: number;
    defenseRating: number;
    mitigation: number;
    avoidance: number;
    critChance: number;
    critBonus: number;
    haste: number;
    dps: number;
    totalPower: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gsBadgeColor(gs: number) {
  if (gs >= DUNGEON_GS_GATE.mythical)   return "text-orange-300";
  if (gs >= DUNGEON_GS_GATE.legendary)  return "text-blue-300";
  if (gs >= DUNGEON_GS_GATE.expert)     return "text-green-300";
  return "text-slate-400";
}

const RARITY_COLORS: Record<string, string> = {
  common:    "text-slate-300",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  legendary: "text-orange-400",
  fabled:    "text-purple-400",
  mythical:  "text-yellow-400",
};

const CLASS_ICONS: Record<string, string> = {
  Berserker: "⚔️",
  Guardian: "🛡️",
  Bruiser: "👊",
  Monk: "🥋",
  "Shadow Knight": "💀",
  Paladin: "✨",
  Ranger: "🏹",
  Assassin: "🗡️",
  Swashbuckler: "⚡",
  Troubadour: "🎵",
  Dirge: "🎶",
  Wizard: "🔮",
  Warlock: "👁️",
  Conjuror: "✨",
  Necromancer: "💀",
  Illusionist: "🌀",
  Coercer: "🧿",
  Templar: "⚔️",
  Inquisitor: "🔥",
  Mystic: "🌙",
  Defiler: "☠️",
  Warden: "🌿",
  Fury: "🌪️",
};

// ─── GhostInspect Panel ───────────────────────────────────────────────────────

export function GhostInspect({
  ghostId,
  onClose,
}: {
  ghostId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery<GhostProfile>({
    queryKey: ["ghost-profile", ghostId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/leaderboard/ghost/${ghostId}/profile`));
      if (!res.ok) throw new Error("Failed to load ghost profile");
      return res.json();
    },
  });

  const { data: rivals } = useQuery<number[]>({
    queryKey: ["character-rivals"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/character/rivals"));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: { id: number }) => r.id) : [];
    },
  });

  const isRival = rivals?.includes(ghostId) ?? false;

  const rivalMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      const res = await fetch(apiUrl("/api/character/rivals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghostId, action }),
      });
      if (!res.ok) throw new Error("Failed to update rivals");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-rivals"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative h-full w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 text-lg z-10"
        >
          ✕
        </button>

        {isLoading && (
          <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
            Loading ghost profile…
          </div>
        )}

        {error && (
          <div className="p-4 text-red-400 text-sm">Failed to load ghost profile.</div>
        )}

        {profile && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <span className="text-2xl">{CLASS_ICONS[profile.class] ?? "⚔️"}</span>
                  <span>{profile.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 ml-auto">
                    Lv {profile.level}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-400">
                  {profile.race} {profile.class}
                </div>
                <div className="text-xs text-slate-500 mt-1">{profile.zone}</div>
              </CardContent>
            </Card>

            {/* Generation */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                    Gen {profile.generation}
                  </span>
                  {profile.parentId && (
                    <span className="text-xs text-slate-500">Child of #{profile.parentId}</span>
                  )}
                </div>
                {profile.inheritedTraits.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {profile.inheritedTraits.map(trait => (
                      <span key={trait} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/50">
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gear Score */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="pt-3 pb-3">
                <div className="text-xs uppercase tracking-widest text-slate-600 mb-1">Gear Score</div>
                <div className={cn("text-3xl font-bold", gsBadgeColor(profile.gearScore))}>
                  {Math.round(profile.gearScore)}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ["HP", profile.stats.maxHp],
                    ["ATK", profile.stats.attackRating],
                    ["DEF", profile.stats.defenseRating],
                    ["MIT", `${profile.stats.mitigation}%`],
                    ["Crit%", `${profile.stats.critChance.toFixed(1)}%`],
                    ["DPS", profile.stats.dps.toFixed(1)],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-300">{val}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gear */}
            {profile.gear.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Gear</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {profile.gear.map(item => (
                      <div key={item.slot} className="flex justify-between text-xs">
                        <span className="text-slate-500 capitalize">{item.slot}</span>
                        <span className={RARITY_COLORS[item.rarity] ?? "text-slate-300"}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dungeon Clears */}
            {profile.dungeonClears.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Dungeon Clears</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700">
                        <th className="text-left py-1">Dungeon</th>
                        <th className="text-center">Best</th>
                        <th className="text-right">Clears</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.dungeonClears.map(d => (
                        <tr key={d.dungeonId} className="border-b border-slate-800">
                          <td className="py-1 text-slate-300">{d.dungeonId}</td>
                          <td className="text-center capitalize text-slate-400">{d.bestDifficulty}</td>
                          <td className="text-right text-slate-300">{d.clearCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Raid Clears */}
            {profile.raidClears.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Raid Clears</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700">
                        <th className="text-left py-1">Raid</th>
                        <th className="text-center">Max Phase</th>
                        <th className="text-right">Clears</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.raidClears.map(r => (
                        <tr key={r.raidId} className="border-b border-slate-800">
                          <td className="py-1 text-slate-300">{r.raidId}</td>
                          <td className="text-center text-slate-400">{r.maxPhase}</td>
                          <td className="text-right text-slate-300">{r.clearCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Rival button */}
            <button
              onClick={() => rivalMutation.mutate(isRival ? "remove" : "add")}
              disabled={rivalMutation.isPending}
              className={cn(
                "w-full py-2 rounded-lg border text-sm font-medium transition-all",
                isRival
                  ? "border-red-700/50 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                  : "border-amber-700/50 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isRival ? "Remove Rival" : "Add as Rival"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
