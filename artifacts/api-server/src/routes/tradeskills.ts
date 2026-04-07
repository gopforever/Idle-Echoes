import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryTable, knownRecipesTable, recipesTable, craftQueueTable, charactersTable } from "@workspace/db/schema";
import { eq, and, sql, lte, inArray } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { TRADESKILL_MATERIALS, APPRENTICE_RECIPES, TRADESKILL_CLASSES, type TradeskillClass } from "../lib/tradeskillData.js";

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

// ─── Seed recipes on startup (once, if table empty) ──────────────────────────

let seeded = false;

async function seedRecipesIfNeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(recipesTable);
    if ((countRow?.count ?? 0) > 0) return;

    const rows = APPRENTICE_RECIPES.map(r => ({
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
    await db.insert(recipesTable).values(rows);
    console.log(`[tradeskills] Seeded ${rows.length} apprentice recipes.`);
  } catch (err) {
    seeded = false; // allow retry
    console.error("[tradeskills] Seed error:", err);
  }
}

// Kick off seed immediately
seedRecipesIfNeeded();

// ─── Inventory helpers ────────────────────────────────────────────────────────

/** Returns a map of itemId → total quantity in inventory */
async function getInventoryMap(characterId: number): Promise<Map<string, number>> {
  const rows = await db
    .select({ itemId: inventoryTable.itemId, quantity: inventoryTable.quantity })
    .from(inventoryTable)
    .where(eq(inventoryTable.characterId, characterId));
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.itemId, (map.get(row.itemId) ?? 0) + row.quantity);
  }
  return map;
}

/**
 * Deduct ingredients from character inventory.
 * Returns false if insufficient materials (no partial deduction).
 */
async function deductIngredients(
  characterId: number,
  ingredients: Array<{ itemId: string; quantity: number }>,
): Promise<boolean> {
  // First verify totals are available
  const invMap = await getInventoryMap(characterId);
  for (const ing of ingredients) {
    if ((invMap.get(ing.itemId) ?? 0) < ing.quantity) return false;
  }

  // Deduct each ingredient
  for (const ing of ingredients) {
    let remaining = ing.quantity;
    const rows = await db
      .select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.characterId, characterId),
          eq(inventoryTable.itemId, ing.itemId),
        ),
      );
    for (const row of rows) {
      if (remaining <= 0) break;
      if (row.quantity <= remaining) {
        remaining -= row.quantity;
        await db.delete(inventoryTable).where(eq(inventoryTable.id, row.id));
      } else {
        await db
          .update(inventoryTable)
          .set({ quantity: row.quantity - remaining })
          .where(eq(inventoryTable.id, row.id));
        remaining = 0;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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

    // Get inventory map for have/need counts
    const invMap = await getInventoryMap(characterId);

    const result = recipes.map(recipe => {
      const ingredients = recipe.ingredients as Array<{ itemId: string; quantity: number }>;
      const ingredientsWithCounts = ingredients.map(ing => ({
        ...ing,
        have: invMap.get(ing.itemId) ?? 0,
        canCraft: (invMap.get(ing.itemId) ?? 0) >= ing.quantity,
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
    const characterId = (req.session as { characterId?: number }).characterId;
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
    const characterId = (req.session as { characterId?: number }).characterId;
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

        // Add items to inventory
        await addCraftedItem(characterId, { ...output, quantity: outputPerCraft * newlyCompleted }, recipe.name);

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

// ─── DELETE /tradeskills/queue/:id ────────────────────────────────────────────

router.delete("/tradeskills/queue/:id", async (req, res) => {
  try {
    const characterId = (req.session as { characterId?: number }).characterId;
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

export default router;
