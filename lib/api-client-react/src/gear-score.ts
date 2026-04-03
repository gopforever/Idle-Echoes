/**
 * Gear Score constants shared between the server (eq2Formulas.ts) and the frontend.
 * Keep these in sync with artifacts/api-server/src/lib/eq2Formulas.ts.
 *
 * Rarity multipliers are fixed by design; slot weights use the WoW GearScoreLite approach.
 */

export const RARITY_GS_MULTIPLIER: Record<string, number> = {
  common: 1, uncommon: 2, rare: 4, legendary: 8, fabled: 12, mythical: 16,
};

/**
 * Per-slot GS weight. All weapon slots (primary, secondary, ranged) are 2.5× —
 * the heaviest tier. Body armor > standard armor > accessories > jewelry.
 * Sum of all 18 slot weights ≈ 19.25 with weapons at 2.5×.
 */
export const SLOT_GS_WEIGHT: Record<string, number> = {
  primary:   2.5,
  secondary: 2.5,
  ranged:    2.5,
  chest:     1.25,
  legs:      1.25,
  head:      1.0,
  shoulder:  1.0,
  hands:     1.0,
  feet:      1.0,
  back:      0.75,
  waist:     0.75,
  wrist:     0.75,
  neck:      0.75,
  charm:     0.75,
  earLeft:   0.5,
  earRight:  0.5,
  ringLeft:  0.5,
  ringRight: 0.5,
};

/** Returns the GS contribution of a single item (level × slotWeight × rarityMultiplier). */
export function computeItemGS(level: number, rarity: string, slot?: string): number {
  const slotWeight = SLOT_GS_WEIGHT[slot ?? ""] ?? 1.0;
  return Math.round(level * slotWeight * (RARITY_GS_MULTIPLIER[rarity] ?? 1));
}

/** Returns true for item types that have meaningful gear score (equippable gear only). */
export function isGearType(type: string): boolean {
  return type !== "material" && type !== "consumable" && type !== "quest" &&
    type !== "crafting_material" && type !== "recipe_scroll" && type !== "mount";
}

/**
 * Dungeon difficulty GS gates — matches DUNGEON_GS_GATE in eq2Formulas.ts.
 * Calibrated so weapons (2.5×) dominate GS at higher tiers.
 */
export const DUNGEON_GS_GATE: Record<string, number> = {
  normal:    0,
  expert:    100,
  legendary: 500,
  mythical:  1500,
};
