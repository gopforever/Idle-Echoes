import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { skillsTable, inventoryTable, combatStateTable, achievementsTable } from "@workspace/db/schema";
import { getOrCreateCharacter, formatCharacter } from "./character.js";

const router: IRouter = Router();

router.get("/game/summary", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const characterId = req.characterId;
    const skills = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
    const inventory = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
    const [combatState] = await db.select().from(combatStateTable).where(eq(combatStateTable.characterId, characterId)).limit(1);
    const achievements = await db.select().from(achievementsTable).where(eq(achievementsTable.characterId, characterId));

    const totalSkillLevels = skills.reduce((sum, s) => sum + s.level, 0);
    const achievementsCompleted = achievements.filter(a => a.completed).length;

    return res.json({
      character: formatCharacter(character),
      totalSkillLevels,
      killCount: character.killCount,
      goldEarned: character.gold,
      itemsFound: inventory.length,
      currentZone: character.zone,
      combatActive: combatState?.active || false,
      activeSkillTraining: skills.filter(s => s.isTraining).length,
      achievementsCompleted,
      factionsPositive: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting game summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
