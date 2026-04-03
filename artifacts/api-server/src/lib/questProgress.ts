/**
 * Quest Objective Auto-Progress
 * Called from combat/faction handlers to auto-advance quest objectives and
 * auto-replace quests when all objectives are completed.
 */
import { db } from "@workspace/db";
import { questsTable, charactersTable, inventoryTable } from "@workspace/db/schema";
import type { QuestObjective } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQuestBatch } from "../routes/gm.js";

// ─── Kill Objectives (called from combat tick on enemy death) ──────────────

/** Called when the player kills an enemy. Advances all matching kill objectives. */
export async function progressKillObjectives(enemyName: string): Promise<Array<{ questId: number; questTitle: string; completed: boolean }>> {
  const results: Array<{ questId: number; questTitle: string; completed: boolean }> = [];

  const activeQuests = await db.select().from(questsTable).where(and(eq(questsTable.completed, false))).limit(10);

  for (const quest of activeQuests) {
    const objectives = quest.objectives as QuestObjective[];
    let changed = false;

    const updated = objectives.map((obj) => {
      if (obj.completed) return obj;

      const isKillObjective = obj.type === "kill";
      const nameMatch = obj.target
        ? enemyName.toLowerCase().includes(obj.target.toLowerCase()) ||
          obj.target.toLowerCase().includes(enemyName.toLowerCase())
        : false;

      if (isKillObjective && nameMatch && obj.progress < obj.total) {
        const newProgress = obj.progress + 1;
        const nowDone = newProgress >= obj.total;
        changed = true;
        return { ...obj, progress: newProgress, completed: nowDone };
      }

      return obj;
    });

    if (changed) {
      const allDone = updated.every(o => o.completed);
      await db.update(questsTable)
        .set({ objectives: updated, ...(allDone ? { completed: true, completedAt: new Date() } : {}) })
        .where(eq(questsTable.id, quest.id));
      if (allDone) {
        _awardAndReplace({ ...quest, objectives: updated }).catch(() => {});
      }
      results.push({ questId: quest.id, questTitle: quest.title, completed: allDone });
    }
  }

  return results;
}

// ─── Explore Objectives (called when player travels to a zone) ───────────────

/** Called when the player travels to a zone. Advances matching explore objectives. */
export async function progressExploreObjectives(zoneName: string): Promise<void> {
  const activeQuests = await db.select().from(questsTable).where(eq(questsTable.completed, false)).limit(10);

  for (const quest of activeQuests) {
    const objectives = quest.objectives as QuestObjective[];
    let changed = false;

    const updated = objectives.map((obj) => {
      if (obj.completed || obj.type !== "explore") return obj;

      const nameMatch = obj.target
        ? zoneName.toLowerCase().includes(obj.target.toLowerCase()) ||
          obj.target.toLowerCase().includes(zoneName.toLowerCase()) ||
          obj.text.toLowerCase().includes(zoneName.toLowerCase())
        : obj.text.toLowerCase().includes("explore") || obj.text.toLowerCase().includes("patrol");

      if (nameMatch) {
        changed = true;
        return { ...obj, progress: obj.total, completed: true };
      }

      return obj;
    });

    if (changed) {
      const allDone = updated.every(o => o.completed);
      await db.update(questsTable)
        .set({ objectives: updated, ...(allDone ? { completed: true, completedAt: new Date() } : {}) })
        .where(eq(questsTable.id, quest.id));
      if (allDone) {
        _awardAndReplace({ ...quest, objectives: updated }).catch(() => {});
      }
    }
  }
}

// ─── Talk Objectives (called when player uses NPC dialogue) ─────────────────

/** Called when the player talks to an NPC. Advances matching talk objectives. */
export async function progressTalkObjectives(npcName: string): Promise<void> {
  const activeQuests = await db.select().from(questsTable).where(eq(questsTable.completed, false)).limit(10);

  for (const quest of activeQuests) {
    const objectives = quest.objectives as QuestObjective[];
    let changed = false;

    const updated = objectives.map((obj) => {
      if (obj.completed || obj.type !== "talk") return obj;

      const nameMatch = obj.target
        ? npcName.toLowerCase().includes(obj.target.toLowerCase()) ||
          obj.target.toLowerCase().includes(npcName.toLowerCase())
        : obj.text.toLowerCase().includes(npcName.toLowerCase());

      if (nameMatch) {
        changed = true;
        return { ...obj, progress: obj.total, completed: true };
      }

      return obj;
    });

    if (changed) {
      const allDone = updated.every(o => o.completed);
      await db.update(questsTable)
        .set({ objectives: updated, ...(allDone ? { completed: true, completedAt: new Date() } : {}) })
        .where(eq(questsTable.id, quest.id));
      if (allDone) {
        _awardAndReplace({ ...quest, objectives: updated }).catch(() => {});
      }
    }
  }
}

// ─── Collect Objectives (called when player buys/obtains an item) ─────────────

/** Called when the player buys or obtains an item. Advances matching collect objectives. */
export async function progressCollectObjectives(itemName: string): Promise<void> {
  const activeQuests = await db.select().from(questsTable).where(eq(questsTable.completed, false)).limit(10);

  for (const quest of activeQuests) {
    const objectives = quest.objectives as QuestObjective[];
    let changed = false;

    const updated = objectives.map((obj) => {
      if (obj.completed || obj.type !== "collect") return obj;

      const nameMatch = obj.target
        ? itemName.toLowerCase().includes(obj.target.toLowerCase()) ||
          obj.target.toLowerCase().includes(itemName.toLowerCase())
        : obj.text.toLowerCase().includes(itemName.toLowerCase());

      if (nameMatch) {
        const newProgress = Math.min(obj.progress + 1, obj.total);
        const nowDone = newProgress >= obj.total;
        changed = true;
        return { ...obj, progress: newProgress, completed: nowDone };
      }

      return obj;
    });

    if (changed) {
      const allDone = updated.every(o => o.completed);
      await db.update(questsTable)
        .set({ objectives: updated, ...(allDone ? { completed: true, completedAt: new Date() } : {}) })
        .where(eq(questsTable.id, quest.id));
      if (allDone) {
        _awardAndReplace({ ...quest, objectives: updated }).catch(() => {});
      }
    }
  }
}

// ─── Faction Objectives (called when faction standing changes) ─────────────

/** Called when a faction standing changes. Advances matching faction objectives. */
export async function progressFactionObjectives(factionId: string, newStanding: number): Promise<void> {
  const activeQuests = await db.select().from(questsTable).where(eq(questsTable.completed, false)).limit(10);

  for (const quest of activeQuests) {
    const objectives = quest.objectives as QuestObjective[];
    let changed = false;

    const updated = objectives.map((obj) => {
      if (obj.completed) return obj;
      if (obj.type !== "faction") return obj;

      const isFactionObj = obj.target
        ? factionId.toLowerCase().includes(obj.target.toLowerCase()) ||
          obj.target.toLowerCase().includes(factionId.toLowerCase())
        : false;

      if (isFactionObj) {
        const target = obj.total > 0 ? obj.total : 100;
        const newProgress = Math.min(target, Math.max(0, Math.round(newStanding)));
        const nowDone = newProgress >= target;
        changed = true;
        return { ...obj, progress: newProgress, completed: nowDone };
      }

      return obj;
    });

    if (changed) {
      const allDone = updated.every(o => o.completed);
      await db.update(questsTable)
        .set({ objectives: updated, ...(allDone ? { completed: true, completedAt: new Date() } : {}) })
        .where(eq(questsTable.id, quest.id));
      if (allDone) {
        _awardAndReplace({ ...quest, objectives: updated }).catch(() => {});
      }
    }
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

async function _awardAndReplace(quest: typeof questsTable.$inferSelect): Promise<void> {
  const rewards = quest.rewards as { xp?: number; gold?: number; item?: string; aaXp?: number };
  const [character] = await db.select().from(charactersTable).limit(1);
  if (character) {
    const newAaPoints = character.aaPoints + Math.floor((rewards.aaXp ?? 0) / 10);
    await db.update(charactersTable).set({
      gold: character.gold + (rewards.gold ?? 0),
      xp: character.xp + (rewards.xp ?? 0),
      aaPoints: newAaPoints,
      updatedAt: new Date(),
    }).where(eq(charactersTable.id, character.id));

    // Grant reward item to inventory if specified
    if (rewards.item) {
      const itemId = rewards.item.toLowerCase().replace(/\s+/g, "_");
      const itemData: Record<string, unknown> = { id: itemId, name: rewards.item, type: "quest_reward", rarity: "uncommon", level: character.level, stats: {}, sellPrice: 10 };
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.itemId, itemId));
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + 1 }).where(eq(inventoryTable.id, existing.id));
      } else {
        await db.insert(inventoryTable).values({ itemId, itemData, quantity: 1 });
      }
    }
  }

  // Generate a replacement quest (fire-and-forget so we don't block combat)
  generateQuestBatch(1).catch(() => {});
}
