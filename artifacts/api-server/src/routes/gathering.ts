import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, inventoryTable, skillsTable, gatheringSessionsTable, gatheringBagItemsTable, aaPointsTable } from "@workspace/db/schema";
import { eq, and, sql, gt } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { getOrCreateSkills } from "./skills.js";
import {
  GATHERING_NODES,
  getGatheringNodeById,
  getItemById,
  xpForLevel,
  type GatheringNode,
} from "../lib/gameData.js";
import { checkAndUnlockAchievements } from "./achievements.js";
import { applyAABonuses } from "../lib/eq2Formulas.js";
import { ALL_AA_TABS } from "../lib/eq2Data.js";
import { getGuildPerksForCharacter } from "../lib/guildPerks.js";

const router: IRouter = Router();

const ALL_AA_NODES_GATHERING = ALL_AA_TABS.flatMap(tab => tab.nodes);
const AA_NODE_DEF_MAP_GATHERING = new Map(ALL_AA_NODES_GATHERING.map(n => [n.id, n]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Percentage-based yield bonus: +10% per 25 skill levels (floor).
 * e.g. at level 25 → +10%, level 50 → +20%, level 100 → +40%.
 * Applied probabilistically so fractional bonuses still provide value on 1-item nodes.
 */
function yieldBonusQty(baseQuantity: number, skillLevel: number): number {
  const bonusMultiplier = Math.floor(skillLevel / 25) * 0.1;
  const exactBonus = baseQuantity * bonusMultiplier;
  const wholeBonus = Math.floor(exactBonus);
  const fractional = exactBonus - wholeBonus;
  return wholeBonus + (Math.random() < fractional ? 1 : 0);
}

function rareChance(skillLevel: number): number {
  if (skillLevel < 50) return 0;
  return Math.min((skillLevel - 50) * 0.005, 0.15);
}

function itemToRecord(itemId: string) {
  const item = getItemById(itemId);
  if (!item) return null;
  return {
    id: item.id, name: item.name, description: item.description,
    type: item.type, slot: item.slot, rarity: item.rarity,
    level: item.level, stats: item.stats, sellPrice: item.sellPrice,
    buyPrice: item.buyPrice ?? 0, spriteId: item.spriteId,
    stackable: item.stackable ?? false,
  };
}

async function addItemToInventory(characterId: number, itemId: string, quantity: number) {
  const itemData = itemToRecord(itemId);
  if (!itemData) {
    console.warn(`addItemToInventory: unknown itemId "${itemId}" – skipping`);
    return;
  }
  const existing = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)));
  if (existing.length > 0) {
    await db.update(inventoryTable)
      .set({ quantity: sql`${inventoryTable.quantity} + ${quantity}` })
      .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)));
  } else {
    await db.insert(inventoryTable).values({ characterId, itemId, itemData: itemData as Record<string, unknown>, quantity });
  }
}

async function addItemToGatheringBag(characterId: number, itemId: string, quantity: number) {
  const itemData = itemToRecord(itemId);
  if (!itemData) return;
  // Atomic increment: try update first so concurrent calls don't overwrite each other.
  const updated = await db.update(gatheringBagItemsTable)
    .set({ quantity: sql`${gatheringBagItemsTable.quantity} + ${quantity}`, updatedAt: new Date() })
    .where(and(eq(gatheringBagItemsTable.characterId, characterId), eq(gatheringBagItemsTable.itemId, itemId)))
    .returning({ id: gatheringBagItemsTable.id });
  if (updated.length === 0) {
    // Item not yet in bag — insert it.
    await db.insert(gatheringBagItemsTable)
      .values({ characterId, itemId, itemData: itemData as Record<string, unknown>, quantity })
      .onConflictDoNothing();
  }
}

async function awardSkillXp(characterId: number, skillId: string, xpAmount: number) {
  const [skill] = await db.select().from(skillsTable).where(and(eq(skillsTable.characterId, characterId), eq(skillsTable.skillId, skillId)));
  if (!skill) return;
  let { xp, level, xpToNextLevel } = skill;
  xp += xpAmount;
  while (xp >= xpToNextLevel && level < skill.maxLevel) {
    xp -= xpToNextLevel;
    level++;
    xpToNextLevel = xpForLevel(level);
  }
  if (level >= skill.maxLevel) xp = Math.min(xp, xpToNextLevel);
  await db.update(skillsTable)
    .set({ xp, level, xpToNextLevel, updatedAt: new Date() })
    .where(and(eq(skillsTable.characterId, characterId), eq(skillsTable.skillId, skillId)));
}

async function processGatheringTick(
  characterId: number,
  node: GatheringNode,
  skillLevel: number,
): Promise<{ yields: Array<{ itemId: string; quantity: number }>; gotRare: boolean }> {
  const results: Array<{ itemId: string; quantity: number }> = [];

  for (const y of node.yields) {
    const bonus = yieldBonusQty(y.baseQuantity, skillLevel);
    const qty = y.baseQuantity + bonus;
    await addItemToGatheringBag(characterId, y.itemId, qty);
    results.push({ itemId: y.itemId, quantity: qty });
  }

  let gotRare = false;
  if (node.rareYield) {
    const chance = rareChance(skillLevel);
    if (chance > 0 && Math.random() < chance) {
      await addItemToGatheringBag(characterId, node.rareYield.itemId, node.rareYield.quantity);
      results.push({ itemId: node.rareYield.itemId, quantity: node.rareYield.quantity });
      gotRare = true;
    }
  }

  return { yields: results, gotRare };
}

// ─── GET /gathering/nodes ─────────────────────────────────────────────────────

router.get("/gathering/nodes", async (req, res) => {
  try {
    const characterId = req.characterId;
    await getOrCreateSkills(characterId);
    const skills = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
    const skillLevelMap = new Map(skills.map(s => [s.skillId, s.level]));

    const enriched = GATHERING_NODES.map(node => {
      const skillLevel = skillLevelMap.get(node.skillId) ?? 1;
      const bonusPct = Math.floor(skillLevel / 25) * 10;
      return {
        ...node,
        skillLevel,
        unlocked: skillLevel >= node.requiredLevel,
        rareChance: rareChance(skillLevel),
        yieldBonus: bonusPct,
        yieldBonusPct: bonusPct,
      };
    });

    return res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error getting gathering nodes");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /gathering/start ────────────────────────────────────────────────────

router.post("/gathering/start", async (req, res) => {
  try {
    const { skillId, nodeId } = req.body;
    if (!skillId || !nodeId) return res.status(400).json({ error: "skillId and nodeId required" });

    const node = getGatheringNodeById(nodeId);
    if (!node) return res.status(404).json({ error: "Node not found" });
    if (node.skillId !== skillId) return res.status(400).json({ error: "Node does not belong to skill" });

    const character = await getOrCreateCharacter(req.characterId);
    const characterId = character.id;
    await getOrCreateSkills(characterId);
    const [skill] = await db.select().from(skillsTable).where(and(eq(skillsTable.characterId, characterId), eq(skillsTable.skillId, skillId)));
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (skill.level < node.requiredLevel) {
      return res.status(400).json({ error: `Requires ${node.skillId} level ${node.requiredLevel}` });
    }

    const now = new Date();

    const [existing] = await db.select().from(gatheringSessionsTable)
      .where(and(
        eq(gatheringSessionsTable.characterId, character.id),
        eq(gatheringSessionsTable.skillId, skillId),
        eq(gatheringSessionsTable.isActive, true),
      ));

    if (existing) {
      await db.update(gatheringSessionsTable)
        .set({ nodeId, startedAt: now, lastTickAt: now, totalGathered: 0 })
        .where(eq(gatheringSessionsTable.id, existing.id));
    } else {
      await db.insert(gatheringSessionsTable).values({
        characterId: character.id,
        skillId,
        nodeId,
        startedAt: now,
        lastTickAt: now,
        isActive: true,
        totalGathered: 0,
      });
    }

    return res.json({ success: true, skillId, nodeId });
  } catch (err) {
    req.log.error({ err }, "Error starting gathering");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /gathering/stop ─────────────────────────────────────────────────────

router.post("/gathering/stop", async (req, res) => {
  try {
    const { skillId } = req.body;
    if (!skillId) return res.status(400).json({ error: "skillId required" });

    const character = await getOrCreateCharacter(req.characterId);
    await db.update(gatheringSessionsTable)
      .set({ isActive: false })
      .where(and(
        eq(gatheringSessionsTable.characterId, character.id),
        eq(gatheringSessionsTable.skillId, skillId),
        eq(gatheringSessionsTable.isActive, true),
      ));

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error stopping gathering");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /gathering/status ────────────────────────────────────────────────────

router.get("/gathering/status", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const characterId = character.id;
    await getOrCreateSkills(characterId);
    const skills = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
    const skillLevelMap = new Map(skills.map(s => [s.skillId, s.level]));

    // ── Load AA bonuses for gathering speed ──────────────────────────────────
    const aaRows = await db.select().from(aaPointsTable)
      .where(and(eq(aaPointsTable.characterId, characterId), gt(aaPointsTable.rank, 0)));
    const aaInvested = aaRows.map(r => {
      const def = AA_NODE_DEF_MAP_GATHERING.get(r.nodeId);
      if (!def) return null;
      return { effect: def.effect, currentRank: r.rank, effectValue: def.effectValue, effectPerRank: def.effectPerRank };
    }).filter((n): n is NonNullable<typeof n> => n !== null);
    const aaBonuses = applyAABonuses(aaInvested);

    // ── Guild gathering speed bonus ───────────────────────────────────────────
    const guildPerks = await getGuildPerksForCharacter(characterId);
    const totalGatheringSpeedBonus = aaBonuses.gatheringSpeed + guildPerks.gatheringSpeedBonus;

    const sessions = await db.select().from(gatheringSessionsTable)
      .where(and(
        eq(gatheringSessionsTable.characterId, character.id),
        eq(gatheringSessionsTable.isActive, true),
      ));

    const now = new Date();
    const allYields: Array<{ skillId: string; nodeId: string; items: Array<{ itemId: string; quantity: number }>; rareItemIds: string[] }> = [];

    let totalOresGathered = 0;
    let totalLogsChopped = 0;
    let totalFishCaught = 0;
    let totalHerbsGathered = 0;
    let totalRares = 0;

    // Track updated lastTickAt and totalGathered in-memory so enrichedSessions is current
    const sessionUpdates = new Map<number, { lastTickAt: Date; totalGathered: number }>();

    for (const session of sessions) {
      const node = getGatheringNodeById(session.nodeId);
      if (!node) continue;

      const skillLevel = skillLevelMap.get(session.skillId) ?? 1;
      const elapsedMs = now.getTime() - new Date(session.lastTickAt).getTime();
      // Apply AA + guild gatheringSpeed bonus: speed% bonus reduces effective gather interval
      const effectiveGatherMs = (node.gatherTimeSeconds * 1000) / Math.max(0.1, 1 + totalGatheringSpeedBonus / 100);
      const ticksElapsed = Math.floor(elapsedMs / effectiveGatherMs);

      if (ticksElapsed <= 0) {
        allYields.push({ skillId: session.skillId, nodeId: session.nodeId, items: [], rareItemIds: [] });
        continue;
      }

      const capTicks = Math.min(ticksElapsed, 50);
      const newLastTickAt = new Date(new Date(session.lastTickAt).getTime() + capTicks * effectiveGatherMs);

      // Optimistic locking: only process if lastTickAt hasn't been updated by a concurrent request
      const lastTickAtSnapshot = session.lastTickAt;
      const updateResult = await db.update(gatheringSessionsTable)
        .set({
          lastTickAt: newLastTickAt,
          totalGathered: session.totalGathered + capTicks,
        })
        .where(and(
          eq(gatheringSessionsTable.id, session.id),
          eq(gatheringSessionsTable.lastTickAt, lastTickAtSnapshot),
        ))
        .returning({ id: gatheringSessionsTable.id });

      if (updateResult.length === 0) {
        // Another concurrent request already processed this window — skip to avoid double-credit
        allYields.push({ skillId: session.skillId, nodeId: session.nodeId, items: [], rareItemIds: [] });
        continue;
      }

      const sessionYields: Array<{ itemId: string; quantity: number }> = [];
      const sessionRareItemIds = new Set<string>();

      for (let t = 0; t < capTicks; t++) {
        const { yields, gotRare } = await processGatheringTick(characterId, node, skillLevel);
        for (const y of yields) {
          const existing = sessionYields.find(e => e.itemId === y.itemId);
          if (existing) existing.quantity += y.quantity;
          else sessionYields.push({ ...y });
        }
        // Track which specific item IDs were rare drops (not all items in the batch)
        if (gotRare && node.rareYield) {
          sessionRareItemIds.add(node.rareYield.itemId);
        }

        const rareItemId = gotRare && node.rareYield ? node.rareYield.itemId : undefined;
        const totalItemsThisTick = yields
          .filter(y => y.itemId !== rareItemId)
          .reduce((s, y) => s + y.quantity, 0);
        if (node.skillId === "mining") totalOresGathered += totalItemsThisTick;
        else if (node.skillId === "woodcutting") totalLogsChopped += totalItemsThisTick;
        else if (node.skillId === "fishing") totalFishCaught += totalItemsThisTick;
        else if (node.skillId === "herbalism") totalHerbsGathered += totalItemsThisTick;
        if (gotRare) totalRares++;
      }

      await awardSkillXp(characterId, session.skillId, node.xpPerGather * capTicks);

      // Record updated values in-memory so enrichedSessions reflects current state
      sessionUpdates.set(session.id, {
        lastTickAt: newLastTickAt,
        totalGathered: session.totalGathered + capTicks,
      });

      allYields.push({ skillId: session.skillId, nodeId: session.nodeId, items: sessionYields, rareItemIds: [...sessionRareItemIds] });
    }

    if (totalOresGathered > 0 || totalLogsChopped > 0 || totalFishCaught > 0 || totalHerbsGathered > 0 || totalRares > 0) {
      // Use SQL atomic increments to prevent stale-snapshot overwrite under concurrent status calls
      await db.update(charactersTable)
        .set({
          oresGathered: sql`COALESCE(${charactersTable.oresGathered}, 0) + ${totalOresGathered}`,
          logsChopped: sql`COALESCE(${charactersTable.logsChopped}, 0) + ${totalLogsChopped}`,
          fishCaught: sql`COALESCE(${charactersTable.fishCaught}, 0) + ${totalFishCaught}`,
          herbsGathered: sql`COALESCE(${charactersTable.herbsGathered}, 0) + ${totalHerbsGathered}`,
          raresGathered: sql`COALESCE(${charactersTable.raresGathered}, 0) + ${totalRares}`,
          updatedAt: now,
        })
        .where(eq(charactersTable.id, character.id));

      await checkAndUnlockAchievements(characterId);
    }

    const updatedSkills = await db.select().from(skillsTable).where(eq(skillsTable.characterId, characterId));
    const skillMap = new Map(updatedSkills.map(s => [s.skillId, s]));

    const enrichedSessions = sessions.map(s => {
      const node = getGatheringNodeById(s.nodeId);
      const skill = skillMap.get(s.skillId);
      // Use in-memory updated values so display reflects what was just processed
      const updated = sessionUpdates.get(s.id);
      const effectiveLastTickAt = updated ? updated.lastTickAt : new Date(s.lastTickAt);
      const effectiveTotalGathered = updated ? updated.totalGathered : s.totalGathered;
      const effectiveGatherTimeSec = node ? (node.gatherTimeSeconds / Math.max(0.1, 1 + totalGatheringSpeedBonus / 100)) : 10;
      return {
        skillId: s.skillId,
        nodeId: s.nodeId,
        nodeName: node?.name ?? s.nodeId,
        nodeIcon: node?.icon ?? "⛏️",
        gatherTimeSeconds: effectiveGatherTimeSec,
        skillLevel: skill?.level ?? 1,
        nextTickIn: node
          ? Math.max(0, effectiveGatherTimeSec - Math.floor((now.getTime() - effectiveLastTickAt.getTime()) / 1000) % effectiveGatherTimeSec)
          : 0,
        totalGathered: effectiveTotalGathered,
      };
    });

    return res.json({ sessions: enrichedSessions, yields: allYields });
  } catch (err) {
    req.log.error({ err }, "Error getting gathering status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /gathering/bag ───────────────────────────────────────────────────────

router.get("/gathering/bag", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const items = await db.select().from(gatheringBagItemsTable).where(eq(gatheringBagItemsTable.characterId, character.id));
    return res.json({ items: items.filter(i => i.quantity > 0) });
  } catch (err) {
    req.log.error({ err }, "Error fetching gathering bag");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /gathering/bag/withdraw-all ────────────────────────────────────────

router.post("/gathering/bag/withdraw-all", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const bagItems = await db.select().from(gatheringBagItemsTable).where(eq(gatheringBagItemsTable.characterId, character.id));

    for (const item of bagItems) {
      if (item.quantity <= 0) continue;
      await addItemToInventory(character.id, item.itemId, item.quantity);
    }

    await db.delete(gatheringBagItemsTable).where(eq(gatheringBagItemsTable.characterId, character.id));

    return res.json({ success: true, moved: bagItems.filter(i => i.quantity > 0).length });
  } catch (err) {
    req.log.error({ err }, "Error withdrawing gathering bag");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
