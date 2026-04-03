import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { aaPointsTable, charactersTable } from "@workspace/db/schema";
import { AA_TABS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/aa/tree", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(req.characterId);
    const dbPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const spentMap = new Map(dbPoints.map(p => [p.nodeId, p.rank]));

    const archetype = character.archetype ?? "Fighter";
    const relevantTabs = AA_TABS.filter(tab => tab.archetype === archetype || tab.archetype === "All");

    const tabs = relevantTabs.map(tab => ({
      id: tab.id, name: tab.name,
      nodes: tab.nodes.map(node => ({ ...node, currentRank: spentMap.get(node.id) ?? 0 })),
    }));

    const totalSpent = dbPoints.reduce((sum, p) => sum + p.rank, 0);

    return res.json({
      totalPoints: character.aaPoints ?? 0,
      spentPoints: totalSpent,
      availablePoints: (character.aaPoints ?? 0) - totalSpent,
      tabs,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting AA tree");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/aa/spend", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { nodeId } = req.body;
    const character = await getOrCreateCharacter(req.characterId);

    let nodeFound = false;
    let maxRank = 1;
    let pointsPerRank = 1;

    for (const tab of AA_TABS) {
      const node = tab.nodes.find(n => n.id === nodeId);
      if (node) { nodeFound = true; maxRank = node.maxRank; pointsPerRank = node.pointsPerRank; break; }
    }

    if (!nodeFound) return res.status(404).json({ error: "AA node not found" });

    const [existing] = await db.select().from(aaPointsTable).where(
      and(eq(aaPointsTable.characterId, characterId), eq(aaPointsTable.nodeId, nodeId))
    );
    const currentRank = existing?.rank ?? 0;

    if (currentRank >= maxRank) return res.status(400).json({ error: "Already at maximum rank" });

    const dbPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const totalSpent = dbPoints.reduce((sum, p) => sum + p.rank, 0);
    const available = (character.aaPoints ?? 0) - totalSpent;

    if (available < pointsPerRank) return res.status(400).json({ error: "Not enough AA points" });

    if (existing) {
      await db.update(aaPointsTable).set({ rank: currentRank + 1 }).where(eq(aaPointsTable.id, existing.id));
    } else {
      await db.insert(aaPointsTable).values({ characterId, nodeId, rank: 1 });
    }

    await db.update(charactersTable)
      .set({ aaPointsSpent: (character.aaPointsSpent ?? 0) + pointsPerRank, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id));

    const updatedPoints = await db.select().from(aaPointsTable).where(eq(aaPointsTable.characterId, characterId));
    const spentMap = new Map(updatedPoints.map(p => [p.nodeId, p.rank]));
    const archetype = character.archetype ?? "Fighter";
    const relevantTabs = AA_TABS.filter(tab => tab.archetype === archetype || tab.archetype === "All");
    const tabs = relevantTabs.map(tab => ({
      id: tab.id, name: tab.name,
      nodes: tab.nodes.map(node => ({ ...node, currentRank: spentMap.get(node.id) ?? 0 })),
    }));

    const newTotalSpent = updatedPoints.reduce((sum, p) => sum + p.rank, 0);

    return res.json({
      totalPoints: character.aaPoints ?? 0,
      spentPoints: newTotalSpent,
      availablePoints: (character.aaPoints ?? 0) - newTotalSpent,
      tabs,
    });
  } catch (err) {
    req.log.error({ err }, "Error spending AA point");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
