import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryTable, knownRecipesTable, recipesTable, craftQueueTable, charactersTable, gatheringBagItemsTable, bankItemsTable } from "@workspace/db/schema";
import { eq, and, sql, lte, inArray, isNull } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { TRADESKILL_MATERIALS, APPRENTICE_RECIPES, MASTER_RECIPES, JOURNEYMAN_TS_RECIPES, ALL_MASTER_RECIPE_NAMES, TRADESKILL_CLASSES, type TradeskillClass } from "../lib/tradeskillData.js";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradeskillMap {
  weaponsmith: number;
  armorer: number;
  tailor: number;
  jeweler: number;
  alchemist: number;
}

function defaultTradeskills(): Record<string, number> {
  return { weaponsmith: 0, armorer: 0, tailor: 0, jeweler: 0, alchemist: 0 };
}

/** XP → skill level: level = floor(sqrt(totalXp / 25)), capped at 100 */
function xpToSkillLevel(xp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(xp / 25)));
}

// ─── Seed recipes on startup (idempotent by name, all tiers) ─────────────────

let seeded = false;

async function seedRecipesIfNeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    // Fetch all existing recipe names once, then seed each tier idempotently.
    const existing = await db.select({ name: recipesTable.name }).from(recipesTable);
    const existingNames = new Set(existing.map(r => r.name));

    // Seed apprentice recipes (idempotent by name)
    const newApprenticeRows = APPRENTICE_RECIPES
      .filter(r => !existingNames.has(r.name))
      .map(r => ({
        name: r.name,
        tradeskillClass: r.tradeskillClass,
        tier: r.tier,
        minSkill: r.minSkill,
        minLevel: r.minLevel,
        craftTimeSeconds: r.craftTimeSeconds,
        ingredients: r.ingredients,
        output: r.output,
        acquisitionType: r.acquisitionType,
        vendorCost: r.vendorCost,
        isOoak: false,
      }));
    if (newApprenticeRows.length > 0) {
      await db.insert(recipesTable).values(newApprenticeRows);
      console.log(`[tradeskills] Seeded ${newApprenticeRows.length} apprentice recipes.`);
    }

    // Seed journeyman recipes (idempotent by name)
    const newJourneymanTsRows = JOURNEYMAN_TS_RECIPES
      .filter(r => !existingNames.has(r.name))
      .map(r => ({
        name: r.name,
        tradeskillClass: r.tradeskillClass,
        tier: r.tier,
        minSkill: r.minSkill,
        minLevel: r.minLevel,
        craftTimeSeconds: r.craftTimeSeconds,
        ingredients: r.ingredients,
        output: r.output,
        acquisitionType: r.acquisitionType,
        vendorCost: null,
        isOoak: false,
      }));
    if (newJourneymanTsRows.length > 0) {
      await db.insert(recipesTable).values(newJourneymanTsRows);
      console.log(`[tradeskills] Seeded ${newJourneymanTsRows.length} journeyman recipes.`);
    }

    // Seed master recipes (idempotent by name)
    const newMasterRows = MASTER_RECIPES
      .filter(r => !existingNames.has(r.name))
      .map(r => ({
        name: r.name,
        tradeskillClass: r.tradeskillClass,
        tier: r.tier,
        minSkill: r.minSkill,
        minLevel: r.minLevel,
        craftTimeSeconds: r.craftTimeSeconds,
        ingredients: r.ingredients,
        output: r.output,
        acquisitionType: r.acquisitionType,
        vendorCost: null,
        isOoak: false,
      }));
    if (newMasterRows.length > 0) {
      await db.insert(recipesTable).values(newMasterRows);
      console.log(`[tradeskills] Seeded ${newMasterRows.length} master recipes.`);
    }
  } catch (err) {
    seeded = false; // allow retry
    console.error("[tradeskills] Seed error:", err);
  }
}

// Kick off seed immediately
seedRecipesIfNeeded();

// ─── Quality variance helpers ─────────────────────────────────────────────────

const MASTERWORK_CHANCE_PER_LEVEL = 0.015;

const MASTERWORK_SUFFIXES = [
  "of the Fallen", "the Unbroken", "of Ashveil", "the Eternal",
  "of the Ember Court", "the Relentless", "of Duskmantle", "the Unyielding",
  "of the Voidborn", "the Ancient", "of the Shattered Keep", "the Undying",
  "of Grimhallow", "the Forsaken", "of the Iron Pact", "the Resolute",
  "of Nightfall", "the Immovable", "of the Storm's Eye", "the Boundless",
  "of the Ashen Vale", "the Inexorable",
];

/**
 * Returns a random quality multiplier for a crafted stat based on skill level.
 *
 * Tier thresholds and variance ranges:
 *  - Skill  0–49 : [0.85, 1.15] — wide variance, outcomes can be poor or fine
 *  - Skill 50–89 : [0.95, 1.15] — narrower floor, min poor outcome removed
 *  - Skill 90–100: [1.00, 1.20] — guaranteed at-or-above baseline, high ceiling
 */
function computeQualityMultiplier(skillLevel: number): number {
  let min: number, max: number;
  if (skillLevel >= 90) { min = 1.0; max = 1.20; }
  else if (skillLevel >= 50) { min = 0.95; max = 1.15; }
  else { min = 0.85; max = 1.15; }
  return min + Math.random() * (max - min);
}

function qualityLabel(avgMult: number): "poor" | "normal" | "fine" | "excellent" {
  if (avgMult < 0.92) return "poor";
  if (avgMult < 1.04) return "normal";
  if (avgMult < 1.12) return "fine";
  return "excellent";
}

// ─── Inventory helpers ────────────────────────────────────────────────────────

/**
 * Returns a map of itemId → total quantity across inventory, gathering bag, and bank.
 */
async function getTotalItemMap(characterId: number): Promise<Map<string, number>> {
  const [invRows, bagRows, bankRows] = await Promise.all([
    db
      .select({ itemId: inventoryTable.itemId, quantity: inventoryTable.quantity })
      .from(inventoryTable)
      .where(eq(inventoryTable.characterId, characterId)),
    db
      .select({ itemId: gatheringBagItemsTable.itemId, quantity: gatheringBagItemsTable.quantity })
      .from(gatheringBagItemsTable)
      .where(eq(gatheringBagItemsTable.characterId, characterId)),
    db
      .select({ itemId: bankItemsTable.itemId, quantity: bankItemsTable.quantity })
      .from(bankItemsTable)
      .where(eq(bankItemsTable.characterId, characterId)),
  ]);
  const map = new Map<string, number>();
  for (const row of [...invRows, ...bagRows, ...bankRows]) {
    map.set(row.itemId, (map.get(row.itemId) ?? 0) + row.quantity);
  }
  return map;
}

/**
 * Deduct ingredients from inventory first, then gathering bag, then bank.
 * Returns false if insufficient materials across all sources (no partial deduction).
 */
async function deductIngredients(
  characterId: number,
  ingredients: Array<{ itemId: string; quantity: number }>,
): Promise<boolean> {
  // Verify totals are available across all three sources before touching anything
  const totalMap = await getTotalItemMap(characterId);
  for (const ing of ingredients) {
    if ((totalMap.get(ing.itemId) ?? 0) < ing.quantity) return false;
  }

  // Deduct each ingredient: inventory → gathering bag → bank
  for (const ing of ingredients) {
    let remaining = ing.quantity;

    // 1. Drain from inventory
    if (remaining > 0) {
      const rows = await db
        .select()
        .from(inventoryTable)
        .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, ing.itemId)));
      for (const row of rows) {
        if (remaining <= 0) break;
        if (row.quantity <= remaining) {
          remaining -= row.quantity;
          await db.delete(inventoryTable).where(eq(inventoryTable.id, row.id));
        } else {
          await db.update(inventoryTable).set({ quantity: row.quantity - remaining }).where(eq(inventoryTable.id, row.id));
          remaining = 0;
        }
      }
    }

    // 2. Drain from gathering bag
    if (remaining > 0) {
      const [bagRow] = await db
        .select()
        .from(gatheringBagItemsTable)
        .where(and(eq(gatheringBagItemsTable.characterId, characterId), eq(gatheringBagItemsTable.itemId, ing.itemId)))
        .limit(1);
      if (bagRow) {
        const take = Math.min(bagRow.quantity, remaining);
        remaining -= take;
        if (bagRow.quantity <= take) {
          await db.delete(gatheringBagItemsTable).where(eq(gatheringBagItemsTable.id, bagRow.id));
        } else {
          await db.update(gatheringBagItemsTable).set({ quantity: bagRow.quantity - take }).where(eq(gatheringBagItemsTable.id, bagRow.id));
        }
      }
    }

    // 3. Drain from bank
    if (remaining > 0) {
      const [bankRow] = await db
        .select()
        .from(bankItemsTable)
        .where(and(eq(bankItemsTable.characterId, characterId), eq(bankItemsTable.itemId, ing.itemId)))
        .limit(1);
      if (bankRow) {
        const take = Math.min(bankRow.quantity, remaining);
        remaining -= take;
        if (bankRow.quantity <= take) {
          await db.delete(bankItemsTable).where(eq(bankItemsTable.id, bankRow.id));
        } else {
          await db.update(bankItemsTable).set({ quantity: bankRow.quantity - take }).where(eq(bankItemsTable.id, bankRow.id));
        }
      }
    }
  }
  return true;
}

/**
 * Refund ingredients back to inventory (used when cancelling a craft).
 */
async function refundIngredients(
  characterId: number,
  ingredients: Array<{ itemId: string; quantity: number }>,
): Promise<void> {
  for (const ing of ingredients) {
    const [existing] = await db
      .select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.characterId, characterId),
          eq(inventoryTable.itemId, ing.itemId),
        ),
      )
      .limit(1);
    if (existing) {
      await db
        .update(inventoryTable)
        .set({ quantity: existing.quantity + ing.quantity })
        .where(eq(inventoryTable.id, existing.id));
    } else {
      await db.insert(inventoryTable).values({
        characterId,
        itemId: ing.itemId,
        quantity: ing.quantity,
        itemData: { id: ing.itemId, name: ing.itemId },
      });
    }
  }
}

/** Add a crafted item output to inventory */
async function addCraftedItem(
  characterId: number,
  output: {
    name: string;
    description: string;
    type: string;
    slot: string;
    rarity: string;
    stats: Record<string, number>;
    sellPrice: number;
    armorType?: string;
    quantity: number;
    spriteId?: string;
    stackable?: boolean;
    effect?: { type: string; value: number };
  },
  recipeName: string,
  meta?: { quality?: string; isMasterwork?: boolean; suffix?: string },
): Promise<void> {
  const craftedItemId = `crafted_${recipeName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
  const itemData: Record<string, unknown> = {
    id: craftedItemId,
    name: output.name,
    description: output.description,
    type: output.type,
    slot: output.slot,
    rarity: output.rarity,
    stats: output.stats,
    sellPrice: output.sellPrice,
    level: 1,
    spriteId: output.spriteId ?? null,
    stackable: output.stackable ?? false,
    crafted: true,
    quality: meta?.quality ?? "normal",
    isMasterwork: meta?.isMasterwork ?? false,
    suffix: meta?.suffix,
  };
  if (output.armorType) itemData.armorType = output.armorType;
  if (output.effect) itemData.effect = output.effect;

  if (output.stackable) {
    // Try to stack with existing
    const [existing] = await db
      .select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.characterId, characterId),
          eq(inventoryTable.itemId, output.name), // use name as stable id for stackables
        ),
      )
      .limit(1);
    if (existing) {
      await db
        .update(inventoryTable)
        .set({ quantity: existing.quantity + output.quantity })
        .where(eq(inventoryTable.id, existing.id));
      return;
    }
    await db.insert(inventoryTable).values({
      characterId,
      itemId: output.name,
      quantity: output.quantity,
      itemData,
    });
  } else {
    await db.insert(inventoryTable).values({
      characterId,
      itemId: craftedItemId,
      quantity: output.quantity,
      itemData,
    });
  }
}

/** Award tradeskill XP and update character */
async function awardTradeskillXp(
  characterId: number,
  tradeskillClass: TradeskillClass,
  xpAmount: number,
): Promise<void> {
  const char = await getOrCreateCharacter(characterId);
  const tradeskills: Record<string, number> = (char.tradeskills as Record<string, number> | null) ?? defaultTradeskills();
  const current = tradeskills[tradeskillClass] ?? 0;
  tradeskills[tradeskillClass] = current + xpAmount;
  await db
    .update(charactersTable)
    .set({ tradeskills })
    .where(eq(charactersTable.id, characterId));
}

// ─── GET /tradeskills/status ──────────────────────────────────────────────────

router.get("/tradeskills/status", async (req, res) => {
  await seedRecipesIfNeeded();
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const char = await getOrCreateCharacter(characterId);
    const tradeskills: Record<string, number> = (char.tradeskills as Record<string, number> | null) ?? defaultTradeskills();

    const [queueCountRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(craftQueueTable)
      .where(
        and(
          eq(craftQueueTable.characterId, characterId),
          eq(craftQueueTable.status, "crafting"),
        ),
      );

    const tradeskillLevels: Record<string, { xp: number; level: number }> = {};
    for (const cls of TRADESKILL_CLASSES) {
      const xp = tradeskills[cls] ?? 0;
      tradeskillLevels[cls] = { xp, level: xpToSkillLevel(xp) };
    }

    return res.json({
      tradeskillClass: char.tradeskillClass ?? null,
      tradeskills: tradeskillLevels,
      queueCount: queueCountRow?.count ?? 0,
    });
  } catch (err) {
    console.error("[tradeskills] status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /tradeskills/class ──────────────────────────────────────────────────

router.post("/tradeskills/class", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const { tradeskillClass } = req.body as { tradeskillClass?: string };
    if (!tradeskillClass || !(TRADESKILL_CLASSES as readonly string[]).includes(tradeskillClass)) {
      return res.status(400).json({ error: "Invalid tradeskill class" });
    }

    const char = await getOrCreateCharacter(characterId);
    if (char.tradeskillClass) {
      return res.status(400).json({ error: "Tradeskill class already chosen" });
    }

    await db
      .update(charactersTable)
      .set({ tradeskillClass })
      .where(eq(charactersTable.id, characterId));

    return res.json({ tradeskillClass });
  } catch (err) {
    console.error("[tradeskills] class error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tradeskills/vendor/materials ───────────────────────────────────────

router.get("/tradeskills/vendor/materials", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const char = await getOrCreateCharacter(characterId);
    const tsClass = char.tradeskillClass;

    // Return all materials, filtered by class if one is chosen
    const materials = tsClass
      ? TRADESKILL_MATERIALS.filter(m => m.usedBy.includes(tsClass))
      : TRADESKILL_MATERIALS;

    return res.json(materials);
  } catch (err) {
    console.error("[tradeskills] vendor/materials error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /tradeskills/vendor/materials/purchase ─────────────────────────────

router.post("/tradeskills/vendor/materials/purchase", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const { itemId, quantity = 1 } = req.body as { itemId?: string; quantity?: number };
    if (!itemId || quantity < 1) return res.status(400).json({ error: "Invalid itemId or quantity" });

    const material = TRADESKILL_MATERIALS.find(m => m.id === itemId);
    if (!material) return res.status(404).json({ error: "Material not found" });

    const totalCost = material.vendorCost * quantity;
    const char = await getOrCreateCharacter(characterId);
    if (char.gold < totalCost) {
      return res.status(400).json({ error: "Insufficient gold" });
    }

    await db
      .update(charactersTable)
      .set({ gold: char.gold - totalCost })
      .where(eq(charactersTable.id, characterId));

    // Add to inventory
    const [existing] = await db
      .select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.characterId, characterId),
          eq(inventoryTable.itemId, itemId),
        ),
      )
      .limit(1);

    const itemData: Record<string, unknown> = {
      id: itemId,
      name: material.name,
      description: material.description,
      type: "material",
      slot: "none",
      rarity: "common",
      level: 1,
      stats: {},
      sellPrice: Math.floor(material.vendorCost * 0.5),
      spriteId: material.spriteId,
      stackable: true,
    };

    if (existing) {
      await db
        .update(inventoryTable)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(inventoryTable.id, existing.id));
    } else {
      await db.insert(inventoryTable).values({
        characterId,
        itemId,
        quantity,
        itemData,
      });
    }

    return res.json({ success: true, goldSpent: totalCost, quantity });
  } catch (err) {
    console.error("[tradeskills] vendor/materials/purchase error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tradeskills/vendor/recipes ─────────────────────────────────────────

router.get("/tradeskills/vendor/recipes", async (req, res) => {
  await seedRecipesIfNeeded();
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const char = await getOrCreateCharacter(characterId);
    if (!char.tradeskillClass) {
      return res.json([]);
    }

    // All recipes for this class
    const allRecipes = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.tradeskillClass, char.tradeskillClass));

    // Already known recipe IDs
    const known = await db
      .select({ recipeId: knownRecipesTable.recipeId })
      .from(knownRecipesTable)
      .where(eq(knownRecipesTable.characterId, characterId));
    const knownIds = new Set(known.map(k => k.recipeId));

    const available = allRecipes.filter(r => !knownIds.has(String(r.id)));
    return res.json(available);
  } catch (err) {
    console.error("[tradeskills] vendor/recipes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /tradeskills/vendor/recipes/purchase ───────────────────────────────

router.post("/tradeskills/vendor/recipes/purchase", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const { recipeId } = req.body as { recipeId?: number };
    if (!recipeId) return res.status(400).json({ error: "Missing recipeId" });

    const [recipe] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId))
      .limit(1);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const char = await getOrCreateCharacter(characterId);
    if (char.tradeskillClass !== recipe.tradeskillClass) {
      return res.status(403).json({ error: "Wrong tradeskill class for this recipe" });
    }

    const cost = recipe.vendorCost ?? 0;
    if (char.gold < cost) return res.status(400).json({ error: "Insufficient gold" });

    // Check not already known
    const [alreadyKnown] = await db
      .select()
      .from(knownRecipesTable)
      .where(
        and(
          eq(knownRecipesTable.characterId, characterId),
          eq(knownRecipesTable.recipeId, String(recipeId)),
        ),
      )
      .limit(1);
    if (alreadyKnown) return res.status(400).json({ error: "Recipe already known" });

    await db
      .update(charactersTable)
      .set({ gold: char.gold - cost })
      .where(eq(charactersTable.id, characterId));

    await db.insert(knownRecipesTable).values({
      characterId,
      recipeId: String(recipeId),
    });

    return res.json({ success: true, goldSpent: cost });
  } catch (err) {
    console.error("[tradeskills] vendor/recipes/purchase error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tradeskills/recipes ─────────────────────────────────────────────────

router.get("/tradeskills/recipes", async (req, res) => {
  await seedRecipesIfNeeded();
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const known = await db
      .select({ recipeId: knownRecipesTable.recipeId, learnedAt: knownRecipesTable.learnedAt })
      .from(knownRecipesTable)
      .where(eq(knownRecipesTable.characterId, characterId));

    if (known.length === 0) return res.json([]);

    const recipeIds = known.map(k => Number(k.recipeId)).filter(id => !isNaN(id));
    if (recipeIds.length === 0) return res.json([]);

    const recipes = await db
      .select()
      .from(recipesTable)
      .where(inArray(recipesTable.id, recipeIds));

    // Get total item counts across inventory, gathering bag, and bank
    const totalItemMap = await getTotalItemMap(characterId);

    const result = recipes.map(recipe => {
      const ingredients = recipe.ingredients as Array<{ itemId: string; quantity: number }>;
      const ingredientsWithCounts = ingredients.map(ing => ({
        ...ing,
        have: totalItemMap.get(ing.itemId) ?? 0,
        canCraft: (totalItemMap.get(ing.itemId) ?? 0) >= ing.quantity,
      }));
      const canCraft = ingredientsWithCounts.every(i => i.canCraft);

      return {
        ...recipe,
        ingredients: ingredientsWithCounts,
        canCraft,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("[tradeskills] recipes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /tradeskills/queue ──────────────────────────────────────────────────

router.post("/tradeskills/queue", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const { recipeId, quantity = 1 } = req.body as { recipeId?: number; quantity?: number };
    if (!recipeId || quantity < 1) return res.status(400).json({ error: "Invalid recipeId or quantity" });

    // Enforce queue limit of 5 active crafts
    const [qCountRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(craftQueueTable)
      .where(
        and(
          eq(craftQueueTable.characterId, characterId),
          eq(craftQueueTable.status, "crafting"),
        ),
      );
    if ((qCountRow?.count ?? 0) >= 5) {
      return res.status(400).json({ error: "Craft queue is full (max 5)" });
    }

    // Verify character knows this recipe
    const [known] = await db
      .select()
      .from(knownRecipesTable)
      .where(
        and(
          eq(knownRecipesTable.characterId, characterId),
          eq(knownRecipesTable.recipeId, String(recipeId)),
        ),
      )
      .limit(1);
    if (!known) return res.status(403).json({ error: "Recipe not known" });

    const [recipe] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId))
      .limit(1);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const ingredients = recipe.ingredients as Array<{ itemId: string; quantity: number }>;
    // Scale ingredients by quantity
    const scaledIngredients = ingredients.map(ing => ({
      itemId: ing.itemId,
      quantity: ing.quantity * quantity,
    }));

    const ok = await deductIngredients(characterId, scaledIngredients);
    if (!ok) return res.status(400).json({ error: "Insufficient materials" });

    const now = new Date();
    const nextCompletesAt = new Date(now.getTime() + recipe.craftTimeSeconds * 1000);

    const [inserted] = await db
      .insert(craftQueueTable)
      .values({
        characterId,
        recipeId,
        quantity,
        quantityCompleted: 0,
        startedAt: now,
        nextCompletesAt,
        status: "crafting",
      })
      .returning();

    return res.json({ success: true, queueEntry: inserted });
  } catch (err) {
    console.error("[tradeskills] queue POST error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tradeskills/queue ───────────────────────────────────────────────────

router.get("/tradeskills/queue", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const char = await getOrCreateCharacter(characterId);
    const tsClass = char.tradeskillClass as TradeskillClass | null;

    const queue = await db
      .select()
      .from(craftQueueTable)
      .where(
        and(
          eq(craftQueueTable.characterId, characterId),
          eq(craftQueueTable.status, "crafting"),
        ),
      );

    const now = new Date();
    const updatedQueue = [];

    for (const entry of queue) {
      const recipe = await db
        .select()
        .from(recipesTable)
        .where(eq(recipesTable.id, entry.recipeId))
        .then(rows => rows[0]);
      if (!recipe) continue;

      const craftTimeMs = recipe.craftTimeSeconds * 1000;
      const startedAt = entry.startedAt;
      const alreadyCompleted = entry.quantityCompleted;
      const totalQuantity = entry.quantity;

      // How many have completed since start?
      const elapsed = now.getTime() - startedAt.getTime();
      const totalCompleted = Math.min(
        Math.floor(elapsed / craftTimeMs),
        totalQuantity,
      );
      const newlyCompleted = totalCompleted - alreadyCompleted;

      if (newlyCompleted > 0 && tsClass) {
        const output = recipe.output as {
          name: string; description: string; type: string; slot: string; rarity: string;
          stats: Record<string, number>; sellPrice: number; armorType?: string;
          quantity: number; xpGained: number; spriteId?: string; stackable?: boolean;
          effect?: { type: string; value: number };
        };
        const outputPerCraft = output.quantity;

        // Compute tradeskill level for quality variance
        const char = await getOrCreateCharacter(characterId);
        const tradeskillsMap: Record<string, number> = (char.tradeskills as Record<string, number> | null) ?? {};
        const tsXp = tradeskillsMap[tsClass] ?? 0;
        const skillLevel = Math.min(100, Math.floor(Math.sqrt(tsXp / 25)));

        // Roll quality variance for each stat
        const statMultipliers: number[] = [];
        const variedStats: Record<string, number> = {};
        for (const [k, v] of Object.entries(output.stats)) {
          const mult = computeQualityMultiplier(skillLevel);
          statMultipliers.push(mult);
          variedStats[k] = Math.round(v * mult);
        }
        const avgMult = statMultipliers.length > 0
          ? statMultipliers.reduce((a, b) => a + b, 0) / statMultipliers.length
          : 1.0;
        const quality = qualityLabel(avgMult);

        // Masterwork check
        let isMasterwork = false;
        let masterworkSuffix = "";
        if (skillLevel >= 70 && Math.random() < (skillLevel - 69) * MASTERWORK_CHANCE_PER_LEVEL) {
          isMasterwork = true;
          masterworkSuffix = MASTERWORK_SUFFIXES[Math.floor(Math.random() * MASTERWORK_SUFFIXES.length)];
          for (const k of Object.keys(variedStats)) {
            variedStats[k] = Math.round(variedStats[k] * 1.10);
          }
        }
        const finalName = isMasterwork ? `${output.name} ${masterworkSuffix}` : output.name;
        const variedOutput = {
          ...output,
          name: finalName,
          stats: variedStats,
        };

        // Add items to inventory
        await addCraftedItem(characterId, { ...variedOutput, quantity: outputPerCraft * newlyCompleted }, recipe.name, {
          quality,
          isMasterwork,
          suffix: masterworkSuffix || undefined,
        });

        // Award XP
        const totalXp = output.xpGained * newlyCompleted;
        await awardTradeskillXp(characterId, tsClass, totalXp);

        if (totalCompleted >= totalQuantity) {
          // All done
          await db
            .update(craftQueueTable)
            .set({ quantityCompleted: totalQuantity, status: "completed" })
            .where(eq(craftQueueTable.id, entry.id));
        } else {
          // Partially done — compute next completion time
          const nextCompletesAt = new Date(
            startedAt.getTime() + (totalCompleted + 1) * craftTimeMs,
          );
          await db
            .update(craftQueueTable)
            .set({ quantityCompleted: totalCompleted, nextCompletesAt })
            .where(eq(craftQueueTable.id, entry.id));
          updatedQueue.push({
            ...entry,
            quantityCompleted: totalCompleted,
            nextCompletesAt,
            recipeName: recipe.name,
            craftTimeSeconds: recipe.craftTimeSeconds,
          });
        }
      } else if (totalCompleted >= totalQuantity && newlyCompleted === 0 && alreadyCompleted >= totalQuantity) {
        // Already fully completed from a previous poll — mark done
        await db
          .update(craftQueueTable)
          .set({ status: "completed" })
          .where(eq(craftQueueTable.id, entry.id));
      } else {
        updatedQueue.push({
          ...entry,
          recipeName: recipe.name,
          craftTimeSeconds: recipe.craftTimeSeconds,
        });
      }
    }

    return res.json(updatedQueue);
  } catch (err) {
    console.error("[tradeskills] queue GET error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /tradeskills/class ────────────────────────────────────────────────

router.delete("/tradeskills/class", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    // Delete all known recipes for this character
    await db
      .delete(knownRecipesTable)
      .where(eq(knownRecipesTable.characterId, characterId));

    // Delete all active craft queue entries for this character (no refund)
    await db
      .delete(craftQueueTable)
      .where(eq(craftQueueTable.characterId, characterId));

    // Reset tradeskill class and XP on the character
    await db
      .update(charactersTable)
      .set({
        tradeskillClass: null,
        tradeskills: defaultTradeskills(),
      })
      .where(eq(charactersTable.id, characterId));

    return res.json({ success: true });
  } catch (err) {
    console.error("[tradeskills] class DELETE error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /tradeskills/queue/:id ────────────────────────────────────────────

router.delete("/tradeskills/queue/:id", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const queueId = Number(req.params.id);
    if (isNaN(queueId)) return res.status(400).json({ error: "Invalid queue id" });

    const [entry] = await db
      .select()
      .from(craftQueueTable)
      .where(
        and(
          eq(craftQueueTable.id, queueId),
          eq(craftQueueTable.characterId, characterId),
        ),
      )
      .limit(1);

    if (!entry) return res.status(404).json({ error: "Queue entry not found" });
    if (entry.status !== "crafting") return res.status(400).json({ error: "Cannot cancel completed craft" });

    const [recipe] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, entry.recipeId))
      .limit(1);

    // Refund remaining (not-yet-completed) ingredients
    if (recipe) {
      const ingredients = recipe.ingredients as Array<{ itemId: string; quantity: number }>;
      const remaining = entry.quantity - entry.quantityCompleted;
      if (remaining > 0) {
        const scaledIngredients = ingredients.map(ing => ({
          itemId: ing.itemId,
          quantity: ing.quantity * remaining,
        }));
        await refundIngredients(characterId, scaledIngredients);
      }
    }

    await db.delete(craftQueueTable).where(eq(craftQueueTable.id, queueId));

    return res.json({ success: true });
  } catch (err) {
    console.error("[tradeskills] queue DELETE error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /tradeskills/ooak/claim/:recipeId ───────────────────────────────────
// Atomically claims an unclaimed OoaK recipe for the requesting character.
// Only the first caller wins; subsequent callers get "already claimed" error.

router.post("/tradeskills/ooak/claim/:recipeId", async (req, res) => {
  try {
    const characterId = req.characterId;
    if (!characterId) return res.status(401).json({ error: "Not authenticated" });

    const recipeId = Number(req.params.recipeId);
    if (isNaN(recipeId)) return res.status(400).json({ error: "Invalid recipeId" });

    // Fetch the recipe
    const [recipe] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId))
      .limit(1);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    if (!recipe.isOoak) return res.status(400).json({ error: "Recipe is not a One-of-a-Kind recipe" });

    // Atomic check-and-set: only update if claimedBy IS NULL
    const [updated] = await db
      .update(recipesTable)
      .set({ claimedBy: String(characterId) })
      .where(and(eq(recipesTable.id, recipeId), isNull(recipesTable.claimedBy)))
      .returning();

    if (!updated) {
      // Already claimed — fetch current claimant for info
      const [current] = await db.select({ claimedBy: recipesTable.claimedBy }).from(recipesTable).where(eq(recipesTable.id, recipeId)).limit(1);
      return res.status(409).json({ error: "This One-of-a-Kind recipe has already been claimed", claimedBy: current?.claimedBy });
    }

    // Add to character's known recipes
    const alreadyKnown = await db
      .select()
      .from(knownRecipesTable)
      .where(and(eq(knownRecipesTable.characterId, characterId), eq(knownRecipesTable.recipeId, String(recipeId))))
      .limit(1);
    if (alreadyKnown.length === 0) {
      await db.insert(knownRecipesTable).values({ characterId, recipeId: String(recipeId) });
    }

    return res.json({
      success: true,
      message: `You have claimed the legendary recipe: ${recipe.name}`,
      recipe: updated,
    });
  } catch (err) {
    console.error("[tradeskills] ooak/claim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tradeskills/ooak/unclaimed ─────────────────────────────────────────
// Returns OoaK recipes that are currently unclaimed (for world display/events).

router.get("/tradeskills/ooak/unclaimed", async (req, res) => {
  try {
    const recipes = await db
      .select()
      .from(recipesTable)
      .where(and(eq(recipesTable.isOoak, true), isNull(recipesTable.claimedBy)));
    return res.json({ recipes });
  } catch (err) {
    console.error("[tradeskills] ooak/unclaimed error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
