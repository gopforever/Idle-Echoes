const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
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
  level: number;
  currentZone?: string;
  killCount?: number;
  bossKills?: number;
  deathCount?: number;
  totalGoldEarned?: number;
  gearScore?: number;
  str?: number;
  agi?: number;
  sta?: number;
  int?: number;
  wis?: number;
  cha?: number;
  alignment?: string;
  personality?: string;
  generation?: number;
  parentId?: number;
  dungeonClears?: number;
  raidClears?: number;
  inheritedTraits?: string[];
  lastActive?: string;
}

export interface WorldEvent {
  id: number;
  playerId?: number;
  playerName?: string;
  eventType: string;
  zone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  timestamp?: string;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  race?: string;
  class?: string;
  level?: number;
  killCount?: number;
  bossKills?: number;
  deathCount?: number;
  totalGold?: number;
  goldEarned?: number;
  gearScore?: number;
  dungeonCompletions?: number;
  isGhost?: boolean;
  playerType?: string;
  oresGathered?: number;
  logsGathered?: number;
  fishGathered?: number;
  herbsGathered?: number;
  raresGathered?: number;
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
  leaderboardOverview: () => get<LeaderboardEntry[]>("/leaderboard/overview"),
  leaderboardKills: () => get<LeaderboardEntry[]>("/leaderboard/kills"),
  leaderboardGold: () => get<LeaderboardEntry[]>("/leaderboard/gold"),
  leaderboardDungeons: () => get<LeaderboardEntry[]>("/leaderboard/dungeons"),
  leaderboardGathering: () => get<LeaderboardEntry[]>("/leaderboard/gathering"),
};
