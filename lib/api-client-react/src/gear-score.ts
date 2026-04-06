/**
 * Gear Score constants shared between the server (eq2Formulas.ts) and the frontend.
 * Keep these in sync with artifacts/api-server/src/lib/eq2Formulas.ts.
 *
 * Formula matches the authentic WoW GearScoreCalc.lua script:
 *   itemGS = floor((itemLevel / rarityDivisor) * slotModifier * enchantModifier * GLOBAL_SCALE)
 */

// Rarity is a DIVISOR — lower value = rarer = higher GS contribution.
// Matches rarityModifiers from GearScoreCalc.lua.
export const RARITY_GS_DIVISOR: Record<string, number> = {
  poor:      3.5,
  common:    3.0,
  uncommon:  2.5,
  rare:      1.76,
  epic:      1.6,    // not used in game but keep for completeness
  legendary: 1.4,
  fabled:    1.3,    // one tier above legendary
  mythical:  1.2,    // highest tier
};

// Deprecated alias — kept for backward compatibility
/** @deprecated Use RARITY_GS_DIVISOR instead */
export const RARITY_GS_MULTIPLIER: Record<string, number> = {
  common: 1, uncommon: 2, rare: 4, legendary: 8, fabled: 12, mythical: 16,
};

/**
 * Per-slot modifiers from GearScoreCalc.lua itemTypeInfo.
 * Maps our slot names to the corresponding Lua INVTYPE values.
 */
export const SLOT_GS_MODIFIER: Record<string, number> = {
  primary:   1.0,    // INVTYPE_WEAPONMAINHAND
  secondary: 1.0,    // INVTYPE_WEAPONOFFHAND / INVTYPE_SHIELD
  ranged:    0.3164, // INVTYPE_RANGED / INVTYPE_RANGEDRIGHT
  head:      1.0,    // INVTYPE_HEAD
  shoulder:  0.75,   // INVTYPE_SHOULDER
  chest:     1.0,    // INVTYPE_CHEST / INVTYPE_ROBE
  waist:     0.75,   // INVTYPE_WAIST
  legs:      1.0,    // INVTYPE_LEGS
  feet:      0.75,   // INVTYPE_FEET
  wrist:     0.5625, // INVTYPE_WRIST
  hands:     0.75,   // INVTYPE_HAND
  back:      0.5625, // INVTYPE_CLOAK
  neck:      0.5625, // INVTYPE_NECK
  ringLeft:  0.5625, // INVTYPE_FINGER
  ringRight: 0.5625, // INVTYPE_FINGER
  charm:     0.5625, // INVTYPE_TRINKET
  earLeft:   0.5625, // no WoW equiv — treat as accessory
  earRight:  0.5625, // no WoW equiv — treat as accessory
};

// Deprecated alias — kept for backward compatibility
/** @deprecated Use SLOT_GS_MODIFIER instead */
export const SLOT_GS_WEIGHT: Record<string, number> = SLOT_GS_MODIFIER;

const GS_GLOBAL_SCALE = 1.7;
const GS_ENCHANT_MODIFIER = 1.05; // treat all equippable gear as enchanted

/** Returns the GS contribution of a single item using the WoW GearScoreCalc.lua formula. */
export function computeItemGS(level: number, rarity: string, slot?: string): number {
  const divisor = RARITY_GS_DIVISOR[rarity] ?? RARITY_GS_DIVISOR.common;
  const slotMod = SLOT_GS_MODIFIER[slot ?? ""] ?? 1.0;
  return Math.floor((level / divisor) * slotMod * GS_ENCHANT_MODIFIER * GS_GLOBAL_SCALE);
}

/** Returns true for item types that have meaningful gear score (equippable gear only). */
export function isGearType(type: string): boolean {
  return type !== "material" && type !== "consumable" && type !== "quest" &&
    type !== "crafting_material" && type !== "recipe_scroll" && type !== "mount";
}

/**
 * Dungeon difficulty GS gates — matches DUNGEON_GS_GATE in eq2Formulas.ts.
 * Calibrated for the WoW GearScoreCalc.lua formula (rarity as divisor, GLOBAL_SCALE=1.7).
 */
export const DUNGEON_GS_GATE: Record<string, number> = {
  normal:    0,
  expert:    30,
  legendary: 100,
  mythical:  250,
};
