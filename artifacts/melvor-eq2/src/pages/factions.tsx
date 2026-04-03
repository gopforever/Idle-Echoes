import * as React from "react";
import { useGetFactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NpcDialogueModal } from "@/components/game/npc-dialogue-modal";

const STANDING_COLORS: Record<string, string> = {
  Hated: "text-red-600",
  Threatening: "text-red-500",
  Apprehensive: "text-orange-500",
  Dubious: "text-amber-500",
  Indifferent: "text-slate-400",
  Amiable: "text-green-400",
  Kindly: "text-sky-400",
  Warmly: "text-blue-400",
  Ally: "text-purple-400",
};

const STANDING_ORDER = ["Hated", "Threatening", "Apprehensive", "Dubious", "Indifferent", "Amiable", "Kindly", "Warmly", "Ally"];

function standingToPercent(standing: number): number {
  return Math.max(0, Math.min(100, ((standing + 2000) / 42000) * 100));
}

const FACTION_EMOJIS: Record<string, string> = {
  qeynos: "🛡️", freeport: "⚔️", neriak: "🌑", concordium: "🔮",
  ironforge: "⚒️", celestial_watch: "✝️", halasian: "❄️", scaled_mystics: "🐉",
};

const FACTION_EMISSARY: Record<string, { name: string; role: string }> = {
  qeynos:          { name: "Captain Darathar",   role: "Qeynos Guard captain" },
  freeport:        { name: "Overlord's Envoy",    role: "Freeport emissary" },
  neriak:          { name: "Dark Elf Liaison",    role: "Neriak ambassador" },
  concordium:      { name: "Arcane Curator",      role: "Concordium mage scholar" },
  ironforge:       { name: "Forgemaster Grunvik", role: "Ironforge Exchange broker" },
  celestial_watch: { name: "Watcher Elysara",     role: "Celestial Watch paladin" },
  halasian:        { name: "Thane Bjornolf",      role: "Halasian ranger chief" },
  scaled_mystics:  { name: "Elder Ssyssek",       role: "Scaled Mystics dragon-sage" },
};

export default function FactionsPage() {
  const { data: factions, isLoading } = useGetFactions();

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Faction Standings</h1>
        <p className="text-slate-400 text-sm mt-1">Your reputation across Norrath — earn standing by defeating enemies and completing quests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {factions?.map((faction: any) => {
          const pct = standingToPercent(faction.standing);
          const standingIndex = STANDING_ORDER.indexOf(faction.standingTitle);
          const tierColor = STANDING_COLORS[faction.standingTitle] ?? "text-slate-400";
          const emoji = FACTION_EMOJIS[faction.id] ?? "🏛️";

          return (
            <Card key={faction.id} className={cn(
              "border-slate-800 bg-card/40 backdrop-blur",
              standingIndex >= 5 ? "border-green-900/50" : standingIndex <= 3 ? "border-red-900/50" : ""
            )}>
              <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm text-slate-200">{faction.name}</CardTitle>
                    <p className="text-xs text-slate-500">{faction.zone}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn("text-sm font-bold", tierColor)}>{faction.standingTitle}</div>
                    <NpcDialogueModal
                      npcName={FACTION_EMISSARY[faction.id]?.name ?? `${faction.name} Emissary`}
                      npcRole={FACTION_EMISSARY[faction.id]?.role ?? "faction representative"}
                      context={`You represent the ${faction.name}. Standing: ${faction.standingTitle} (${faction.standing})`}
                      triggerLabel="💬"
                      triggerClassName="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:border-amber-700/50 hover:text-amber-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-400">{faction.description}</p>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Standing: {faction.standing > 0 ? "+" : ""}{faction.standing}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", standingIndex >= 5 ? "bg-green-600" : standingIndex <= 3 ? "bg-red-700" : "bg-slate-600")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-700 mt-0.5">
                    {STANDING_ORDER.map((s, i) => (
                      <span key={s} className={cn(i === standingIndex ? (STANDING_COLORS[s] ?? "text-slate-400") : "")}>{i === standingIndex ? "▲" : ""}</span>
                    ))}
                  </div>
                </div>

                {standingIndex >= 5 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Perks unlocked:</p>
                    {faction.perks?.slice(0, 2).map((perk: string) => (
                      <div key={perk} className="text-xs text-green-400 flex gap-1">
                        <span>✓</span><span>{perk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
