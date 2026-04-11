import { db } from "@workspace/db";
import { dungeonRunsTable, inventoryTable, dungeonKillStatsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getItemById, ITEMS } from "./gameData.js";
import { getDungeonById } from "./dungeonData.js";
import { getOrCreateCharacter } from "../routes/character.js";
import { ADORNMENTS } from "./eq2Data.js";

/**
 * Upsert kill stats for a dungeon or raid.
 * Called from progressDungeonKill (per-kill) and the advance/phase-advance routes (completion).
 */
export async function upsertDungeonKillStats(opts: {
  characterId: number;
  dungeonOrRaidId: string;
  isRaid?: boolean;
  normalKills?: number;
  miniBossKills?: number;
  mainBossKills?: number;
  completed?: boolean;
}): Promise<void> {
  const { characterId, dungeonOrRaidId, isRaid = false,
    normalKills = 0, miniBossKills = 0, mainBossKills = 0, completed = false } = opts;

  const [existing] = await db.select().from(dungeonKillStatsTable)
    .where(and(
      eq(dungeonKillStatsTable.characterId, characterId),
      eq(dungeonKillStatsTable.dungeonOrRaidId, dungeonOrRaidId),
      eq(dungeonKillStatsTable.isRaid, isRaid),
    )).limit(1);

  if (existing) {
    const wasFirstClear = completed && existing.completions === 0;
    await db.update(dungeonKillStatsTable).set({
      normalKills: existing.normalKills + normalKills,
      miniBossKills: existing.miniBossKills + miniBossKills,
      mainBossKills: existing.mainBossKills + mainBossKills,
      completions: completed ? existing.completions + 1 : existing.completions,
      firstClearAt: wasFirstClear ? new Date() : existing.firstClearAt,
      updatedAt: new Date(),
    }).where(eq(dungeonKillStatsTable.id, existing.id));
  } else {
    await db.insert(dungeonKillStatsTable).values({
      characterId,
      dungeonOrRaidId,
      isRaid,
      normalKills,
      miniBossKills,
      mainBossKills,
      completions: completed ? 1 : 0,
      firstClearAt: completed ? new Date() : null,
      updatedAt: new Date(),
    });
  }
}

const RARITY_ORDER = ["common", "uncommon", "rare", "legendary", "fabled", "mythical"] as const;

const DIFFICULTY_RARITY_WEIGHTS: Record<string, number[]> = {
  normal:    [50, 35, 12, 3,  0,  0 ],
  expert:    [25, 40, 25, 8,  2,  0 ],
  legendary: [10, 25, 35, 20, 8,  2 ],
  mythical:  [5,  15, 30, 28, 15, 7 ],
};

function weightedRarityPick(difficulty: string): string {
  const weights = DIFFICULTY_RARITY_WEIGHTS[difficulty] ?? DIFFICULTY_RARITY_WEIGHTS.normal;
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_ORDER[i];
  }
  return "common";
}

/**
 * Generate 0–1 adornment drops for a floor.
 * Drop chance varies by floor type, eligible colors are gated by difficulty, and
 * the adornment pool is filtered to the dungeon's level range.
 */
function generateAdornmentLoot(
  difficulty: string,
  dungeonMinLevel: number,
  dungeonMaxLevel: number,
  floorType: "normal" | "miniboss" | "finalboss",
): string[] {
  const dropChance = floorType === "finalboss" ? 0.35 : floorType === "miniboss" ? 0.20 : 0.10;
  if (Math.random() > dropChance) return [];

  // Determine eligible colors by difficulty
  const eligibleColors = new Set<string>(["white"]);
  if (difficulty === "expert" || difficulty === "legendary" || difficulty === "mythical") {
    eligibleColors.add("yellow");
  }
  if (difficulty === "legendary" || difficulty === "mythical") {
    eligibleColors.add("red");
  }

  // Filter by eligible colors and dungeon level range
  let pool = ADORNMENTS.filter(
    a => eligibleColors.has(a.color) && a.level >= dungeonMinLevel && a.level <= dungeonMaxLevel,
  );
  // Fallback: relax level requirement if the dungeon range yields nothing
  if (pool.length === 0) {
    pool = ADORNMENTS.filter(a => eligibleColors.has(a.color));
  }
  if (pool.length === 0) return [];

  const picked = pool[Math.floor(Math.random() * pool.length)];
  return [picked.id];
}

/**
 * Generate 1–3 loot items.
 * Item level = playerLevel + floor - 1, clamped to the dungeon's defined level range
 * so that low-level dungeons (e.g. Blackburrow, minLevel 10–20) never drop items
 * scaled to a high-level character.
 * If no items at the clamped level exist, expand outward ±1, ±2, ±3 until a pool is found.
 *
 * floorType controls the adornment drop probability:
 *   "normal"   → ~10%   "miniboss" → ~20%   "finalboss" → ~35%
 */
export function generateDungeonLoot(
  playerLevel: number,
  floorNumber: number,
  difficulty: string,
  dungeonMinLevel: number,
  dungeonMaxLevel: number,
  floorType: "normal" | "miniboss" | "finalboss" = "normal",
): string[] {
  const rawTarget = playerLevel + floorNumber - 1;
  // Cap at dungeon max so high-level players don't receive over-levelled gear
  const targetLevel = Math.min(rawTarget, dungeonMaxLevel + floorNumber - 1);
  // Floor at dungeon min so low-level players still get appropriate loot
  const clampedLevel = Math.max(targetLevel, dungeonMinLevel);

  const nonConsumable = ITEMS.filter(item =>
    item.type !== "material" &&
    item.type !== "consumable" &&
    item.type !== "quest",
  );

  // Find items at or near the clamped target level (expanding outward)
  let pool = nonConsumable.filter(item => item.level === clampedLevel);
  for (let delta = 1; delta <= 5 && pool.length === 0; delta++) {
    pool = nonConsumable.filter(item => Math.abs(item.level - clampedLevel) <= delta);
  }
  if (pool.length === 0) pool = nonConsumable; // ultimate fallback

  const diffWeights: Record<string, number> = { normal: 1.0, expert: 1.5, legendary: 2.0, mythical: 3.0 };
  const diffMult = diffWeights[difficulty] ?? 1.0;
  const itemCount = Math.min(3, Math.max(1, Math.round(1 + (diffMult - 1) * 0.5 + Math.random() * 1.5)));

  const loot: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const targetRarity = weightedRarityPick(difficulty);
    const rarityItems = pool.filter(item => item.rarity === targetRarity);
    const finalPool = rarityItems.length > 0 ? rarityItems : pool;
    const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
    loot.push(picked.id);
  }

  // Append adornment drops (chance varies by floor type)
  const adornmentLoot = generateAdornmentLoot(difficulty, dungeonMinLevel, dungeonMaxLevel, floorType);
  return [...loot, ...adornmentLoot];
}

export async function awardItemsToInventory(itemIds: string[], characterId: number): Promise<void> {
  for (const itemId of itemIds) {
    const item = getItemById(itemId);

    // Adornments are not in ITEMS — insert with minimal itemData so the adornments
    // route (which looks up by itemId) can find them correctly.
    if (!item) {
      if (ADORNMENTS.some(a => a.id === itemId)) {
        await db.insert(inventoryTable).values({
          characterId,
          itemId,
          itemData: { type: "adornment", id: itemId } as unknown as Record<string, unknown>,
          quantity: 1,
        });
      }
      continue;
    }

    if (item.stackable) {
      const [existing] = await db.select().from(inventoryTable)
        .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
        .limit(1);
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: existing.quantity + 1 })
          .where(eq(inventoryTable.id, existing.id));
        continue;
      }
    }

    await db.insert(inventoryTable).values({
      characterId,
      itemId,
      itemData: item as unknown as Record<string, unknown>,
      quantity: 1,
    });
  }
}

/**
 * Called from combat.ts when an enemy dies in combat.
 * ONLY tracks the kill — does NOT advance floors (use /run/advance for that).
 *
 * Finds the active dungeon run for the character dynamically — supports all dungeons.
 * Deduplication: enemy must still be present in run.currentFloorEnemies (remaining set).
 * Once removed from the remaining set, subsequent kills of the same ID are ignored.
 *
 * Returns null if no active run, enemy already killed, or enemy not part of this dungeon.
 */
export async function progressDungeonKill(enemyId: string, characterId: number): Promise<{
  floorClear: boolean;
  completed: boolean;
  abandoned: boolean;
  floorKills: number;
  normalKills: number;
  miniBossDefeated: boolean;
  mainBossDefeated: boolean;
  lootAwarded: string[];
} | null> {
  const character = await getOrCreateCharacter(characterId);

  // Find any active run for this character (generic — not hardcoded to blackburrow)
  const [run] = await db.select().from(dungeonRunsTable).where(
    and(
      eq(dungeonRunsTable.characterId, character.id),
      eq(dungeonRunsTable.status, "active"),
    )
  ).limit(1);

  if (!run) return null;

  const dungeon = getDungeonById(run.dungeonId);
  if (!dungeon) return null;

  const currentFloorDef = dungeon.floors.find(f => f.floorNumber === run.currentFloor);
  if (!currentFloorDef) return null;

  // Guard: enemy must belong to this dungeon's definition across all floors
  const allDungeonEnemyIds = new Set<string>([dungeon.mainBossId]);
  for (const floor of dungeon.floors) {
    for (const id of floor.enemyIds) allDungeonEnemyIds.add(id);
    if (floor.miniBossId) allDungeonEnemyIds.add(floor.miniBossId);
  }
  if (!allDungeonEnemyIds.has(enemyId)) return null;

  // Guard: enemy must still be in the floor's remaining set (deduplication)
  const remaining = ((run.currentFloorEnemies as string[]) ?? []);
  if (!remaining.includes(enemyId)) return null;

  const isMainBoss = enemyId === dungeon.mainBossId;
  const isMiniBoss = enemyId === currentFloorDef.miniBossId;
  const isNormal = currentFloorDef.enemyIds.includes(enemyId);

  if (!isMainBoss && !isMiniBoss && !isNormal) return null;

  // Remove exactly ONE occurrence from the remaining set.
  // Using indexOf + splice ensures repeated enemy IDs (e.g. multiple skeletons on a floor)
  // each count as separate kills rather than being removed all at once.
  const newRemaining = [...remaining];
  const killIdx = newRemaining.indexOf(enemyId);
  if (killIdx !== -1) newRemaining.splice(killIdx, 1);

  // ── Main boss kill ─────────────────────────────────────────────────────────
  if (isMainBoss) {
    await db.update(dungeonRunsTable)
      .set({ mainBossDefeated: true, currentFloorEnemies: newRemaining })
      .where(eq(dungeonRunsTable.id, run.id));
    await upsertDungeonKillStats({
      characterId: character.id,
      dungeonOrRaidId: run.dungeonId,
      isRaid: false,
      mainBossKills: 1,
    });
    const floorClear = run.normalKills >= currentFloorDef.normalsRequired && run.miniBossDefeated;
    return {
      floorClear,
      completed: false,
      abandoned: false,
      floorKills: run.normalKills,
      normalKills: run.normalKills,
      miniBossDefeated: run.miniBossDefeated,
      mainBossDefeated: true,
      lootAwarded: [],
    };
  }

  // ── Mini-boss kill ─────────────────────────────────────────────────────────
  if (isMiniBoss) {
    const floorClear = run.normalKills >= currentFloorDef.normalsRequired;
    await db.update(dungeonRunsTable)
      .set({ miniBossDefeated: true, currentFloorEnemies: newRemaining })
      .where(eq(dungeonRunsTable.id, run.id));
    await upsertDungeonKillStats({
      characterId: character.id,
      dungeonOrRaidId: run.dungeonId,
      isRaid: false,
      miniBossKills: 1,
    });
    return {
      floorClear,
      completed: false,
      abandoned: false,
      floorKills: run.normalKills,
      normalKills: run.normalKills,
      miniBossDefeated: true,
      mainBossDefeated: run.mainBossDefeated,
      lootAwarded: [],
    };
  }

  // ── Normal kill ────────────────────────────────────────────────────────────
  const newNormalKills = run.normalKills + 1;
  const floorClear = newNormalKills >= currentFloorDef.normalsRequired && run.miniBossDefeated;

  await db.update(dungeonRunsTable)
    .set({ normalKills: newNormalKills, floorKills: newNormalKills, currentFloorEnemies: newRemaining })
    .where(eq(dungeonRunsTable.id, run.id));

  await upsertDungeonKillStats({
    characterId: character.id,
    dungeonOrRaidId: run.dungeonId,
    isRaid: false,
    normalKills: 1,
  });

  return {
    floorClear,
    completed: false,
    abandoned: false,
    floorKills: newNormalKills,
    normalKills: newNormalKills,
    miniBossDefeated: run.miniBossDefeated,
    mainBossDefeated: run.mainBossDefeated,
    lootAwarded: [],
  };
}
