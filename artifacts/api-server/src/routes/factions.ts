import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { factionsTable } from "@workspace/db/schema";
import { FACTIONS } from "../lib/eq2Data.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function getStandingTitle(standing: number): string {
  if (standing <= -2000) return "Hated";
  if (standing <= -1000) return "Threatening";
  if (standing <= -500) return "Apprehensive";
  if (standing <= -100) return "Dubious";
  if (standing < 100) return "Indifferent";
  if (standing < 500) return "Amiable";
  if (standing < 1000) return "Kindly";
  if (standing < 2000) return "Warmly";
  return "Ally";
}

router.get("/factions", async (req, res) => {
  try {
    const characterId = req.characterId;
    const dbFactions = await db.select().from(factionsTable).where(eq(factionsTable.characterId, characterId));
    const standingMap = new Map(dbFactions.map(f => [f.factionId, f.standing]));

    for (const faction of FACTIONS) {
      if (!standingMap.has(faction.id)) {
        await db.insert(factionsTable).values({ characterId, factionId: faction.id, standing: 0 });
        standingMap.set(faction.id, 0);
      }
    }

    const result = FACTIONS.map(faction => {
      const standing = standingMap.get(faction.id) ?? 0;
      return {
        id: faction.id, name: faction.name, description: faction.description,
        standing, standingTitle: getStandingTitle(standing),
        perks: faction.perks, zone: faction.zone, spriteId: faction.spriteId,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting factions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
