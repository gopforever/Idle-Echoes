import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, inventoryTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getItemById, isNoSell, type Item } from "../lib/gameData.js";
import { getOrCreateCharacter } from "./character.js";

const router: IRouter = Router();

function itemToRecord(item: Item): Record<string, unknown> {
  return {
    id: item.id, name: item.name, description: item.description,
    type: item.type, slot: item.slot, rarity: item.rarity,
    level: item.level, stats: item.stats, sellPrice: item.sellPrice,
    buyPrice: item.buyPrice, spriteId: item.spriteId, stackable: item.stackable,
  };
}

async function resolveItem(itemId: string, characterId: number): Promise<Record<string, unknown> | undefined> {
  const staticItem = getItemById(itemId);
  if (staticItem) return itemToRecord(staticItem);
  const [invRow] = await db.select().from(inventoryTable).where(
    and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId))
  );
  if (invRow?.itemData) return invRow.itemData as Record<string, unknown>;
  return undefined;
}

function gearValue(itemId: string, itemData: Record<string, unknown>): string | Record<string, unknown> {
  if (!getItemById(itemId)) return { ...itemData, id: itemId };
  return itemId;
}

router.get("/inventory/gear", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, unknown>) || {};
    const formattedGear: Record<string, unknown> = {};
    for (const [slot, value] of Object.entries(gear)) {
      if (typeof value === "string") {
        const item = getItemById(value);
        if (item) formattedGear[slot] = { ...item, id: value };
      } else if (value && typeof value === "object") {
        formattedGear[slot] = value;
      }
    }
    return res.json(formattedGear);
  } catch (err) {
    req.log.error({ err }, "Error getting gear");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const characterId = req.characterId;
    const items = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
    
    const formattedItems = items.map(row => {
      const itemData = row.itemData as Record<string, unknown>;
      return { ...itemData, quantity: row.quantity, id: row.itemId };
    });

    return res.json({ items: formattedItems, maxSlots: 40, usedSlots: items.length });
  } catch (err) {
    req.log.error({ err }, "Error getting inventory");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/equip", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { itemId, slot: rawSlot } = req.body;
    const character = await getOrCreateCharacter(req.characterId);

    const item = await resolveItem(itemId, characterId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const gear = { ...(character.gear as Record<string, unknown>) };

    let slot = rawSlot as string;
    if (rawSlot === "ring" || rawSlot === "finger") {
      slot = !gear["ringLeft"] ? "ringLeft" : !gear["ringRight"] ? "ringRight" : "ringLeft";
    } else if (rawSlot === "ear") {
      slot = !gear["earLeft"] ? "earLeft" : !gear["earRight"] ? "earRight" : "earLeft";
    }
    
    const currentSlotValue = gear[slot];
    if (currentSlotValue) {
      if (typeof currentSlotValue === "string") {
        const existingItem = getItemById(currentSlotValue);
        if (existingItem) {
          await db.insert(inventoryTable).values({
            characterId, itemId: currentSlotValue, itemData: itemToRecord(existingItem), quantity: 1,
          });
        }
      } else if (currentSlotValue && typeof currentSlotValue === "object") {
        const obj = currentSlotValue as Record<string, unknown>;
        const existingId = typeof obj.id === "string" ? obj.id : String(obj.id ?? "");
        if (existingId) {
          const [alreadyInInv] = await db.select().from(inventoryTable).where(
            and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, existingId))
          );
          if (alreadyInInv) {
            await db.update(inventoryTable).set({ quantity: alreadyInInv.quantity + 1 }).where(eq(inventoryTable.id, alreadyInInv.id));
          } else {
            await db.insert(inventoryTable).values({ characterId, itemId: existingId, itemData: obj, quantity: 1 });
          }
        }
      }
    }

    gear[slot] = gearValue(itemId, item);
    await db.delete(inventoryTable).where(
      and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId))
    );
    await db.update(charactersTable).set({ gear, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    const formattedGear: Record<string, unknown> = {};
    for (const [gSlot, gValue] of Object.entries(gear)) {
      if (typeof gValue === "string") {
        const gItem = getItemById(gValue);
        if (gItem) formattedGear[gSlot] = { ...gItem, id: gValue };
      } else if (gValue && typeof gValue === "object") {
        formattedGear[gSlot] = gValue;
      }
    }

    return res.json(formattedGear);
  } catch (err) {
    req.log.error({ err }, "Error equipping item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/unequip", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { slot } = req.body;
    const character = await getOrCreateCharacter(req.characterId);
    const gear = { ...(character.gear as Record<string, unknown>) };
    
    const slotValue = gear[slot];
    if (!slotValue) return res.status(400).json({ error: "No item in that slot" });

    if (typeof slotValue === "string") {
      const item = getItemById(slotValue);
      if (item) {
        await db.insert(inventoryTable).values({ characterId, itemId: slotValue, itemData: itemToRecord(item), quantity: 1 });
      }
    } else if (slotValue && typeof slotValue === "object") {
      const obj = slotValue as Record<string, unknown>;
      const itemId = typeof obj.id === "string" ? obj.id : String(obj.id ?? "");
      if (itemId) {
        const [alreadyInInv] = await db.select().from(inventoryTable).where(
          and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId))
        );
        if (alreadyInInv) {
          await db.update(inventoryTable).set({ quantity: alreadyInInv.quantity + 1 }).where(eq(inventoryTable.id, alreadyInInv.id));
        } else {
          await db.insert(inventoryTable).values({ characterId, itemId, itemData: obj, quantity: 1 });
        }
      }
    }

    delete gear[slot];
    await db.update(charactersTable).set({ gear, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    const formattedGear: Record<string, unknown> = {};
    for (const [gSlot, gValue] of Object.entries(gear)) {
      if (typeof gValue === "string") {
        const gItem = getItemById(gValue);
        if (gItem) formattedGear[gSlot] = { ...gItem, id: gValue };
      } else if (gValue && typeof gValue === "object") {
        formattedGear[gSlot] = gValue;
      }
    }

    return res.json(formattedGear);
  } catch (err) {
    req.log.error({ err }, "Error unequipping item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/sell", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { itemId, quantity } = req.body;
    const character = await getOrCreateCharacter(req.characterId);
    
    const [invItem] = await db.select().from(inventoryTable)
      .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
      .limit(1);

    if (!invItem) return res.status(404).json({ error: "Item not in inventory" });

    const itemData = invItem.itemData as Record<string, unknown>;
    const staticItem = getItemById(itemId);
    if (isNoSell(staticItem ?? itemData)) {
      return res.status(400).json({ error: "This item is No-Drop and cannot be sold or traded." });
    }

    const sellPrice = staticItem?.sellPrice
      ?? (typeof itemData?.sellPrice === "number" ? itemData.sellPrice : 0);

    const qty = Math.min(quantity || 1, invItem.quantity);
    const goldEarned = Math.max(1, sellPrice) * qty;
    const newGold = character.gold + goldEarned;

    if (invItem.quantity <= qty) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, invItem.id));
    } else {
      await db.update(inventoryTable).set({ quantity: invItem.quantity - qty }).where(eq(inventoryTable.id, invItem.id));
    }

    await db.update(charactersTable).set({ gold: newGold, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    return res.json({ goldEarned, newGoldTotal: newGold });
  } catch (err) {
    req.log.error({ err }, "Error selling item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/use", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: "itemId required" });

    const character = await getOrCreateCharacter(req.characterId);

    const [invItem] = await db.select().from(inventoryTable)
      .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
      .limit(1);

    if (!invItem) return res.status(404).json({ error: "Item not in inventory" });

    const itemData = invItem.itemData as Record<string, unknown>;
    const type = (itemData.type as string) ?? "";
    if (type !== "consumable") return res.status(400).json({ error: "Item is not consumable" });

    const stats = (itemData.stats as Record<string, number>) ?? {};
    const healthGain = stats.health ?? 0;
    const powerGain  = stats.power  ?? 0;

    const newHp  = Math.min(character.maxHealth, character.health + healthGain);
    const newPwr = Math.min(character.maxPower,  character.power  + powerGain);

    await db.update(charactersTable).set({ health: newHp, power: newPwr, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    if (invItem.quantity <= 1) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, invItem.id));
    } else {
      await db.update(inventoryTable).set({ quantity: invItem.quantity - 1 }).where(eq(inventoryTable.id, invItem.id));
    }

    return res.json({ health: newHp, maxHealth: character.maxHealth, power: newPwr, maxPower: character.maxPower, healthGain, powerGain });
  } catch (err) {
    req.log.error({ err }, "Error using item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/sell-all", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(req.characterId);
    const items = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));

    if (items.length === 0) {
      return res.json({ goldEarned: 0, newGoldTotal: character.gold, itemCount: 0, skippedCount: 0 });
    }

    let goldEarned = 0;
    let skippedCount = 0;
    const sellableIds: number[] = [];

    for (const invItem of items) {
      const itemData = invItem.itemData as Record<string, unknown>;
      const staticItem = getItemById(invItem.itemId);
      if (isNoSell(staticItem ?? itemData)) { skippedCount++; continue; }
      const sellPrice = staticItem?.sellPrice ?? (typeof itemData?.sellPrice === "number" ? itemData.sellPrice : 0);
      goldEarned += Math.max(1, sellPrice) * invItem.quantity;
      sellableIds.push(invItem.id);
    }

    for (const id of sellableIds) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, id));
    }

    const newGold = character.gold + goldEarned;
    await db.update(charactersTable).set({ gold: newGold, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    return res.json({ goldEarned, newGoldTotal: newGold, itemCount: sellableIds.length, skippedCount });
  } catch (err) {
    req.log.error({ err }, "Error selling all items");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
