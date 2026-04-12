/**
 * Ghost Guild Seeder
 *
 * Seeds 8 AI-controlled guilds (one per alignment/personality archetype) with
 * ghost players as members. Ghost guilds provide a populated leaderboard for
 * the real player to compete against.
 *
 * Safe to call on every boot — uses ON CONFLICT DO NOTHING for idempotency.
 */

import { db } from "@workspace/db";
import { guildsTable, guildMembersTable, guildContributionBreakdownTable, guildChallengesTable, worldPlayersTable } from "@workspace/db/schema";
import { eq, and, isNotNull, inArray, sql } from "drizzle-orm";
import { logger } from "./logger.js";
import { computeGuildLevel } from "./guildPerks.js";

interface GhostGuildSeed {
  name: string;
  tag: string;
  description: string;
  motto: string;
  alignment: "Qeynos" | "Freeport" | "Neutral";
}

const GHOST_GUILD_SEEDS: GhostGuildSeed[] = [
  {
    name: "Lions of Qeynos",
    tag: "LION",
    description: "A proud order of knights sworn to uphold law and justice in Norrath.",
    motto: "Strength through honour.",
    alignment: "Qeynos",
  },
  {
    name: "Ironheart Vanguard",
    tag: "IRON",
    description: "Battle-hardened veterans who have survived the worst Norrath has to offer.",
    motto: "Steel will outlast flesh.",
    alignment: "Qeynos",
  },
  {
    name: "Crimson Blades",
    tag: "CRIM",
    description: "Ruthless mercenaries loyal only to Freeport's coin and power.",
    motto: "Gold before glory.",
    alignment: "Freeport",
  },
  {
    name: "Shadow Syndicate",
    tag: "SHAD",
    description: "A web of scouts, rogues and spies operating from the dark alleys of Freeport.",
    motto: "Strike fast, vanish faster.",
    alignment: "Freeport",
  },
  {
    name: "Arcane Conclave",
    tag: "ARCC",
    description: "Scholars and mages who pursue magical mastery above all allegiances.",
    motto: "Knowledge is the truest power.",
    alignment: "Neutral",
  },
  {
    name: "Pathfinders",
    tag: "PATH",
    description: "Explorers and rangers who chart every corner of Norrath, belonging to none.",
    motto: "Every horizon is a new beginning.",
    alignment: "Neutral",
  },
  {
    name: "Order of the Devout",
    tag: "DEVT",
    description: "Priests and paladins united in divine service across all faiths of Norrath.",
    motto: "The gods wield us as instruments.",
    alignment: "Neutral",
  },
  {
    name: "Emerald Pact",
    tag: "EMLD",
    description: "Druids, rangers and nature-bound warriors who protect the wilds of Norrath.",
    motto: "Nature endures all things.",
    alignment: "Qeynos",
  },
];

/** Alignment → compatible ghost personality labels */
const ALIGNMENT_PERSONALITIES: Record<string, string[]> = {
  Qeynos:   ["Cautious", "Devout", "Scholarly"],
  Freeport: ["Aggressive", "Greedy"],
  Neutral:  ["Explorer", "Scholarly", "Devout", "Aggressive", "Cautious", "Greedy"],
};

function computeGhostContribution(ghost: {
  level: number;
  killCount: number;
  bossKills: number;
}): number {
  return ghost.level * 100 + Math.floor(ghost.killCount * 0.5) + ghost.bossKills * 10;
}

export async function seedGhostGuilds(): Promise<void> {
  // Seed all 8 ghost guilds idempotently (by name)
  for (const seed of GHOST_GUILD_SEEDS) {
    const existing = await db
      .select({ id: guildsTable.id })
      .from(guildsTable)
      .where(eq(guildsTable.name, seed.name))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(guildsTable).values({
      name: seed.name,
      tag: seed.tag,
      description: seed.description,
      motto: seed.motto,
      alignment: seed.alignment,
      leaderId: null,
      isGhost: true,
      bankGold: Math.floor(Math.random() * 5000) + 500,
    }).onConflictDoNothing();
  }

  // Fetch all ghost guild IDs
  const ghostGuilds = await db
    .select({ id: guildsTable.id, name: guildsTable.name, alignment: guildsTable.alignment })
    .from(guildsTable)
    .where(eq(guildsTable.isGhost, true));

  if (ghostGuilds.length === 0) return;

  // Find all ghost players already assigned to any guild (any rank)
  const assignedGhostRows = await db
    .select({ ghostId: guildMembersTable.ghostId })
    .from(guildMembersTable)
    .where(isNotNull(guildMembersTable.ghostId));
  const assignedIds = new Set(assignedGhostRows.map(r => r.ghostId).filter(Boolean));

  // Fetch unassigned ghost players
  const allGhosts = await db
    .select({
      id: worldPlayersTable.id,
      alignment: worldPlayersTable.alignment,
      personality: worldPlayersTable.personality,
      level: worldPlayersTable.level,
      killCount: worldPlayersTable.killCount,
      bossKills: worldPlayersTable.bossKills,
    })
    .from(worldPlayersTable);

  const unassigned = allGhosts.filter(g => !assignedIds.has(g.id));
  if (unassigned.length === 0) return;

  // Distribute ghosts into guilds by alignment affinity
  for (const guild of ghostGuilds) {
    const compatiblePersonalities = ALIGNMENT_PERSONALITIES[guild.alignment] ?? ALIGNMENT_PERSONALITIES["Neutral"];

    // Target 5–9 members per guild
    const targetSize = Math.floor(Math.random() * 5) + 5;

    // Prefer ghosts with matching alignment and compatible personality
    const candidates = unassigned.filter(g => {
      if (assignedIds.has(g.id)) return false;
      const alignmentMatch = g.alignment === guild.alignment || guild.alignment === "Neutral";
      const personalityMatch = compatiblePersonalities.includes(g.personality);
      return alignmentMatch && personalityMatch;
    });

    // Fall back to any unassigned ghost if not enough aligned ones
    let pool = candidates.length >= 2 ? candidates : unassigned.filter(g => !assignedIds.has(g.id));
    pool = pool.slice(0, targetSize);

    for (let i = 0; i < pool.length; i++) {
      const ghost = pool[i];
      const rank = i === 0 ? "officer" : "member";
      const contribution = computeGhostContribution(ghost);

      await db.insert(guildMembersTable).values({
        guildId: guild.id,
        ghostId: ghost.id,
        rank,
        contributionPoints: contribution,
      }).onConflictDoNothing().catch((err) => logger.warn({ err }, "[GuildSeeder] Failed to insert ghost member"));

      assignedIds.add(ghost.id);
    }
  }

  // Refresh contribution points for all ghost guild members (any rank)
  const existingMembers = await db
    .select({ id: guildMembersTable.id, ghostId: guildMembersTable.ghostId })
    .from(guildMembersTable)
    .where(isNotNull(guildMembersTable.ghostId));

  const ghostIds = existingMembers
    .map(m => m.ghostId)
    .filter((id): id is number => id !== null && id !== undefined);

  if (ghostIds.length > 0) {
    const ghosts = await db
      .select({ id: worldPlayersTable.id, level: worldPlayersTable.level, killCount: worldPlayersTable.killCount, bossKills: worldPlayersTable.bossKills })
      .from(worldPlayersTable)
      .where(inArray(worldPlayersTable.id, ghostIds));

    for (const ghost of ghosts) {
      const contribution = computeGhostContribution(ghost);
      await db.update(guildMembersTable)
        .set({ contributionPoints: contribution })
        .where(eq(guildMembersTable.ghostId, ghost.id))
        .catch((err) => logger.warn({ err }, "[GuildSeeder] Failed to update ghost contribution"));
    }
  }

  // Tick ghost guild weekly challenges
  await tickGhostGuildChallenges();

  logger.info("[GuildSeeder] Ghost guilds seeded.");
}

/** Returns the most recent Sunday 00:00:00 UTC */
function getThisSundayMidnightUTC(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Ticks weekly challenge progress for all ghost guilds based on their
 * members' accumulated contribution breakdown rows.
 */
export async function tickGhostGuildChallenges(): Promise<void> {
  const weekStart = getThisSundayMidnightUTC();

  const ghostGuilds = await db
    .select({ id: guildsTable.id })
    .from(guildsTable)
    .where(eq(guildsTable.isGhost, true));

  for (const guild of ghostGuilds) {
    // Get guild level for challenge generation
    const [scoreRow] = await db
      .select({ totalScore: sql<number>`cast(sum(${guildMembersTable.contributionPoints}) as float)` })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.guildId, guild.id));
    const guildLevel = computeGuildLevel(scoreRow?.totalScore ?? 0);

    // Ensure challenges exist for this week
    const existing = await db
      .select({ id: guildChallengesTable.id })
      .from(guildChallengesTable)
      .where(and(
        eq(guildChallengesTable.guildId, guild.id),
        eq(guildChallengesTable.weekStart, weekStart),
      ))
      .limit(1);

    if (existing.length === 0) {
      // Seed 3 challenges scaled to guild level
      const challengeTypes = ["kills", "boss_kills", "dungeons"];
      const baseTargets = [200, 10, 5];
      const scaleFactor = 1.4;
      for (let i = 0; i < challengeTypes.length; i++) {
        const target = Math.round(baseTargets[i] * Math.pow(scaleFactor, Math.max(0, guildLevel - 1)));
        await db.insert(guildChallengesTable).values({
          guildId: guild.id,
          weekStart,
          challengeType: challengeTypes[i],
          targetValue: target,
          rewardXpBonus: 500 * guildLevel,
        }).onConflictDoNothing().catch(() => {});
      }
    }

    // Sum ghost member kill/boss/dungeon stats from breakdown table
    const breakdowns = await db
      .select({
        combatKills: sql<number>`cast(sum(${guildContributionBreakdownTable.combatKills}) as int)`,
        bossKills: sql<number>`cast(sum(${guildContributionBreakdownTable.bossKills}) as int)`,
        dungeonClears: sql<number>`cast(sum(${guildContributionBreakdownTable.dungeonClears}) as int)`,
      })
      .from(guildContributionBreakdownTable)
      .where(and(
        eq(guildContributionBreakdownTable.guildId, guild.id),
        eq(guildContributionBreakdownTable.weekStart, weekStart),
        isNotNull(guildContributionBreakdownTable.ghostId),
      ));

    if (breakdowns.length === 0) continue;

    const kills = breakdowns[0]?.combatKills ?? 0;
    const bossKills = breakdowns[0]?.bossKills ?? 0;
    const dungeonClears = breakdowns[0]?.dungeonClears ?? 0;

    // Update challenge progress
    const challenges = await db
      .select()
      .from(guildChallengesTable)
      .where(and(
        eq(guildChallengesTable.guildId, guild.id),
        eq(guildChallengesTable.weekStart, weekStart),
        eq(guildChallengesTable.completed, false),
      ));

    for (const challenge of challenges) {
      let progress = 0;
      if (challenge.challengeType === "kills") progress = kills;
      else if (challenge.challengeType === "boss_kills") progress = bossKills;
      else if (challenge.challengeType === "dungeons") progress = dungeonClears;

      if (progress <= 0) continue;

      const newValue = Math.min(progress, challenge.targetValue);
      const completed = newValue >= challenge.targetValue;
      await db.update(guildChallengesTable)
        .set({ currentValue: newValue, completed, completedAt: completed ? new Date() : null })
        .where(eq(guildChallengesTable.id, challenge.id))
        .catch(() => {});
    }
  }
}
