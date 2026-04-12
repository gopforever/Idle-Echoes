import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { GEAR_SETS, DUNGEONS } from "../lib/dungeonData.js";
import type { GearSetArchetype } from "../lib/dungeonData.js";
import { computeSetBonuses } from "../lib/eq2Formulas.js";

const router: IRouter = Router();

const DUNGEON_NAME_MAP = new Map(DUNGEONS.map(d => [d.id, d.name]));

// ── GET /gear-sets ────────────────────────────────────────────────────────────
// Returns the character's archetype gear sets with per-piece acquisition status.
router.get("/gear-sets", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const equippedGear = (character.gear as Record<string, unknown>) ?? {};
    const charClass = (character.class ?? "Fighter") as string;
    const charArchetype = (character.archetype ?? "Fighter") as string;
    // Fury is a caster-type Priest (intelligence primary); all other Priests are healers.
    const setArchetype: GearSetArchetype =
      charClass === "Fury" ? "caster" :
      charArchetype === "Priest" ? "healer" :
      charArchetype === "Mage" ? "caster" :
      "fighter";
    const archetypeSets = GEAR_SETS.filter(s => s.archetype === setArchetype);

    // Collect all set piece itemIds from inventory
    const inventory = await db.select({ itemId: inventoryTable.itemId, itemData: inventoryTable.itemData })
      .from(inventoryTable)
      .where(eq(inventoryTable.characterId, character.id));

    // Build a set of (setId, slot) pairs the character owns (inventory + equipped)
    const ownedPieces = new Set<string>(); // `${setId}:${slot}`

    for (const row of inventory) {
      const data = row.itemData as Record<string, unknown>;
      const setId = data["setId"] as string | undefined;
      const slot  = data["setPieceSlot"] as string | undefined;
      if (setId && slot) ownedPieces.add(`${setId}:${slot}`);
    }
    for (const slotVal of Object.values(equippedGear)) {
      if (!slotVal || typeof slotVal !== "object") continue;
      const item = slotVal as Record<string, unknown>;
      const setId = item["setId"] as string | undefined;
      const slot  = item["setPieceSlot"] as string | undefined;
      if (setId && slot) ownedPieces.add(`${setId}:${slot}`);
    }

    // Count equipped pieces per set
    const equippedPiecesBySet = new Map<string, number>();
    for (const slotVal of Object.values(equippedGear)) {
      if (!slotVal || typeof slotVal !== "object") continue;
      const item = slotVal as Record<string, unknown>;
      const setId = item["setId"] as string | undefined;
      if (!setId) continue;
      equippedPiecesBySet.set(setId, (equippedPiecesBySet.get(setId) ?? 0) + 1);
    }

    const result = archetypeSets.map(setDef => {
      const equippedCount = equippedPiecesBySet.get(setDef.id) ?? 0;
      return {
        id: setDef.id,
        dungeonId: setDef.dungeonId,
        dungeonName: DUNGEON_NAME_MAP.get(setDef.dungeonId) ?? setDef.dungeonId,
        difficulty: setDef.difficulty,
        setNameTemplate: setDef.setNameTemplate,
        piecesTotal: setDef.pieces.length,
        piecesOwned: setDef.pieces.filter(p => ownedPieces.has(`${setDef.id}:${p.slot}`)).length,
        piecesEquipped: equippedCount,
        pieces: setDef.pieces.map(p => ({
          slot: p.slot,
          dropFloor: p.dropFloor,
          owned: ownedPieces.has(`${setDef.id}:${p.slot}`),
          equipped: (() => {
            for (const [, slotVal] of Object.entries(equippedGear)) {
              if (!slotVal || typeof slotVal !== "object") continue;
              const item = slotVal as Record<string, unknown>;
              if (item["setId"] === setDef.id && item["setPieceSlot"] === p.slot) return true;
            }
            return false;
          })(),
        })),
        bonuses: setDef.bonuses.map(b => ({
          piecesRequired: b.piecesRequired,
          description: b.description,
          active: equippedCount >= b.piecesRequired,
          isProc: !!b.effect,
          procName: b.effect?.name,
        })),
      };
    });

    return res.json({ sets: result });
  } catch (err) {
    req.log.error({ err }, "Error fetching gear sets");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /gear-sets/active ─────────────────────────────────────────────────────
// Returns active set bonuses based on equipped gear (used by character stats page).
router.get("/gear-sets/active", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const equippedGear = (character.gear as Record<string, unknown>) ?? {};
    const { summaries, statBoosts } = computeSetBonuses(equippedGear, GEAR_SETS);
    return res.json({ summaries, statBoosts });
  } catch (err) {
    req.log.error({ err }, "Error computing active set bonuses");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
