import { useState, useEffect, useCallback, Fragment } from "react";
import { fetchOverall, fetchDungeons, fetchRaids, fetchPlayerProfile, fetchGhostProfile } from "@/lib/api";
import type { OverallEntry, DungeonEntry, RaidEntry, PlayerProfile, GearItem, DungeonBreakdownItem } from "@/lib/api";

type Tab = "overall" | "dungeons" | "raids";

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-orange-400",
  fabled: "text-purple-400",
  mythical: "text-red-400",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-mono text-sm">#{rank}</span>;
}

function GhostBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border ml-1">
      <span>👻</span>
      <span>Ghost</span>
    </span>
  );
}

function YouBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 ml-1">
      <span>⚔️</span>
      <span>You</span>
    </span>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded border border-border bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
    >
      <span className={loading ? "animate-spin" : ""}>↻</span>
      {loading ? "Refreshing..." : "Refresh"}
    </button>
  );
}

const ALL_GEAR_SLOTS = [
  "primary", "secondary", "ranged",
  "head", "shoulder", "chest", "hands", "legs", "feet",
  "back", "waist", "wrist", "neck", "charm",
  "earLeft", "earRight", "ringLeft", "ringRight",
];

const SLOT_LABELS: Record<string, string> = {
  primary: "Main Hand", secondary: "Off Hand", ranged: "Ranged",
  head: "Head", shoulder: "Shoulder", chest: "Chest",
  hands: "Hands", legs: "Legs", feet: "Feet",
  back: "Back", waist: "Waist", wrist: "Wrist",
  neck: "Neck", charm: "Charm",
  earLeft: "Ear L", earRight: "Ear R",
  ringLeft: "Ring L", ringRight: "Ring R",
};

const SLOT_ICONS: Record<string, string> = {
  primary: "⚔️", secondary: "🛡️", ranged: "🏹",
  head: "🪖", shoulder: "🫱", chest: "🧥",
  hands: "🧤", legs: "👖", feet: "👢",
  back: "🎒", waist: "🔗", wrist: "⌚",
  neck: "📿", charm: "✨",
  earLeft: "💎", earRight: "💎",
  ringLeft: "💍", ringRight: "💍",
};

function ProfilePanel({ profile, loading, error, isGhost }: { profile: PlayerProfile | null; loading: boolean; error?: boolean; isGhost?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        Loading profile...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center py-6 text-sm gap-2 text-red-400/80">
        <span>⚠</span> Failed to load profile. Please try again.
      </div>
    );
  }
  if (!profile) return null;

  const sortedZones = Object.entries(profile.zoneKills)
    .filter(([, kills]) => kills > 0)
    .sort(([, a], [, b]) => b - a);

  const DIFF_COLORS: Record<string, string> = {
    normal: "text-gray-300",
    expert: "text-green-400",
    legendary: "text-orange-400",
    mythical: "text-red-400",
  };

  // Build a full 18-slot map from the gear array
  const gearBySlot = new Map<string, GearItem>(profile.gear.map(g => [g.slot, g]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-5 pt-2">
      {/* Zone Kills */}
      <div className="bg-background/50 rounded border border-border p-4">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <span>🗺️</span> Zone Kills
        </h3>
        {isGhost ? (
          <p className="text-muted-foreground text-xs italic">Zone kill tracking not available for ghost NPCs.</p>
        ) : sortedZones.length === 0 ? (
          <p className="text-muted-foreground text-xs">No kills recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sortedZones.map(([zone, kills]) => (
              <li key={zone} className="flex items-center justify-between text-xs">
                <span className="text-foreground/80 truncate pr-2">{zone}</span>
                <span className="font-mono text-amber-300 shrink-0">{kills.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dungeon & Raid Clears */}
      <div className="bg-background/50 rounded border border-border p-4">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <span>🗝️</span> Dungeon / Raid Clears
        </h3>
        {isGhost ? (
          <p className="text-muted-foreground text-xs italic">No dungeon/raid data for ghost NPCs.</p>
        ) : profile.dungeonClears.length === 0 && profile.raidClears.length === 0 ? (
          <p className="text-muted-foreground text-xs">No clears on record.</p>
        ) : (
          <ul className="space-y-1.5">
            {profile.dungeonClears.map((d, i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground/80 truncate pr-2">
                  {d.dungeonName}{" "}
                  <span className={`${DIFF_COLORS[d.difficulty] ?? "text-gray-300"} capitalize`}>
                    [{d.difficulty}]
                  </span>
                </span>
                <span className="font-mono text-purple-300 shrink-0">{d.clearCount}×</span>
              </li>
            ))}
            {profile.raidClears.map((r, i) => (
              <li key={`r${i}`} className="flex items-center justify-between text-xs">
                <span className="text-foreground/80 truncate pr-2">
                  {r.raidId}{" "}
                  <span className={`${DIFF_COLORS[r.difficulty] ?? "text-gray-300"} capitalize`}>
                    [{r.difficulty}]
                  </span>
                </span>
                <span className="font-mono text-red-300 shrink-0">{r.clearCount}× (P{r.maxPhase})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Gear (18-slot grid) & Stats */}
      <div className="bg-background/50 rounded border border-border p-4">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <span>🛡️</span> Gear &amp; Stats
        </h3>
        {isGhost ? (
          <p className="text-muted-foreground text-xs italic mb-3">Ghost NPCs carry no tracked gear.</p>
        ) : (
          <ul className="space-y-0.5 mb-3">
            {ALL_GEAR_SLOTS.map(slot => {
              const g = gearBySlot.get(slot);
              return (
                <li key={slot} className="flex items-center text-xs gap-1">
                  <span className="text-base leading-none shrink-0 w-5 text-center">{SLOT_ICONS[slot] ?? "🔲"}</span>
                  <span className="text-muted-foreground w-14 shrink-0">{SLOT_LABELS[slot] ?? slot}</span>
                  {g ? (
                    <span className="flex items-center gap-1 min-w-0">
                      <span className={`${RARITY_COLORS[g.rarity] ?? "text-gray-300"} truncate`}>
                        {g.name}
                      </span>
                      <span className="text-muted-foreground/50 shrink-0 ml-1">IL{g.level}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 italic">— empty —</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className={`${isGhost ? "" : "border-t border-border pt-2 "}grid grid-cols-2 gap-x-3 gap-y-0.5`}>
          {[
            ["HP", profile.stats.maxHp],
            ["Power", profile.stats.totalPower],
            ["ATK", profile.stats.attackRating],
            ["DEF", profile.stats.defenseRating],
            ["MIT", `${profile.stats.mitigation}%`],
            ["AVD", `${profile.stats.avoidance}%`],
            ["Crit", `${profile.stats.critChance}%`],
            ["Haste", `${profile.stats.haste}%`],
            ["DPS", profile.stats.dps],
          ].map(([label, val]) => (
            <div key={label as string} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono text-blue-300">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverallTable({ entries, currentPlayerId }: { entries: OverallEntry[]; currentPlayerId: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback(async (entry: OverallEntry) => {
    const newId = expandedId === entry.id ? null : entry.id;
    setExpandedId(newId);
    if (!newId) return;
    if (profiles[entry.id] || profileErrors[entry.id]) return;

    setLoadingProfile(entry.id);
    try {
      let profile: PlayerProfile;
      if (entry.type === "player") {
        const charId = parseInt(entry.id.replace("player_", ""), 10);
        if (isNaN(charId)) { setProfileErrors(prev => ({ ...prev, [entry.id]: true })); return; }
        profile = await fetchPlayerProfile(charId);
      } else {
        const ghostId = parseInt(entry.id.replace("ghost_", ""), 10);
        if (isNaN(ghostId)) { setProfileErrors(prev => ({ ...prev, [entry.id]: true })); return; }
        profile = await fetchGhostProfile(ghostId);
      }
      setProfiles(prev => ({ ...prev, [entry.id]: profile }));
    } catch {
      setProfileErrors(prev => ({ ...prev, [entry.id]: true }));
    } finally {
      setLoadingProfile(null);
    }
  }, [expandedId, profiles, profileErrors]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-left">
            <th className="pb-3 pr-2 font-medium w-8"></th>
            <th className="pb-3 pr-4 font-medium w-16">Rank</th>
            <th className="pb-3 pr-4 font-medium">Player</th>
            <th className="pb-3 pr-4 font-medium">Class</th>
            <th className="pb-3 pr-4 font-medium text-right">Level</th>
            <th className="pb-3 pr-4 font-medium text-right">Kills</th>
            <th className="pb-3 font-medium text-right">Boss Kills</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isYou = e.id === currentPlayerId;
            const isExpanded = expandedId === e.id;
            return (
              <Fragment key={e.id}>
                <tr
                  onClick={() => toggleExpand(e)}
                  className={[
                    "border-b border-border/50 transition-colors cursor-pointer select-none",
                    isYou ? "player-row-highlight" : "",
                    e.type === "ghost" ? "ghost-row hover:bg-secondary/30" : "hover:bg-secondary/20",
                    e.rank <= 3 ? "bg-amber-500/5" : "",
                    isExpanded ? "border-b-0" : "",
                  ].join(" ")}
                >
                  <td className="py-3 pr-2 text-muted-foreground text-xs w-8">
                    <span className="transition-transform inline-block" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                      ▶
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <RankBadge rank={e.rank} />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-foreground">{e.name}</span>
                    {isYou ? <YouBadge /> : e.type === "ghost" ? <GhostBadge /> : null}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{e.class}</td>
                  <td className="py-3 pr-4 text-right font-mono text-amber-400">{e.level}</td>
                  <td className="py-3 pr-4 text-right font-mono">{e.killCount.toLocaleString()}</td>
                  <td className="py-3 text-right font-mono text-red-400">{e.bossKills.toLocaleString()}</td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-border/50 bg-card/60">
                    <td colSpan={7} className="p-0">
                      <ProfilePanel
                        profile={profiles[e.id] ?? null}
                        loading={loadingProfile === e.id}
                        error={!!profileErrors[e.id]}
                        isGhost={e.type === "ghost"}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  normal: "text-gray-300",
  advanced: "text-green-400",
  expert: "text-blue-400",
  legendary: "text-orange-400",
  mythical: "text-red-400",
};

function DungeonBreakdownRow({ breakdown }: { breakdown: DungeonBreakdownItem[] }) {
  if (breakdown.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-8 py-3 text-xs text-muted-foreground italic border-b border-border/30">
          No completed dungeon runs recorded.
        </td>
      </tr>
    );
  }
  const sorted = [...breakdown].sort((a, b) => {
    const diffOrder = ["mythical", "legendary", "expert", "advanced", "normal"];
    const di = diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
    if (di !== 0) return di;
    return b.clearCount - a.clearCount;
  });
  return (
    <tr>
      <td colSpan={6} className="border-b border-border/30">
        <div className="px-8 py-3 grid grid-cols-2 gap-x-6 gap-y-1">
          {sorted.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{d.dungeonName}</span>
              <span className="flex items-center gap-2 ml-2 shrink-0">
                <span className={`capitalize font-medium ${DIFFICULTY_COLORS[d.difficulty] ?? "text-gray-300"}`}>{d.difficulty}</span>
                <span className="text-foreground font-mono">×{d.clearCount}</span>
              </span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

function DungeonTable({ entries, currentPlayerId }: { entries: DungeonEntry[]; currentPlayerId: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-left">
            <th className="pb-3 pr-4 font-medium w-8"></th>
            <th className="pb-3 pr-4 font-medium w-16">Rank</th>
            <th className="pb-3 pr-4 font-medium">Player</th>
            <th className="pb-3 pr-4 font-medium text-right">Dungeons</th>
            <th className="pb-3 pr-4 font-medium text-right">Floors Cleared</th>
            <th className="pb-3 font-medium text-right">Heroic Clears</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isYou = e.id === currentPlayerId;
            const isExpanded = expandedId === e.id;
            const hasBreakdown = e.type === "player";
            return (
              <Fragment key={e.id}>
                <tr
                  className={[
                    "border-b border-border/50 transition-colors",
                    hasBreakdown ? "cursor-pointer" : "",
                    isYou ? "player-row-highlight" : "",
                    e.type === "ghost" ? "ghost-row hover:bg-secondary/30" : "hover:bg-secondary/20",
                    e.rank <= 3 ? "bg-amber-500/5" : "",
                  ].join(" ")}
                  onClick={() => hasBreakdown && setExpandedId(isExpanded ? null : e.id)}
                >
                  <td className="py-3 pr-2 text-muted-foreground w-8">
                    {hasBreakdown && <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <RankBadge rank={e.rank} />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-foreground">{e.name}</span>
                    {isYou ? <YouBadge /> : e.type === "ghost" ? <GhostBadge /> : null}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-amber-400">{e.dungeonsCompleted}</td>
                  <td className="py-3 pr-4 text-right font-mono">{e.floorsCleared}</td>
                  <td className="py-3 text-right font-mono text-purple-400">{e.heroicCompletions}</td>
                </tr>
                {isExpanded && <DungeonBreakdownRow breakdown={e.dungeonBreakdown ?? []} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RaidTable({ entries, currentPlayerId }: { entries: RaidEntry[]; currentPlayerId: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-left">
            <th className="pb-3 pr-4 font-medium w-16">Rank</th>
            <th className="pb-3 pr-4 font-medium">Player</th>
            <th className="pb-3 pr-4 font-medium text-right">Raids Cleared</th>
            <th className="pb-3 pr-4 font-medium text-right">Highest Phase</th>
            <th className="pb-3 font-medium text-right">Raid Kills</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isYou = e.id === currentPlayerId;
            return (
              <tr
                key={e.id}
                className={[
                  "border-b border-border/50 transition-colors",
                  isYou ? "player-row-highlight" : "",
                  e.type === "ghost" ? "ghost-row hover:bg-secondary/30" : "hover:bg-secondary/20",
                  e.rank <= 3 ? "bg-amber-500/5" : "",
                ].join(" ")}
              >
                <td className="py-3 pr-4">
                  <RankBadge rank={e.rank} />
                </td>
                <td className="py-3 pr-4">
                  <span className="font-medium text-foreground">{e.name}</span>
                  {isYou ? <YouBadge /> : e.type === "ghost" ? <GhostBadge /> : null}
                </td>
                <td className="py-3 pr-4 text-right font-mono text-amber-400">{e.raidsCompleted}</td>
                <td className="py-3 pr-4 text-right font-mono text-red-400">
                  {e.highestPhase > 0 ? `Phase ${e.highestPhase}` : "—"}
                </td>
                <td className="py-3 text-right font-mono">{e.totalRaidKills.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <span className="text-4xl mb-3">⚔️</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm">Loading adventurers...</p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [overallData, setOverallData] = useState<OverallEntry[]>([]);
  const [dungeonData, setDungeonData] = useState<DungeonEntry[]>([]);
  const [raidData, setRaidData] = useState<RaidEntry[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overall, dungeons, raids] = await Promise.all([
        fetchOverall(),
        fetchDungeons(),
        fetchRaids(),
      ]);
      setOverallData(overall.entries);
      setDungeonData(dungeons.entries);
      setRaidData(raids.entries);
      setCurrentPlayerId(overall.currentPlayerId);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load leaderboard data. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overall", label: "Overall Rank", icon: "🏆" },
    { id: "dungeons", label: "Dungeon Progression", icon: "🗝️" },
    { id: "raids", label: "Raid Progression", icon: "⚔️" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-lg font-bold text-amber-400 leading-tight tracking-wide">
                World Leaderboard
              </h1>
              <p className="text-xs text-muted-foreground">Norrath's Greatest Adventurers</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <RefreshButton onClick={refresh} loading={loading} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">
            Rankings of all adventurers — both real players and ghost NPCs — across Norrath.
            Your character is highlighted in gold. Click any row to expand their profile — real players show gear &amp; zone history, ghost NPCs show computed combat stats.
            Auto-refreshes every 30 seconds.
          </p>
        </div>

        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-amber-500 text-black shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded border border-destructive/50 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              {tabs.find(t => t.id === tab)?.icon}
              {tabs.find(t => t.id === tab)?.label}
            </h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Real player
              </span>
              <span className="flex items-center gap-1">
                <span>👻</span>
                Ghost NPC
              </span>
            </div>
          </div>

          <div className="p-6">
            {loading && overallData.length === 0 ? (
              <LoadingState />
            ) : (
              <>
                {tab === "overall" && (
                  overallData.length > 0
                    ? <OverallTable entries={overallData} currentPlayerId={currentPlayerId} />
                    : <EmptyState message="No adventurers found yet. Start playing to appear on the leaderboard!" />
                )}
                {tab === "dungeons" && (
                  dungeonData.length > 0
                    ? <DungeonTable entries={dungeonData} currentPlayerId={currentPlayerId} />
                    : <EmptyState message="No dungeon runs completed yet. Enter a dungeon to climb the ranks!" />
                )}
                {tab === "raids" && (
                  raidData.length > 0
                    ? <RaidTable entries={raidData} currentPlayerId={currentPlayerId} />
                    : <EmptyState message="No raids completed yet. Form a party and take on the raid bosses!" />
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Showing top 100 adventurers per category. Rankings update in real time.
        </div>
      </main>
    </div>
  );
}
