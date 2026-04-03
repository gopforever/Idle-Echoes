import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { skillsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { INITIAL_SKILLS, xpForLevel } from "../lib/gameData.js";

const router: IRouter = Router();

export async function getOrCreateSkills(characterId: number) {
  const existing = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
  const existingIds = new Set(existing.map(s => s.skillId));

  const missing = INITIAL_SKILLS.filter(s => !existingIds.has(s.skillId));
  if (missing.length > 0) {
    const inserted = await db.insert(skillsTable).values(
      missing.map(s => ({
        characterId,
        skillId: s.skillId,
        name: s.name,
        description: s.description,
        category: s.category,
        level: 1,
        xp: 0,
        xpToNextLevel: xpForLevel(1),
        isTraining: false,
        trainingAction: null,
        xpPerHour: s.xpPerHour,
        icon: s.icon,
        maxLevel: 100,
      }))
    ).onConflictDoNothing().returning();
    return [...existing, ...inserted];
  }

  return existing;
}

function formatSkill(skill: typeof skillsTable.$inferSelect) {
  return {
    id: skill.skillId,
    name: skill.name,
    description: skill.description,
    category: skill.category as "combat" | "gathering" | "crafting" | "support",
    level: skill.level,
    xp: skill.xp,
    xpToNextLevel: skill.xpToNextLevel,
    isTraining: skill.isTraining,
    trainingAction: skill.trainingAction || undefined,
    xpPerHour: skill.xpPerHour,
    icon: skill.icon,
    maxLevel: skill.maxLevel,
  };
}

async function processIdleXp(characterId: number) {
  const skills = await db.select().from(skillsTable).where(
    and(eq(skillsTable.characterId, characterId), eq(skillsTable.isTraining, true))
  );
  
  for (const skill of skills) {
    if (skill.xpPerHour <= 0) continue;
    
    const timeSinceUpdate = (Date.now() - skill.updatedAt.getTime()) / 1000;
    const xpGain = (skill.xpPerHour / 3600) * timeSinceUpdate;
    
    let newXp = skill.xp + xpGain;
    let newLevel = skill.level;
    let newXpToNext = skill.xpToNextLevel;
    
    while (newXp >= newXpToNext && newLevel < skill.maxLevel) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = xpForLevel(newLevel);
    }
    
    await db.update(skillsTable)
      .set({ xp: newXp, level: newLevel, xpToNextLevel: newXpToNext, updatedAt: new Date() })
      .where(eq(skillsTable.id, skill.id));
  }
}

router.get("/skills", async (req, res) => {
  try {
    const characterId = req.characterId;
    await processIdleXp(characterId);
    const skills = await getOrCreateSkills(characterId);
    return res.json(skills.map(formatSkill));
  } catch (err) {
    req.log.error({ err }, "Error getting skills");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/skills/:skillId/toggle", async (req, res) => {
  try {
    const characterId = req.characterId;
    await processIdleXp(characterId);
    const { skillId } = req.params;
    
    const [skill] = await db.select().from(skillsTable).where(
      and(eq(skillsTable.characterId, characterId), eq(skillsTable.skillId, skillId))
    );
    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const [updated] = await db.update(skillsTable)
      .set({ isTraining: !skill.isTraining, updatedAt: new Date() })
      .where(and(eq(skillsTable.characterId, characterId), eq(skillsTable.skillId, skillId)))
      .returning();

    return res.json(formatSkill(updated));
  } catch (err) {
    req.log.error({ err }, "Error toggling skill training");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/skills/summary", async (req, res) => {
  try {
    const characterId = req.characterId;
    await processIdleXp(characterId);
    const skills = await getOrCreateSkills(characterId);
    const formatted = skills.map(formatSkill);
    
    const totalLevel = formatted.reduce((sum, s) => sum + s.level, 0);
    const totalXp = formatted.reduce((sum, s) => sum + s.xp, 0);
    const activeTrainingCount = formatted.filter(s => s.isTraining).length;
    const highestSkill = formatted.reduce((best, s) => s.level > best.level ? s : best, formatted[0]);

    const skillsByCategory: Record<string, typeof formatted> = {};
    for (const skill of formatted) {
      if (!skillsByCategory[skill.category]) {
        skillsByCategory[skill.category] = [];
      }
      skillsByCategory[skill.category].push(skill);
    }

    return res.json({ totalLevel, totalXp, activeTrainingCount, highestSkill, skillsByCategory });
  } catch (err) {
    req.log.error({ err }, "Error getting skills summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
