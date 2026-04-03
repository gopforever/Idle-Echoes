import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable } from "@workspace/db/schema";
import { ZONES } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { ENEMIES } from "../lib/gameData.js";
import { DUNGEONS } from "../lib/dungeonData.js";
import { eq } from "drizzle-orm";
import { progressExploreObjectives } from "../lib/questProgress.js";

const router: IRouter = Router();

// Pre-compute the set of dungeon-exclusive enemy IDs so they are excluded from zone counts
const DUNGEON_ENEMY_IDS = new Set<string>();
for (const dungeon of DUNGEONS) {
  DUNGEON_ENEMY_IDS.add(dungeon.mainBossId);
  for (const floor of dungeon.floors) {
    for (const id of floor.enemyIds) DUNGEON_ENEMY_IDS.add(id);
    if (floor.miniBossId) DUNGEON_ENEMY_IDS.add(floor.miniBossId);
  }
}

router.get("/zones", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    const zones = ZONES.map(zone => {
      const outdoorEnemies = ENEMIES.filter(e =>
        !DUNGEON_ENEMY_IDS.has(e.id) &&
        (e.zone.toLowerCase().replace(/\s/g, "_") === zone.id || e.zone === zone.name),
      );
      return {
        id: zone.id, name: zone.name, description: zone.description, lore: zone.lore,
        minLevel: zone.minLevel, maxLevel: zone.maxLevel, continent: zone.continent,
        factionId: zone.factionId ?? null, spriteId: zone.spriteId,
        unlocked: character.level >= zone.minLevel,
        enemyCount: outdoorEnemies.length || zone.enemyCount,
        bossCount: outdoorEnemies.filter(e => e.isBoss).length || zone.bossCount,
      };
    });

    return res.json(zones);
  } catch (err) {
    req.log.error({ err }, "Error getting zones");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/zones/:zoneId/travel", async (req, res) => {
  try {
    const { zoneId } = req.params;
    const character = await getOrCreateCharacter(req.characterId);
    const zone = ZONES.find(z => z.id === zoneId);

    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    if (character.level < zone.minLevel) {
      return res.json({ success: false, message: `You must be level ${zone.minLevel} to enter ${zone.name}` });
    }

    await db.update(charactersTable).set({ zone: zone.name, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    // Advance any "explore zone" quest objectives (fire-and-forget)
    progressExploreObjectives(zone.name).catch(() => {});

    return res.json({ success: true, message: `You have traveled to ${zone.name}!`, newZone: zone.name });
  } catch (err) {
    req.log.error({ err }, "Error traveling to zone");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
