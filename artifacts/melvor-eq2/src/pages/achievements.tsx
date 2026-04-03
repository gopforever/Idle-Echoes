import * as React from "react";
import { useGetAchievements, useGetAchievementsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  combat: "text-red-400 bg-red-900/20 border-red-800",
  character: "text-amber-400 bg-amber-900/20 border-amber-800",
  exploration: "text-sky-400 bg-sky-900/20 border-sky-800",
  collection: "text-purple-400 bg-purple-900/20 border-purple-800",
  crafting: "text-orange-400 bg-orange-900/20 border-orange-800",
  lore: "text-emerald-400 bg-emerald-900/20 border-emerald-800",
  gathering: "text-lime-400 bg-lime-900/20 border-lime-800",
};

const CATEGORY_ICONS: Record<string, string> = {
  combat: "⚔️", character: "🧙", exploration: "🗺️",
  collection: "📦", crafting: "⚒️", lore: "📖",
  gathering: "⛏️",
};

export default function AchievementsPage() {
  const { data: achievements, isLoading } = useGetAchievements();
  const { data: summary } = useGetAchievementsSummary();
  const [filter, setFilter] = React.useState<string>("all");
  const [showCompleted, setShowCompleted] = React.useState(true);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const categories = [...new Set(achievements?.map((a: any) => a.category) ?? [])];

  const filtered = achievements?.filter((a: any) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (!showCompleted && a.completed) return false;
    if (a.secret && !a.completed) return false;
    return true;
  }) ?? [];

  const completedCount = achievements?.filter((a: any) => a.completed).length ?? 0;
  const totalCount = achievements?.filter((a: any) => !a.secret || a.completed).length ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Summary */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Achievements</h1>
        <p className="text-slate-400 text-sm mt-1">Your legacy across Norrath</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-800 bg-card/40">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{completedCount}</div>
            <div className="text-xs text-slate-500">Completed</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-card/40">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-200">{totalCount}</div>
            <div className="text-xs text-slate-500">Total</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-card/40">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{Math.round((completedCount / Math.max(1, totalCount)) * 100)}%</div>
            <div className="text-xs text-slate-500">Completion</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilter("all")} className={cn("px-3 py-1 rounded text-xs border transition-colors", filter === "all" ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400")}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat === filter ? "all" : cat)}
            className={cn("px-3 py-1 rounded text-xs border transition-colors", filter === cat ? "border-current" : "border-slate-700 text-slate-400", CATEGORY_COLORS[cat] ?? "")}>
            {CATEGORY_ICONS[cat] ?? ""} {cat}
          </button>
        ))}
        <button onClick={() => setShowCompleted(!showCompleted)} className={cn("ml-auto px-3 py-1 rounded text-xs border transition-colors", !showCompleted ? "border-slate-500 text-slate-400 bg-slate-800" : "border-slate-700 text-slate-500")}>
          {showCompleted ? "Hide" : "Show"} Completed
        </button>
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((achievement: any) => {
          const pct = Math.min(100, (achievement.progress / achievement.target) * 100);

          return (
            <div
              key={achievement.id}
              className={cn(
                "rounded-lg border p-4 transition-all",
                achievement.completed
                  ? "border-amber-600/50 bg-amber-950/20"
                  : "border-slate-800 bg-slate-900/40 opacity-80"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", achievement.completed ? "text-amber-400" : "text-slate-300")}>{achievement.name}</span>
                    {achievement.completed && <span className="text-xs text-green-400">✓</span>}
                    {achievement.secret && !achievement.completed && <span className="text-xs text-slate-600">🔒</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{achievement.description}</p>

                  {!achievement.completed && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{achievement.progress} / {achievement.target}</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-700 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", CATEGORY_COLORS[achievement.category] ?? "")}>
                      {CATEGORY_ICONS[achievement.category] ?? ""} {achievement.category}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {achievement.reward === "gold" ? `+${achievement.rewardValue}g` :
                       achievement.reward === "xp" ? `+${achievement.rewardValue} XP` :
                       achievement.reward === "aa_point" ? `+${achievement.rewardValue} AA` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
