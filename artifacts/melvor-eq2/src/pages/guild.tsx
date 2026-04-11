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
  ArrowUp, ArrowDown, LogOut, Trash2, Award, Coins,
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
  createdAt: string;
}

interface GuildMemberRow {
  id: number;
  guildId: number;
  characterId: number | null;
  ghostId: number | null;
  rank: string;
  contributionPoints: number;
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

interface MyGuildData {
  guild: Guild;
  membership: { rank: string; characterId: number; contributionPoints: number };
  members: GuildMemberRow[];
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
  score: number;
  memberCount: number;
  bankGold: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchMyGuild(): Promise<MyGuildData | null> {
  const r = await fetch(apiUrl("/api/guild"), { credentials: "include" });
  if (!r.ok) throw new Error("Failed to fetch guild");
  return r.json();
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const r = await fetch(apiUrl("/api/guild/leaderboard"), { credentials: "include" });
  if (!r.ok) throw new Error("Failed to fetch leaderboard");
  return r.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALIGNMENT_ICON: Record<string, string> = {
  Qeynos: "🛡️",
  Freeport: "⚔️",
  Neutral: "⚖️",
};

const RANK_ICON: Record<string, React.ReactElement> = {
  leader:  <Crown className="w-3.5 h-3.5 text-amber-400" />,
  officer: <Star  className="w-3.5 h-3.5 text-sky-400" />,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function GuildTag({ tag, alignment }: { tag: string; alignment: string }) {
  const colors: Record<string, string> = {
    Qeynos:   "bg-sky-900/40 text-sky-300 border-sky-700/50",
    Freeport: "bg-red-900/40 text-red-300 border-red-700/50",
    Neutral:  "bg-slate-800/60 text-slate-300 border-slate-600/50",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold font-mono", colors[alignment] ?? colors.Neutral)}>
      {ALIGNMENT_ICON[alignment] ?? "⚖️"} {tag}
    </span>
  );
}

function MemberRow({
  member,
  myRank,
  myCharacterId,
  onPromote,
  onDemote,
  onKick,
}: {
  member: GuildMemberRow;
  myRank: string;
  myCharacterId: number;
  onPromote: (id: number) => void;
  onDemote: (id: number) => void;
  onKick: (id: number) => void;
}) {
  const isMe = !member.isGhost && member.characterId === myCharacterId;
  const canManage = (myRank === "leader" || (myRank === "officer" && member.rank === "member")) && !isMe;
  const canPromote = myRank === "leader" && member.rank === "member";
  const canDemote  = myRank === "leader" && member.rank === "officer";
  const canKick    = canManage && member.rank !== "leader";

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
      isMe
        ? "border-amber-800/40 bg-amber-950/20"
        : "border-slate-800/50 bg-slate-900/30 hover:bg-slate-800/30",
    )}>
      {/* Rank icon */}
      <div className="shrink-0">{RANK_ICON[member.rank] ?? RANK_ICON.member}</div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-sm font-semibold", isMe ? "text-amber-300" : "text-slate-200")}>
            {member.name}
          </span>
          {isMe && <span className="text-[10px] text-amber-600 font-bold">(you)</span>}
          {member.isGhost && <span className="text-[10px] text-slate-600">ghost</span>}
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
          <span className={cn("font-medium", ARCHETYPE_COLOR[member.archetype] ?? "text-slate-400")}>{member.class}</span>
          <span>·</span>
          <span className="capitalize">{member.race?.replace(/_/g, " ")}</span>
          <span>·</span>
          <span>{member.zone}</span>
        </div>
      </div>

      {/* Level + contribution */}
      <div className="text-right shrink-0 space-y-0.5">
        <div className="text-sm font-bold text-amber-500">Lv {member.level}</div>
        <div className="text-[10px] text-slate-500 tabular-nums">{Math.round(member.contributionPoints).toLocaleString()} pts</div>
      </div>

      {/* Management buttons */}
      {(canPromote || canDemote || canKick) && (
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {canPromote && (
            <button
              onClick={() => onPromote(member.characterId!)}
              title="Promote to Officer"
              className="p-1 rounded hover:bg-sky-900/40 text-slate-600 hover:text-sky-400 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}
          {canDemote && (
            <button
              onClick={() => onDemote(member.characterId!)}
              title="Demote to Member"
              className="p-1 rounded hover:bg-amber-900/40 text-slate-600 hover:text-amber-400 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
          {canKick && (
            <button
              onClick={() => onKick(member.characterId!)}
              title="Kick from Guild"
              className="p-1 rounded hover:bg-red-900/40 text-slate-600 hover:text-red-400 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
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
      const r = await fetch(apiUrl("/api/guild/create"), {
        method: "POST",
        credentials: "include",
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
            <label className="block text-xs text-slate-400 mb-1">Tag <span className="text-slate-600">(2–5 letters)</span></label>
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
                    ? a === "Qeynos" ? "border-sky-600 bg-sky-900/30 text-sky-300"
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
          <label className="block text-xs text-slate-400 mb-1">Motto <span className="text-slate-600">(optional, max 80)</span></label>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
            placeholder="Steel will outlast flesh."
            value={motto}
            maxLength={80}
            onChange={e => setMotto(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Description <span className="text-slate-600">(optional, max 200)</span></label>
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

// ─── Invite Dialog ────────────────────────────────────────────────────────────

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [name, setName] = React.useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/guild/invite"), {
        method: "POST",
        credentials: "include",
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
    <div className="flex gap-2">
      <input
        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
        placeholder="Character name to invite…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && name.trim() && mutation.mutate()}
      />
      <Button
        size="sm"
        className="bg-sky-800 hover:bg-sky-700 text-white"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !name.trim()}
      >
        <UserPlus className="w-3.5 h-3.5 mr-1" />
        Invite
      </Button>
    </div>
  );
}

// ─── My Guild View ────────────────────────────────────────────────────────────

function MyGuildView({ data, characterId }: { data: MyGuildData; characterId: number }) {
  const { guild, membership, members } = data;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disbandConfirm, setDisbandConfirm] = React.useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guild"] });

  function memberAction(endpoint: string, targetCharacterId: number) {
    return fetch(apiUrl(`/api/guild/${endpoint}`), {
      method: "POST",
      credentials: "include",
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

  const handleLeave = () => {
    fetch(apiUrl("/api/guild/leave"), { method: "POST", credentials: "include" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to leave");
        toast({ title: "Left guild" });
        refresh();
      })
      .catch((err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  };

  const handleDisband = () => {
    fetch(apiUrl("/api/guild/disband"), { method: "POST", credentials: "include" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to disband");
        toast({ title: "Guild disbanded." });
        setDisbandConfirm(false);
        refresh();
      })
      .catch((err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  };

  const totalScore = members.reduce((s, m) => s + m.contributionPoints, 0);
  const realMembers = members.filter(m => !m.isGhost);

  return (
    <div className="space-y-5">
      {/* Guild Banner */}
      <Card className="border-slate-800 bg-card/40">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-900/30 border border-amber-800/40 flex items-center justify-center shrink-0">
              <span className="text-2xl">{ALIGNMENT_ICON[guild.alignment] ?? "⚖️"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-serif font-bold text-amber-400">{guild.name}</h2>
                <GuildTag tag={guild.tag} alignment={guild.alignment} />
              </div>
              {guild.motto && (
                <p className="text-xs italic text-slate-500 mt-0.5">"{guild.motto}"</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-slate-600">Your rank</div>
              <div className={cn("text-sm font-bold capitalize", RANK_COLOR[membership.rank] ?? "text-slate-300")}>
                {RANK_ICON[membership.rank]} {membership.rank}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {guild.description && (
            <p className="text-sm text-slate-400">{guild.description}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-slate-200">{members.length}</div>
              <div className="text-[11px] text-slate-500">Members</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{Math.round(totalScore).toLocaleString()}</div>
              <div className="text-[11px] text-slate-500">Guild Score</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-amber-500">💰 {Math.round(guild.bankGold).toLocaleString()}</div>
              <div className="text-[11px] text-slate-500">Bank Gold</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite form (officer/leader) */}
      {(membership.rank === "leader" || membership.rank === "officer") && (
        <Card className="border-slate-800 bg-card/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Invite Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm onInvited={refresh} />
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card className="border-slate-800 bg-card/40">
        <CardHeader className="border-b border-slate-800/50 pb-3">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            Members <span className="text-slate-600 font-normal">({members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-1.5">
          {members.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              myRank={membership.rank}
              myCharacterId={characterId}
              onPromote={(id) => wrapAction("Promote", () => memberAction("promote", id))}
              onDemote={(id) => wrapAction("Demote", () => memberAction("demote", id))}
              onKick={(id) => wrapAction("Kick", () => memberAction("kick", id))}
            />
          ))}
        </CardContent>
      </Card>

      {/* Leave / Disband */}
      <div className="flex gap-3">
        {membership.rank !== "leader" && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400"
            onClick={handleLeave}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Leave Guild
          </Button>
        )}
        {membership.rank === "leader" && (
          <>
            {!disbandConfirm ? (
              <Button
                variant="outline"
                size="sm"
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function GuildLeaderboard({ myGuildId }: { myGuildId?: number }) {
  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["guild", "leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm">No guilds yet.</p>;

  return (
    <div className="space-y-2">
      {data.map(entry => {
        const isMyGuild = entry.id === myGuildId;
        return (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
              isMyGuild
                ? "border-amber-700/50 bg-amber-950/20"
                : "border-slate-800/50 bg-slate-900/30",
            )}
          >
            {/* Rank */}
            <div className="w-8 text-center shrink-0">
              {entry.rank <= 3 ? (
                <span className="text-lg">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
              ) : (
                <span className="text-slate-500 font-mono text-sm">#{entry.rank}</span>
              )}
            </div>

            {/* Alignment icon */}
            <span className="text-xl shrink-0">{ALIGNMENT_ICON[entry.alignment] ?? "⚖️"}</span>

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-semibold text-sm", isMyGuild ? "text-amber-300" : "text-slate-200")}>
                  {entry.name}
                </span>
                <GuildTag tag={entry.tag} alignment={entry.alignment} />
                {isMyGuild && <span className="text-[10px] text-amber-600 font-bold">(your guild)</span>}
                {entry.isGhost && <span className="text-[10px] text-slate-700">ghost</span>}
              </div>
              {entry.motto && (
                <p className="text-[11px] italic text-slate-600 truncate">"{entry.motto}"</p>
              )}
            </div>

            {/* Stats */}
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

  // We need the current character ID for the member row (to identify "me")
  const { data: character } = useQuery<{ id: string }>({
    queryKey: ["/api/character"],
    staleTime: Infinity,
  });
  const myCharacterId = character ? Number(character.id) : 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guild"] });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const inGuild = guildData !== null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Guild
        </h1>
        <p className="text-slate-400 text-sm mt-1">Unite under a banner. Compete in the guild leaderboard against the guilds of Norrath.</p>
      </div>

      <Tabs defaultValue={inGuild ? "guild" : "leaderboard"}>
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="guild" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            {inGuild ? "My Guild" : "Found a Guild"}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400">
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guild" className="mt-5">
          {inGuild && guildData ? (
            <MyGuildView data={guildData} characterId={myCharacterId} />
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">You are not in a guild yet.</p>
                <p className="text-xs mt-1 text-slate-600">Found one to see it appear on the leaderboard.</p>
              </div>
              <CreateGuildForm onCreated={refresh} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-5">
          <GuildLeaderboard myGuildId={guildData?.guild.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
