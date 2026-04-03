const API_BASE = "/api";

export interface OverallEntry {
  id: string;
  type: "player" | "ghost";
  name: string;
  class: string;
  level: number;
  xp: number;
  killCount: number;
  bossKills: number;
  dungeonsCompleted: number;
  heroicCompletions: number;
  raidsCompleted: number;
  highestPhase: number;
  rank: number;
}

export interface DungeonBreakdownItem {
  dungeonId: string;
  dungeonName: string;
  difficulty: string;
  clearCount: number;
}

export interface DungeonEntry {
  id: string;
  type: "player" | "ghost";
  name: string;
  dungeonsCompleted: number;
  floorsCleared: number;
  heroicCompletions: number;
  dungeonBreakdown: DungeonBreakdownItem[];
  rank: number;
}

export interface RaidEntry {
  id: string;
  type: "player" | "ghost";
  name: string;
  raidsCompleted: number;
  highestPhase: number;
  totalRaidKills: number;
  rank: number;
}

export interface GearItem {
  slot: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
}

export interface DungeonClear {
  dungeonId: string;
  dungeonName: string;
  difficulty: string;
  clearCount: number;
}

export interface RaidClear {
  raidId: string;
  difficulty: string;
  clearCount: number;
  maxPhase: number;
}

export interface PlayerStats {
  maxHp: number;
  attackRating: number;
  defenseRating: number;
  mitigation: number;
  avoidance: number;
  critChance: number;
  critBonus: number;
  haste: number;
  dps: number;
  totalPower: number;
}

export interface PlayerProfile {
  characterId: number;
  name: string;
  class: string;
  level: number;
  zoneKills: Record<string, number>;
  dungeonClears: DungeonClear[];
  raidClears: RaidClear[];
  gear: GearItem[];
  stats: PlayerStats;
}

export async function fetchOverall(): Promise<{ entries: OverallEntry[]; currentPlayerId: string | null }> {
  const res = await fetch(`${API_BASE}/leaderboard/overall`);
  if (!res.ok) throw new Error("Failed to fetch overall leaderboard");
  return res.json();
}

export async function fetchDungeons(): Promise<{ entries: DungeonEntry[]; currentPlayerId: string | null }> {
  const res = await fetch(`${API_BASE}/leaderboard/dungeons`);
  if (!res.ok) throw new Error("Failed to fetch dungeon leaderboard");
  return res.json();
}

export async function fetchRaids(): Promise<{ entries: RaidEntry[]; currentPlayerId: string | null }> {
  const res = await fetch(`${API_BASE}/leaderboard/raids`);
  if (!res.ok) throw new Error("Failed to fetch raid leaderboard");
  return res.json();
}

export async function fetchPlayerProfile(characterId: number): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/leaderboard/player/${characterId}/profile`);
  if (!res.ok) throw new Error("Failed to fetch player profile");
  return res.json();
}

export async function fetchGhostProfile(ghostId: number): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/leaderboard/ghost/${ghostId}/profile`);
  if (!res.ok) throw new Error("Failed to fetch ghost profile");
  return res.json();
}
