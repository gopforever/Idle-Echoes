import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { heroicStateTable, combatLogTable, combatStateTable, charactersTable } from "@workspace/db/schema";
import { getOrCreateCharacter } from "./character.js";
import { checkAndUnlockAchievements } from "./achievements.js";
import { HEROIC_CHAINS, CLASSES } from "../lib/eq2Data.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function getChainForClass(className: string, archetype: string) {
  if (archetype === "Mage")   return HEROIC_CHAINS.find(c => c.id === "mage_chain")!;
  if (archetype === "Priest") return HEROIC_CHAINS.find(c => c.id === "divine_chain")!;
  if (archetype === "Scout")  return HEROIC_CHAINS.find(c => c.id === "scout_chain")!;
  return HEROIC_CHAINS.find(c => c.id === "warrior_chain")!;
}

async function getOrCreateHeroicState(characterId: number) {
  const [state] = await db.select().from(heroicStateTable).where(eq(heroicStateTable.characterId, characterId)).limit(1);
  if (state) return state;
  const [created] = await db.insert(heroicStateTable).values({
    characterId,
    active: false, progress: 0, chain: 0, stepNumber: 0, triggerType: "any",
  }).returning();
  return created;
}

router.get("/heroic/state", async (req, res) => {
  try {
    const characterId = req.characterId;
    const state = await getOrCreateHeroicState(characterId);
    const character = await getOrCreateCharacter(req.characterId);
    const chain = getChainForClass(character.class, character.archetype ?? "Fighter");

    const currentStep = state.stepNumber < chain.steps.length
      ? chain.steps[state.stepNumber] : null;

    return res.json({
      active: state.active,
      stepNumber: state.stepNumber,
      progress: state.progress,
      completions: state.chain,
      currentStep: currentStep ?? null,
      chainId: chain.id,
      chainName: chain.id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      chainDescription: chain.description,
      chainSteps: chain.steps,
      totalSteps: chain.steps.length,
      bonusType: state.bonusType ?? chain.bonusType,
      bonusValue: state.bonusValue ?? chain.bonusValue,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting heroic state");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/heroic/trigger", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { triggerType } = req.body;
    const character = await getOrCreateCharacter(req.characterId);
    const state = await getOrCreateHeroicState(characterId);
    const chain = getChainForClass(character.class, character.archetype ?? "Fighter");

    const currentStep = chain.steps[state.stepNumber];
    if (!state.active || !currentStep) {
      return res.json({ success: false, chainCompleted: false, message: "No active heroic opportunity" });
    }

    const matches = currentStep.triggerType === "any" || currentStep.triggerType === triggerType;
    if (!matches) {
      await db.update(heroicStateTable)
        .set({ active: false, stepNumber: 0, progress: 0 })
        .where(eq(heroicStateTable.id, state.id));
      return res.json({ success: false, chainCompleted: false, message: "Wrong trigger type! Opportunity chain broken." });
    }

    const nextStep = state.stepNumber + 1;
    const chainCompleted = nextStep >= chain.steps.length;

    if (chainCompleted) {
      await db.update(heroicStateTable).set({
        active: false, stepNumber: 0, progress: 0, chain: state.chain + 1,
      }).where(eq(heroicStateTable.id, state.id));

      const [combatState] = await db.select().from(combatStateTable)
        .where(eq(combatStateTable.characterId, characterId)).limit(1);
      if (combatState?.active) {
        await db.insert(combatLogTable).values({
          characterId,
          tick: combatState.tick,
          message: `⚡ HEROIC OPPORTUNITY COMPLETE! ${chain.bonusType}: +${chain.bonusValue}!`,
          type: "heroic", value: chain.bonusValue,
        });
      }

      db.update(charactersTable)
        .set({ heroicCompleted: (character.heroicCompleted ?? 0) + 1 })
        .where(eq(charactersTable.id, character.id))
        .then(() => checkAndUnlockAchievements(characterId))
        .catch(() => {});

      return res.json({
        success: true, chainCompleted: true,
        bonusApplied: chain.bonusType, bonusValue: chain.bonusValue,
        message: `Heroic Opportunity complete! Bonus: ${chain.bonusType} +${chain.bonusValue}!`,
      });
    } else {
      await db.update(heroicStateTable).set({
        stepNumber: nextStep,
        triggerType: chain.steps[nextStep].triggerType,
      }).where(eq(heroicStateTable.id, state.id));

      return res.json({
        success: true, chainCompleted: false,
        message: `Step ${nextStep} complete! Next: ${chain.steps[nextStep].description}`,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Error triggering heroic");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
