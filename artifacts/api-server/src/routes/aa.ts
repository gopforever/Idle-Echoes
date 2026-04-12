import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { aaPointsTable, charactersTable } from "@workspace/db/schema";
import { ALL_AA_TABS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

/** Build the tab list visible to this character, with currentRank merged in. */
function buildTabs(
  character: { archetype: string | null; class: string | null },
  spentMap: Map<string, number>,
  totalSpent: number,
) {
  const archetype = character.archetype ?? "Fighter";
  const charClass = (character.class ?? "").toLowerCase();

  return ALL_AA_TABS
    .filter(tab => {
      if (tab.tabType === "prestige") {
        // Only show prestige tab for this character's class; locked until prestigeMinSpent points spent
        return tab.classId === charClass;
      }
      if (tab.tabType === "class") {
        return tab.classId === charClass;
      }
      if (tab.tabType === "tradeskill") return true;
      // archetype tabs (including "All")
      return tab.archetype === archetype || tab.archetype === "All";
    })
    .map(tab => {
      const nodesWithRanks = tab.nodes.map(node => ({
        ...node,
        currentRank: spentMap.get(node.id) ?? 0,
      }));

      // For prestige tabs, determine which path (if any) is already chosen
      let chosenPrestigePath: "left" | "right" | null = null;
      if (tab.tabType === "prestige") {
        const hasLeft  = nodesWithRanks.some(n => n.prestigePath === "left"  && n.currentRank > 0);
        const hasRight = nodesWithRanks.some(n => n.prestigePath === "right" && n.currentRank > 0);
        if (hasLeft)  chosenPrestigePath = "left";
        if (hasRight) chosenPrestigePath = "right";
      }

      return {
        id: tab.id,
        name: tab.name,
        tabType: tab.tabType ?? "archetype",
        classId: tab.classId,
        prestigeMinSpent: tab.prestigeMinSpent,
        prestigeLeftName: tab.prestigeLeftName,
        prestigeRightName: tab.prestigeRightName,
        isLocked: tab.tabType === "prestige" && totalSpent < (tab.prestigeMinSpent ?? 50),
        chosenPrestigePath,
        nodes: nodesWithRanks,
      };
    });
}

// ── GET /aa/tree ──────────────────────────────────────────────────────────────
router.get("/aa/tree", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(characterId);
    const dbPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const spentMap = new Map(dbPoints.map(p => [p.nodeId, p.rank]));
    const totalSpent = dbPoints.reduce((sum, p) => sum + p.rank, 0);

    return res.json({
      totalPoints: character.aaPoints ?? 0,
      spentPoints: totalSpent,
      availablePoints: (character.aaPoints ?? 0) - totalSpent,
      aaXpRatio: character.aaXpRatio ?? 0,
      aaRespecUsed: character.aaRespecUsed ?? false,
      tabs: buildTabs(character, spentMap, totalSpent),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting AA tree");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /aa/spend ────────────────────────────────────────────────────────────
router.post("/aa/spend", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { nodeId } = req.body;
    const character = await getOrCreateCharacter(characterId);

    // Find node definition across all tabs
    let foundNode: (typeof ALL_AA_TABS[0]["nodes"][0]) | undefined;
    let foundTab: (typeof ALL_AA_TABS[0]) | undefined;
    for (const tab of ALL_AA_TABS) {
      const n = tab.nodes.find(n => n.id === nodeId);
      if (n) { foundNode = n; foundTab = tab; break; }
    }
    if (!foundNode || !foundTab) return res.status(404).json({ error: "AA node not found" });

    const dbPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const spentMap = new Map(dbPoints.map(p => [p.nodeId, p.rank]));
    const totalSpent = dbPoints.reduce((sum, p) => sum + p.rank, 0);

    // Prestige: enforce path locking and minimum spent
    if (foundTab.tabType === "prestige") {
      if (totalSpent < (foundTab.prestigeMinSpent ?? 50)) {
        return res.status(400).json({ error: `Prestige unlocks after spending ${foundTab.prestigeMinSpent ?? 50} AA points` });
      }
      if (foundNode.prestigePath) {
        const otherPath = foundNode.prestigePath === "left" ? "right" : "left";
        const otherPathNodes = foundTab.nodes.filter(n => n.prestigePath === otherPath);
        const hasOtherPath = otherPathNodes.some(n => (spentMap.get(n.id) ?? 0) > 0);
        if (hasOtherPath) {
          return res.status(400).json({ error: "You have already chosen a prestige path" });
        }
      }
    }

    const currentRank = spentMap.get(nodeId) ?? 0;
    if (currentRank >= foundNode.maxRank) return res.status(400).json({ error: "Already at maximum rank" });

    const available = (character.aaPoints ?? 0) - totalSpent;
    if (available < foundNode.pointsPerRank) return res.status(400).json({ error: "Not enough AA points" });

    // Check prerequisites within the same tab
    const prereqsMet = foundNode.requires.every(reqId => (spentMap.get(reqId) ?? 0) > 0);
    if (!prereqsMet) return res.status(400).json({ error: "Prerequisites not met" });

    const [existing] = await db.select().from(aaPointsTable).where(
      and(eq(aaPointsTable.characterId, characterId), eq(aaPointsTable.nodeId, nodeId))
    );

    if (existing) {
      await db.update(aaPointsTable).set({ rank: currentRank + 1 }).where(eq(aaPointsTable.id, existing.id));
    } else {
      await db.insert(aaPointsTable).values({ characterId, nodeId, rank: 1 });
    }

    await db.update(charactersTable)
      .set({ aaPointsSpent: (character.aaPointsSpent ?? 0) + foundNode.pointsPerRank, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id));

    const updatedPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const updatedSpentMap = new Map(updatedPoints.map(p => [p.nodeId, p.rank]));
    const newTotalSpent = updatedPoints.reduce((sum, p) => sum + p.rank, 0);

    return res.json({
      totalPoints: character.aaPoints ?? 0,
      spentPoints: newTotalSpent,
      availablePoints: (character.aaPoints ?? 0) - newTotalSpent,
      aaXpRatio: character.aaXpRatio ?? 0,
      aaRespecUsed: character.aaRespecUsed ?? false,
      tabs: buildTabs(character, updatedSpentMap, newTotalSpent),
    });
  } catch (err) {
    req.log.error({ err }, "Error spending AA point");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /aa/xp-ratio ─────────────────────────────────────────────────────────
// Set the percentage of combat XP that is diverted to AA points (0-100).
router.post("/aa/xp-ratio", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { ratio } = req.body;
    const parsed = parseInt(ratio, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return res.status(400).json({ error: "Ratio must be 0-100" });
    }

    await db.update(charactersTable)
      .set({ aaXpRatio: parsed, updatedAt: new Date() })
      .where(eq(charactersTable.id, (await getOrCreateCharacter(characterId)).id));

    return res.json({ aaXpRatio: parsed });
  } catch (err) {
    req.log.error({ err }, "Error setting AA XP ratio");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /aa/respec ───────────────────────────────────────────────────────────
// One-time paid respec: costs 10,000 gold, resets all AA investments.
const RESPEC_COST = 10_000;

router.post("/aa/respec", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(characterId);

    if (character.aaRespecUsed) {
      return res.status(400).json({ error: "You have already used your respec" });
    }
    if ((character.gold ?? 0) < RESPEC_COST) {
      return res.status(400).json({ error: `Respec costs ${RESPEC_COST.toLocaleString()} gold` });
    }

    // Delete all invested AA points for this character
    await db.delete(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));

    // Deduct gold, reset spent, mark respec used
    await db.update(charactersTable).set({
      gold: (character.gold ?? 0) - RESPEC_COST,
      aaPointsSpent: 0,
      aaRespecUsed: true,
      updatedAt: new Date(),
    }).where(eq(charactersTable.id, character.id));

    return res.json({
      success: true,
      goldSpent: RESPEC_COST,
      message: "All AA points have been refunded. Spend them again wisely.",
    });
  } catch (err) {
    req.log.error({ err }, "Error processing AA respec");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
