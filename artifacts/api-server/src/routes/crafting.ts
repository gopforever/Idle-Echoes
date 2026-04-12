import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inventoryTable,
  skillsTable,
  charactersTable,
  knownRecipesTable,
  oneOfAKindCraftedTable,
  gatheringBagItemsTable,
  bankItemsTable,
  aaPointsTable,
} from "@workspace/db/schema";
import { and, eq, gt, inArray } from "drizzle-orm";
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
import { applyAABonuses } from "../lib/eq2Formulas.js";
import { ALL_AA_TABS } from "../lib/eq2Data.js";
import { getGuildPerksForCharacter } from "../lib/guildPerks.js";

const router: IRouter = Router();

const ALL_AA_NODES_CRAFTING = ALL_AA_TABS.flatMap(tab => tab.nodes);
const AA_NODE_DEF_MAP_CRAFTING = new Map(ALL_AA_NODES_CRAFTING.map(n => [n.id, n]));

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

    // ── Load AA bonuses for craft yield and tradeskill XP ────────────────────
    const aaRows = await db.select().from(aaPointsTable)
      .where(and(eq(aaPointsTable.characterId, character.id), gt(aaPointsTable.rank, 0)));
    const aaInvested = aaRows.map(r => {
      const def = AA_NODE_DEF_MAP_CRAFTING.get(r.nodeId);
      if (!def) return null;
      return { effect: def.effect, currentRank: r.rank, effectValue: def.effectValue, effectPerRank: def.effectPerRank };
    }).filter((n): n is NonNullable<typeof n> => n !== null);
    const aaBonuses = applyAABonuses(aaInvested);
    const guildPerks = await getGuildPerksForCharacter(character.id);

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
    const bagItems = await db.select().from(gatheringBagItemsTable).where(eq(gatheringBagItemsTable.characterId, character.id));
    const bankItems = await db.select().from(bankItemsTable).where(eq(bankItemsTable.characterId, character.id));
    const inventoryMap = new Map(currentInventory.map(i => [i.itemId, i]));
    const bagMap = new Map(bagItems.map(i => [i.itemId, i]));
    const bankMap = new Map(bankItems.map(i => [i.itemId, i]));

    // Apply craft cost reduction AA bonus: reduces each ingredient's required quantity (floor at 1)
    const costReductionFactor = Math.max(0, 1 - aaBonuses.craftCostReduction / 100);
    const effectiveIngredients = recipe.ingredients.map(ing => ({
      ...ing,
      quantity: Math.max(1, Math.floor(ing.quantity * costReductionFactor)),
    }));

    for (const ingredient of effectiveIngredients) {
      const invQty = inventoryMap.get(ingredient.itemId)?.quantity ?? 0;
      const bagQty = bagMap.get(ingredient.itemId)?.quantity ?? 0;
      const bankQty = bankMap.get(ingredient.itemId)?.quantity ?? 0;
      const totalQty = invQty + bagQty + bankQty;
      if (totalQty < ingredient.quantity) {
        const ingredientItem = getItemById(ingredient.itemId);
        return res.json({
          success: false,
          xpGained: 0,
          message: `Need ${ingredient.quantity}x ${ingredientItem?.name || ingredient.itemId}`,
        });
      }
    }

    const qualityScores: number[] = [];
    for (const ingredient of effectiveIngredients) {
      let remaining = ingredient.quantity;
      const invRow = inventoryMap.get(ingredient.itemId);
      if (invRow && invRow.quantity > 0) {
        const invUsed = Math.min(invRow.quantity, remaining);
        const invData = invRow.itemData as Record<string, unknown> | null;
        const invQuality = (typeof invData?.quality === "number" ? invData.quality : 50);
        for (let q = 0; q < invUsed; q++) qualityScores.push(invQuality);
        remaining -= invUsed;
      }
      if (remaining > 0) {
        const bagRow = bagMap.get(ingredient.itemId);
        if (bagRow) {
          const bagUsed = Math.min(bagRow.quantity, remaining);
          const bagData = bagRow.itemData as Record<string, unknown> | null;
          const bagQuality = (typeof bagData?.quality === "number" ? bagData.quality : 50);
          for (let q = 0; q < bagUsed; q++) qualityScores.push(bagQuality);
          remaining -= bagUsed;
        }
      }
      if (remaining > 0) {
        const bankRow = bankMap.get(ingredient.itemId);
        if (bankRow) {
          const bankUsed = Math.min(bankRow.quantity, remaining);
          const bankData = bankRow.itemData as Record<string, unknown> | null;
          const bankQuality = (typeof bankData?.quality === "number" ? bankData.quality : 50);
          for (let q = 0; q < bankUsed; q++) qualityScores.push(bankQuality);
        }
      }
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

    // Apply craftYield bonus from AA + guild perk (stacked)
    const totalCraftYieldPct = aaBonuses.craftYield + guildPerks.craftYieldBonus;
    const craftYieldBonus = totalCraftYieldPct / 100;
    const extraWholeItems = Math.floor(craftYieldBonus);
    const extraFractional = craftYieldBonus - extraWholeItems;
    const bonusItems = extraWholeItems + (Math.random() < extraFractional ? 1 : 0);
    const finalQuantity = recipe.resultQuantity + bonusItems;

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

      for (const ingredient of effectiveIngredients) {
        let remaining = ingredient.quantity;

        // Consume from inventory first
        const invRow = inventoryMap.get(ingredient.itemId);
        if (invRow && invRow.quantity > 0) {
          const invUsed = Math.min(invRow.quantity, remaining);
          const invRemaining = invRow.quantity - invUsed;
          if (invRemaining <= 0) {
            await tx.delete(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, ingredient.itemId)));
          } else {
            await tx
              .update(inventoryTable)
              .set({ quantity: invRemaining })
              .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, ingredient.itemId)));
          }
          remaining -= invUsed;
        }

        // Then consume from gathering bag if still needed
        if (remaining > 0) {
          const bagRow = bagMap.get(ingredient.itemId);
          if (bagRow) {
            const bagUsed = Math.min(bagRow.quantity, remaining);
            const bagRemaining = bagRow.quantity - bagUsed;
            if (bagRemaining <= 0) {
              await tx.delete(gatheringBagItemsTable).where(and(eq(gatheringBagItemsTable.characterId, character.id), eq(gatheringBagItemsTable.itemId, ingredient.itemId)));
            } else {
              await tx
                .update(gatheringBagItemsTable)
                .set({ quantity: bagRemaining })
                .where(and(eq(gatheringBagItemsTable.characterId, character.id), eq(gatheringBagItemsTable.itemId, ingredient.itemId)));
            }
            remaining -= bagUsed;
          }
        }

        // Finally consume from bank if still needed
        if (remaining > 0) {
          const bankRow = bankMap.get(ingredient.itemId);
          if (bankRow) {
            const bankUsed = Math.min(bankRow.quantity, remaining);
            const bankRemaining = bankRow.quantity - bankUsed;
            if (bankRemaining <= 0) {
              await tx.delete(bankItemsTable).where(and(eq(bankItemsTable.characterId, character.id), eq(bankItemsTable.itemId, ingredient.itemId)));
            } else {
              await tx
                .update(bankItemsTable)
                .set({ quantity: bankRemaining })
                .where(and(eq(bankItemsTable.characterId, character.id), eq(bankItemsTable.itemId, ingredient.itemId)));
            }
          }
        }
      }

      await tx.insert(inventoryTable).values({
        characterId: character.id,
        itemId: craftedItemId,
        itemData: resultItemData as Record<string, unknown>,
        quantity: finalQuantity,
      });

      // Apply tradeskill XP bonus from AA nodes
      const xpWithBonus = Math.floor(recipe.xpReward * (1 + aaBonuses.tradeskillXpBonus / 100));
      let newXp = skill.xp + xpWithBonus;
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
    const yieldMsg = bonusItems > 0 ? ` Bonus yield: +${bonusItems}!` : "";
    const xpWithBonus = Math.floor(recipe.xpReward * (1 + aaBonuses.tradeskillXpBonus / 100));
    return res.json({
      success: true,
      resultItem: {
        ...resultItemData,
        id: craftedItemId,
        quantity: finalQuantity,
      },
      craftedMeta,
      xpGained: xpWithBonus,
      isCritical,
      critChance: Math.round(critChance * 100),
      resourceQuality,
      message: `Crafted ${resultItemData.name}!${critMsg}${yieldMsg}`,
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

// ─── GET /crafting/pins ───────────────────────────────────────────────────────

router.get("/crafting/pins", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const pinned = (character.pinnedRecipes as string[] | null) ?? [];
    return res.json({ pinned });
  } catch (err) {
    req.log.error({ err }, "Error fetching pins");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /crafting/pins ──────────────────────────────────────────────────────

router.post("/crafting/pins", async (req, res) => {
  try {
    const { pinned } = req.body as { pinned: unknown };

    if (!Array.isArray(pinned)) {
      return res.status(400).json({ error: "pinned must be an array of recipe IDs" });
    }
    if (pinned.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "Each pinned entry must be a string recipe ID" });
    }
    const uniquePinned = [...new Set(pinned as string[])];
    if (uniquePinned.length > 10) {
      return res.status(400).json({ error: "Cannot pin more than 10 recipes" });
    }

    const allRecipeIds = new Set(CRAFTING_RECIPES.map(r => r.id));
    const invalid = uniquePinned.filter(id => !allRecipeIds.has(id));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Unknown recipe ID(s): ${invalid.join(", ")}` });
    }

    const character = await getOrCreateCharacter(req.characterId);
    await db
      .update(charactersTable)
      .set({ pinnedRecipes: uniquePinned, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id));

    return res.json({ pinned: uniquePinned });
  } catch (err) {
    req.log.error({ err }, "Error saving pins");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { JOURNEYMAN_RECIPE_IDS };
export default router;
