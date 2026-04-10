const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export interface HealthData {
  status: string;
  uptime?: number;
  timestamp?: string;
}

export interface WorldPlayer {
  id: number;
  name: string;
  race?: string;
  class?: string;
  archetype?: string;
  alignment?: string;
  personality?: string;
  level: number;
  xp?: number;
  xpToNextLevel?: number;
  gold?: number;
  zone?: string;
  killCount?: number;
  deathCount?: number;
  bossKills?: number;
  totalGoldEarned?: number;
  totalGoldSpent?: number;
  stats?: {
    strength?: number;
    agility?: number;
    stamina?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  gear?: Record<string, unknown>;
  generation?: number;
  parentId?: number | null;
  inheritedTraits?: string[];
  lastTickAt?: string;
  createdAt?: string;
  isRealPlayer?: boolean;
}

export interface WorldEvent {
  id: number;
  type: string;
  message?: string;
  playerName?: string;
  zone?: string;
  importance?: number;
  tick?: number;
  createdAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  type?: "player" | "ghost";
  name: string;
  class?: string;
  level?: number;
  xp?: number;
  killCount?: number;
  bossKills?: number;
  dungeonsCompleted?: number;
  heroicCompletions?: number;
  raidsCompleted?: number;
  highestPhase?: number;
  rank?: number;
  // dungeon-specific fields
  floorsCleared?: number;
  dungeonBreakdown?: Array<{ dungeonId: string; dungeonName: string; difficulty: string; clearCount: number }>;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentPlayerId: string | null;
}

export interface GhostMarketDemand {
  itemName?: string;
  demand?: number;
  supply?: number;
  price?: number;
}

export const api = {
  health: () => get<HealthData>("/health"),
  worldPlayers: () => get<WorldPlayer[]>("/world/players"),
  worldEvents: (limit = 50) => get<WorldEvent[]>(`/world/events?limit=${limit}`),
  ghostMarketDemand: () => get<GhostMarketDemand[]>("/world/ghost-market-demand"),
  leaderboardOverview: () => get<LeaderboardResponse>("/leaderboard/overall").then((r) => r.entries),
  leaderboardKills: () =>
    get<LeaderboardResponse>("/leaderboard/overall").then((r) =>
      [...r.entries].sort((a, b) => (b.killCount ?? 0) - (a.killCount ?? 0)),
    ),
  leaderboardGold: () => get<LeaderboardResponse>("/leaderboard/overall").then((r) => r.entries),
  leaderboardDungeons: () => get<LeaderboardResponse>("/leaderboard/dungeons").then((r) => r.entries),
  leaderboardGathering: (): Promise<LeaderboardEntry[]> => Promise.resolve([]),
};
