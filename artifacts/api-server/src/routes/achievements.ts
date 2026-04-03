import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { achievementsTable, charactersTable, skillsTable, factionsTable, mountsTable, collectionsTable, dungeonKillStatsTable } from "@workspace/db/schema";
import { ACHIEVEMENTS, COLLECTIONS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

export async function checkAndUnlockAchievements(characterId: number): Promise<typeof ACHIEVEMENTS[0][]> {
  const character = await getOrCreateCharacter(characterId);
  const existingAchievements = await db.select().from(achievementsTable).where(eq(achievementsTable.characterId, characterId));
  const completedIds = new Set(existingAchievements.filter(a => a.completed).map(a => a.achievementId));
  const progressMap = new Map(existingAchievements.map(a => [a.achievementId, a]));

  const skills = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
  const maxedSkills = skills.filter(s => s.level >= 100).length;

  const [factions, mounts, collectionRows, dungeonKillRows] = await Promise.all([
    db.select().from(factionsTable).where(eq(factionsTable.characterId, characterId)),
    db.select().from(mountsTable).where(eq(mountsTable.characterId, characterId)),
    db.select().from(collectionsTable).where(eq(collectionsTable.characterId, characterId)),
    db.select().from(dungeonKillStatsTable).where(eq(dungeonKillStatsTable.characterId, character.id)),
  ]);

  const collectedPieces = new Set(collectionRows.map(c => `${c.collectionId}:${c.pieceId}`));
  const collectionsCompleted = COLLECTIONS.filter(col =>
    col.pieces.every(p => collectedPieces.has(`${col.id}:${p.id}`))
  ).length;

  const amiableFactions = factions.filter(f => f.standing >= 100).length;
  const allyFactions = factions.filter(f => f.standing >= 2000).length;
  const mountsOwned = mounts.filter(m => m.owned).length;

  const dungeonRows = dungeonKillRows.filter(r => !r.isRaid);
  const raidRows = dungeonKillRows.filter(r => r.isRaid);

  const totalDungeonCompletions = dungeonRows.reduce((s, r) => s + (r.completions ?? 0), 0);
  const totalRaidCompletions = raidRows.reduce((s, r) => s + (r.completions ?? 0), 0);
  const totalMiniBossKills = dungeonRows.reduce((s, r) => s + (r.miniBossKills ?? 0), 0);
  const totalDungeonMainBossKills = dungeonRows.reduce((s, r) => s + (r.mainBossKills ?? 0), 0);
  const uniqueDungeonsCleared = dungeonRows.filter(r => (r.completions ?? 0) >= 1).length;
  const uniqueRaidsCleared = raidRows.filter(r => (r.completions ?? 0) >= 1).length;

  const perDungeonCompletions: Record<string, number> = {};
  for (const row of dungeonKillRows) {
    const key = row.isRaid ? `raidCompletions_${row.dungeonOrRaidId}` : `dungeonCompletions_${row.dungeonOrRaidId}`;
    perDungeonCompletions[key] = row.completions ?? 0;
  }

  const miningSkill = skills.find(s => s.skillId === "mining");
  const woodcuttingSkill = skills.find(s => s.skillId === "woodcutting");
  const fishingSkill = skills.find(s => s.skillId === "fishing");
  const herbalismSkill = skills.find(s => s.skillId === "herbalism");

  const stats: Record<string, number> = {
    killCount: character.killCount ?? 0,
    bossKills: character.bossKills ?? 0,
    level: character.level,
    gold: character.gold,
    zonesVisited: 1,
    itemsCrafted: character.itemsCrafted ?? 0,
    collectionsCompleted,
    amiableFactions,
    allyFactions,
    maxedSkills,
    heroicCompleted: character.heroicCompleted ?? 0,
    undeadKills: character.undeadKills ?? 0,
    dragonKills: character.dragonKills ?? 0,
    legendaryEquipped: 0,
    fabledEquipped: 0,
    mountsOwned,
    aaPointsSpent: character.aaPointsSpent ?? 0,
    totalDungeonCompletions,
    totalRaidCompletions,
    totalMiniBossKills,
    totalDungeonMainBossKills,
    uniqueDungeonsCleared,
    uniqueRaidsCleared,
    ...perDungeonCompletions,
    oresGathered: character.oresGathered ?? 0,
    logsChopped: character.logsChopped ?? 0,
    fishCaught: character.fishCaught ?? 0,
    herbsGathered: character.herbsGathered ?? 0,
    raresGathered: character.raresGathered ?? 0,
    miningLevel: miningSkill?.level ?? 1,
    woodcuttingLevel: woodcuttingSkill?.level ?? 1,
    fishingLevel: fishingSkill?.level ?? 1,
    herbalismLevel: herbalismSkill?.level ?? 1,
    totalGathered: (character.oresGathered ?? 0) + (character.logsChopped ?? 0) + (character.fishCaught ?? 0) + (character.herbsGathered ?? 0),
  };

  const newlyCompleted: typeof ACHIEVEMENTS[0][] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (completedIds.has(achievement.id)) continue;

    const progress = achievement.checkFn(stats);
    const existing = progressMap.get(achievement.id);

    if (progress >= achievement.target) {
      if (existing) {
        await db.update(achievementsTable)
          .set({ completed: true, progress, completedAt: new Date() })
          .where(eq(achievementsTable.id, existing.id));
      } else {
        await db.insert(achievementsTable).values({
          characterId,
          achievementId: achievement.id,
          completed: true,
          progress,
          completedAt: new Date(),
        });
      }

      if (achievement.reward === "gold") {
        await db.update(charactersTable)
          .set({ gold: sql`${charactersTable.gold} + ${achievement.rewardValue}` })
          .where(eq(charactersTable.id, character.id));
      } else if (achievement.reward === "aa_point") {
        await db.update(charactersTable)
          .set({ aaPoints: sql`COALESCE(${charactersTable.aaPoints}, 0) + ${achievement.rewardValue}` })
          .where(eq(charactersTable.id, character.id));
      } else if (achievement.reward === "xp") {
        await db.update(charactersTable)
          .set({ xp: sql`COALESCE(${charactersTable.xp}, 0) + ${achievement.rewardValue}` })
          .where(eq(charactersTable.id, character.id));
      }

      newlyCompleted.push(achievement);
    } else if (!existing) {
      await db.insert(achievementsTable).values({
        characterId,
        achievementId: achievement.id,
        completed: false,
        progress,
      });
    } else if (existing.progress !== progress) {
      await db.update(achievementsTable)
        .set({ progress })
        .where(eq(achievementsTable.id, existing.id));
    }
  }

  return newlyCompleted;
}

router.get("/achievements", async (req, res) => {
  try {
    const characterId = req.characterId;
    await checkAndUnlockAchievements(characterId);

    const dbAchievements = await db.select().from(achievementsTable).where(eq(achievementsTable.characterId, characterId));
    const progressMap = new Map(dbAchievements.map(a => [a.achievementId, a]));

    const result = ACHIEVEMENTS.map(a => {
      const dbEntry = progressMap.get(a.id);
      return {
        id: a.id, name: a.name, description: a.description,
        category: a.category, icon: a.icon, secret: a.secret,
        target: a.target, reward: a.reward, rewardValue: a.rewardValue,
        completed: dbEntry?.completed ?? false,
        progress: dbEntry?.progress ?? 0,
        completedAt: dbEntry?.completedAt?.toISOString() ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting achievements");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/achievements/summary", async (req, res) => {
  try {
    const characterId = req.characterId;
    const dbAchievements = await db.select().from(achievementsTable).where(eq(achievementsTable.characterId, characterId));
    const completed = dbAchievements.filter(a => a.completed);
    const points = completed.reduce((sum, a) => {
      const def = ACHIEVEMENTS.find(d => d.id === a.achievementId);
      return sum + (def?.rewardValue ?? 0);
    }, 0);

    const recentlyCompleted = completed
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
      .slice(0, 5)
      .map(a => {
        const def = ACHIEVEMENTS.find(d => d.id === a.achievementId)!;
        return { ...def, completed: true, progress: a.progress, completedAt: a.completedAt?.toISOString() ?? null };
      });

    res.json({ total: ACHIEVEMENTS.length, completed: completed.length, points, recentlyCompleted });
  } catch (err) {
    req.log.error({ err }, "Error getting achievements summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
