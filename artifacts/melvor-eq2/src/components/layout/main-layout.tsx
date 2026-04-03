import * as React from "react";
import { Sidebar } from "./sidebar";
import { useGetCharacter, useGetCombatState, applyRegen } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Map, Coins, Heart, Zap } from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: character } = useGetCharacter();
  const { data: combatState } = useGetCombatState();
  const queryClient = useQueryClient();

  // Global out-of-combat regen poller — keeps HP/Power ticking on every page
  React.useEffect(() => {
    if (combatState?.active) return;
    const interval = setInterval(async () => {
      try {
        const data = await applyRegen();
        // Update the generated-client query key so HUD bars stay in sync
        queryClient.setQueryData(["/api/character"], (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return { ...old, health: data.health, power: data.power };
        });
        // Also keep the character-page profile cache in sync
        queryClient.setQueryData(["character", "profile"], (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return { ...old, health: data.health, power: data.power };
        });
      } catch {
        // silent — regen polling is best-effort
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [combatState?.active, queryClient]);

  const hpPct = character ? Math.min(100, (character.health / character.maxHealth) * 100) : 0;
  const powerPct = character ? Math.min(100, (character.power / character.maxPower) * 100) : 0;
  const xpPct = character ? Math.min(100, ((character.xp ?? 0) / Math.max(1, character.xpToNextLevel ?? 1)) * 100) : 0;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top Bar ── */}
        <header className="h-14 border-b border-border/60 bg-slate-950/80 backdrop-blur shrink-0 flex items-center px-5 gap-4">
          {/* Zone */}
          <Link href="/zones" className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors font-medium shrink-0">
            <Map className="w-3.5 h-3.5" />
            {character?.zone ?? "—"}
          </Link>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Combat status */}
          {combatState?.active && combatState.enemy ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400">vs {combatState.enemy.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-600 shrink-0">Idle</span>
          )}

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* HP bar */}
          {character && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Heart className="w-3 h-3 text-red-500 shrink-0" />
              <div className="flex flex-col gap-0.5 w-24 shrink-0">
                <Progress value={hpPct} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-red-500 rounded-full" />
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums hidden sm:block">{character.health}/{character.maxHealth}</span>
            </div>
          )}

          {/* Power bar */}
          {character && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap className="w-3 h-3 text-blue-500 shrink-0" />
              <div className="w-20 shrink-0">
                <Progress value={powerPct} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-blue-500 rounded-full" />
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums hidden sm:block">{character.power}/{character.maxPower}</span>
            </div>
          )}

          {/* XP bar */}
          {character && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[10px] text-amber-600 shrink-0 font-bold">XP</span>
              <div className="flex-1 min-w-[60px] max-w-[120px]">
                <Progress value={xpPct} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-amber-600 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-600 tabular-nums hidden md:block">{xpPct.toFixed(1)}%</span>
            </div>
          )}

          {/* Gold */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-bold text-amber-400 tabular-nums">{(character?.gold ?? 0).toLocaleString()}</span>
            <span className="text-xs text-slate-600">g</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 relative">
          <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
