/**
 * Guild Perk System
 *
 * Guild level is derived dynamically from the guild's total contribution score.
 * Each level unlocks an additive bonus that stacks with AA bonuses.
 *
 * Level thresholds (total score):
 *   1  →       0   (no perks)
 *   2  →   5,000   +5% combat XP
 *   3  →  15,000   +10% gold from kills
 *   4  →  30,000   +5% gathering speed
 *   5  →  60,000   +10% craft yield
 *   6  → 100,000   +5% dungeon XP
 *   7  → 150,000   +3% raid drop chance
 *   8  → 220,000   bank tier 2 (higher withdrawal limits)
 *   9  → 320,000   +5% AA XP gain
 *  10  → 450,000   +5 max member cap
 *  11  → 600,000   +10% all XP (combat + AA stacked)
 *  12  → 800,000   +15% gold / +10% gathering
 */

import { db } from "@workspace/db";
import { guildMembersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const GUILD_LEVEL_THRESHOLDS: readonly number[] = [
  0,        // Level 1 — baseline
  5_000,    // Level 2
  15_000,   // Level 3
  30_000,   // Level 4
  60_000,   // Level 5
  100_000,  // Level 6
  150_000,  // Level 7
  220_000,  // Level 8
  320_000,  // Level 9
  450_000,  // Level 10
  600_000,  // Level 11
  800_000,  // Level 12
];

export const GUILD_PERK_DESCRIPTIONS: ReadonlyArray<{ level: number; label: string; icon: string }> = [
  { level: 2,  label: "+5% combat XP",                icon: "⚔️"  },
  { level: 3,  label: "+10% gold from kills",          icon: "💰"  },
  { level: 4,  label: "+5% gathering speed",           icon: "⛏️"  },
  { level: 5,  label: "+10% craft yield",              icon: "🔨"  },
  { level: 6,  label: "+5% dungeon XP",                icon: "🏰"  },
  { level: 7,  label: "+3% raid drop chance",          icon: "🐉"  },
  { level: 8,  label: "Bank Tier 2 (2× withdraw cap)", icon: "🏦"  },
  { level: 9,  label: "+5% AA XP gain",                icon: "✨"  },
  { level: 10, label: "+5 max member cap",             icon: "👥"  },
  { level: 11, label: "+10% all XP (combat + AA)",     icon: "🌟"  },
  { level: 12, label: "+15% gold / +10% gathering",    icon: "👑"  },
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
  /** Additive % bonus to dungeon XP */
  dungeonXpBonus: number;
  /** Additive % bonus to raid drop chance */
  raidDropBonus: number;
  /** Bank tier (1 = base, 2 = higher limits) */
  bankCapacityTier: number;
  /** Additive % bonus to AA XP gain */
  aaXpBonus: number;
  /** Bonus to max member cap */
  memberCapBonus: number;
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
  // All bonuses stack cumulatively with higher levels
  return {
    xpBonus:             level >= 2  ? (level >= 11 ? 15 : 5)   : 0,   // 5% at 2, stacks to 15% at 11
    goldBonus:           level >= 3  ? (level >= 12 ? 25 : level >= 3 ? 10 : 0) : 0,  // 10% at 3, 25% at 12
    gatheringSpeedBonus: level >= 4  ? (level >= 12 ? 15 : 5)   : 0,   // 5% at 4, 15% at 12
    craftYieldBonus:     level >= 5  ? 10                         : 0,
    dungeonXpBonus:      level >= 6  ? 5                          : 0,
    raidDropBonus:       level >= 7  ? 3                          : 0,
    bankCapacityTier:    level >= 8  ? 2                          : 1,
    aaXpBonus:           level >= 9  ? 5                          : 0,
    memberCapBonus:      level >= 10 ? 5                          : 0,
  };
}

export function makeZeroGuildPerks(): GuildPerks {
  return {
    guildLevel: 0,
    xpBonus: 0,
    goldBonus: 0,
    gatheringSpeedBonus: 0,
    craftYieldBonus: 0,
    dungeonXpBonus: 0,
    raidDropBonus: 0,
    bankCapacityTier: 1,
    aaXpBonus: 0,
    memberCapBonus: 0,
  };
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
