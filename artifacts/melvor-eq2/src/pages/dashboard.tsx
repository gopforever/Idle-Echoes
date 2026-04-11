import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetCharacter,
  useGetCombatState,
  useGetGameSummary,
  useGetCharacterStats,
  useGetSkillsSummary,
  useGetFactions,
  useGetAchievements,
  useGetMounts,
  useGetWorldEvents,
  useGetWorldStats,
  useGetWorldZones,
} from "@workspace/api-client-react";
import { SpriteRenderer } from "@/components/game/sprite-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link, useLocation } from "wouter";
import {
  Sword, Shield, Coins, TrendingUp, Zap, Map as MapIcon, Users, Award,
  Star, ChevronRight, Swords, BookOpen, RefreshCw, Skull, Globe2, MessageSquare,
  UserMinus, Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

async function deleteCharacter() {
  const res = await fetch(apiUrl("/api/character"), { method: "DELETE" });
  if (!res.ok) throw new Error("Reset failed");
  return res.json();
}

const ghostQuoteCache = new Map<string, string>();

function GhostQuoteBubble({ playerName }: { playerName: string }) {
  const [quote, setQuote] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const fetchQuote = async () => {
    if (ghostQuoteCache.has(playerName)) {
      setQuote(ghostQuoteCache.get(playerName)!);
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/world/player/by-name/${encodeURIComponent(playerName)}/quote`));
      const data = await res.json();
      if (data.quote) {
        ghostQuoteCache.set(playerName, data.quote);
        setQuote(data.quote);
      }
    } catch {}
    setLoading(false);
    setOpen(true);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={fetchQuote}
        title={`Hear ${playerName}'s thoughts`}
        className="text-slate-600 hover:text-blue-400 transition-colors"
      >
        <MessageSquare className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 bottom-5 z-10 w-48 bg-slate-800 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-300 shadow-lg">
          <div className="font-semibold text-blue-400 mb-0.5">{playerName} says:</div>
          {loading ? <span className="text-slate-500 animate-pulse">thinking...</span> : quote ?? "..."}
          <button onClick={() => setOpen(false)} className="absolute top-1 right-1.5 text-slate-600 hover:text-slate-400 text-xs">×</button>
        </div>
      )}
    </div>
  );
}

const ARCHETYPE_COLORS: Record<string, string> = {
  Fighter: "bg-red-900/40 text-red-300 border-red-700",
  Scout: "bg-green-900/40 text-green-300 border-green-700",
  Mage: "bg-blue-900/40 text-blue-300 border-blue-700",
  Priest: "bg-amber-900/40 text-amber-300 border-amber-700",
};

const ALIGNMENT_ICON: Record<string, string> = {
  Qeynos: "🛡️", Freeport: "⚔️", Neutral: "⚖️",
};

const STANDING_COLORS: Record<string, string> = {
  Hated: "text-red-600", Threatening: "text-red-500", Apprehensive: "text-orange-500",
  Dubious: "text-amber-500", Indifferent: "text-slate-400", Amiable: "text-green-400",
  Kindly: "text-sky-400", Warmly: "text-blue-400", Ally: "text-purple-400",
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center gap-3">
      <div className={cn("p-2.5 rounded-lg", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-slate-100 leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Rivals Card ─────────────────────────────────────────────────────────────

const PERSONALITY_BORDER_DASH: Record<string, string> = {
  Aggressive: "border-red-600/70",
  Cautious:   "border-sky-600/70",
  Explorer:   "border-emerald-600/70",
  Greedy:     "border-yellow-600/70",
  Scholarly:  "border-violet-600/70",
  Devout:     "border-amber-500/70",
};

const PERSONALITY_EMOJI_DASH: Record<string, string> = {
  Aggressive: "😤", Cautious: "🛡️", Explorer: "🗺️",
  Greedy: "💰", Scholarly: "📚", Devout: "🙏",
};

const portraitCacheDash = new Map<number, string>();

function GhostPortraitDash({ playerId, personality }: { playerId: number; personality?: string }) {
  const [src, setSrc] = React.useState<string | null>(portraitCacheDash.get(playerId) ?? null);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (src || loading || failed) return;
    setLoading(true);
    let active = true;
    fetch(apiUrl(`/api/world/player/${playerId}/portrait`))
      .then(r => {
        if (!r.ok) { if (active) setFailed(true); return null; }
        return r.json();
      })
      .then(data => {
        if (!active || !data?.portrait) return;
        portraitCacheDash.set(playerId, data.portrait);
        setSrc(data.portrait);
      })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [playerId]);

  const borderCls = personality ? (PERSONALITY_BORDER_DASH[personality] ?? "border-slate-600/70") : "border-slate-600/70";
  const fallback = personality ? (PERSONALITY_EMOJI_DASH[personality] ?? "?") : "?";

  if (src) {
    return (
      <img
        src={src} alt=""
        className={cn("w-10 h-10 rounded-lg object-cover border-2 shrink-0 shadow", borderCls)}
      />
    );
  }

  return (
    <div className={cn("w-10 h-10 rounded-lg bg-slate-800 border-2 flex items-center justify-center shrink-0 text-lg", borderCls)}>
      {loading ? <span className="text-slate-600 text-xs animate-pulse">…</span> : fallback}
    </div>
  );
}

function RivalsCard({ character }: { character: any }) {
  const [rivals, setRivals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [, navigate] = useLocation();

  React.useEffect(() => {
    fetch(apiUrl("/api/character/rivals"))
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRivals(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function removeRival(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    const prevRivals = rivals;
    setRivals(prev => prev.filter(r => r.id !== id));
    try {
      const r = await fetch(apiUrl("/api/character/rivals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghostId: id, action: "remove" }),
      });
      if (!r.ok) setRivals(prevRivals);
    } catch {
      setRivals(prevRivals);
    }
  }

  return (
    <Card className="border-amber-800/30 bg-amber-950/10 backdrop-blur">
      <CardHeader className="py-3 px-4 border-b border-amber-800/20 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-amber-300 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-400" /> Rivals
          {rivals.length > 0 && (
            <span className="text-[10px] text-slate-600 font-normal">Head-to-head comparison</span>
          )}
        </CardTitle>
        <Link href="/world" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">
          {rivals.length === 0 ? "Find rivals" : "Manage"} <ChevronRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : rivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Crosshair className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-600">No rivals tracked yet.</p>
            <p className="text-xs text-slate-700">Visit the Living World to find worthy rivals.</p>
            <button
              onClick={() => navigate("/world")}
              className="mt-1 text-xs px-3 py-1 rounded-lg border border-amber-800/40 text-amber-500 hover:bg-amber-900/20 transition-colors"
            >
              Find rivals →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rivals.map((rival: any) => {
              const lvlDiff = (character.level ?? 0) - rival.level;
              const killDiff = (character.killCount ?? 0) - rival.killCount;
              const goldDiff = Math.round((character.gold ?? 0) - (rival.gold ?? 0));
              return (
                <div
                  key={rival.id}
                  className="border border-slate-700 bg-slate-900/60 rounded-xl p-3 relative group cursor-pointer hover:border-slate-600 transition-colors"
                  onClick={() => navigate(`/world?ghostId=${rival.id}`)}
                >
                  <button
                    onClick={(e) => removeRival(e, rival.id)}
                    title="Remove rival"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    <GhostPortraitDash playerId={rival.id} personality={rival.personality} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{rival.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{rival.race} {rival.class}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <RivalStat
                      label="Level"
                      rivalVal={rival.level}
                      playerVal={character.level ?? 0}
                      diff={lvlDiff}
                      format={v => `Lv ${v}`}
                    />
                    <RivalStat
                      label="Kills"
                      rivalVal={rival.killCount}
                      playerVal={character.killCount ?? 0}
                      diff={killDiff}
                      format={v => v.toLocaleString()}
                    />
                    <RivalStat
                      label="Gold"
                      rivalVal={Math.round(rival.gold ?? 0)}
                      playerVal={Math.round(character.gold ?? 0)}
                      diff={goldDiff}
                      format={v => `${v.toLocaleString()}g`}
                    />
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-slate-600">
                    <MapIcon className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{rival.zone}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RivalStat({ label, rivalVal, playerVal, diff, format }: {
  label: string; rivalVal: number; playerVal: number;
  diff: number; format: (v: number) => string;
}) {
  const winning = diff > 0;
  const tied = diff === 0;
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 tabular-nums">{format(rivalVal)}</span>
        <span className={cn(
          "font-bold tabular-nums",
          winning ? "text-emerald-400" : tied ? "text-slate-500" : "text-red-400"
        )}>
          {tied ? "=" : `${winning ? "+" : "-"}${format(Math.abs(diff))}`}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: character, isLoading: charLoading } = useGetCharacter();
  const { data: combatState } = useGetCombatState();
  const { data: summary } = useGetGameSummary();
  const { data: stats } = useGetCharacterStats();
  const { data: skillsSummary } = useGetSkillsSummary();
  const { data: factions } = useGetFactions();
  const { data: achievements } = useGetAchievements();
  const { data: mounts } = useGetMounts();
  const { data: worldEvents } = useGetWorldEvents({ limit: 5 }, { query: { refetchInterval: 10000, queryKey: [] } });
  const { data: worldStats } = useGetWorldStats({ query: { refetchInterval: 10000, queryKey: [] } });
  const { data: worldZones } = useGetWorldZones({ query: { refetchInterval: 10000, queryKey: [] } });

  const resetCharacter = useMutation({
    mutationFn: deleteCharacter,
    onSuccess: () => {
      queryClient.clear();
      navigate("/creation");
    },
  });

  if (charLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      </div>
    );
  }

  if (!character) return <div className="text-red-400 p-4">Failed to load character.</div>;

  const xpPercent = Math.min(100, ((character.xp ?? 0) / Math.max(1, character.xpToNextLevel ?? 1)) * 100);
  const hpPercent = Math.min(100, (character.health / character.maxHealth) * 100);
  const powerPercent = Math.min(100, (character.power / character.maxPower) * 100);

  const char = character as any;
  const archetype = char.archetype as string | undefined;
  const alignment = char.alignment as string | undefined;
  const aaPoints = char.aaPoints ?? 0;

  const equippedMount = mounts?.find((m: any) => m.equipped);
  const completedAchievements = achievements?.filter((a: any) => a.completed).length ?? 0;
  const topFactions = (factions ?? []).slice(0, 3);
  const allSkills = (skillsSummary as any)?.skills ?? [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Hero Banner ── */}
      <Card className="overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_70%)]" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0 relative">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                <SpriteRenderer characterClass={character.class} size="xl" />
              </div>
              {equippedMount && (
                <div className="absolute -bottom-2 -right-2 bg-slate-800 border border-amber-600/50 rounded-full px-2 py-0.5 text-[10px] text-amber-400 font-medium">
                  🐴 {equippedMount.name}
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-100 tracking-wide leading-tight">
                    {character.name}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-300 capitalize">
                      {char.race?.replace(/_/g, " ") || "Human"}
                    </span>
                    {archetype && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", ARCHETYPE_COLORS[archetype] ?? "border-slate-700 text-slate-400")}>
                        {archetype}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-200 font-medium">
                      Lv {character.level} {character.class}
                    </span>
                    {alignment && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-300">
                        {ALIGNMENT_ICON[alignment] ?? ""} {alignment}
                      </span>
                    )}
                    {combatState?.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-red-700 bg-red-900/30 text-red-400 animate-pulse font-medium">
                        ⚔ In Combat
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/combat" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700/20 border border-amber-700/40 text-amber-400 text-sm font-medium hover:bg-amber-700/30 transition-colors">
                    <Swords className="w-4 h-4" /> Combat
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-slate-600 hover:text-red-400 hover:bg-red-950/30 border border-slate-800 hover:border-red-900/60 transition-all"
                        title="Create a new character (deletes current progress)"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        <span className="text-xs">New Character</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-200">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-400 flex items-center gap-2">
                          <Skull className="w-5 h-5" /> Delete {character.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400 space-y-2">
                          <p>This will permanently delete your character and <span className="text-slate-200 font-medium">all associated progress</span>:</p>
                          <ul className="text-sm space-y-0.5 text-slate-500 list-disc list-inside">
                            <li>All inventory items and gold</li>
                            <li>All skills and XP</li>
                            <li>Combat history and achievements</li>
                            <li>Faction standings and AA points</li>
                            <li>Mounts and collections</li>
                          </ul>
                          <p className="text-red-400/80 text-xs mt-2 font-medium">⚠ This action cannot be undone.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800">
                          Keep Playing
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => resetCharacter.mutate()}
                          disabled={resetCharacter.isPending}
                          className="bg-red-800 hover:bg-red-700 text-white border-0"
                        >
                          {resetCharacter.isPending ? "Deleting…" : "Delete & Start Over"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Vitals */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="text-red-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> HP</span>
                    <span className="tabular-nums">{character.health} / {character.maxHealth}</span>
                  </div>
                  <Progress value={hpPercent} className="h-2.5 bg-slate-800 rounded-full" indicatorClassName="bg-gradient-to-r from-red-600 to-red-500 rounded-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="text-blue-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Power</span>
                    <span className="tabular-nums">{character.power} / {character.maxPower}</span>
                  </div>
                  <Progress value={powerPercent} className="h-2.5 bg-slate-800 rounded-full" indicatorClassName="bg-gradient-to-r from-blue-600 to-blue-500 rounded-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="text-amber-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> XP</span>
                    <span className="tabular-nums">{xpPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={xpPercent} className="h-2.5 bg-slate-800 rounded-full" indicatorClassName="bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" />
                  <div className="text-[10px] text-slate-600 text-right">{(character.xp ?? 0).toLocaleString()} / {(character.xpToNextLevel ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stat Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Gold" value={(character.gold ?? 0).toLocaleString()} sub="current balance" icon={Coins} color="bg-amber-900/40 text-amber-400" />
        <StatCard label="Total Level" value={skillsSummary?.totalLevel ?? 0} sub="across all skills" icon={TrendingUp} color="bg-emerald-900/40 text-emerald-400" />
        <StatCard label="AA Points" value={aaPoints} sub={`${char.aaPointsSpent ?? 0} spent`} icon={Zap} color="bg-purple-900/40 text-purple-400" />
        <StatCard label="Achievements" value={completedAchievements} sub={`of ${achievements?.length ?? 0} total`} icon={Award} color="bg-sky-900/40 text-sky-400" />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Combat Status */}
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sword className="w-4 h-4 text-red-400" /> Combat
            </CardTitle>
            <Link href="/combat" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">View <ChevronRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {combatState?.active && combatState.enemy ? (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-900/40">
                  <div className="flex items-center gap-3">
                    <SpriteRenderer enemyType={combatState.enemy.type} size="sm" type="enemy" />
                    <div>
                      <div className="text-sm font-bold text-red-300">{combatState.enemy.name}</div>
                      <div className="text-xs text-slate-500">Lv {combatState.enemy.level} • {combatState.enemy.type}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 border border-red-800 animate-pulse font-bold">FIGHT</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Enemy HP</span>
                    <span>{combatState.enemyCurrentHp} / {combatState.enemy.maxHp}</span>
                  </div>
                  <Progress value={(combatState.enemyCurrentHp / combatState.enemy.maxHp) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-red-600" />
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-slate-600 space-y-3">
                <div className="text-2xl opacity-30">⚔️</div>
                <p className="text-sm">Not in combat</p>
                <Link href="/combat" className="inline-block px-4 py-1.5 rounded bg-amber-800/30 border border-amber-700/40 text-amber-400 text-xs font-medium hover:bg-amber-800/50 transition-colors">
                  Find Enemies →
                </Link>
              </div>
            )}

            {/* Zone */}
            <div className="pt-2 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1"><MapIcon className="w-3 h-3" /> Zone</span>
                <Link href="/zones" className="text-amber-500 font-medium hover:text-amber-400">{character.zone ?? "Unknown"}</Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Combat Stats */}
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Combat Stats
            </CardTitle>
            <Link href="/character" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">Sheet <ChevronRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {[
                { label: "Attack", val: stats?.attackRating ?? 0, color: "text-red-400" },
                { label: "Defense", val: stats?.defenseRating ?? 0, color: "text-blue-400" },
                { label: "Mitigation", val: stats?.mitigation ?? 0, color: "text-slate-300" },
                { label: "Avoidance", val: stats?.avoidance ?? 0, color: "text-slate-300" },
                { label: "Crit%", val: `${stats?.critChance ?? 0}%`, color: "text-amber-400" },
                { label: "Crit Bonus", val: `${stats?.critBonus ?? 0}%`, color: "text-amber-400" },
                { label: "Haste", val: `${stats?.haste ?? 0}%`, color: "text-green-400" },
                { label: "DPS", val: (stats?.dps ?? 0).toFixed(1), color: "text-orange-400" },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className={cn("text-xs font-bold tabular-nums", s.color)}>{s.val}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/50">
              <div className="text-xs text-slate-500 mb-1.5">Weapon</div>
              <div className="text-xs text-slate-300 tabular-nums">
                {(stats?.weaponDamageMin ?? 0)}–{(stats?.weaponDamageMax ?? 0)} dmg
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factions quick view */}
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Factions
            </CardTitle>
            <Link href="/factions" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">All <ChevronRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topFactions.map((f: any) => {
              const pct = Math.max(0, Math.min(100, ((f.standing + 2000) / 42000) * 100));
              return (
                <div key={f.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">{f.name}</span>
                    <span className={cn("font-bold", STANDING_COLORS[f.standingTitle] ?? "text-slate-400")}>{f.standingTitle}</span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-slate-600 rounded-full" />
                </div>
              );
            })}
            {topFactions.length === 0 && <p className="text-xs text-slate-600 text-center py-2">No faction data</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Skills */}
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Skills
            </CardTitle>
            <Link href="/skills" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">All <ChevronRight className="w-3 h-3" /></Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {allSkills.slice(0, 8).map((skill: any) => {
                const pct = Math.min(100, ((skill.xp ?? 0) / Math.max(1, skill.xpToNext ?? 1)) * 100);
                return (
                  <div key={skill.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cn("font-medium", skill.isTraining ? "text-emerald-400" : "text-slate-400")}>
                        {skill.isTraining && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
                        {skill.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">Lv {skill.level}</span>
                    </div>
                    <Progress value={pct} className="h-1 bg-slate-800 rounded-full" indicatorClassName={cn("rounded-full", skill.isTraining ? "bg-emerald-600" : "bg-slate-700")} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Achievements + Mounts */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-card/40 backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Recent Achievements
              </CardTitle>
              <Link href="/achievements" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">All <ChevronRight className="w-3 h-3" /></Link>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {achievements?.filter((a: any) => !a.completed).slice(0, 3).map((a: any) => {
                  const pct = Math.min(100, (a.progress / Math.max(1, a.target)) * 100);
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-lg shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-300 truncate">{a.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Progress value={pct} className="h-1 flex-1 bg-slate-800 rounded-full" indicatorClassName="bg-amber-700 rounded-full" />
                          <span className="text-[10px] text-slate-600 tabular-nums shrink-0">{a.progress}/{a.target}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {completedAchievements > 0 && (
                  <div className="text-xs text-center text-slate-600 pt-1">{completedAchievements} completed</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mount + AA */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-800 bg-card/40 backdrop-blur">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1 mb-2"><Star className="w-3 h-3 text-amber-400" /> Mount</div>
                {equippedMount ? (
                  <div>
                    <div className="text-sm font-bold text-amber-400">{equippedMount.name}</div>
                    <div className="text-xs text-slate-500">+{equippedMount.speedBonus}% speed</div>
                    <div className="text-xs text-slate-600 capitalize mt-1">{equippedMount.type}</div>
                  </div>
                ) : (
                  <Link href="/mounts" className="text-xs text-slate-600 hover:text-amber-500 transition-colors">No mount equipped →</Link>
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-card/40 backdrop-blur">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1 mb-2"><Zap className="w-3 h-3 text-purple-400" /> Alt Advancement</div>
                <div className="text-2xl font-bold text-purple-400">{aaPoints}</div>
                <div className="text-xs text-slate-500">points available</div>
                {aaPoints > 0 && (
                  <Link href="/aa" className="text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1 block">Spend now →</Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Rivals Card ── */}
      <RivalsCard character={character} />

      {/* ── Living World Widget ── */}
      <Card className="border-slate-800 bg-card/40 backdrop-blur">
        <CardHeader className="py-3 px-4 border-b border-slate-800/50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" /> Living World of Norrath
            {worldStats && (
              <span className="text-[10px] text-slate-600 font-normal ml-1">
                · {worldStats.totalPlayers} adventurers online
              </span>
            )}
          </CardTitle>
          <Link href="/world" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recent events */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Recent Activity</div>
              {(worldEvents ?? []).slice(0, 5).map((e: any) => {
                const icons: Record<string, string> = { kill: "⚔️", boss_kill: "💀", level_up: "⬆️", zone_travel: "🗺️", loot: "💰" };
                const colors: Record<string, string> = { boss_kill: "text-purple-400", level_up: "text-amber-400", loot: "text-yellow-400" };
                return (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 mt-0.5">{icons[e.type] ?? "📜"}</span>
                    <span className={cn("flex-1 truncate", colors[e.type] ?? "text-slate-400")}>{e.message}</span>
                    {e.playerName && (
                      <span className="shrink-0"><GhostQuoteBubble playerName={e.playerName} /></span>
                    )}
                  </div>
                );
              })}
              {(!worldEvents || worldEvents.length === 0) && (
                <p className="text-xs text-slate-600 text-center py-2">World is waking up...</p>
              )}
            </div>
            {/* Zone breakdown */}
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Adventurers by Zone</div>
              <div className="space-y-1.5">
                {(Array.isArray(worldZones) ? worldZones : [])
                  .filter((z: any) => z.total > 0)
                  .sort((a: any, b: any) => b.total - a.total)
                  .slice(0, 6)
                  .map((zone: any) => (
                    <div key={zone.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-slate-400 truncate">{zone.name}</span>
                      <div className="flex items-center gap-1">
                        {zone.realCount > 0 && (
                          <span className="text-[9px] px-1 py-0 rounded border border-blue-700/60 text-blue-400 font-bold">You</span>
                        )}
                        <span className="text-slate-500 tabular-nums">
                          {zone.ghostCount}{zone.ghostCount > 0 ? " ghost" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                {(Array.isArray(worldZones) ? worldZones : []).filter((z: any) => z.total > 0).length === 0 && (
                  <p className="text-xs text-slate-600">Loading zones...</p>
                )}
              </div>
              {worldStats && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                    <div className="text-base font-black text-red-400">{(worldStats.totalKills ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-600">World Kills</div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                    <div className="text-base font-black text-purple-400">{worldStats.totalBossKills}</div>
                    <div className="text-[10px] text-slate-600">Boss Kills</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
