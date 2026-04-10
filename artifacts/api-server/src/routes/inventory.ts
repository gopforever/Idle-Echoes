import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, inventoryTable, aaPointsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { getItemById, type Item } from "../lib/gameData.js";
import { getOrCreateCharacter } from "./character.js";
import { computeStats, applyAABonuses, makeZeroAABonuses } from "../lib/eq2Formulas.js";
import { AA_TABS } from "../lib/eq2Data.js";

const ALL_AA_NODES = AA_TABS.flatMap((tab: { nodes: unknown[] }) => tab.nodes) as Array<{ id: string; effect: string; effectValue: number; effectPerRank: number }>;

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

async function recomputeMaxStats(
  character: Awaited<ReturnType<typeof getOrCreateCharacter>>,
  gear: Record<string, unknown>,
): Promise<{ newMaxHealth: number; newMaxPower: number }> {
  const baseStats = character.baseStats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };

  const nodeDefsMap = new Map(ALL_AA_NODES.map(n => [n.id, n]));
  const investedRows = await db.select().from(aaPointsTable).where(and(eq(aaPointsTable.characterId, character.id), gt(aaPointsTable.rank, 0)));
  const investedNodes = investedRows
    .map((r: { nodeId: string; rank: number }) => {
      const def = nodeDefsMap.get(r.nodeId);
      if (!def) return null;
      return { effect: def.effect, currentRank: r.rank, effectValue: def.effectValue, effectPerRank: def.effectPerRank };
    })
    .filter((n): n is { effect: string; currentRank: number; effectValue: number; effectPerRank: number } => n !== null);
  const aaBonuses = investedNodes.length > 0 ? applyAABonuses(investedNodes) : makeZeroAABonuses();

  let gearHealth = 0, gearPower = 0;
  let gearAttackRating = 0, gearDefenseRating = 0, gearMitigation = 0;
  let gearHaste = 0, gearCritChance = 0, gearCritBonus = 0;
  let gearWeaponDamageMin = 0, gearWeaponDamageMax = 0, gearWeaponDelay = 2.0;
  let hasWeapon = false;
  let gearStrength = 0, gearAgility = 0, gearStamina = 0;
  let gearIntelligence = 0, gearWisdom = 0, gearCharisma = 0;

  for (const slotValue of Object.values(gear)) {
    let s: Record<string, number> | null = null;
    if (typeof slotValue === "string") {
      const it = getItemById(slotValue);
      if (it?.stats) s = it.stats as Record<string, number>;
    } else if (slotValue && typeof slotValue === "object") {
      const obj = slotValue as Record<string, unknown>;
      if (obj.stats && typeof obj.stats === "object") s = obj.stats as Record<string, number>;
    }
    if (!s) continue;
    gearHealth        += s.health        || 0;
    gearPower         += s.power         || 0;
    gearAttackRating  += s.attackRating  || 0;
    gearDefenseRating += s.defenseRating || 0;
    gearMitigation    += s.mitigation    || 0;
    gearHaste         += s.haste         || 0;
    gearCritChance    += s.critChance    || 0;
    gearCritBonus     += s.critBonus     || 0;
    gearStrength      += s.strength      || 0;
    gearAgility       += s.agility       || 0;
    gearStamina       += s.stamina       || 0;
    gearIntelligence  += s.intelligence  || 0;
    gearWisdom        += s.wisdom        || 0;
    gearCharisma      += s.charisma      || 0;
    if (s.weaponDamageMin) {
      gearWeaponDamageMin = s.weaponDamageMin;
      gearWeaponDamageMax = s.weaponDamageMax || s.weaponDamageMin * 2;
      gearWeaponDelay = s.weaponDelay || 2.0;
      hasWeapon = true;
    }
  }

  if (!hasWeapon) {
    gearWeaponDamageMin = baseStats.strength * 0.5 + character.level;
    gearWeaponDamageMax = baseStats.strength * 1.0 + character.level * 2;
  }

  const computed = computeStats({
    level: character.level, ...baseStats,
    gearAttackRating, gearDefenseRating, gearMitigation,
    gearHaste, gearCritChance, gearCritBonus,
    gearWeaponDamageMin, gearWeaponDamageMax, gearWeaponDelay,
    gearHealth, gearPower,
    gearStrength, gearAgility, gearStamina, gearIntelligence, gearWisdom, gearCharisma,
    archetype: (character.archetype ?? "Fighter"),
  }, aaBonuses);

  const effStamina = baseStats.stamina + gearStamina;
  const newMaxHealth = Math.max(1, Math.floor(
    (effStamina * 10 + 50 + (character.level - 1) * 15 + gearHealth)
    * (1 + aaBonuses.maxHpPercent / 100)
  ));
  const newMaxPower = computed.totalPower;

  return { newMaxHealth, newMaxPower };
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
    const { newMaxHealth, newMaxPower } = await recomputeMaxStats(character, gear);
    const newHealth = Math.min(character.health, newMaxHealth);
    const newPower  = Math.min(character.power,  newMaxPower);
    await db.update(charactersTable).set({ gear, maxHealth: newMaxHealth, maxPower: newMaxPower, health: newHealth, power: newPower, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

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
    const { newMaxHealth, newMaxPower } = await recomputeMaxStats(character, gear);
    const newHealth = Math.min(character.health, newMaxHealth);
    const newPower  = Math.min(character.power,  newMaxPower);
    await db.update(charactersTable).set({ gear, maxHealth: newMaxHealth, maxPower: newMaxPower, health: newHealth, power: newPower, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

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
    const sellableIds: number[] = [];

    for (const invItem of items) {
      const itemData = invItem.itemData as Record<string, unknown>;
      const staticItem = getItemById(invItem.itemId);
      const sellPrice = staticItem?.sellPrice ?? (typeof itemData?.sellPrice === "number" ? itemData.sellPrice : 0);
      goldEarned += Math.max(1, sellPrice) * invItem.quantity;
      sellableIds.push(invItem.id);
    }

    for (const id of sellableIds) {
      await db.delete(inventoryTable).where(eq(inventoryTable.id, id));
    }

    const newGold = character.gold + goldEarned;
    await db.update(charactersTable).set({ gold: newGold, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    return res.json({ goldEarned, newGoldTotal: newGold, itemCount: sellableIds.length, skippedCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Error selling all items");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
