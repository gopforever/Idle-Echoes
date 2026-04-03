import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bestiaryTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { ENEMIES } from "../lib/gameData.js";
import { getOrCreateCharacter } from "./character.js";

const router: IRouter = Router();

const LORE_KILL_THRESHOLD = 10;

// ─── GET /bestiary ────────────────────────────────────────────────────────────
router.get("/bestiary", async (req, res) => {
  const characterId: number = req.characterId;
  const character = await getOrCreateCharacter(characterId);

  const entries = await db
    .select()
    .from(bestiaryTable)
    .where(eq(bestiaryTable.characterId, character.id));

  const entryMap = new Map(entries.map((e) => [e.enemyId, e]));

  const result = entries.map((e) => {
    const enemy = ENEMIES.find((en) => en.id === e.enemyId);
    return {
      enemyId: e.enemyId,
      name: enemy?.name ?? e.enemyId,
      level: enemy?.level ?? 0,
      zone: enemy?.zone ?? "",
      type: enemy?.type ?? "humanoid",
      killCount: e.killCount,
      firstKillAt: e.firstKillAt,
      lastKillAt: e.lastKillAt,
      loreUnlocked: e.loreUnlocked,
    };
  });

  return res.json({
    entries: result,
    totalDiscovered: entryMap.size,
    totalEnemies: ENEMIES.length,
  });
});

// ─── GET /bestiary/:enemyId ───────────────────────────────────────────────────
router.get("/bestiary/:enemyId", async (req, res) => {
  const characterId: number = req.characterId;
  const { enemyId } = req.params;
  const character = await getOrCreateCharacter(characterId);

  const enemy = ENEMIES.find((e) => e.id === enemyId);
  if (!enemy) {
    return res.status(404).json({ error: "Enemy not found" });
  }

  const [entry] = await db
    .select()
    .from(bestiaryTable)
    .where(
      and(
        eq(bestiaryTable.characterId, character.id),
        eq(bestiaryTable.enemyId, enemyId),
      ),
    )
    .limit(1);

  const loreUnlocked = entry?.loreUnlocked ?? false;

  return res.json({
    enemyId: enemy.id,
    name: enemy.name,
    level: enemy.level,
    zone: enemy.zone,
    killCount: entry?.killCount ?? 0,
    firstKillAt: entry?.firstKillAt ?? null,
    lastKillAt: entry?.lastKillAt ?? null,
    loreUnlocked,
    description: loreUnlocked ? enemy.description : null,
    abilities: loreUnlocked ? enemy.abilities : null,
    resistances: loreUnlocked ? enemy.resistances : null,
    lootTable: loreUnlocked ? enemy.lootTable : null,
  });
});

// ─── POST /bestiary/:enemyId/kill ─────────────────────────────────────────────
router.post("/bestiary/:enemyId/kill", async (req, res) => {
  const characterId: number = req.characterId;
  const { enemyId } = req.params;
  const character = await getOrCreateCharacter(characterId);

  const entry = await recordBestiaryKill(character.id, enemyId);
  return res.json(entry);
});

export default router;

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Upsert a bestiary entry for the given character + enemy.
 * Used both as a fire-and-forget helper called from combat.ts on enemy death
 * and as the implementation backing the POST /bestiary/:enemyId/kill endpoint.
 */
export async function recordBestiaryKill(
  characterId: number,
  enemyId: string,
): Promise<{ enemyId: string; killCount: number; loreUnlocked: boolean; newlyUnlocked: boolean }> {
  const now = new Date();

  const [existing] = await db
    .select()
    .from(bestiaryTable)
    .where(
      and(
        eq(bestiaryTable.characterId, characterId),
        eq(bestiaryTable.enemyId, enemyId),
      ),
    )
    .limit(1);

  let killCount: number;
  let loreUnlocked: boolean;
  let newlyUnlocked = false;

  if (existing) {
    killCount = existing.killCount + 1;
    loreUnlocked = existing.loreUnlocked || killCount >= LORE_KILL_THRESHOLD;
    newlyUnlocked = !existing.loreUnlocked && loreUnlocked;

    await db
      .update(bestiaryTable)
      .set({ killCount, lastKillAt: now, loreUnlocked })
      .where(eq(bestiaryTable.id, existing.id));
  } else {
    killCount = 1;
    loreUnlocked = killCount >= LORE_KILL_THRESHOLD;
    newlyUnlocked = loreUnlocked;

    await db.insert(bestiaryTable).values({
      characterId,
      enemyId,
      killCount,
      firstKillAt: now,
      lastKillAt: now,
      loreUnlocked,
    });
  }

  return { enemyId, killCount, loreUnlocked, newlyUnlocked };
}
