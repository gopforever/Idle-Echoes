import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, Trophy, Crown, Star, Sword, UserMinus, UserPlus,
  ArrowUp, ArrowDown, LogOut, Trash2, Award, Coins, BarChart2,
  ChevronDown, ChevronUp, CheckCircle2, Clock, Target, AlertCircle,
  Banknote, Zap, Activity, TrendingUp, TrendingDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Guild {
  id: number;
  name: string;
  tag: string;
  description: string;
  motto: string;
  alignment: string;
  leaderId: number | null;
  isGhost: boolean;
  bankGold: number;
  totalGoldDeposited: number;
  isRecruiting: boolean;
  recruitDescription: string;
  maxMembers: number;
  officerDailyWithdrawLimit: number;
  createdAt: string;
}

interface GuildMemberRow {
  id: number;
  guildId: number;
  characterId: number | null;
  ghostId: number | null;
  rank: string;
  contributionPoints: number;
  weeklyContributionPoints: number;
  lastActiveAt: string | null;
  joinedAt: string;
  isGhost: boolean;
  name: string;
  race: string;
  class: string;
  archetype: string;
  level: number;
  zone: string;
  killCount: number;
  bossKills: number;
}

interface DetailedMember extends GuildMemberRow {
  gearScore: number;
  heroicCompleted: number;
  itemsCrafted: number;
  dungeonClears: number;
  isTopContributor: boolean;
  isInactive: boolean;
  daysSinceActive: number | null;
}

interface GuildPerks {
  xpBonus: number;
  goldBonus: number;
  gatheringSpeedBonus: number;
  craftYieldBonus: number;
  dungeonXpBonus: number;
  raidDropBonus: number;
  bankCapacityTier: number;
  aaXpBonus: number;
  memberCapBonus: number;
}

interface PerkDescription {
  level: number;
  label: string;
  icon: string;
}

interface MyGuildData {
  guild: Guild;
  membership: { rank: string; characterId: number; contributionPoints: number };
  members: GuildMemberRow[];
  guildLevel: number;
  perks: GuildPerks;
  perkDescriptions: PerkDescription[];
  currentScore: number;
  nextLevelScore: number | null;
}

interface GuildStats {
  guildId: number;
  totalKills: number;
  totalBossKills: number;
  totalGoldEarned: number;
  totalDungeonClears: number;
  bankGold: number;
  memberCount: number;
  currentScore: number;
  nextLevelScore: number | null;
  guildLevel: number;
  perks: GuildPerks;
  perkDescriptions: PerkDescription[];
  weeklyTopContributors: Array<{
    memberId: number;
    characterId: number | null;
    name: string;
    class: string;
    level: number;
    weeklyPoints: number;
    rank: string;
    isGhost: boolean;
  }>;
}

interface ContributionWeek {
  weekStart: string;
  isCurrentWeek: boolean;
  members: Array<{
    name: string;
    characterId: number | null;
    combatKills: number;
    bossKills: number;
    dungeonClears: number;
    craftedItems: number;
    goldDonated: number;
    totalPoints: number;
  }>;
}

interface BankTransaction {
  id: number;
  guildId: number;
  characterId: number | null;
  transactionType: string;
  amount: number;
  note: string;
  createdAt: string;
  characterName: string;
}

interface GuildChallenge {
  id: number;
  guildId: number;
  weekStart: string;
  challengeType: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  rewardXpBonus: number;
  completedAt: string | null;
}

interface LeaderboardEntry {
  id: number;
  rank: number;
  name: string;
  tag: string;
  alignment: string;
  description: string;
  motto: string;
  isGhost: boolean;
  isRecruiting: boolean;
  score: number;
  memberCount: number;
  bankGold: number;
  guildLevel: number;
  topMembers: Array<{ name: string; level: number; isGhost: boolean }>;
  weeklyDelta: number | null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), { credentials: "include", ...init });

async function fetchMyGuild(): Promise<MyGuildData | null> {
  const r = await apiFetch("/api/guild");
  if (!r.ok) throw new Error("Failed to fetch guild");
  return r.json();
}

async function fetchGuildStats(): Promise<GuildStats> {
  const r = await apiFetch("/api/guild/stats");
  if (!r.ok) throw new Error("Failed to fetch guild stats");
  return r.json();
}

async function fetchDetailedMembers(sort: string): Promise<DetailedMember[]> {
  const r = await apiFetch(`/api/guild/members/detailed?sort=${sort}`);
  if (!r.ok) throw new Error("Failed to fetch members");
  return r.json();
}

async function fetchContributionHistory(): Promise<ContributionWeek[]> {
  const r = await apiFetch("/api/guild/contribution-history");
  if (!r.ok) throw new Error("Failed to fetch history");
  return r.json();
}

async function fetchBankLog(): Promise<BankTransaction[]> {
  const r = await apiFetch("/api/guild/bank/log");
  if (!r.ok) throw new Error("Failed to fetch bank log");
  return r.json();
}

async function fetchChallenges(): Promise<GuildChallenge[]> {
  const r = await apiFetch("/api/guild/challenges");
  if (!r.ok) throw new Error("Failed to fetch challenges");
  return r.json();
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const r = await apiFetch("/api/guild/leaderboard");
  if (!r.ok) throw new Error("Failed to fetch leaderboard");
  return r.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALIGNMENT_ICON: Record<string, string> = {
  Qeynos: "🛡️",
  Freeport: "⚔️",
  Neutral: "⚖️",
};

const ALIGNMENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  Qeynos:   { border: "border-sky-700/50",   bg: "bg-sky-900/20",   text: "text-sky-300"   },
  Freeport: { border: "border-red-700/50",    bg: "bg-red-900/20",   text: "text-red-300"   },
  Neutral:  { border: "border-slate-700/50",  bg: "bg-slate-900/20", text: "text-slate-300" },
};

const RANK_ICON: Record<string, React.ReactElement> = {
  leader:  <Crown  className="w-3.5 h-3.5 text-amber-400" />,
  officer: <Star   className="w-3.5 h-3.5 text-sky-400" />,
  member:  <Shield className="w-3.5 h-3.5 text-slate-500" />,
};

const RANK_COLOR: Record<string, string> = {
  leader:  "text-amber-400",
  officer: "text-sky-400",
  member:  "text-slate-400",
};

const ARCHETYPE_COLOR: Record<string, string> = {
  Fighter: "text-red-400",
  Scout:   "text-green-400",
  Mage:    "text-blue-400",
  Priest:  "text-amber-300",
};

const CHALLENGE_LABEL: Record<string, string> = {
  kills:          "Total Enemy Kills",
  boss_kills:     "Boss Kills",
  dungeons:       "Dungeon Clears",
  crafts:         "Items Crafted",
  gold_deposited: "Gold Deposited",
};

const CHALLENGE_ICON: Record<string, string> = {
  kills:          "⚔️",
  boss_kills:     "💀",
  dungeons:       "🏰",
  crafts:         "🔨",
  gold_deposited: "💰",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GuildTag({ tag, alignment }: { tag: string; alignment: string }) {
  const c = ALIGNMENT_COLORS[alignment] ?? ALIGNMENT_COLORS.Neutral;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold font-mono", c.bg, c.text, c.border)}>
      {ALIGNMENT_ICON[alignment] ?? "⚖️"} {tag}
    </span>
  );
}

function GuildLevelBadge({ level }: { level: number }) {
  const color = level >= 10 ? "text-amber-400 border-amber-600/50 bg-amber-900/30"
    : level >= 7 ? "text-purple-400 border-purple-700/50 bg-purple-900/30"
    : level >= 5 ? "text-sky-400 border-sky-700/50 bg-sky-900/30"
    : "text-slate-400 border-slate-700/50 bg-slate-800/40";
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold tabular-nums", color)}>
      Lv {level}
    </span>
  );
}

function StatBox({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-slate-200">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-600">{sub}</div>}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ guildData }: { guildData: MyGuildData }) {
  const { guild, guildLevel, currentScore, nextLevelScore, perkDescriptions } = guildData;

  const { data: stats } = useQuery<GuildStats>({
    queryKey: ["guild", "stats"],
    queryFn: fetchGuildStats,
    refetchInterval: 60_000,
  });

  const { data: challenges } = useQuery<GuildChallenge[]>({
    queryKey: ["guild", "challenges"],
    queryFn: fetchChallenges,
    refetchInterval: 60_000,
  });

  const progressPct = nextLevelScore
    ? Math.min(100, Math.round((currentScore / nextLevelScore) * 100))
    : 100;

  const alignColors = ALIGNMENT_COLORS[guild.alignment] ?? ALIGNMENT_COLORS.Neutral;

  return (
    <div className="space-y-5">
      {/* Guild Banner */}
      <Card className={cn("border bg-card/40", alignColors.border)}>
        <CardHeader className={cn("border-b pb-3", alignColors.border, alignColors.bg)}>
          <div className="flex items-start gap-3">
            <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0", alignColors.border, alignColors.bg)}>
              <span className="text-2xl">{ALIGNMENT_ICON[guild.alignment] ?? "⚖️"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-serif font-bold text-amber-400">{guild.name}</h2>
                <GuildTag tag={guild.tag} alignment={guild.alignment} />
                <GuildLevelBadge level={guildLevel} />
              </div>
              {guild.motto && <p className="text-xs italic text-slate-500 mt-0.5">"{guild.motto}"</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {guild.description && <p className="text-sm text-slate-400">{guild.description}</p>}

          {/* Guild XP Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Guild Progress</span>
              <span className="text-xs font-mono text-slate-400">
                {currentScore.toLocaleString()} / {nextLevelScore ? nextLevelScore.toLocaleString() : "MAX"} pts
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5 bg-slate-800" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-600">Level {guildLevel}</span>
              {nextLevelScore && <span className="text-[10px] text-slate-600">Level {guildLevel + 1}</span>}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Members" value={stats?.memberCount ?? guildData.members.length} />
            <StatBox label="Total Kills" value={(stats?.totalKills ?? 0).toLocaleString()} />
            <StatBox label="Boss Kills" value={(stats?.totalBossKills ?? 0).toLocaleString()} />
            <StatBox label="Bank Gold" value={`💰 ${Math.round(guild.bankGold).toLocaleString()}`} />
          </div>

          {/* Active Perks */}
          <div>
            <div className="text-xs text-slate-500 mb-2">Active Perks</div>
            <div className="flex flex-wrap gap-1.5">
              {perkDescriptions.map(p => {
                const unlocked = guildLevel >= p.level;
                return (
                  <span
                    key={p.level}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border",
                      unlocked
                        ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
                        : "bg-slate-900/30 border-slate-800/50 text-slate-600",
                    )}
                  >
                    <span>{p.icon}</span>
                    <span>{unlocked ? p.label : `Lv ${p.level}`}</span>
                    {unlocked && <CheckCircle2 className="w-2.5 h-2.5 text-amber-500" />}
                  </span>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Challenges */}
      {challenges && challenges.length > 0 && (
        <Card className="border-slate-800 bg-card/40">
          <CardHeader className="border-b border-slate-800/50 pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Weekly Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {challenges.map(ch => {
              const pct = Math.min(100, Math.round((ch.currentValue / ch.targetValue) * 100));
              return (
                <div key={ch.id} className={cn(
                  "rounded-lg border p-3",
                  ch.completed
                    ? "border-green-800/50 bg-green-950/20"
                    : "border-slate-800/50 bg-slate-900/30",
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{CHALLENGE_ICON[ch.challengeType] ?? "🎯"}</span>
                      <span className="text-sm font-medium text-slate-200">
                        {CHALLENGE_LABEL[ch.challengeType] ?? ch.challengeType}
                      </span>
                      {ch.completed && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {ch.currentValue.toLocaleString()} / {ch.targetValue.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={pct} className={cn("h-1.5", ch.completed ? "bg-green-900/40" : "bg-slate-800")} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-600">{pct}% complete</span>
                    <span className="text-[10px] text-purple-500">+{ch.rewardXpBonus.toLocaleString()} guild pts on completion</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Weekly Top Contributors */}
      {stats && stats.weeklyTopContributors.length > 0 && (
        <Card className="border-slate-800 bg-card/40">
          <CardHeader className="border-b border-slate-800/50 pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              This Week's Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-1.5">
            {stats.weeklyTopContributors.map((contributor, i) => (
              <div key={contributor.memberId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
                <span className="text-base w-6 text-center shrink-0">
                  {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm font-semibold", i === 0 ? "text-amber-400" : "text-slate-200")}>
                    {contributor.name}
                  </span>
                  <span className="text-[11px] text-slate-600 ml-1.5">Lv {contributor.level} {contributor.class}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-amber-500 tabular-nums">
                    +{contributor.weeklyPoints.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-600">pts this week</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ guildData, characterId }: { guildData: MyGuildData; characterId: number }) {
  const { membership } = guildData;
  const [sort, setSort] = React.useState("contribution");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery<DetailedMember[]>({
    queryKey: ["guild", "members", "detailed", sort],
    queryFn: () => fetchDetailedMembers(sort),
    refetchInterval: 60_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["guild"] });
    queryClient.invalidateQueries({ queryKey: ["guild", "members", "detailed"] });
  };

  function memberAction(endpoint: string, targetCharacterId: number) {
    return apiFetch(`/api/guild/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCharacterId }),
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Action failed");
      return d;
    });
  }

  function wrapAction(label: string, fn: () => Promise<unknown>) {
    return fn()
      .then(() => { toast({ title: "Done", description: `${label} successful.` }); refresh(); })
      .catch((err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const sortOptions = [
    { value: "contribution", label: "Contribution" },
    { value: "level", label: "Level" },
    { value: "gearScore", label: "Gear Score" },
    { value: "weekly", label: "This Week" },
    { value: "lastActive", label: "Last Active" },
  ];

  return (
    <div className="space-y-4">
      {/* Sort bar + Invite */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                sort === opt.value
                  ? "border-amber-700/60 bg-amber-900/30 text-amber-300"
                  : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(membership.rank === "leader" || membership.rank === "officer") && (
          <InviteForm onInvited={refresh} />
        )}
      </div>

      {/* Member list */}
      <div className="space-y-1.5">
        {(members ?? []).map(m => {
          const isMe = !m.isGhost && m.characterId === characterId;
          const isExpanded = expandedId === m.id;
          const canPromote = membership.rank === "leader" && m.rank === "member" && !isMe;
          const canDemote  = membership.rank === "leader" && m.rank === "officer" && !isMe;
          const canKick    = (membership.rank === "leader" || (membership.rank === "officer" && m.rank === "member"))
            && !isMe && m.rank !== "leader";

          return (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border transition-colors",
                isMe ? "border-amber-800/40 bg-amber-950/20" : "border-slate-800/50 bg-slate-900/30",
              )}
            >
              {/* Main row */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-800/20"
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
              >
                <div className="shrink-0">{RANK_ICON[m.rank] ?? RANK_ICON.member}</div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-sm font-semibold", isMe ? "text-amber-300" : "text-slate-200")}>
                      {m.name}
                    </span>
                    {isMe && <span className="text-[10px] text-amber-600 font-bold">(you)</span>}
                    {m.isTopContributor && !m.isGhost && (
                      <span title="Top Contributor This Week" className="text-[10px] text-amber-400">👑</span>
                    )}
                    {m.isInactive && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-950/40 border border-orange-800/40 text-[9px] text-orange-400">
                        <Clock className="w-2.5 h-2.5" />
                        {m.daysSinceActive}d inactive
                      </span>
                    )}
                    {m.isGhost && <span className="text-[10px] text-slate-600">ghost</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span className={cn("font-medium", ARCHETYPE_COLOR[m.archetype] ?? "text-slate-400")}>{m.class}</span>
                    <span>·</span>
                    <span>{m.zone}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-sm font-bold text-amber-500">Lv {m.level}</div>
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    {Math.round(m.contributionPoints).toLocaleString()} pts
                  </div>
                  {(m.weeklyContributionPoints ?? 0) > 0 && (
                    <div className="text-[9px] text-amber-700 tabular-nums">
                      +{Math.round(m.weeklyContributionPoints).toLocaleString()} wk
                    </div>
                  )}
                </div>

                {/* Management */}
                {(canPromote || canDemote || canKick) && (
                  <div className="flex items-center gap-1 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                    {canPromote && (
                      <button onClick={() => wrapAction("Promote", () => memberAction("promote", m.characterId!))}
                        title="Promote to Officer"
                        className="p-1 rounded hover:bg-sky-900/40 text-slate-600 hover:text-sky-400 transition-colors">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDemote && (
                      <button onClick={() => wrapAction("Demote", () => memberAction("demote", m.characterId!))}
                        title="Demote to Member"
                        className="p-1 rounded hover:bg-amber-900/40 text-slate-600 hover:text-amber-400 transition-colors">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canKick && (
                      <button onClick={() => wrapAction("Kick", () => memberAction("kick", m.characterId!))}
                        title="Kick from Guild"
                        className="p-1 rounded hover:bg-red-900/40 text-slate-600 hover:text-red-400 transition-colors">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className="shrink-0 text-slate-600 ml-1">
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t border-slate-800/40">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1">
                    <div className="text-center">
                      <div className="text-sm font-bold text-slate-200 tabular-nums">{m.gearScore}</div>
                      <div className="text-[10px] text-slate-600">Gear Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-red-400 tabular-nums">{(m.killCount ?? 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-600">Kills</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-orange-400 tabular-nums">{m.bossKills ?? 0}</div>
                      <div className="text-[10px] text-slate-600">Boss Kills</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-purple-400 tabular-nums">{m.dungeonClears ?? 0}</div>
                      <div className="text-[10px] text-slate-600">Dungeons</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-sky-400 tabular-nums">{m.itemsCrafted ?? 0}</div>
                      <div className="text-[10px] text-slate-600">Crafted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-amber-400 tabular-nums">{m.heroicCompleted ?? 0}</div>
                      <div className="text-[10px] text-slate-600">Heroic</div>
                    </div>
                  </div>
                  {m.lastActiveAt && (
                    <div className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Last active: {new Date(m.lastActiveAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leave / Disband */}
      <LeaveOrDisbandButtons membership={membership} />
    </div>
  );
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab() {
  const { data, isLoading } = useQuery<ContributionWeek[]>({
    queryKey: ["guild", "contribution-history"],
    queryFn: fetchContributionHistory,
    refetchInterval: 120_000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No contribution data yet this week.</p>
        <p className="text-xs mt-1 text-slate-600">Kill enemies, clear dungeons, and craft items to earn guild contribution.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {data.map(week => (
        <Card key={week.weekStart} className={cn(
          "border bg-card/40",
          week.isCurrentWeek ? "border-amber-800/50" : "border-slate-800",
        )}>
          <CardHeader className="border-b border-slate-800/50 pb-2.5 pt-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              {week.isCurrentWeek && (
                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 text-[10px] font-bold border border-amber-800/50">
                  CURRENT WEEK
                </span>
              )}
              <span className="text-slate-500 font-normal text-xs">
                Week of {new Date(week.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-600 border-b border-slate-800/50">
                    <th className="text-left pb-1.5 font-medium">Member</th>
                    <th className="text-right pb-1.5 font-medium">⚔️ Kills</th>
                    <th className="text-right pb-1.5 font-medium">💀 Boss</th>
                    <th className="text-right pb-1.5 font-medium">🏰 Dungeons</th>
                    <th className="text-right pb-1.5 font-medium">🔨 Crafts</th>
                    <th className="text-right pb-1.5 font-medium">💰 Gold</th>
                    <th className="text-right pb-1.5 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {week.members.map((m, i) => (
                    <tr key={`${m.name}-${i}`} className="hover:bg-slate-800/20">
                      <td className="py-1.5 text-slate-300 font-medium">{m.name}</td>
                      <td className="py-1.5 text-right text-slate-400 tabular-nums">{(m.combatKills ?? 0).toLocaleString()}</td>
                      <td className="py-1.5 text-right text-slate-400 tabular-nums">{m.bossKills ?? 0}</td>
                      <td className="py-1.5 text-right text-slate-400 tabular-nums">{m.dungeonClears ?? 0}</td>
                      <td className="py-1.5 text-right text-slate-400 tabular-nums">{m.craftedItems ?? 0}</td>
                      <td className="py-1.5 text-right text-slate-400 tabular-nums">{Math.round(m.goldDonated ?? 0).toLocaleString()}</td>
                      <td className="py-1.5 text-right font-bold text-amber-500 tabular-nums">{m.totalPoints.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Bank Tab ─────────────────────────────────────────────────────────────────

function BankTab({ guildData }: { guildData: MyGuildData }) {
  const { guild, membership } = guildData;
  const [depositAmount, setDepositAmount] = React.useState("");
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [withdrawNote, setWithdrawNote] = React.useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: log } = useQuery<BankTransaction[]>({
    queryKey: ["guild", "bank", "log"],
    queryFn: fetchBankLog,
    refetchInterval: 60_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["guild"] });
    queryClient.invalidateQueries({ queryKey: ["guild", "bank", "log"] });
    queryClient.invalidateQueries({ queryKey: ["guild", "stats"] });
  };

  const depositMutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/guild/bank/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(depositAmount) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Deposit failed");
      return d;
    },
    onSuccess: (d: { deposited: number }) => {
      toast({ title: "Deposited!", description: `${d.deposited.toLocaleString()}g added to guild bank.` });
      setDepositAmount("");
      refresh();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/guild/bank/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(withdrawAmount), note: withdrawNote }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Withdrawal failed");
      return d;
    },
    onSuccess: (d: { withdrawn: number }) => {
      toast({ title: "Withdrawn!", description: `${d.withdrawn.toLocaleString()}g moved to your gold.` });
      setWithdrawAmount("");
      setWithdrawNote("");
      refresh();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isOfficerPlus = membership.rank === "leader" || membership.rank === "officer";
  const dailyLimit = membership.rank === "leader"
    ? guild.officerDailyWithdrawLimit * 2
    : guild.officerDailyWithdrawLimit;

  return (
    <div className="space-y-5">
      {/* Bank balance */}
      <Card className="border-slate-800 bg-card/40">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-400 tabular-nums">
                💰 {Math.round(guild.bankGold).toLocaleString()}g
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Guild Bank Balance · {Math.round(guild.totalGoldDeposited ?? 0).toLocaleString()}g deposited lifetime
              </div>
            </div>
            <Banknote className="w-8 h-8 text-amber-700/50" />
          </div>
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card className="border-slate-800 bg-card/40">
        <CardHeader className="border-b border-slate-800/50 pb-3">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-400" />
            Deposit Gold
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
              placeholder="Amount to deposit…"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              min={1}
            />
            <Button
              size="sm"
              className="bg-green-800 hover:bg-green-700 text-white"
              onClick={() => depositMutation.mutate()}
              disabled={depositMutation.isPending || !depositAmount || Number(depositAmount) <= 0}
            >
              {depositMutation.isPending ? "Depositing…" : "Deposit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw (officer+) */}
      {isOfficerPlus && (
        <Card className="border-slate-800 bg-card/40">
          <CardHeader className="border-b border-slate-800/50 pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400" />
              Withdraw Gold
              <span className="text-[10px] text-slate-600 font-normal">(daily limit: {dailyLimit.toLocaleString()}g)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
                placeholder="Amount to withdraw…"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                min={1}
              />
              <Button
                size="sm"
                className="bg-amber-800 hover:bg-amber-700 text-white"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending || !withdrawAmount || Number(withdrawAmount) <= 0}
              >
                {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-slate-600"
              placeholder="Reason / note (optional)…"
              value={withdrawNote}
              onChange={e => setWithdrawNote(e.target.value)}
              maxLength={100}
            />
          </CardContent>
        </Card>
      )}

      {/* Transaction log */}
      {log && log.length > 0 && (
        <Card className="border-slate-800 bg-card/40">
          <CardHeader className="border-b border-slate-800/50 pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5">
              {log.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 text-xs px-2 py-1.5 rounded hover:bg-slate-800/20">
                  <span className={cn(
                    "font-bold w-16 shrink-0",
                    tx.transactionType === "deposit" ? "text-green-400"
                    : tx.transactionType === "withdraw" ? "text-amber-400"
                    : "text-purple-400",
                  )}>
                    {tx.transactionType === "deposit" ? "+" : "-"}{Math.round(tx.amount).toLocaleString()}g
                  </span>
                  <span className="flex-1 text-slate-400 capitalize">{tx.transactionType}</span>
                  <span className="text-slate-500 truncate max-w-[120px]">{tx.characterName}</span>
                  <span className="text-slate-600 shrink-0">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────

function LeaderboardTab({ myGuildId }: { myGuildId?: number }) {
  const [alignFilter, setAlignFilter] = React.useState("All");
  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["guild", "leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm">No guilds yet.</p>;

  const filtered = alignFilter === "All" ? data : data.filter(g => g.alignment === alignFilter);

  return (
    <div className="space-y-4">
      {/* Alignment filter */}
      <div className="flex gap-1.5">
        {["All", "Qeynos", "Freeport", "Neutral"].map(a => (
          <button
            key={a}
            onClick={() => setAlignFilter(a)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs border transition-colors",
              alignFilter === a
                ? a === "Qeynos"   ? "border-sky-700/60 bg-sky-900/30 text-sky-300"
                  : a === "Freeport" ? "border-red-700/60 bg-red-900/30 text-red-300"
                  : a === "All"      ? "border-amber-700/60 bg-amber-900/30 text-amber-300"
                  : "border-slate-600 bg-slate-800 text-slate-200"
                : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400",
            )}
          >
            {a === "All" ? "🌍 All" : `${ALIGNMENT_ICON[a]} ${a}`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(entry => {
          const isMyGuild = entry.id === myGuildId;
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors",
                isMyGuild
                  ? "border-amber-700/50 bg-amber-950/20"
                  : "border-slate-800/50 bg-slate-900/30",
              )}
            >
              {/* Rank + delta */}
              <div className="w-10 text-center shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-lg">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
                ) : (
                  <span className="text-slate-500 font-mono text-sm">#{entry.rank}</span>
                )}
                {entry.weeklyDelta != null && entry.weeklyDelta !== 0 && (
                  <div className={cn("text-[9px] font-bold tabular-nums flex items-center justify-center gap-0.5",
                    entry.weeklyDelta > 0 ? "text-green-400" : "text-red-400",
                  )}>
                    {entry.weeklyDelta > 0
                      ? <TrendingUp className="w-2.5 h-2.5" />
                      : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(entry.weeklyDelta)}
                  </div>
                )}
              </div>

              {/* Alignment icon */}
              <span className="text-xl shrink-0 mt-0.5">{ALIGNMENT_ICON[entry.alignment] ?? "⚖️"}</span>

              {/* Name + info + top members */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("font-semibold text-sm", isMyGuild ? "text-amber-300" : "text-slate-200")}>
                    {entry.name}
                  </span>
                  <GuildTag tag={entry.tag} alignment={entry.alignment} />
                  <GuildLevelBadge level={entry.guildLevel} />
                  {isMyGuild && <span className="text-[10px] text-amber-600 font-bold">(your guild)</span>}
                  {entry.isGhost && <span className="text-[10px] text-slate-700">ghost</span>}
                  {entry.isRecruiting && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-950/40 border border-green-800/40 text-green-400">
                      Recruiting
                    </span>
                  )}
                </div>
                {entry.motto && (
                  <p className="text-[11px] italic text-slate-600 truncate mt-0.5">"{entry.motto}"</p>
                )}
                {/* Top 3 members */}
                {entry.topMembers.length > 0 && (
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {entry.topMembers.map((m, i) => (
                      <span key={i} className="text-[10px] text-slate-600 flex items-center gap-0.5">
                        <span>{i === 0 ? "👑" : "·"}</span>
                        <span className={i === 0 ? "text-amber-600" : ""}>{m.name}</span>
                        <span className="text-slate-700">Lv{m.level}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score + members */}
              <div className="text-right shrink-0 space-y-0.5">
                <div className="text-sm font-bold text-amber-400 tabular-nums">{entry.score.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                  <Users className="w-3 h-3" />
                  {entry.memberCount}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LeaveOrDisbandButtons({ membership }: { membership: { rank: string } }) {
  const [disbandConfirm, setDisbandConfirm] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guild"] });

  const handleLeave = () => {
    apiFetch("/api/guild/leave", { method: "POST" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to leave");
        toast({ title: "Left guild" });
        refresh();
      })
      .catch((err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  };

  const handleDisband = () => {
    apiFetch("/api/guild/disband", { method: "POST" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to disband");
        toast({ title: "Guild disbanded." });
        setDisbandConfirm(false);
        refresh();
      })
      .catch((err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  };

  return (
    <div className="flex gap-3 pt-2">
      {membership.rank !== "leader" && (
        <Button
          variant="outline" size="sm"
          className="border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400"
          onClick={handleLeave}
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Leave Guild
        </Button>
      )}
      {membership.rank === "leader" && (
        !disbandConfirm ? (
          <Button
            variant="outline" size="sm"
            className="border-slate-700 text-slate-500 hover:border-red-800 hover:text-red-500"
            onClick={() => setDisbandConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Disband Guild
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Permanently disband?</span>
            <Button size="sm" className="bg-red-800 hover:bg-red-700 text-white text-xs h-7" onClick={handleDisband}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" className="border-slate-700 text-xs h-7" onClick={() => setDisbandConfirm(false)}>
              Cancel
            </Button>
          </div>
        )
      )}
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [name, setName] = React.useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/guild/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterName: name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to invite");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Invited!", description: `${name} has joined the guild.` });
      setName("");
      onInvited();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex gap-2 flex-1 min-w-0">
      <input
        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
        placeholder="Invite by character name…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && name.trim() && mutation.mutate()}
      />
      <Button
        size="sm"
        className="bg-sky-800 hover:bg-sky-700 text-white shrink-0"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !name.trim()}
      >
        <UserPlus className="w-3.5 h-3.5 mr-1" />
        Invite
      </Button>
    </div>
  );
}

// ─── Create Guild Form ────────────────────────────────────────────────────────

function CreateGuildForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [motto, setMotto] = React.useState("");
  const [alignment, setAlignment] = React.useState("Neutral");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/guild/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag: tag.toUpperCase(), description, motto, alignment }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to create guild");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Guild created!", description: `${name} [${tag.toUpperCase()}] is now founded.` });
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-slate-800 bg-card/40 max-w-lg mx-auto">
      <CardHeader className="border-b border-slate-800/50 bg-slate-900/30">
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Shield className="w-5 h-5" />
          Found a Guild
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">Unite adventurers under a single banner</p>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Guild Name <span className="text-slate-600">(3–30 chars)</span></label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
              placeholder="Lions of Qeynos"
              value={name}
              maxLength={30}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tag <span className="text-slate-600">(2–5)</span></label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600 uppercase font-mono"
              placeholder="LION"
              value={tag}
              maxLength={5}
              onChange={e => setTag(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Alignment</label>
          <div className="flex gap-2">
            {["Qeynos", "Freeport", "Neutral"].map(a => (
              <button
                key={a}
                onClick={() => setAlignment(a)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  alignment === a
                    ? a === "Qeynos"   ? "border-sky-600 bg-sky-900/30 text-sky-300"
                      : a === "Freeport" ? "border-red-600 bg-red-900/30 text-red-300"
                      : "border-slate-600 bg-slate-800 text-slate-200"
                    : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400",
                )}
              >
                {ALIGNMENT_ICON[a]} {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Motto <span className="text-slate-600">(optional)</span></label>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
            placeholder="Steel will outlast flesh."
            value={motto}
            maxLength={80}
            onChange={e => setMotto(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Description <span className="text-slate-600">(optional)</span></label>
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600 resize-none"
            placeholder="A few words about your guild's purpose and goals..."
            value={description}
            maxLength={200}
            rows={3}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <Button
          className="w-full bg-amber-700 hover:bg-amber-600 text-white"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !tag.trim()}
        >
          {mutation.isPending ? "Founding…" : "Found Guild"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuildPage() {
  const queryClient = useQueryClient();

  const { data: guildData, isLoading } = useQuery<MyGuildData | null>({
    queryKey: ["guild"],
    queryFn: fetchMyGuild,
    refetchInterval: 30_000,
  });

  const { data: character } = useQuery<{ id: string }>({
    queryKey: ["/api/character"],
    staleTime: Infinity,
  });
  const myCharacterId = character ? Number(character.id) : 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guild"] });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const inGuild = guildData !== null && guildData !== undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Guild
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Unite under a banner. Grow your guild's power. Dominate the leaderboards of Norrath.
        </p>
      </div>

      {inGuild && guildData ? (
        <Tabs defaultValue="dashboard">
          <TabsList className="bg-slate-900/60 border border-slate-800 flex-wrap h-auto gap-0.5">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="contributions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              Contributions
            </TabsTrigger>
            <TabsTrigger value="bank" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Coins className="w-3.5 h-3.5 mr-1.5" />
              Bank
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Trophy className="w-3.5 h-3.5 mr-1.5" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-5">
            <DashboardTab guildData={guildData} />
          </TabsContent>

          <TabsContent value="members" className="mt-5">
            <MembersTab guildData={guildData} characterId={myCharacterId} />
          </TabsContent>

          <TabsContent value="contributions" className="mt-5">
            <ContributionsTab />
          </TabsContent>

          <TabsContent value="bank" className="mt-5">
            <BankTab guildData={guildData} />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-5">
            <LeaderboardTab myGuildId={guildData.guild.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="leaderboard">
          <TabsList className="bg-slate-900/60 border border-slate-800">
            <TabsTrigger value="create" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Found a Guild
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
              <Trophy className="w-3.5 h-3.5 mr-1.5" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-5">
            <div className="space-y-4">
              <div className="text-center py-4 text-slate-500">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">You are not in a guild yet.</p>
                <p className="text-xs mt-1 text-slate-600">Found one to unlock guild perks, the guild bank, and weekly challenges.</p>
              </div>
              <CreateGuildForm onCreated={refresh} />
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-5">
            <LeaderboardTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
