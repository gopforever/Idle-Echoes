import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inventoryTable,
  skillsTable,
  charactersTable,
  knownRecipesTable,
  oneOfAKindCraftedTable,
} from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  CRAFTING_RECIPES,
  getItemById,
  xpForLevel,
  type CraftedItemMetadata,
  type ExperimentFocus,
  type ItemStats,
} from "../lib/gameData.js";
import { getOrCreateCharacter } from "./character.js";
import { checkAndUnlockAchievements } from "./achievements.js";

const router: IRouter = Router();

const JOURNEYMAN_RECIPE_IDS = CRAFTING_RECIPES
  .filter(r => r.tier === "journeyman")
  .map(r => r.id);

const RARITY_ORDER = ["common", "uncommon", "rare", "legendary", "fabled", "mythical"];

function bumpRarity(rarity: string): string {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return rarity;
  return RARITY_ORDER[idx + 1];
}

function applyFocusBoost(
  stats: ItemStats,
  focus: ExperimentFocus,
  points: number,
  resourceQuality: number,
): ItemStats {
  const boostedStats = { ...stats };
  const boost = 1 + (points * 0.15) * (resourceQuality / 100);

  if (focus === "attack") {
    if (boostedStats.attackRating) boostedStats.attackRating = Math.round(boostedStats.attackRating * boost);
    if (boostedStats.weaponDamageMin) boostedStats.weaponDamageMin = Math.round(boostedStats.weaponDamageMin * boost);
    if (boostedStats.weaponDamageMax) boostedStats.weaponDamageMax = Math.round(boostedStats.weaponDamageMax * boost);
    if (boostedStats.critChance) boostedStats.critChance = Math.round(boostedStats.critChance * boost);
    if (boostedStats.strength) boostedStats.strength = Math.round(boostedStats.strength * boost);
    if (boostedStats.agility) boostedStats.agility = Math.round(boostedStats.agility * boost);
  } else if (focus === "defense") {
    if (boostedStats.defenseRating) boostedStats.defenseRating = Math.round(boostedStats.defenseRating * boost);
    if (boostedStats.mitigation) boostedStats.mitigation = Math.round(boostedStats.mitigation * boost);
    if (boostedStats.avoidance) boostedStats.avoidance = Math.round(boostedStats.avoidance * boost);
    if (boostedStats.health) boostedStats.health = Math.round(boostedStats.health * boost);
    if (boostedStats.stamina) boostedStats.stamina = Math.round(boostedStats.stamina * boost);
  } else {
    if (boostedStats.wisdom) boostedStats.wisdom = Math.round(boostedStats.wisdom * boost);
    if (boostedStats.intelligence) boostedStats.intelligence = Math.round(boostedStats.intelligence * boost);
    if (boostedStats.haste) boostedStats.haste = Math.round(boostedStats.haste * boost);
    if (boostedStats.power) boostedStats.power = Math.round(boostedStats.power * boost);
    if (boostedStats.charisma) boostedStats.charisma = Math.round(boostedStats.charisma * boost);
  }
  return boostedStats;
}

router.get("/crafting/known-recipes", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    const known = await db
      .select({ recipeId: knownRecipesTable.recipeId })
      .from(knownRecipesTable)
      .where(eq(knownRecipesTable.characterId, character.id));

    const knownIds = new Set([
      ...JOURNEYMAN_RECIPE_IDS,
      ...known.map(r => r.recipeId),
    ]);

    const craftedOnce = await db.select().from(oneOfAKindCraftedTable);
    const craftedOnceIds = new Set(craftedOnce.map(r => r.recipeId));

    const recipes = CRAFTING_RECIPES
      .filter(r => knownIds.has(r.id))
      .filter(r => !craftedOnceIds.has(r.id))
      .map(r => ({
        ...r,
        resultItem: getItemById(r.resultItemId),
      }));

    return res.json(recipes);
  } catch (err) {
    req.log.error({ err }, "Error fetching known recipes");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crafting/learn-recipe", async (req, res) => {
  try {
    const { scrollItemId } = req.body;
    if (!scrollItemId) {
      return res.status(400).json({ success: false, message: "scrollItemId is required" });
    }

    const scrollItem = getItemById(scrollItemId);
    if (!scrollItem || scrollItem.type !== "recipe_scroll") {
      return res.json({ success: false, message: "That item is not a recipe scroll." });
    }

    const recipeId = scrollItem.recipeId;
    if (!recipeId) {
      return res.json({ success: false, message: "This scroll has no associated recipe." });
    }

    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) {
      return res.json({ success: false, message: "Recipe not found in game data." });
    }

    const character = await getOrCreateCharacter(req.characterId);

    const [invRow] = await db
      .select()
      .from(inventoryTable)
      .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, scrollItemId)));

    if (!invRow || invRow.quantity < 1) {
      return res.json({ success: false, message: "You don't have that scroll." });
    }

    const existing = await db
      .select()
      .from(knownRecipesTable)
      .where(
        and(
          eq(knownRecipesTable.characterId, character.id),
          eq(knownRecipesTable.recipeId, recipeId),
        )
      );

    if (existing.length > 0 || JOURNEYMAN_RECIPE_IDS.includes(recipeId)) {
      return res.json({ success: false, message: "You already know this recipe." });
    }

    await db.transaction(async (tx) => {
      if (invRow.quantity <= 1) {
        await tx.delete(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, scrollItemId)));
      } else {
        await tx
          .update(inventoryTable)
          .set({ quantity: invRow.quantity - 1 })
          .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, scrollItemId)));
      }

      await tx.insert(knownRecipesTable).values({
        characterId: character.id,
        recipeId,
      });
    });

    return res.json({
      success: true,
      message: `You have learned: ${recipe.name}!`,
      recipeId,
    });
  } catch (err) {
    req.log.error({ err }, "Error learning recipe from scroll");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crafting/craft", async (req, res) => {
  try {
    const {
      recipeId,
      experimentFocus = "attack",
      experimentPoints,
    } = req.body as {
      recipeId: string;
      experimentFocus?: ExperimentFocus;
      experimentPoints?: number;
    };

    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const character = await getOrCreateCharacter(req.characterId);

    const knownIds = new Set(JOURNEYMAN_RECIPE_IDS);
    const learnedRows = await db
      .select({ recipeId: knownRecipesTable.recipeId })
      .from(knownRecipesTable)
      .where(eq(knownRecipesTable.characterId, character.id));
    learnedRows.forEach(r => knownIds.add(r.recipeId));

    if (!knownIds.has(recipeId)) {
      return res.json({ success: false, xpGained: 0, message: "You do not know this recipe." });
    }

    if (recipe.oneOfAKind) {
      const [crafted] = await db
        .select()
        .from(oneOfAKindCraftedTable)
        .where(eq(oneOfAKindCraftedTable.recipeId, recipeId));
      if (crafted) {
        return res.json({
          success: false,
          xpGained: 0,
          message: `This one-of-a-kind item has already been created by ${crafted.craftedBy}.`,
        });
      }
    }

    const craftingSkill = await db
      .select()
      .from(skillsTable)
      .where(and(eq(skillsTable.characterId, character.id), eq(skillsTable.skillId, recipe.requiredSkillId)));
    const skill = craftingSkill[0];

    if (!skill || skill.level < recipe.requiredSkillLevel) {
      return res.json({
        success: false,
        xpGained: 0,
        message: `Requires ${recipe.requiredSkillId} level ${recipe.requiredSkillLevel}`,
      });
    }

    const skillLevel = skill.level;
    const maxExperimentPoints = Math.max(1, Math.floor(skillLevel / 10));
    const allocatedPoints = Math.min(
      maxExperimentPoints,
      Math.max(1, experimentPoints ?? maxExperimentPoints)
    );

    const currentInventory = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, character.id));
    const inventoryMap = new Map(currentInventory.map(i => [i.itemId, i]));

    for (const ingredient of recipe.ingredients) {
      const invRow = inventoryMap.get(ingredient.itemId);
      const have = invRow?.quantity || 0;
      if (have < ingredient.quantity) {
        const ingredientItem = getItemById(ingredient.itemId);
        return res.json({
          success: false,
          xpGained: 0,
          message: `Need ${ingredient.quantity}x ${ingredientItem?.name || ingredient.itemId}`,
        });
      }
    }

    const qualityScores: number[] = [];
    for (const ingredient of recipe.ingredients) {
      const invRow = inventoryMap.get(ingredient.itemId);
      const data = invRow?.itemData as Record<string, unknown> | null;
      const quality = (typeof data?.quality === "number" ? data.quality : 50);
      for (let q = 0; q < ingredient.quantity; q++) qualityScores.push(quality);
    }
    const resourceQuality = qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 50;

    const critChance = (skillLevel + resourceQuality) / 200;
    const isCritical = Math.random() < critChance;

    const baseItem = getItemById(recipe.resultItemId);
    if (!baseItem) {
      return res.status(500).json({ error: "Result item not found in game data" });
    }

    const finalRarity = isCritical ? bumpRarity(baseItem.rarity) : baseItem.rarity;
    const boostedStats = applyFocusBoost(
      { ...baseItem.stats },
      experimentFocus,
      allocatedPoints,
      resourceQuality,
    );

    const qualityBoost = 1 + (resourceQuality - 50) / 200;
    const boostedSellPrice = Math.round(baseItem.sellPrice * qualityBoost * (isCritical ? 1.5 : 1));

    const craftedMeta: CraftedItemMetadata = {
      craftedBy: character.name,
      resourceQuality,
      experimentFocus,
      isCritical,
      recipeId,
      recipeTier: recipe.tier,
      isOneOfAKind: recipe.oneOfAKind,
    };

    const resultItemData = {
      ...baseItem,
      rarity: finalRarity,
      stats: boostedStats,
      sellPrice: boostedSellPrice,
      craftedMeta,
      description: `${baseItem.description} Handcrafted by ${character.name}.`,
    };

    const craftedItemId = `crafted_${recipe.resultItemId}_${Date.now()}`;

    // ── Atomic transaction — for one-of-a-kind recipes we INSERT the lock row
    // first (which throws on unique conflict) then consume mats and mint the item.
    // Any concurrent craft attempt will fail at the INSERT and the error handler
    // below turns it into a graceful 200 with success:false.
    await db.transaction(async (tx) => {
      if (recipe.oneOfAKind) {
        await tx.insert(oneOfAKindCraftedTable).values({
          recipeId,
          craftedBy: character.name,
        });
      }

      for (const ingredient of recipe.ingredients) {
        const invRow = inventoryMap.get(ingredient.itemId)!;
        const remaining = invRow.quantity - ingredient.quantity;
        if (remaining <= 0) {
          await tx.delete(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, ingredient.itemId)));
        } else {
          await tx
            .update(inventoryTable)
            .set({ quantity: remaining })
            .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, ingredient.itemId)));
        }
      }

      await tx.insert(inventoryTable).values({
        characterId: character.id,
        itemId: craftedItemId,
        itemData: resultItemData as Record<string, unknown>,
        quantity: recipe.resultQuantity,
      });

      let newXp = skill.xp + recipe.xpReward;
      let newLevel = skill.level;
      let newXpToNext = skill.xpToNextLevel;
      while (newXp >= newXpToNext && newLevel < skill.maxLevel) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = xpForLevel(newLevel);
      }
      await tx
        .update(skillsTable)
        .set({ xp: newXp, level: newLevel, xpToNextLevel: newXpToNext, updatedAt: new Date() })
        .where(and(eq(skillsTable.characterId, character.id), eq(skillsTable.skillId, recipe.requiredSkillId)));
    });

    getOrCreateCharacter(req.characterId).then(ch =>
      db.update(charactersTable)
        .set({ itemsCrafted: (ch.itemsCrafted ?? 0) + 1 })
        .where(eq(charactersTable.id, ch.id))
        .then(() => checkAndUnlockAchievements(ch.id))
    ).catch(() => {});

    const critMsg = isCritical ? " Critical Success! Rarity upgraded!" : "";
    return res.json({
      success: true,
      resultItem: {
        ...resultItemData,
        id: craftedItemId,
        quantity: recipe.resultQuantity,
      },
      craftedMeta,
      xpGained: recipe.xpReward,
      isCritical,
      critChance: Math.round(critChance * 100),
      resourceQuality,
      message: `Crafted ${resultItemData.name}!${critMsg}`,
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr?.code === "23505") {
      return res.json({
        success: false,
        xpGained: 0,
        message: "This one-of-a-kind item was just created by another crafter. It can never be made again.",
      });
    }
    req.log.error({ err }, "Error crafting item");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { JOURNEYMAN_RECIPE_IDS };
export default router;
