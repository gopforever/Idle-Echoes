import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { collectionsTable, charactersTable, achievementsTable } from "@workspace/db/schema";
import { COLLECTIONS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/collections", async (req, res) => {
  try {
    const characterId = req.characterId;
    const dbCollections = await db.select().from(collectionsTable).where(eq(collectionsTable.characterId, characterId));
    const foundPieces = new Set(dbCollections.map(c => `${c.collectionId}:${c.pieceId}`));

    const result = COLLECTIONS.map(col => {
      const pieces = col.pieces.map(p => ({
        id: p.id, name: p.name, found: foundPieces.has(`${col.id}:${p.id}`), dropZone: p.dropZone,
      }));
      const completed = pieces.every(p => p.found);
      return {
        id: col.id, name: col.name, description: col.description, zone: col.zone,
        pieces, completed, reward: col.reward, rewardValue: col.rewardValue,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting collections");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
