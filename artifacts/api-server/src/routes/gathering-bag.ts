import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gatheringBagItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /gathering-bag ────────────────────────────────────────────────────────

router.get("/gathering-bag", async (req, res) => {
  try {
    const characterId = req.characterId;
    const items = await db
      .select()
      .from(gatheringBagItemsTable)
      .where(eq(gatheringBagItemsTable.characterId, characterId))
      .orderBy(gatheringBagItemsTable.createdAt);

    const formattedItems = items.map(row => {
      const d = row.itemData as Record<string, unknown>;
      return { ...d, id: row.itemId, quantity: row.quantity, rowId: row.id };
    });

    return res.json({ items: formattedItems });
  } catch (err) {
    req.log.error({ err }, "Error getting gathering bag");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
