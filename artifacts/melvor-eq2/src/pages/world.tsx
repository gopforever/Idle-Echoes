import * as React from "react";
import {
  useGetWorldPlayers,
  useGetWorldEvents,
  useGetWorldLeaderboard,
  useGetWorldStats,
  useGetWorldZones,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import {
  Globe2, Users, Sword, Coins, Trophy, ScrollText,
  Zap, Crown, Star, Shield, Map as MapIcon, RefreshCw, TrendingUp, Skull, MessageSquare,
  UserPlus, UserMinus, BookOpen, Loader2, Feather,
} from "lucide-react";
import { useRealtimeWorldEvents } from "@/hooks/use-realtime-world";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ───────────────────────────────────────────────────────────────

const ARCHETYPE_COLORS: Record<string, string> = {
  Fighter: "bg-red-900/40 text-red-300 border-red-800",
  Scout:   "bg-green-900/40 text-green-300 border-green-800",
  Mage:    "bg-blue-900/40 text-blue-300 border-blue-800",
  Priest:  "bg-amber-900/40 text-amber-300 border-amber-800",
};

const PERSONALITY_STYLES: Record<string, { icon: string; cls: string }> = {
  Aggressive: { icon: "⚔️", cls: "border-red-700/60 text-red-400 bg-red-950/20" },
  Cautious:   { icon: "🛡️", cls: "border-sky-700/60 text-sky-400 bg-sky-950/20" },
  Explorer:   { icon: "🗺️", cls: "border-emerald-700/60 text-emerald-400 bg-emerald-950/20" },
  Greedy:     { icon: "💰", cls: "border-yellow-700/60 text-yellow-400 bg-yellow-950/20" },
  Scholarly:  { icon: "📚", cls: "border-violet-700/60 text-violet-400 bg-violet-950/20" },
  Devout:     { icon: "✨", cls: "border-amber-600/60 text-amber-300 bg-amber-950/20" },
};

const EVENT_ICONS: Record<string, string> = {
  kill:        "⚔️",
  boss_kill:   "💀",
  level_up:    "⬆️",
  zone_travel: "🗺️",
  loot:        "💰",
};

const EVENT_COLORS: Record<string, string> = {
  kill:        "border-slate-800 bg-slate-900/40",
  boss_kill:   "border-purple-800/60 bg-purple-950/30",
  level_up:    "border-amber-700/60 bg-amber-950/20",
  zone_travel: "border-blue-800/60 bg-blue-950/20",
  loot:        "border-yellow-800/60 bg-yellow-950/20",
};

const ARCHETYPE_SPRITE: Record<string, string> = {
  Fighter: "⚔️", Scout: "🏹", Mage: "🔮", Priest: "✨",
};

const ALIGNMENT_ICON: Record<string, string> = {
  Qeynos: "🛡️", Freeport: "⚔️", Neutral: "⚖️",
};

// ─── Ghost Quote Cache & Bubble ───────────────────────────────────────────────

const ghostQuoteCache = new Map<string, string>();

function GhostQuote({ playerName }: { playerName: string }) {
  const [quote, setQuote] = React.useState<string | null>(ghostQuoteCache.get(playerName) ?? null);

  React.useEffect(() => {
    if (quote) return;
    let active = true;
    fetch(`/api/world/player/by-name/${encodeURIComponent(playerName)}/quote`)
      .then(r => r.json())
      .then(data => {
        if (!active || !data.quote) return;
        ghostQuoteCache.set(playerName, data.quote);
        setQuote(data.quote);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [playerName]);

  if (!quote) return null;
  return (
    <p className="text-[10px] text-blue-400/70 italic mt-0.5 leading-snug">
      <MessageSquare className="w-2.5 h-2.5 inline mr-0.5 opacity-60" />
      &ldquo;{quote}&rdquo;
    </p>
  );
}

// ─── Chronicle of Norrath Card ───────────────────────────────────────────────

interface ChronicleData {
  text: string;
  generatedAt: string;
  cached: boolean;
}

function NorrathChronicleCard() {
  const [data, setData] = React.useState<ChronicleData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [lastFetched, setLastFetched] = React.useState<number | null>(null);

  const fetchChronicle = React.useCallback((force = false) => {
    // Don't re-fetch if cached entry is less than 10 minutes old (unless forced)
    if (!force && lastFetched && Date.now() - lastFetched < 10 * 60 * 1000) return;
    setLoading(true);
    fetch("/api/world/chronicle")
      .then(r => r.json())
      .then((d: ChronicleData) => {
        setData(d);
        setLastFetched(Date.now());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lastFetched]);

  React.useEffect(() => {
    fetchChronicle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeAgo = data
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(data.generatedAt).getTime()) / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
      })()
    : null;

  return (
    <div className="border border-amber-900/40 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
          <Feather className="w-3.5 h-3.5 text-amber-400/80" />
          Chronicle of Norrath
        </h3>
        <div className="flex items-center gap-2">
          {timeAgo && (
            <span className="text-[10px] text-slate-500">{timeAgo}</span>
          )}
          <button
            onClick={() => fetchChronicle(true)}
            disabled={loading}
            className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-40"
            title="Refresh chronicle"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-slate-800/60 rounded" />
          <Skeleton className="h-3 w-5/6 bg-slate-800/60 rounded" />
          <Skeleton className="h-3 w-4/5 bg-slate-800/60 rounded" />
        </div>
      ) : data ? (
        <p className="text-xs text-amber-100/75 leading-relaxed italic font-serif">
          {data.text}
        </p>
      ) : (
        <p className="text-xs text-slate-600 italic">The Chronicle Keeper's quill rests…</p>
      )}
    </div>
  );
}

// ─── Ghost Portrait Avatar (thumbnail, lazy-loaded) ──────────────────────────

const portraitCache = new Map<number, string>();

const PERSONALITY_BORDER: Record<string, string> = {
  Aggressive: "border-red-600/70",
  Cautious:   "border-sky-600/70",
  Explorer:   "border-emerald-600/70",
  Greedy:     "border-yellow-600/70",
  Scholarly:  "border-violet-600/70",
  Devout:     "border-amber-500/70",
};

function GhostPortraitAvatar({ playerId, size = 32, personality, className }: {
  playerId: number; size?: number; personality?: string; className?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(portraitCache.get(playerId) ?? null);
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
        portraitCache.set(playerId, data.portrait);
        setSrc(data.portrait);
      })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [playerId]);

  const borderCls = personality ? (PERSONALITY_BORDER[personality] ?? "border-slate-600/70") : "border-slate-600/70";
  const fallbackEmoji = personality ? PERSONALITY_STYLES[personality]?.icon : "?";
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        className={cn("rounded-full object-cover border-2 shrink-0", borderCls, className)}
      />
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "rounded-full bg-slate-800 border-2 flex items-center justify-center shrink-0 text-center",
        borderCls, className
      )}
    >
      {loading
        ? <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
        : <span style={{ fontSize: size * 0.45 }}>{fallbackEmoji}</span>
      }
    </div>
  );
}

// ─── Ghost Profile Panel (slide-over) ────────────────────────────────────────

interface GhostProfilePanelProps {
  player: any | null;
  rivals: number[];
  onClose: () => void;
  onToggleRival: (id: number) => void;
}

function GhostProfilePanel({ player, rivals, onClose, onToggleRival }: GhostProfilePanelProps) {
  const [portrait, setPortrait] = React.useState<string | null>(null);
  const [chronicle, setChronicle] = React.useState<string | null>(null);
  const [chronicleDetail, setChronicleDetail] = React.useState<Record<string, string> | null>(null);
  const [chronicleLoading, setChronicleLoading] = React.useState(false);
  const [rivalLoading, setRivalLoading] = React.useState(false);
  // Full player data (may have more fields than the list item)
  const [fullPlayer, setFullPlayer] = React.useState<any | null>(null);
  const displayPlayer = fullPlayer ?? player;

  const open = !!player;
  const isRival = player ? rivals.includes(player.id) : false;

  React.useEffect(() => {
    if (!player || player.isRealPlayer) return;
    setFullPlayer(null);

    // Fetch full player profile to ensure all stats are available
    fetch(apiUrl(`/api/world/player/${player.id}`))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFullPlayer(data); })
      .catch(() => {});

    const cached = portraitCache.get(player.id);
    if (cached) {
      setPortrait(cached);
    } else {
      setPortrait(null);
      fetch(apiUrl(`/api/world/player/${player.id}/portrait`))
        .then(r => r.json())
        .then(data => {
          if (data.portrait) {
            portraitCache.set(player.id, data.portrait);
            setPortrait(data.portrait);
          }
        })
        .catch(() => {});
    }

    setChronicle(null);
    setChronicleDetail(null);
    setChronicleLoading(true);
    fetch(apiUrl(`/api/world/player/${player.id}/chronicle`))
      .then(r => r.json())
      .then(data => {
        if (data.chronicle) setChronicle(data.chronicle);
        if (data.detail) setChronicleDetail(data.detail);
      })
      .catch(() => {})
      .finally(() => setChronicleLoading(false));
  }, [player?.id]);

  function handleToggleRival() {
    if (!player || rivalLoading) return;
    setRivalLoading(true);
    onToggleRival(player.id);
    // Brief visual feedback; parent handles API call and state revert on error
    setTimeout(() => setRivalLoading(false), 400);
  }

  if (!player) return null;

  const xpPct = Math.min(100, ((displayPlayer.xp ?? 0) / Math.max(1, displayPlayer.xpToNextLevel ?? 1)) * 100);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] bg-slate-950 border-slate-800 text-slate-200 overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-slate-800">
          <SheetTitle className="text-slate-100 flex items-center gap-2">
            {player.name}
            {player.isRealPlayer && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-700 text-blue-400">YOU</span>
            )}
          </SheetTitle>
          <div className="text-xs text-slate-500">
            Lv {player.level} {player.race} {player.class} · {player.alignment}
          </div>
        </SheetHeader>

        <div className="pt-4 space-y-5">
          {/* Portrait */}
          {!player.isRealPlayer && (
            <div className="flex gap-4 items-start">
              <div className="shrink-0">
                {portrait ? (
                  <img
                    src={portrait}
                    alt={player.name}
                    className={cn(
                      "w-24 h-24 rounded-xl object-cover border-2 shadow-lg",
                      PERSONALITY_BORDER[player.personality] ?? "border-slate-700"
                    )}
                  />
                ) : (
                  <div className={cn(
                    "w-24 h-24 rounded-xl bg-slate-800 border-2 flex items-center justify-center",
                    PERSONALITY_BORDER[player.personality] ?? "border-slate-700"
                  )}>
                    <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-1">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", ARCHETYPE_COLORS[player.archetype] ?? "border-slate-700 text-slate-400")}>
                    {player.archetype} · {player.class}
                  </span>
                  {player.personality && PERSONALITY_STYLES[player.personality] && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", PERSONALITY_STYLES[player.personality].cls)}>
                      {PERSONALITY_STYLES[player.personality].icon} {player.personality}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                    {ALIGNMENT_ICON[player.alignment]} {player.alignment}
                  </span>
                </div>

                {/* Rival button */}
                <button
                  onClick={handleToggleRival}
                  disabled={rivalLoading || (!isRival && rivals.length >= 3)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
                    isRival
                      ? "bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50"
                      : rivals.length >= 3
                        ? "bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-amber-900/20 border-amber-700/40 text-amber-400 hover:bg-amber-900/40"
                  )}
                >
                  {rivalLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isRival ? (
                    <UserMinus className="w-3 h-3" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  {isRival ? "Remove Rival" : rivals.length >= 3 ? "Max 3 Rivals" : "Track as Rival"}
                </button>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Stats</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Kills", val: displayPlayer.killCount ?? 0, color: "text-red-400" },
                { label: "Bosses", val: displayPlayer.bossKills ?? 0, color: "text-purple-400" },
                { label: "Deaths", val: displayPlayer.deathCount ?? 0, color: "text-slate-400" },
                { label: "Gold", val: Math.round(displayPlayer.gold ?? 0).toLocaleString(), color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 text-center">
                  <div className={cn("font-bold tabular-nums text-sm", s.color)}>{typeof s.val === "number" ? s.val.toLocaleString() : s.val}</div>
                  <div className="text-[10px] text-slate-600">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-600 mb-1">
              <span>XP Progress</span><span>{xpPct.toFixed(1)}%</span>
            </div>
            <Progress value={xpPct} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-amber-600 rounded-full" />
          </div>

          {/* Zone */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{displayPlayer.zone}</span>
          </div>

          {/* Chronicle */}
          {!player.isRealPlayer && (
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Chronicle
                <button
                  onClick={() => {
                    if (chronicleLoading || !player) return;
                    setChronicle(null);
                    setChronicleLoading(true);
                    fetch(apiUrl(`/api/world/player/${player.id}/chronicle?refresh=1`))
                      .then(r => r.json())
                      .then(data => {
                        if (data.chronicle) setChronicle(data.chronicle);
                        if (data.detail) setChronicleDetail(data.detail);
                      })
                      .catch(() => {})
                      .finally(() => setChronicleLoading(false));
                  }}
                  disabled={chronicleLoading}
                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400 transition-colors disabled:opacity-40"
                  title="Refresh chronicle"
                >
                  {chronicleLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : "↺ Refresh"}
                </button>
              </div>
              {chronicleLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-4 rounded w-full" />)}
                </div>
              ) : chronicle ? (
                <div className="space-y-3">
                  {/* Narrative summary string */}
                  <p className="text-xs text-slate-300 leading-relaxed">{chronicle}</p>
                  {/* Rich detail breakdown */}
                  {chronicleDetail && (
                    <>
                      {chronicleDetail.motto && (
                        <blockquote className="border-l-2 border-amber-700/50 pl-3 text-xs text-amber-300/80 italic">
                          &ldquo;{chronicleDetail.motto}&rdquo;
                        </blockquote>
                      )}
                      {[
                        { label: "Reputation", key: "reputation" },
                      ].map(({ label, key }) => chronicleDetail[key] ? (
                        <div key={key}>
                          <div className="text-[10px] text-slate-600 font-semibold mb-0.5">{label}</div>
                          <p className="text-xs text-slate-400 leading-relaxed">{chronicleDetail[key]}</p>
                        </div>
                      ) : null)}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600">Chronicle unavailable.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorldStatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center gap-3">
      <div className={cn("p-2.5 rounded-lg", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl font-bold text-slate-100 leading-none tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const timeAgo = (() => {
    const s = Math.floor((Date.now() - new Date(event.createdAt).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  })();
  const colorClass = EVENT_COLORS[event.type] ?? "border-slate-800 bg-slate-900/40";
  return (
    <div className={cn("rounded-lg px-3 py-2 border text-sm", colorClass)}>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">{EVENT_ICONS[event.type] ?? "📜"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 leading-snug">{event.message}</p>
          {event.playerName && <GhostQuote playerName={event.playerName} />}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-600">{event.zone}</span>
            <span className="text-[10px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-600">{timeAgo}</span>
            {event.importance >= 3 && (
              <span className="text-[10px] text-purple-500 font-bold">★ Major</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, onSelect }: { entry: any; onSelect?: () => void }) {
  const rankColors = [
    "text-amber-400 font-black", "text-slate-300 font-bold",
    "text-amber-700 font-bold", "text-slate-500",
  ];
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0",
        entry.isRealPlayer && "bg-blue-950/20 rounded-lg px-1",
        !entry.isRealPlayer && "cursor-pointer hover:bg-slate-800/40 rounded-lg px-1 transition-colors"
      )}
      onClick={!entry.isRealPlayer ? onSelect : undefined}
    >
      <span className={cn("text-sm w-5 text-center shrink-0", rankColors[entry.rank - 1] ?? "text-slate-600")}>
        {entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
      </span>
      {!entry.isRealPlayer ? (
        <GhostPortraitAvatar playerId={entry.id} size={28} personality={entry.personality} />
      ) : (
        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">
          {ARCHETYPE_SPRITE[entry.archetype] ?? "⚔️"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-slate-200 truncate">{entry.name}</span>
          {entry.isRealPlayer && (
            <span className="text-[9px] px-1 py-0 rounded border border-blue-700 text-blue-400 shrink-0">YOU</span>
          )}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0", ARCHETYPE_COLORS[entry.archetype] ?? "border-slate-700 text-slate-400")}>
            {entry.archetype}
          </span>
          {entry.personality && PERSONALITY_STYLES[entry.personality] && (
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded border shrink-0", PERSONALITY_STYLES[entry.personality].cls)}>
              {PERSONALITY_STYLES[entry.personality].icon} {entry.personality}
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          Lv {entry.level} {entry.race} {entry.class} · {entry.zone}
        </div>
      </div>
      <div className="text-xs font-bold tabular-nums text-amber-400 shrink-0">
        {(entry.killCount ?? 0).toLocaleString()} kills
      </div>
    </div>
  );
}

function ZoneMapPanel({ zones }: { zones: any[] }) {
  const sorted = [...zones].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(1, ...zones.map(z => z.total));

  return (
    <Card className="border-slate-800 bg-card/40 backdrop-blur">
      <CardHeader className="py-3 px-4 border-b border-slate-800/50">
        <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-emerald-400" /> Zone Map — Active Adventurers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {sorted.map(zone => (
          <div key={zone.id} className={cn(
            "rounded-lg border p-2.5 transition-colors",
            zone.total > 0 ? "border-slate-700 bg-slate-900/50" : "border-slate-800/40 bg-slate-900/20 opacity-50"
          )}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">{zone.name}</div>
                <div className="text-[10px] text-slate-600">Levels {zone.levelRange}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {zone.realCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-700/60 bg-blue-900/30 text-blue-400 font-bold">
                    ★ You
                  </span>
                )}
                {zone.ghostCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60 text-slate-400">
                    {zone.ghostCount} ghost{zone.ghostCount !== 1 ? "s" : ""}
                  </span>
                )}
                {zone.total === 0 && (
                  <span className="text-[10px] text-slate-700">empty</span>
                )}
              </div>
            </div>
            {zone.total > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(zone.total / maxTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Champions Tab ───────────────────────────────────────────────────────────

interface GhostRoleEntry {
  id: number;
  name: string;
  class: string;
  race: string;
  level: number;
  zone: string;
  killCount: number;
  bossKills: number;
  gearScore: number;
  dungeonClears: number;
  personality: string;
  role: string;
  generation: number;
}

function gearScoreBadgeCls(gs: number): string {
  if (gs >= 400) return "text-amber-300 border-amber-600/60 bg-amber-950/20";
  if (gs >= 200) return "text-violet-300 border-violet-600/60 bg-violet-950/20";
  if (gs >= 100) return "text-blue-300 border-blue-600/60 bg-blue-950/20";
  return "text-slate-400 border-slate-700 bg-slate-900/40";
}

function ChampionGhostCard({
  ghost,
  rank,
  onSelect,
}: {
  ghost: GhostRoleEntry;
  rank: number;
  onSelect: (ghost: GhostRoleEntry) => void;
}) {
  const rankBadge =
    rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const rankCls =
    rank === 1
      ? "text-amber-400 font-black"
      : rank === 2
      ? "text-slate-300 font-bold"
      : rank === 3
      ? "text-amber-700 font-bold"
      : "text-slate-500";
  const ps = PERSONALITY_STYLES[ghost.personality];

  return (
    <div
      className="border border-slate-800 bg-slate-900/60 rounded-xl p-3 cursor-pointer hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
      onClick={() => onSelect(ghost)}
    >
      <div className="flex items-start gap-2">
        <span className={cn("text-sm w-6 text-center shrink-0 mt-0.5", rankCls)}>
          {rankBadge}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-sm font-bold text-slate-200 truncate">{ghost.name}</span>
            <span className="text-xs font-black text-amber-400 shrink-0">Lv {ghost.level}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {ghost.race} · {ghost.class}
          </div>

          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", gearScoreBadgeCls(ghost.gearScore))}>
              GS {ghost.gearScore}
            </span>
            {ghost.generation > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600/60 text-slate-400 bg-slate-900/40">
                ✦ Gen {ghost.generation}
              </span>
            )}
            {ps && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", ps.cls)}>
                {ps.icon} {ghost.personality}
              </span>
            )}
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
            <div className="text-center">
              <div className="font-bold text-red-400">{(ghost.killCount ?? 0).toLocaleString()}</div>
              <div className="text-slate-600">Kills</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-400">{ghost.bossKills}</div>
              <div className="text-slate-600">Bosses</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-emerald-400">{ghost.dungeonClears}</div>
              <div className="text-slate-600">Clears</div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5 min-w-0">
            <MapIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{ghost.zone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RoleColumnConfig {
  key: "tanks" | "healers" | "dps";
  label: string;
  icon: string;
  headerCls: string;
  borderCls: string;
  bgCls: string;
  emptyMsg: string;
}

const ROLE_COLUMNS: RoleColumnConfig[] = [
  {
    key: "tanks",
    label: "Top Tanks",
    icon: "🛡️",
    headerCls: "text-blue-400",
    borderCls: "border-blue-800/40",
    bgCls: "bg-blue-950/10",
    emptyMsg: "No Tank ghosts found yet.",
  },
  {
    key: "healers",
    label: "Top Healers",
    icon: "💚",
    headerCls: "text-green-400",
    borderCls: "border-green-800/40",
    bgCls: "bg-green-950/10",
    emptyMsg: "No Healer ghosts found yet.",
  },
  {
    key: "dps",
    label: "Top DPS",
    icon: "⚔️",
    headerCls: "text-red-400",
    borderCls: "border-red-800/40",
    bgCls: "bg-red-950/10",
    emptyMsg: "No DPS ghosts found yet.",
  },
];

function ChampionsTab({ onSelectPlayer }: { onSelectPlayer: (player: any) => void }) {
  const { data, isLoading } = useQuery<{
    tanks: GhostRoleEntry[];
    healers: GhostRoleEntry[];
    dps: GhostRoleEntry[];
  }>({
    queryKey: ["champions-by-role"],
    queryFn: () =>
      fetch(apiUrl("/api/leaderboard/ghosts/top-by-role")).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch champions: ${r.status}`);
        return r.json();
      }),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Champions of Norrath
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Top 5 ghost adventurers per role, ranked by composite score (gear score × 2 + level × 50 + kills × 0.1 + dungeon clears × 100).
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLE_COLUMNS.map(col => (
          <Card key={col.key} className={cn("border backdrop-blur", col.borderCls, col.bgCls)}>
            <CardHeader className={cn("py-3 px-4 border-b", col.borderCls)}>
              <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", col.headerCls)}>
                <span>{col.icon}</span> {col.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))
              ) : !data || data[col.key].length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-sm">
                  <span className="block text-2xl mb-2">{col.icon}</span>
                  {col.emptyMsg}
                </div>
              ) : (
                data[col.key].map((ghost, idx) => (
                  <ChampionGhostCard
                    key={ghost.id}
                    ghost={ghost}
                    rank={idx + 1}
                    onSelect={onSelectPlayer}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlayerCard({
  player, onSelect, rivals, onRivalToggle,
}: {
  player: any;
  onSelect?: () => void;
  rivals?: number[];
  onRivalToggle?: (id: number, action: "add" | "remove") => void;
}) {
  const xpPct = Math.min(100, ((player.xp ?? 0) / Math.max(1, player.xpToNextLevel ?? 1)) * 100);
  const isRival = rivals?.includes(player.id) ?? false;
  const rivalsFull = (rivals?.length ?? 0) >= 3 && !isRival;

  function handleRivalClick(e: React.MouseEvent) {
    e.stopPropagation();
    onRivalToggle?.(player.id, isRival ? "remove" : "add");
  }

  return (
    <div
      className={cn(
        "border rounded-xl p-4 transition-colors",
        player.isRealPlayer
          ? "border-blue-800/60 bg-blue-950/20"
          : "border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 hover:bg-slate-800/60"
      )}
      onClick={!player.isRealPlayer ? onSelect : undefined}
    >
      <div className="flex items-start gap-3">
        {!player.isRealPlayer ? (
          <GhostPortraitAvatar playerId={player.id} size={40} personality={player.personality} className="rounded-xl mt-0.5" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xl shrink-0">
            {ARCHETYPE_SPRITE[player.archetype] ?? "⚔️"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-bold text-slate-200">{player.name}</div>
                {player.isRealPlayer && (
                  <span className="text-[9px] px-1 py-0 rounded border border-blue-700 text-blue-400">YOU</span>
                )}
                {!player.isRealPlayer && isRival && (
                  <span className="text-[9px] px-1 py-0 rounded border border-red-700 text-red-400">RIVAL</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 capitalize">{player.race}</span>
                <span className="text-[10px] text-slate-600">·</span>
                <span className={cn("text-[10px] px-1 py-0 rounded border", ARCHETYPE_COLORS[player.archetype] ?? "")}>
                  {player.class}
                </span>
                <span className="text-[10px] text-slate-500">
                  {ALIGNMENT_ICON[(player.alignment as string)] ?? ""} {player.alignment}
                </span>
                {player.personality && PERSONALITY_STYLES[player.personality] && (
                  <span className={cn("text-[9px] px-1 py-0 rounded border", PERSONALITY_STYLES[player.personality].cls)}>
                    {PERSONALITY_STYLES[player.personality].icon} {player.personality}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-black text-amber-400 shrink-0">Lv {player.level}</span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
              <span>XP</span><span>{xpPct.toFixed(1)}%</span>
            </div>
            <Progress value={xpPct} className="h-1 bg-slate-800 rounded-full" indicatorClassName="bg-amber-600 rounded-full" />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
            <div className="text-center">
              <div className="font-bold text-red-400">{(player.killCount ?? 0).toLocaleString()}</div>
              <div className="text-slate-600">Kills</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-400">{player.bossKills}</div>
              <div className="text-slate-600">Bosses</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-amber-400">{Math.round(player.gold ?? 0).toLocaleString()}</div>
              <div className="text-slate-600">Gold</div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
              <MapIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{player.zone}</span>
            </div>
            {!player.isRealPlayer && onRivalToggle && (
              <button
                onClick={handleRivalClick}
                disabled={rivalsFull}
                className={cn(
                  "text-[9px] px-2 py-0.5 rounded border shrink-0 transition-colors",
                  isRival
                    ? "border-red-700 text-red-400 hover:bg-red-900/30"
                    : rivalsFull
                      ? "border-slate-800 text-slate-700 cursor-not-allowed"
                      : "border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400"
                )}
                title={rivalsFull ? "Max 3 rivals" : isRival ? "Remove rival" : "Track as rival"}
              >
                {isRival ? "⚔ Untrack" : rivalsFull ? "Max rivals" : "⚔ Track"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main World Page ──────────────────────────────────────────────────────────

export default function WorldPage() {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [selectedPlayer, setSelectedPlayer] = React.useState<any | null>(null);
  const [rivals, setRivals] = React.useState<number[]>([]);
  const [ghostResetting, setGhostResetting] = React.useState(false);

  // Deep-link: ?ghostId=<id> opens that ghost's profile panel automatically
  const ghostIdParam = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ghostId");
    return raw ? parseInt(raw, 10) : null;
  }, []);

  const isRealtime = useRealtimeWorldEvents();

  const POLL_INTERVAL = 10_000;
  const effectiveInterval = autoRefresh && !isRealtime ? POLL_INTERVAL : false;

  const { data: stats, isLoading: statsLoading } = useGetWorldStats({
    query: { refetchInterval: effectiveInterval, queryKey: [] },
  });
  const { data: events, isLoading: eventsLoading } = useGetWorldEvents(
    { limit: 60 },
    { query: { refetchInterval: effectiveInterval, queryKey: [] } },
  );
  const { data: leaderboard, isLoading: lbLoading } = useGetWorldLeaderboard({
    query: { refetchInterval: effectiveInterval, queryKey: [] },
  });
  const { data: players, isLoading: playersLoading } = useGetWorldPlayers({
    query: { refetchInterval: effectiveInterval, queryKey: [] },
  });
  const { data: zones, isLoading: zonesLoading } = useGetWorldZones({
    query: { refetchInterval: effectiveInterval, queryKey: [] },
  });

  // Load rivals from server on mount
  React.useEffect(() => {
    fetch(apiUrl("/api/character/rivals"))
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setRivals(data.map((r: any) => r.id));
      })
      .catch(() => {});
  }, []);

  // Deep-link: auto-open profile panel for ?ghostId=<id>
  React.useEffect(() => {
    if (!ghostIdParam || !players || selectedPlayer) return;
    const target = (players as any[]).find((p: any) => p.id === ghostIdParam);
    if (target) setSelectedPlayer(target);
  }, [ghostIdParam, players]);

  const [rivalError, setRivalError] = React.useState<string | null>(null);

  function toggleRival(id: number, action: "add" | "remove") {
    const prev = rivals;
    setRivals(
      action === "remove" ? rivals.filter(r => r !== id) : rivals.includes(id) ? rivals : [...rivals, id]
    );
    fetch(apiUrl("/api/character/rivals"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ghostId: id, action }),
    })
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setRivalError(body.error ?? "Could not update rival.");
          setRivals(prev); // revert optimistic update
          setTimeout(() => setRivalError(null), 3000);
        }
      })
      .catch(() => {
        setRivals(prev); // revert on network failure
      });
  }

  const sortedEvents = React.useMemo(() => {
    const all = Array.isArray(events) ? events : [];
    const major = all.filter((e: any) => e.importance >= 3);
    const regular = all.filter((e: any) => e.importance < 3);
    return [...major, ...regular];
  }, [events]);

  const zoneNames = React.useMemo(() =>
    (Array.isArray(zones) ? zones : []).filter((z: any) => z.total > 0).map((z: any) => z.name),
    [zones]
  );

  const [eventZone, setEventZone] = React.useState<string>("");
  const filteredEvents = eventZone
    ? sortedEvents.filter((e: any) => e.zone === eventZone)
    : sortedEvents;

  const majorEvents = React.useMemo(() =>
    (Array.isArray(events) ? events : []).filter((e: any) => e.importance >= 3).slice(0, 10),
    [events]
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Ghost Profile Panel */}
      <GhostProfilePanel
        player={selectedPlayer}
        rivals={rivals}
        onClose={() => setSelectedPlayer(null)}
        onToggleRival={(id) => toggleRival(id, rivals.includes(id) ? "remove" : "add")}
      />

      {/* ── Header ── */}
      {rivalError && (
        <div className="mb-2 px-3 py-2 rounded-lg border border-red-800 bg-red-950/40 text-xs text-red-400">
          {rivalError}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-blue-400" /> Living World of Norrath
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            60 ghost adventurers explore the world alongside you — simulated every 30 seconds, refreshed every 10s.
            {rivals.length > 0 && (
              <span className="ml-2 text-amber-400 font-medium">
                ⚔ Tracking {rivals.length} rival{rivals.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(p => !p)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              autoRefresh
                ? "bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-900/50"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-700/60"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Live (10s)" : "Paused"}
          </button>
          <button
            disabled={ghostResetting}
            onClick={async () => {
              if (!confirm("Reset all 60 ghost players back to level 1? This takes a few seconds.")) return;
              setGhostResetting(true);
              try {
                const res = await fetch(apiUrl("/api/admin/reset-ghosts"), { method: "POST" });
                if (res.ok) {
                  toast({ title: "Ghost players reset", description: "All 60 adventurers have been reborn at level 1." });
                } else {
                  toast({ title: "Reset failed", description: "Could not reset ghosts. Check server logs.", variant: "destructive" });
                }
              } catch {
                toast({ title: "Reset failed", description: "Network error. Check server logs.", variant: "destructive" });
              } finally {
                setGhostResetting(false);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", ghostResetting && "animate-spin")} />
            {ghostResetting ? "Resetting…" : "Reset Ghosts"}
          </button>
        </div>
      </div>

      <Tabs defaultValue="world">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="world" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            <Globe2 className="w-3.5 h-3.5 mr-1.5" /> World
          </TabsTrigger>
          <TabsTrigger value="champions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            <Trophy className="w-3.5 h-3.5 mr-1.5" /> Champions
          </TabsTrigger>
        </TabsList>

        {/* ── World Tab ── */}
        <TabsContent value="world" className="mt-4 space-y-5">
          {/* ── Chronicle of Norrath ── */}
          <NorrathChronicleCard />

          {/* ── World Stats ── */}
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <WorldStatCard label="Adventurers Online" value={stats.totalPlayers} icon={Users} color="bg-blue-900/40 text-blue-400" />
              <WorldStatCard label="Total Kills" value={stats.totalKills} icon={Sword} color="bg-red-900/40 text-red-400" />
              <WorldStatCard label="Boss Kills" value={stats.totalBossKills} icon={Crown} color="bg-purple-900/40 text-purple-400" />
              <WorldStatCard label="Gold Earned" value={`${(stats.totalGoldEarned / 1000).toFixed(0)}K`} icon={Coins} color="bg-amber-900/40 text-amber-400" />
            </div>
          )}

          {/* ── Secondary stats ── */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-emerald-400">{stats.maxLevel}</div>
                <div className="text-xs text-slate-500 mt-0.5">Highest Level</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-sky-400">{stats.avgLevel}</div>
                <div className="text-xs text-slate-500 mt-0.5">Average Level</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-violet-400">{stats.totalEvents}</div>
                <div className="text-xs text-slate-500 mt-0.5">World Events</div>
              </div>
            </div>
          )}

          {/* ── Three-column layout: Events | Leaderboard + Zone Map ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Live Event Feed ── */}
            <div className="lg:col-span-2 space-y-3">
              {/* Major World Events Panel */}
              {majorEvents.length > 0 && (
                <Card className="border-purple-800/40 bg-purple-950/10 backdrop-blur">
                  <CardHeader className="py-3 px-4 border-b border-purple-800/30">
                    <CardTitle className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-400" /> Major World Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-1.5">
                    {majorEvents.map((event: any) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Live Activity Feed */}
              <Card className="border-slate-800 bg-card/40 backdrop-blur">
                <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-blue-400" /> World Activity Feed
                    </CardTitle>
                    <select
                      value={eventZone}
                      onChange={e => setEventZone(e.target.value)}
                      className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-400 focus:outline-none focus:border-slate-600"
                    >
                      <option value="">All Zones</option>
                      {zoneNames.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-3 max-h-[480px] overflow-y-auto space-y-1.5">
                  {eventsLoading ? (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="py-8 text-center text-slate-600">
                      <Globe2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No events yet — world is loading...</p>
                    </div>
                  ) : (
                    filteredEvents.map((event: any) => (
                      <EventCard key={event.id} event={event} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right column: Leaderboard + Zone Map ── */}
            <div className="space-y-4">
              {/* Leaderboard: top-10 by level then kills */}
              <Card className="border-slate-800 bg-card/40 backdrop-blur">
                <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
                    <span className="text-[10px] text-slate-600 font-normal ml-1">by level → kills</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {lbLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                    </div>
                  ) : (
                    <div>
                      {(Array.isArray(leaderboard) ? leaderboard : []).map((entry: any) => (
                        <LeaderboardRow
                          key={entry.id}
                          entry={entry}
                          onSelect={() => setSelectedPlayer(entry)}
                        />
                      ))}
                      {(!leaderboard || (Array.isArray(leaderboard) && leaderboard.length === 0)) && (
                        <div className="text-center py-4 text-slate-600 text-xs">No data yet</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Zone Map */}
              {zonesLoading ? (
                <Card className="border-slate-800 bg-card/40">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                    </div>
                  </CardContent>
                </Card>
              ) : zones && (
                <ZoneMapPanel zones={Array.isArray(zones) ? zones : []} />
              )}
            </div>
          </div>

          {/* ── All Adventurers ── */}
          <Card className="border-slate-800 bg-card/40 backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/50">
              <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> All Adventurers of Norrath
                <span className="text-[10px] text-slate-600 font-normal ml-1">click a ghost to view profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {playersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
                </div>
              ) : !players || (Array.isArray(players) ? players : []).length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="text-4xl">👻</div>
                  <p className="text-slate-400 text-sm">No adventurers found in Norrath yet.</p>
                  <button
                    onClick={() => fetch(apiUrl("/api/admin/reset-ghosts"), { method: "POST", credentials: "include" })
                      .then(() => window.location.reload())
                      .catch(() => window.location.reload())}
                    className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:border-amber-600 hover:text-amber-400 transition-colors"
                  >
                    Summon Adventurers
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(Array.isArray(players) ? players : []).map((p: any) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      onSelect={() => setSelectedPlayer(p)}
                      rivals={rivals}
                      onRivalToggle={toggleRival}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Champions Tab ── */}
        <TabsContent value="champions" className="mt-4">
          <ChampionsTab onSelectPlayer={setSelectedPlayer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
