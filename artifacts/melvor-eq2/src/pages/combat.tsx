import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCharacter,
  useGetCombatState,
  useStartCombat,
  useGetEnemies,
  useGetSkillsSummary,
  getGetCombatStateQueryKey,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Skull } from "lucide-react";
import { CombatHud, EnemyCard } from "@/components/game/combat-hud";
import type { EnemyData } from "@/components/game/combat-hud";

export default function Combat() {
  const queryClient = useQueryClient();
  const { data: character } = useGetCharacter();
  const { data: combatState } = useGetCombatState();
  const { data: enemies } = useGetEnemies({ zone: character?.zone });
  const startCombat = useStartCombat();

  const { data: skillsSummary } = useGetSkillsSummary();
  const activeSkills = (skillsSummary?.skills ?? []).filter((s: any) => s.isTraining).slice(0, 4);

  const [autoCombat, setAutoCombat] = React.useState(true);

  const handleStart = (enemyId: string) => {
    startCombat.mutate({ data: { enemyId } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCombatStateQueryKey() }),
    });
  };

  if (!character || !combatState) return <Skeleton className="h-[80vh] w-full rounded-xl" />;

  const typedEnemies = (enemies as EnemyData[] | undefined) ?? [];
  const bosses = typedEnemies.filter(e => e.isBoss);
  const regulars = typedEnemies.filter(e => !e.isBoss);
  const activeEnemy = combatState?.enemy as EnemyData | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto" style={{ height: "calc(100vh - 8.5rem)" }}>
      {/* ── Left: Combat HUD (arena + log) ── */}
      <div className="lg:col-span-2 flex flex-col min-h-0">
        <CombatHud
          autoCombat={autoCombat}
          onToggleAutoCombat={() => setAutoCombat(v => !v)}
          locationLabel={character.zone}
        />
      </div>

      {/* ── Right: Enemy Selection ── */}
      <Card className="flex flex-col min-h-0 bg-card/40 border-slate-800 overflow-hidden">
        <CardHeader className="py-2 px-4 border-b border-slate-800/50 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <Skull className="w-3.5 h-3.5 text-red-500" />
            <CardTitle className="text-xs font-semibold text-slate-400">Enemies in {character.zone}</CardTitle>
            <span className="ml-auto text-xs text-slate-600">{enemies?.length ?? 0} available</span>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-3 grid grid-cols-1 gap-2">
            {bosses.map((enemy: EnemyData) => (
              <EnemyCard
                key={enemy.id}
                enemy={enemy}
                isActive={activeEnemy?.id === enemy.id}
                isInCombat={!!combatState.active}
                onFight={handleStart}
                isPending={startCombat.isPending}
              />
            ))}
            {regulars.map((enemy: EnemyData) => (
              <EnemyCard
                key={enemy.id}
                enemy={enemy}
                isActive={activeEnemy?.id === enemy.id}
                isInCombat={!!combatState.active}
                onFight={handleStart}
                isPending={startCombat.isPending}
              />
            ))}
          </div>
        </ScrollArea>
        {activeSkills.length > 0 && (
          <div className="shrink-0 border-t border-slate-800/50 bg-slate-900/40 p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Idle Skills</div>
            <div className="space-y-2">
              {activeSkills.map((skill: any) => {
                const pct = Math.min(100, ((skill.xp ?? 0) / Math.max(1, skill.xpToNext ?? 1)) * 100);
                return (
                  <div key={skill.id}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        {skill.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">Lv {skill.level}</span>
                    </div>
                    <Progress value={pct} className="h-1 bg-slate-800 rounded-full"
                      indicatorClassName="bg-emerald-600 rounded-full" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
