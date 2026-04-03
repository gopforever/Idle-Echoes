import { db } from "@workspace/db";
import { skillsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { xpForLevel } from "./gameData.js";

export async function applySkillXp(skillId: string, xpAmount: number, characterId: number): Promise<void> {
  const [skill] = await db.select().from(skillsTable).where(
    and(eq(skillsTable.skillId, skillId), eq(skillsTable.characterId, characterId))
  );
  if (!skill) return;
  let newXp = skill.xp + xpAmount;
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
