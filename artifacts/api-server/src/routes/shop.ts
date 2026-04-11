import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, inventoryTable, ghostMarketDemandTable } from "@workspace/db/schema";
import { SHOP_ITEMS, ADORNMENTS } from "../lib/eq2Data.js";
import { getItemById, ITEMS } from "../lib/gameData.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, and } from "drizzle-orm";
import { progressCollectObjectives } from "../lib/questProgress.js";
import { getMerchantStock, computeAuthoritativeBuyPrice, serializeForDb, markMerchantItemSold, isMerchantItemSoldOut } from "../lib/proceduralItems.js";

const router: IRouter = Router();

const MOUNT_ITEMS = [
  { id: "horse_brown", name: "Brown Horse", type: "mount" as const, slot: "none", rarity: "common" as const, level: 1, stats: {}, sellPrice: 500, buyPrice: 1000, spriteId: "mount_horse_brown", description: "A sturdy riding horse" },
  { id: "horse_black", name: "Black Stallion", type: "mount" as const, slot: "none", rarity: "uncommon" as const, level: 10, stats: {}, sellPrice: 1250, buyPrice: 2500, spriteId: "mount_horse_black", description: "A magnificent black stallion" },
  { id: "wolf_grey", name: "Grey Wolf", type: "mount" as const, slot: "none", rarity: "uncommon" as const, level: 15, stats: {}, sellPrice: 1500, buyPrice: 3000, spriteId: "mount_wolf_grey", description: "A large trained direwolf" },
  { id: "magic_carpet", name: "Magic Carpet", type: "mount" as const, slot: "none", rarity: "rare" as const, level: 30, stats: {}, sellPrice: 6000, buyPrice: 12000, spriteId: "mount_carpet", description: "An enchanted flying carpet" },
];

// ─── Demand → price multiplier ────────────────────────────────────────────────
// demandScore 0–100 → multiplier 0.90–1.15

function demandMultiplier(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  // score 0   → 0.90 (-10%)
  // score 50  → 1.00 (normal)
  // score 100 → 1.15 (+15%)
  return 0.90 + (clamped / 100) * 0.25;
}

async function getMarketMultipliers(): Promise<Record<string, number>> {
  try {
    const rows = await db.select().from(ghostMarketDemandTable);
    const multipliers: Record<string, number> = {};
    for (const row of rows) {
      multipliers[row.category] = demandMultiplier(row.demandScore);
    }
    return multipliers;
  } catch {
    return {};
  }
}

// ─── GET /shop/market-pulse ──────────────────────────────────────────────────

router.get("/shop/market-pulse", async (_req, res) => {
  try {
    const rows = await db.select().from(ghostMarketDemandTable);

    const result = rows.map(row => {
      const score = row.demandScore;
      let trend: "high" | "normal" | "low";
      if (score >= 60) trend = "high";
      else if (score >= 20) trend = "normal";
      else trend = "low";
      return {
        category:    row.category,
        demandScore: Math.round(score),
        trend,
        multiplier:  parseFloat(demandMultiplier(score).toFixed(3)),
      };
    });

    // Ensure all known categories are present even with 0 demand
    const CATEGORIES = ["consumables", "weapons", "armor", "mounts", "materials", "adornments", "accessories"];
    for (const cat of CATEGORIES) {
      if (!result.find(r => r.category === cat)) {
        result.push({ category: cat, demandScore: 0, trend: "low", multiplier: 0.9 });
      }
    }

    return res.json(result);
  } catch (err) {
    console.error("Error getting market pulse", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /shop ────────────────────────────────────────────────────────────────

router.get("/shop", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const zone = (req.query.zone as string) || character.zone;
    const category = req.query.category as string | undefined;

    const shopItems = SHOP_ITEMS.filter(si => {
      const zoneMatch = si.zones.some(z => z.toLowerCase() === zone.toLowerCase()) || si.zones.includes("all");
      const catMatch = !category || si.category === category;
      return zoneMatch && catMatch;
    });

    const multipliers = await getMarketMultipliers();

    const items = shopItems.map(si => {
      let item: any = getItemById(si.itemId);
      if (!item) {
        const mountItem = MOUNT_ITEMS.find(m => m.id === si.itemId);
        const adornItem = ADORNMENTS.find(a => a.id === si.itemId);
        if (mountItem) item = mountItem;
        else if (adornItem) {
          const adornStats: Record<string, number> = {};
          for (const { stat, value } of adornItem.stats) adornStats[stat] = (adornStats[stat] ?? 0) + value;
          item = { id: adornItem.id, name: adornItem.name, type: "adornment", slot: adornItem.slotType, rarity: "uncommon", level: adornItem.level, stats: adornStats, sellPrice: Math.floor(si.buyPrice * 0.4), buyPrice: si.buyPrice, spriteId: adornItem.spriteId, description: adornItem.description };
        }
      }
      if (!item) return null;

      // Apply market demand multiplier to price
      const mult = multipliers[si.category] ?? 1.0;
      const adjustedPrice = Math.round(si.buyPrice * mult);

      return {
        item: { ...item, buyPrice: adjustedPrice },
        buyPrice: adjustedPrice,
        basePrice: si.buyPrice,
        stock: 99,
        category: si.category,
      };
    }).filter(Boolean);

    const merchantNames: Record<string, string> = {
      "Commonlands": "Merchant Tolin", "Antonica": "Trader Aelwyn",
      "Thundering Steppes": "Quartermaster Dak", "Nektulos Forest": "Dark Trader Xel",
      "Everfrost Peaks": "Frost Merchant Bjorn", "Lavastorm Mountains": "Infernal Trader Gar",
    };

    // ── Traveling Merchant procedural stock ──────────────────────────────────
    // Stock is session-scoped: generated once per (characterId, zone, level), cached in memory.
    // The buy endpoint uses the same getMerchantStock call with character's authoritative values.
    // Each slot is limited: once purchased it is marked sold-out server-side.
    const charIdStr = String(character.id);
    const travelingStock = getMerchantStock(charIdStr, character.zone, character.level);
    const travelingItems = travelingStock.map((procItem, idx) => {
      const buyPrice = computeAuthoritativeBuyPrice(procItem.sellPrice);
      const soldOut = isMerchantItemSoldOut(charIdStr, character.zone, character.level, idx);
      return {
        item: { ...procItem, buyPrice },
        buyPrice,
        basePrice: procItem.sellPrice,
        stock: soldOut ? 0 : 1,
        soldOut,
        category: procItem.type === "weapon" ? "weapons" : procItem.type === "armor" ? "armor" : "accessories",
        procedural: true,
        stockIndex: idx, // client uses this to buy — no item payload needed
      };
    });

    return res.json({
      merchantName: merchantNames[zone] || "General Merchant",
      zone,
      categories: [...new Set(shopItems.map(s => s.category))],
      items,
      travelingMerchant: {
        name: "Traveling Merchant Zaxis",
        items: travelingItems,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error getting shop");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /shop/buy ───────────────────────────────────────────────────────────

router.post("/shop/buy", async (req, res) => {
  try {
    const { itemId, quantity = 1, merchantStockIndex } = req.body;
    const character = await getOrCreateCharacter(req.characterId);

    // ── Procedural Traveling Merchant purchase (server-authoritative) ──────────
    // Client sends only merchantStockIndex; all other context (zone, level, character)
    // is sourced exclusively from the server-side character record.
    // The server regenerates the identical session-cached stock list and looks up the
    // item by slot index — no client-supplied item data, zone, or level is accepted.
    if (merchantStockIndex !== undefined && merchantStockIndex !== null) {
      const idx = Number(merchantStockIndex);

      if (!Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ success: false, message: "Invalid stock index", goldSpent: 0, newGoldTotal: character.gold });
      }

      // Use character's authoritative zone + level to regenerate the exact same session-cached stock
      const charId = String(character.id);
      const stock = getMerchantStock(charId, character.zone, character.level);
      const procItem = stock[idx];
      if (!procItem) {
        return res.status(404).json({ success: false, message: "Stock item not found", goldSpent: 0, newGoldTotal: character.gold });
      }

      // Enforce sold-out: each slot can only be purchased once per session
      if (isMerchantItemSoldOut(charId, character.zone, character.level, idx)) {
        return res.json({ success: false, message: "That item is sold out!", goldSpent: 0, newGoldTotal: character.gold });
      }

      const price = computeAuthoritativeBuyPrice(procItem.sellPrice);
      const totalCost = price; // limited stock: always qty 1

      if (character.gold < totalCost) {
        return res.json({ success: false, message: "Not enough gold!", goldSpent: 0, newGoldTotal: character.gold });
      }

      const newGold = character.gold - totalCost;
      await db.update(charactersTable).set({ gold: newGold, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

      const [existing] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, procItem.id)));
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + 1 }).where(eq(inventoryTable.id, existing.id));
      } else {
        await db.insert(inventoryTable).values({ characterId: character.id, itemId: procItem.id, itemData: serializeForDb(procItem), quantity: 1 });
      }

      // Mark this slot as sold-out so it cannot be bought again this session
      markMerchantItemSold(charId, character.zone, character.level, idx);

      progressCollectObjectives(procItem.name).catch(() => {});
      return res.json({ success: true, message: `Purchased ${procItem.name} for ${totalCost}g`, goldSpent: totalCost, newGoldTotal: newGold });
    }

    const shopItem = SHOP_ITEMS.find(si => si.itemId === itemId);
    if (!shopItem) {
      return res.status(404).json({ success: false, message: "Item not in shop", goldSpent: 0, newGoldTotal: character.gold });
    }

    // Apply current market multiplier to buy price
    const multipliers = await getMarketMultipliers();
    const mult = multipliers[shopItem.category] ?? 1.0;
    const adjustedPrice = Math.round(shopItem.buyPrice * mult);
    const totalCost = adjustedPrice * (quantity as number);

    if (character.gold < totalCost) {
      return res.json({ success: false, message: "Not enough gold!", goldSpent: 0, newGoldTotal: character.gold });
    }

    const newGold = character.gold - totalCost;
    await db.update(charactersTable).set({ gold: newGold, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    const staticItem = getItemById(itemId);
    let itemData: Record<string, unknown> | undefined = staticItem
      ? (staticItem as unknown as Record<string, unknown>)
      : undefined;
    if (!itemData) {
      const adorn = ADORNMENTS.find(a => a.id === itemId);
      if (adorn) {
        const adornStats: Record<string, number> = {};
        for (const { stat, value } of adorn.stats) adornStats[stat] = (adornStats[stat] ?? 0) + value;
        itemData = {
          id: adorn.id, name: adorn.name, type: "adornment", slot: adorn.slotType,
          rarity: "uncommon", level: adorn.level,
          stats: adornStats,
          sellPrice: Math.floor(shopItem.buyPrice * 0.4),
          spriteId: adorn.spriteId,
        };
      }
    }

    const qty = Number(quantity) || 1;
    if (itemData) {
      const [existing] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, itemId)));
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + qty }).where(eq(inventoryTable.id, existing.id));
      } else {
        await db.insert(inventoryTable).values({ characterId: character.id, itemId, itemData, quantity: qty });
      }
    }

    const boughtName = (itemData?.name as string | undefined) ?? itemId;
    progressCollectObjectives(boughtName).catch(() => {});

    return res.json({ success: true, message: `Purchased ${quantity}x ${itemId} for ${totalCost}g`, goldSpent: totalCost, newGoldTotal: newGold });
  } catch (err) {
    req.log.error({ err }, "Error buying item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
