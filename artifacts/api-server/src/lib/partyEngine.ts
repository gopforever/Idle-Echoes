/**
 * Ghost Party Combat Engine
 * Handles ghost combat contributions based on archetype:
 * - Fighter: aggro reduction (player takes ~30% less damage)
 * - Priest: heals player per tick
 * - Scout/Mage: bonus damage proportional to level vs enemy level
 *
 * Ghosts take a share of incoming enemy damage.
 * At 0 HP they become "downed" and stop contributing.
 * On floor advance, downed ghosts revive at 50% HP.
 */

import { db } from "@workspace/db";
import { worldPlayersTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { PartyMember } from "@workspace/db/schema";

export { PartyMember };

export interface GhostInfo {
  id: number;
  name: string;
  class: string;
  archetype: string;
  level: number;
  race: string;
}

export interface CombatContribution {
  damageReduction: number;
  healingAmount: number;
  bonusDamage: number;
  ghostsActive: number;
}

const BASE_GHOST_HP = 200;
const HP_PER_LEVEL = 30;

export function ghostMaxHp(level: number): number {
  return BASE_GHOST_HP + level * HP_PER_LEVEL;
}

export function initPartyMember(ghostId: number, level: number): PartyMember {
  const maxHp = ghostMaxHp(level);
  return {
    ghostId,
    hp: maxHp,
    maxHp,
    status: "active",
    damageDone: 0,
    healingDone: 0,
    saveCount: 0,
  };
}

/**
 * Calculate combined party combat contributions for a single combat tick.
 * Returns damage reduction factor, heal amount, and bonus damage.
 */
export function calculateContributions(
  party: PartyMember[],
  ghosts: GhostInfo[],
  enemyLevel: number,
): CombatContribution {
  const living = party.filter(m => m.status !== "downed");
  let damageReduction = 0;
  let healingAmount = 0;
  let bonusDamage = 0;

  for (const member of living) {
    const ghost = ghosts.find(g => g.id === member.ghostId);
    if (!ghost) continue;

    const archetype = ghost.archetype.toLowerCase();
    const levelRatio = Math.min(2.0, ghost.level / Math.max(1, enemyLevel));

    if (archetype === "fighter") {
      damageReduction += 0.12;
    } else if (archetype === "priest") {
      const healPerTick = Math.round(5 + ghost.level * 1.5);
      healingAmount += healPerTick;
    } else if (archetype === "scout" || archetype === "mage") {
      const baseDmg = Math.round(ghost.level * 8 * levelRatio);
      bonusDamage += baseDmg;
    }
  }

  damageReduction = Math.min(0.30, damageReduction);

  return {
    damageReduction,
    healingAmount,
    bonusDamage,
    ghostsActive: living.length,
  };
}

/**
 * Apply incoming damage to party members. Fighters take more, scouts/mages take less.
 * Returns updated party state.
 */
export function applyPartyDamage(
  party: PartyMember[],
  ghosts: GhostInfo[],
  enemyDamage: number,
): { updatedParty: PartyMember[]; playerWasSaved: boolean } {
  if (party.length === 0) return { updatedParty: party, playerWasSaved: false };

  const living = party.filter(m => m.status !== "downed");
  if (living.length === 0) return { updatedParty: party, playerWasSaved: false };

  const damageSharePerGhost = Math.round(enemyDamage * 0.1 / living.length);

  let playerWasSaved = false;
  const updated = party.map(member => {
    if (member.status === "downed") return member;

    const ghost = ghosts.find(g => g.id === member.ghostId);
    const archetype = ghost?.archetype.toLowerCase() ?? "scout";

    let dmgMult = 1.0;
    if (archetype === "fighter") dmgMult = 1.5;
    else if (archetype === "priest") dmgMult = 0.8;

    const dmg = Math.round(damageSharePerGhost * dmgMult);
    const newHp = Math.max(0, member.hp - dmg);
    const wasSaved = member.hp > 0 && newHp === 0;
    if (wasSaved) playerWasSaved = true;

    return {
      ...member,
      hp: newHp,
      status: (newHp <= 0 ? "downed" : member.status) as PartyMember["status"],
      damageDone: member.damageDone,
      healingDone: member.healingDone,
      saveCount: member.saveCount + (wasSaved ? 1 : 0),
    };
  });

  return { updatedParty: updated, playerWasSaved };
}

/**
 * Update ghost contribution stats in party state.
 */
export function updateGhostStats(
  party: PartyMember[],
  contributions: {
    ghostId: number;
    damageDone?: number;
    healingDone?: number;
  }[],
): PartyMember[] {
  return party.map(member => {
    const contrib = contributions.find(c => c.ghostId === member.ghostId);
    if (!contrib) return member;
    return {
      ...member,
      damageDone: member.damageDone + (contrib.damageDone ?? 0),
      healingDone: member.healingDone + (contrib.healingDone ?? 0),
    };
  });
}

/**
 * Revive all downed ghosts at 50% HP on floor advance.
 */
export function revivePartyOnFloorAdvance(party: PartyMember[]): PartyMember[] {
  return party.map(member => {
    if (member.status === "downed") {
      return {
        ...member,
        hp: Math.round(member.maxHp * 0.5),
        status: "revived" as const,
      };
    }
    return member;
  });
}

/**
 * Fetch ghost info for a list of IDs from world_players.
 */
export async function fetchGhostInfo(ghostIds: number[]): Promise<GhostInfo[]> {
  if (ghostIds.length === 0) return [];
  const rows = await db
    .select({
      id: worldPlayersTable.id,
      name: worldPlayersTable.name,
      class: worldPlayersTable.class,
      archetype: worldPlayersTable.archetype,
      level: worldPlayersTable.level,
      race: worldPlayersTable.race,
    })
    .from(worldPlayersTable)
    .where(inArray(worldPlayersTable.id, ghostIds));
  return rows;
}

/**
 * Award XP/gold to ghosts for their dungeon/raid contributions.
 */
export async function awardGhostContributions(party: PartyMember[]): Promise<void> {
  for (const member of party) {
    const xpBonus = Math.round(member.damageDone * 0.1 + member.healingDone * 0.05 + member.saveCount * 50);
    const goldBonus = Math.round(member.damageDone * 0.02 + member.saveCount * 10);
    if (xpBonus === 0 && goldBonus === 0) continue;

    const [ghost] = await db
      .select({ xp: worldPlayersTable.xp, gold: worldPlayersTable.gold, killCount: worldPlayersTable.killCount })
      .from(worldPlayersTable)
      .where(eq(worldPlayersTable.id, member.ghostId))
      .limit(1);

    if (!ghost) continue;

    await db.update(worldPlayersTable).set({
      xp: ghost.xp + xpBonus,
      gold: ghost.gold + goldBonus,
      killCount: ghost.killCount + (member.damageDone > 0 ? 1 : 0),
    }).where(eq(worldPlayersTable.id, member.ghostId));
  }
}
