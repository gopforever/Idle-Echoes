/**
 * Epic Quest Routes
 *
 * GET  /epic-quest             — get current state (or null if not started)
 * POST /epic-quest/start       — begin the epic quest chain for character's class
 * POST /epic-quest/advance     — check conditions and advance completed steps; award fabled weapon when done
 * POST /epic-quest/upgrade     — consume raid materials and upgrade fabled → mythical weapon
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { epicQuestProgressTable, inventoryTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { awardItemsToInventory } from "../lib/dungeonProgress.js";
import { getEpicWeaponByClass, getEpicWeaponByItemId, EPIC_QUEST_STEPS, EPIC_UPGRADE_REQUIREMENTS } from "../lib/epicQuestData.js";
import type { EpicQuestStepData } from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the quantity of itemId in the character's inventory (0 if absent). */
async function getInventoryQty(characterId: number, itemId: string): Promise<number> {
  const [row] = await db
    .select({ quantity: inventoryTable.quantity })
    .from(inventoryTable)
    .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
    .limit(1);
  return row?.quantity ?? 0;
}

/** Consume `qty` of itemId from inventory. Throws if not enough. */
async function consumeInventoryItem(
  characterId: number,
  itemId: string,
  qty: number,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  const qb = tx ?? db;
  const [row] = await qb
    .select({ id: inventoryTable.id, quantity: inventoryTable.quantity })
    .from(inventoryTable)
    .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, itemId)))
    .limit(1);
  if (!row || row.quantity < qty) {
    throw new Error(`Insufficient ${itemId}: need ${qty}, have ${row?.quantity ?? 0}`);
  }
  if (row.quantity === qty) {
    await qb.delete(inventoryTable).where(eq(inventoryTable.id, row.id));
  } else {
    await qb.update(inventoryTable).set({ quantity: row.quantity - qty }).where(eq(inventoryTable.id, row.id));
  }
}

/** Derive a step summary for the API response. */
function buildStepSummary(stepData: EpicQuestStepData, character: { level: number; bossKills: number }) {
  return [
    {
      step: 1,
      title: EPIC_QUEST_STEPS[0].title,
      description: EPIC_QUEST_STEPS[0].description,
      lore: EPIC_QUEST_STEPS[0].lore,
      done: stepData.step1Done,
      requirement: "Reach Level 70",
      progress: `Level ${character.level} / 70`,
      progressPct: Math.min(100, Math.round((character.level / 70) * 100)),
    },
    {
      step: 2,
      title: EPIC_QUEST_STEPS[1].title,
      description: EPIC_QUEST_STEPS[1].description,
      lore: EPIC_QUEST_STEPS[1].lore,
      done: stepData.step2Done,
      requirement: "Defeat 200 boss enemies",
      progress: `${Math.min(200, character.bossKills)} / 200 boss kills`,
      progressPct: Math.min(100, Math.round((character.bossKills / 200) * 100)),
    },
    {
      step: 3,
      title: EPIC_QUEST_STEPS[2].title,
      description: EPIC_QUEST_STEPS[2].description,
      lore: EPIC_QUEST_STEPS[2].lore,
      done: stepData.step3Done,
      requirement: "Obtain a Prismatic Dragon Scale from Harla Dar",
      progress: stepData.step3Done ? "Obtained" : "Not yet obtained",
      progressPct: stepData.step3Done ? 100 : 0,
    },
    {
      step: 4,
      title: EPIC_QUEST_STEPS[3].title,
      description: EPIC_QUEST_STEPS[3].description,
      lore: EPIC_QUEST_STEPS[3].lore,
      done: stepData.step4Done,
      requirement: "Obtain a Plague Dragon's Spine from Trakanon",
      progress: stepData.step4Done ? "Obtained" : "Not yet obtained",
      progressPct: stepData.step4Done ? 100 : 0,
    },
    {
      step: 5,
      title: EPIC_QUEST_STEPS[4].title,
      description: EPIC_QUEST_STEPS[4].description,
      lore: EPIC_QUEST_STEPS[4].lore,
      done: stepData.step5Done,
      requirement: "Obtain a Vampire Lord's Fang from Mayong Mistmoore",
      progress: stepData.step5Done ? "Obtained" : "Not yet obtained",
      progressPct: stepData.step5Done ? 100 : 0,
    },
  ];
}

// ─── GET /epic-quest ──────────────────────────────────────────────────────────

router.get("/epic-quest", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    const [progress] = await db
      .select()
      .from(epicQuestProgressTable)
      .where(eq(epicQuestProgressTable.characterId, character.id))
      .limit(1);

    if (!progress) {
      const epicDef = getEpicWeaponByClass(character.class);
      return res.json({
        started: false,
        eligible: character.level >= 70,
        characterLevel: character.level,
        characterClass: character.class,
        epicDef: epicDef ?? null,
        questSteps: EPIC_QUEST_STEPS,
      });
    }

    const epicDef = getEpicWeaponByClass(progress.classId);
    const stepData = progress.stepData as EpicQuestStepData;
    const steps = buildStepSummary(stepData, character);

    return res.json({
      started: true,
      completed: progress.completed,
      mythicalAwarded: progress.mythicalAwarded,
      fabledWeaponId: progress.fabledWeaponId,
      mythicalWeaponId: progress.mythicalWeaponId,
      classId: progress.classId,
      currentStep: progress.currentStep,
      epicDef: epicDef ?? null,
      steps,
      upgradeRequirements: EPIC_UPGRADE_REQUIREMENTS,
    });
  } catch (err) {
    req.log.error({ err }, "GET /epic-quest failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /epic-quest/start ───────────────────────────────────────────────────

router.post("/epic-quest/start", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    if (character.level < 70) {
      return res.status(400).json({
        error: `You must be Level 70 to begin the Epic Quest. You are Level ${character.level}.`,
        required: 70,
        current: character.level,
      });
    }

    const classId = character.class.toLowerCase();
    const epicDef = getEpicWeaponByClass(classId);
    if (!epicDef) {
      return res.status(400).json({ error: `No epic weapon defined for class: ${character.class}` });
    }

    // Check if already started
    const [existing] = await db
      .select({ id: epicQuestProgressTable.id })
      .from(epicQuestProgressTable)
      .where(eq(epicQuestProgressTable.characterId, character.id))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Epic quest already started for this character." });
    }

    const initialStep: EpicQuestStepData = {
      step1Done: true, // already level 70 to start
      step2Done: false,
      step3Done: false,
      step4Done: false,
      step5Done: false,
    };

    const [inserted] = await db.insert(epicQuestProgressTable).values({
      characterId: character.id,
      classId,
      currentStep: 2,
      stepData: initialStep,
    }).returning();

    return res.json({
      message: "Epic Quest begun! The Legend's Call has been answered.",
      progress: inserted,
    });
  } catch (err) {
    req.log.error({ err }, "POST /epic-quest/start failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /epic-quest/advance ─────────────────────────────────────────────────
// Checks all conditions and advances any newly-completed steps.
// Awards the fabled weapon when step 5 is newly completed.

router.post("/epic-quest/advance", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    const [progress] = await db
      .select()
      .from(epicQuestProgressTable)
      .where(eq(epicQuestProgressTable.characterId, character.id))
      .limit(1);

    if (!progress) {
      return res.status(404).json({ error: "Epic quest not started. POST /epic-quest/start first." });
    }

    if (progress.completed) {
      return res.json({ message: "Epic quest already completed.", alreadyDone: true });
    }

    const stepData = { ...(progress.stepData as EpicQuestStepData) };
    const prev = { ...stepData };

    // Step 1: Level 70
    if (!stepData.step1Done && character.level >= 70) {
      stepData.step1Done = true;
    }

    // Step 2: 200 boss kills
    if (stepData.step1Done && !stepData.step2Done && character.bossKills >= 200) {
      stepData.step2Done = true;
    }

    // Step 3: Have prismatic_dragon_scale in inventory
    if (stepData.step2Done && !stepData.step3Done) {
      const qty = await getInventoryQty(character.id, "prismatic_dragon_scale");
      if (qty >= 1) stepData.step3Done = true;
    }

    // Step 4: Have plague_dragon_spine in inventory
    if (stepData.step3Done && !stepData.step4Done) {
      const qty = await getInventoryQty(character.id, "plague_dragon_spine");
      if (qty >= 1) stepData.step4Done = true;
    }

    // Step 5: Have vampire_lord_fang in inventory
    if (stepData.step4Done && !stepData.step5Done) {
      const qty = await getInventoryQty(character.id, "vampire_lord_fang");
      if (qty >= 1) stepData.step5Done = true;
    }

    const allDone = stepData.step1Done && stepData.step2Done && stepData.step3Done && stepData.step4Done && stepData.step5Done;
    const newlyCompleted = allDone && !progress.completed;

    // Determine current step number (first not-done step)
    const currentStep = !stepData.step1Done ? 1
      : !stepData.step2Done ? 2
      : !stepData.step3Done ? 3
      : !stepData.step4Done ? 4
      : !stepData.step5Done ? 5
      : 5;

    // Only write to DB if something changed
    const changed = prev.step1Done !== stepData.step1Done
      || prev.step2Done !== stepData.step2Done
      || prev.step3Done !== stepData.step3Done
      || prev.step4Done !== stepData.step4Done
      || prev.step5Done !== stepData.step5Done;

    // Pre-compute the epic weapon definition so we can write fabledWeaponId in the
    // same UPDATE that acts as the optimistic lock, avoiding a second round-trip.
    const epicDef = getEpicWeaponByClass(progress.classId);
    const pendingFabledId = allDone ? (epicDef?.fabledItemId ?? null) : null;

    let awardedWeaponId: string | null = null;

    if (changed || allDone) {
      await db.transaction(async (tx) => {
        const updated = await tx.update(epicQuestProgressTable)
          .set({
            stepData,
            currentStep,
            completed: allDone,
            fabledWeaponId: pendingFabledId ?? progress.fabledWeaponId,
            updatedAt: new Date(),
          })
          .where(
            allDone
              ? and(eq(epicQuestProgressTable.id, progress.id), eq(epicQuestProgressTable.completed, false))
              : eq(epicQuestProgressTable.id, progress.id)
          )
          .returning();

        if (allDone && updated.length > 0 && epicDef) {
          // Exactly one request wins the race — award inside the same transaction
          await awardItemsToInventory([epicDef.fabledItemId], character.id, tx);
          awardedWeaponId = epicDef.fabledItemId;
        }
      });
    }

    const steps = buildStepSummary(stepData, character);

    return res.json({
      advanced: changed,
      newlyCompleted,
      awardedWeaponId,
      awardedWeaponName: awardedWeaponId ? (getEpicWeaponByItemId(awardedWeaponId)?.className + " Epic Weapon") ?? null : null,
      completed: allDone,
      currentStep,
      steps,
      epicDef: epicDef ?? null,
      message: awardedWeaponId !== null
        ? `🏆 EPIC QUEST COMPLETE! Your class epic weapon has been added to your inventory!`
        : changed
        ? "Progress updated."
        : "No new progress detected. Keep adventuring!",
    });
  } catch (err) {
    req.log.error({ err }, "POST /epic-quest/advance failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /epic-quest/upgrade ─────────────────────────────────────────────────
// Consumes 3x each raid material and upgrades fabled → mythical epic weapon.

router.post("/epic-quest/upgrade", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);

    const [progress] = await db
      .select()
      .from(epicQuestProgressTable)
      .where(eq(epicQuestProgressTable.characterId, character.id))
      .limit(1);

    if (!progress) return res.status(404).json({ error: "Epic quest not started." });
    if (!progress.completed) return res.status(400).json({ error: "Complete the epic quest chain first." });
    if (progress.mythicalAwarded) return res.status(409).json({ error: "Mythical upgrade already performed." });

    // Check fabled weapon is in inventory
    const fabledId = progress.fabledWeaponId;
    if (!fabledId) return res.status(400).json({ error: "No fabled weapon on record for this quest." });

    const fabledQty = await getInventoryQty(character.id, fabledId);
    if (fabledQty < 1) {
      return res.status(400).json({ error: "Your fabled epic weapon must be in your inventory to upgrade (unequip it first)." });
    }

    // Check and consume upgrade materials
    for (const [itemId, qty] of Object.entries(EPIC_UPGRADE_REQUIREMENTS)) {
      const have = await getInventoryQty(character.id, itemId);
      if (have < qty) {
        const names: Record<string, string> = {
          prismatic_dragon_scale: "Prismatic Dragon Scale",
          plague_dragon_spine: "Plague Dragon's Spine",
          vampire_lord_fang: "Vampire Lord's Fang",
        };
        return res.status(400).json({
          error: `Insufficient materials: need ${qty}x ${names[itemId] ?? itemId}, have ${have}.`,
          itemId,
          required: qty,
          have,
        });
      }
    }

    // All checks passed — perform upgrade atomically
    const epicDef = getEpicWeaponByClass(progress.classId);
    if (!epicDef) return res.status(400).json({ error: "Epic weapon definition not found." });

    try {
      await db.transaction(async (tx) => {
        // Re-select inside the transaction as an optimistic lock
        const [locked] = await tx.select()
          .from(epicQuestProgressTable)
          .where(and(
            eq(epicQuestProgressTable.characterId, character.id),
            eq(epicQuestProgressTable.mythicalAwarded, false),
          ))
          .limit(1);

        if (!locked) throw new Error("already_upgraded");

        // Consume fabled weapon and raid materials
        await consumeInventoryItem(character.id, fabledId, 1, tx);
        for (const [itemId, qty] of Object.entries(EPIC_UPGRADE_REQUIREMENTS)) {
          await consumeInventoryItem(character.id, itemId, qty, tx);
        }

        // Award mythical weapon and mark complete — all in the same transaction
        await awardItemsToInventory([epicDef.mythicalItemId], character.id, tx);
        await tx.update(epicQuestProgressTable)
          .set({
            mythicalAwarded: true,
            mythicalWeaponId: epicDef.mythicalItemId,
            updatedAt: new Date(),
          })
          .where(eq(epicQuestProgressTable.id, locked.id));
      });
    } catch (err: any) {
      if (err?.message === "already_upgraded") {
        return res.status(409).json({ error: "Mythical upgrade already performed." });
      }
      throw err;
    }

    return res.json({
      success: true,
      mythicalWeaponId: epicDef.mythicalItemId,
      message: `⚡ MYTHICAL UPGRADE COMPLETE! "${epicDef.mythicalItemId.replace(/_/g, " ")}" has been forged from the very essence of Norrath's greatest evils!`,
    });
  } catch (err) {
    req.log.error({ err }, "POST /epic-quest/upgrade failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
