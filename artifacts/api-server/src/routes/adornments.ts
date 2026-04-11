import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adornmentsTable, inventoryTable, charactersTable } from "@workspace/db/schema";
import { ADORNMENTS } from "../lib/eq2Data.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// Map adornment color to its socket index (one white/yellow/red slot per gear piece)
const COLOR_SLOT_INDEX: Record<string, number> = { white: 0, yellow: 1, red: 2 };

// Canonical backend gear slot names grouped by type
const WEAPON_SLOTS = new Set(["primary", "secondary"]);
const ARMOR_SLOTS  = new Set(["head", "shoulder", "chest", "hands", "legs", "feet", "waist", "back", "wrist", "neck", "ringLeft", "ringRight", "earLeft", "earRight", "charm"]);

/** Build a single merged stats object from an AdornmentDefinition's stats array. */
function adornStatsToObject(stats: { stat: string; value: number }[]): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const { stat, value } of stats) {
    obj[stat] = (obj[stat] ?? 0) + value;
  }
  return obj;
}

router.get("/adornments", async (req, res) => {
  try {
    const characterId = req.characterId;
    const inventory = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
    const owned = inventory.filter(i => {
      const data = i.itemData as any;
      return data?.type === "adornment" || ADORNMENTS.some(a => a.id === i.itemId);
    });

    const result = owned.map(i => {
      const adorn = ADORNMENTS.find(a => a.id === i.itemId);
      if (!adorn) return null;
      return {
        id: adorn.id, name: adorn.name, description: adorn.description,
        color: adorn.color, stats: adorn.stats,
        slotType: adorn.slotType, level: adorn.level, spriteId: adorn.spriteId,
        quantity: i.quantity,
      };
    }).filter(Boolean);

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting adornments");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/adornments/catalog", async (req, res) => {
  try {
    const characterId = req.characterId;
    const inventory = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
    const appliedRows = await db.select().from(adornmentsTable).where(eq(adornmentsTable.characterId, characterId));

    const ownedMap = new Map<string, number>();
    for (const i of inventory) {
      if (ADORNMENTS.some(a => a.id === i.itemId)) {
        ownedMap.set(i.itemId, i.quantity);
      }
    }

    const appliedMap = new Map<string, string>();
    for (const a of appliedRows) {
      appliedMap.set(a.adornmentId, a.gearSlot);
    }

    const catalog = ADORNMENTS.map(adorn => ({
      id: adorn.id, name: adorn.name, description: adorn.description,
      color: adorn.color, stats: adorn.stats,
      slotType: adorn.slotType, level: adorn.level, spriteId: adorn.spriteId,
      owned: ownedMap.get(adorn.id) ?? 0,
      appliedTo: appliedMap.get(adorn.id) ?? null,
    }));

    return res.json(catalog);
  } catch (err) {
    req.log.error({ err }, "Error getting adornment catalog");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/adornments/applied", async (req, res) => {
  try {
    const characterId = req.characterId;
    const rows = await db.select().from(adornmentsTable).where(eq(adornmentsTable.characterId, characterId));
    const result = rows.map(r => {
      const adorn = ADORNMENTS.find(a => a.id === r.adornmentId);
      return { gearSlot: r.gearSlot, slotIndex: r.slotIndex, adornmentId: r.adornmentId, adornment: adorn ?? null };
    });
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting applied adornments");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/adornments/apply", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { adornmentId, gearSlot } = req.body;

    const adorn = ADORNMENTS.find(a => a.id === adornmentId);
    if (!adorn) return res.status(404).json({ success: false, message: "Adornment not found" });

    // Enforce character level requirement
    const [character] = await db.select({ level: charactersTable.level }).from(charactersTable).where(eq(charactersTable.id, characterId)).limit(1);
    if (!character || character.level < adorn.level) {
      return res.json({ success: false, message: `Requires level ${adorn.level}` });
    }

    // Validate slotType vs gearSlot
    if (adorn.slotType === "weapon" && !WEAPON_SLOTS.has(gearSlot) && !ARMOR_SLOTS.has(gearSlot) === false) {
      if (!WEAPON_SLOTS.has(gearSlot)) {
        return res.json({ success: false, message: "Weapon adornments can only be applied to weapon slots." });
      }
    }
    if (adorn.slotType === "armor" && WEAPON_SLOTS.has(gearSlot)) {
      return res.json({ success: false, message: "Armor adornments cannot be applied to weapon slots." });
    }

    const [invItem] = await db.select().from(inventoryTable).where(
      and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, adornmentId))
    );
    if (!invItem || invItem.quantity < 1) return res.json({ success: false, message: "You don't have that adornment" });

    // Each color occupies its own socket index; replace only the same-color socket
    const slotIndex = COLOR_SLOT_INDEX[adorn.color] ?? 0;
    await db.delete(adornmentsTable).where(
      and(eq(adornmentsTable.characterId, characterId), eq(adornmentsTable.gearSlot, gearSlot), eq(adornmentsTable.slotIndex, slotIndex))
    );
    await db.insert(adornmentsTable).values({ characterId, gearSlot, slotIndex, adornmentId });

    if (invItem.quantity <= 1) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, invItem.id));
    } else {
      await db.update(inventoryTable).set({ quantity: invItem.quantity - 1 }).where(eq(inventoryTable.id, invItem.id));
    }

    return res.json({ success: true, message: `${adorn.name} applied to ${gearSlot}` });
  } catch (err) {
    req.log.error({ err }, "Error applying adornment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/adornments/remove", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { gearSlot, slotIndex } = req.body;
    if (!gearSlot) return res.status(400).json({ success: false, message: "gearSlot required" });

    if (slotIndex !== undefined && slotIndex !== null) {
      // Remove only the specific color socket
      await db.delete(adornmentsTable).where(
        and(eq(adornmentsTable.characterId, characterId), eq(adornmentsTable.gearSlot, gearSlot), eq(adornmentsTable.slotIndex, slotIndex))
      );
    } else {
      // Remove all adornments on the slot (legacy behaviour)
      await db.delete(adornmentsTable).where(
        and(eq(adornmentsTable.characterId, characterId), eq(adornmentsTable.gearSlot, gearSlot))
      );
    }
    return res.json({ success: true, message: `Adornment removed from ${gearSlot}` });
  } catch (err) {
    req.log.error({ err }, "Error removing adornment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { adornStatsToObject };
export default router;
