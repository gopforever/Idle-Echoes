import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, inventoryTable, bankItemsTable, combatStateTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";

const router: IRouter = Router();

async function isInCombat(characterId: number): Promise<boolean> {
  const [cs] = await db.select({ active: combatStateTable.active })
    .from(combatStateTable)
    .where(eq(combatStateTable.characterId, characterId))
    .limit(1);
  return cs?.active ?? false;
}

router.get("/bank", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(req.characterId);
    const items = await db.select().from(bankItemsTable)
      .where(eq(bankItemsTable.characterId, characterId))
      .orderBy(bankItemsTable.createdAt);

    const formattedItems = items.map(row => {
      const d = row.itemData as Record<string, unknown>;
      return { ...d, id: row.itemId, quantity: row.quantity, rowId: row.id };
    });

    return res.json({ items: formattedItems, bankGold: character.bankGold ?? 0, walletGold: character.gold });
  } catch (err) {
    req.log.error({ err }, "Error getting bank");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bank/deposit-item", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (await isInCombat(characterId)) return res.status(409).json({ error: "Cannot access bank during combat" });

    const { itemId, quantity } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId required" });

    const [invItem] = await db.select().from(inventoryTable)
      .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
      .limit(1);
    if (!invItem) return res.status(404).json({ error: "Item not in inventory" });

    const qty = Math.min(quantity ?? invItem.quantity, invItem.quantity);

    const [existingBank] = await db.select().from(bankItemsTable)
      .where(and(eq(bankItemsTable.characterId, characterId), eq(bankItemsTable.itemId, itemId)))
      .limit(1);

    if (existingBank) {
      await db.update(bankItemsTable)
        .set({ quantity: existingBank.quantity + qty })
        .where(eq(bankItemsTable.id, existingBank.id));
    } else {
      await db.insert(bankItemsTable).values({
        characterId, itemId, itemData: invItem.itemData as Record<string, unknown>, quantity: qty,
      });
    }

    if (invItem.quantity <= qty) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, invItem.id));
    } else {
      await db.update(inventoryTable).set({ quantity: invItem.quantity - qty }).where(eq(inventoryTable.id, invItem.id));
    }

    return res.json({ success: true, itemId, quantity: qty });
  } catch (err) {
    req.log.error({ err }, "Error depositing item to bank");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bank/withdraw-item", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (await isInCombat(characterId)) return res.status(409).json({ error: "Cannot access bank during combat" });

    const { itemId, quantity } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId required" });

    const [bankItem] = await db.select().from(bankItemsTable)
      .where(and(eq(bankItemsTable.characterId, characterId), eq(bankItemsTable.itemId, itemId)))
      .limit(1);
    if (!bankItem) return res.status(404).json({ error: "Item not in bank" });

    const invAll = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
    const invItemForId = invAll.find(i => i.itemId === itemId);
    const usedSlots = invAll.length;
    if (!invItemForId && usedSlots >= 40) {
      return res.status(409).json({ error: "Inventory is full (40 slots)" });
    }

    const qty = Math.min(quantity ?? bankItem.quantity, bankItem.quantity);

    if (invItemForId) {
      await db.update(inventoryTable)
        .set({ quantity: invItemForId.quantity + qty })
        .where(eq(inventoryTable.id, invItemForId.id));
    } else {
      await db.insert(inventoryTable).values({
        characterId, itemId, itemData: bankItem.itemData as Record<string, unknown>, quantity: qty,
      });
    }

    if (bankItem.quantity <= qty) {
      await db.delete(bankItemsTable).where(eq(bankItemsTable.id, bankItem.id));
    } else {
      await db.update(bankItemsTable).set({ quantity: bankItem.quantity - qty }).where(eq(bankItemsTable.id, bankItem.id));
    }

    return res.json({ success: true, itemId, quantity: qty });
  } catch (err) {
    req.log.error({ err }, "Error withdrawing item from bank");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bank/deposit-gold", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (await isInCombat(characterId)) return res.status(409).json({ error: "Cannot access bank during combat" });

    const { amount } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const character = await getOrCreateCharacter(req.characterId);
    const deposit = Math.min(Math.floor(amount), Math.floor(character.gold));
    if (deposit <= 0) return res.status(400).json({ error: "Insufficient gold" });

    const [updated] = await db.update(charactersTable)
      .set({ gold: character.gold - deposit, bankGold: (character.bankGold ?? 0) + deposit, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id))
      .returning();

    return res.json({ walletGold: updated.gold, bankGold: updated.bankGold ?? 0, deposited: deposit });
  } catch (err) {
    req.log.error({ err }, "Error depositing gold to bank");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bank/withdraw-gold", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (await isInCombat(characterId)) return res.status(409).json({ error: "Cannot access bank during combat" });

    const { amount } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const character = await getOrCreateCharacter(req.characterId);
    const withdraw = Math.min(Math.floor(amount), Math.floor(character.bankGold ?? 0));
    if (withdraw <= 0) return res.status(400).json({ error: "Insufficient gold in bank" });

    const [updated] = await db.update(charactersTable)
      .set({ gold: character.gold + withdraw, bankGold: (character.bankGold ?? 0) - withdraw, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id))
      .returning();

    return res.json({ walletGold: updated.gold, bankGold: updated.bankGold ?? 0, withdrawn: withdraw });
  } catch (err) {
    req.log.error({ err }, "Error withdrawing gold from bank");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
