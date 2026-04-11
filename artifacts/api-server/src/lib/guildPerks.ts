/**
 * Guild Perk System
 *
 * Guild level is derived dynamically from the guild's total contribution score.
 * Each level unlocks an additive bonus that stacks with AA bonuses.
 *
 * Level thresholds (total score):
 *   1 →      0   (no perks)
 *   2 →  5,000   +5% combat XP
 *   3 → 15,000   +10% gold from kills
 *   4 → 30,000   +5% gathering speed
 *   5 → 60,000   +10% craft yield
 */

import { db } from "@workspace/db";
import { guildMembersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const GUILD_LEVEL_THRESHOLDS: readonly number[] = [0, 5_000, 15_000, 30_000, 60_000];

export const GUILD_PERK_DESCRIPTIONS: ReadonlyArray<{ level: number; label: string }> = [
  { level: 2, label: "+5% combat XP" },
  { level: 3, label: "+10% gold from kills" },
  { level: 4, label: "+5% gathering speed" },
  { level: 5, label: "+10% craft yield" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuildPerks {
  guildLevel: number;
  /** Additive % bonus to combat XP */
  xpBonus: number;
  /** Additive % bonus to gold from kills */
  goldBonus: number;
  /** Additive % bonus to gathering speed */
  gatheringSpeedBonus: number;
  /** Additive % bonus to craft yield */
  craftYieldBonus: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeGuildLevel(totalScore: number): number {
  let level = 1;
  for (let i = 1; i < GUILD_LEVEL_THRESHOLDS.length; i++) {
    if (totalScore >= GUILD_LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function guildLevelPerks(level: number): Omit<GuildPerks, "guildLevel"> {
  return {
    xpBonus:             level >= 2 ? 5  : 0,
    goldBonus:           level >= 3 ? 10 : 0,
    gatheringSpeedBonus: level >= 4 ? 5  : 0,
    craftYieldBonus:     level >= 5 ? 10 : 0,
  };
}

export function makeZeroGuildPerks(): GuildPerks {
  return { guildLevel: 0, xpBonus: 0, goldBonus: 0, gatheringSpeedBonus: 0, craftYieldBonus: 0 };
}

// ─── DB lookup ────────────────────────────────────────────────────────────────

/**
 * Returns the guild perks for a character based on their guild's live total
 * contribution score. Returns zero perks if the character is not in a guild.
 */
export async function getGuildPerksForCharacter(characterId: number): Promise<GuildPerks> {
  const [membership] = await db
    .select({ guildId: guildMembersTable.guildId })
    .from(guildMembersTable)
    .where(eq(guildMembersTable.characterId, characterId))
    .limit(1);

  if (!membership) return makeZeroGuildPerks();

  const [agg] = await db
    .select({
      totalScore: sql<number>`cast(coalesce(sum(${guildMembersTable.contributionPoints}), 0) as float)`,
    })
    .from(guildMembersTable)
    .where(eq(guildMembersTable.guildId, membership.guildId));

  const totalScore = agg?.totalScore ?? 0;
  const level = computeGuildLevel(totalScore);
  return { guildLevel: level, ...guildLevelPerks(level) };
}
