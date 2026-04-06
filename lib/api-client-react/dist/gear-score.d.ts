/**
 * Gear Score constants shared between the server (eq2Formulas.ts) and the frontend.
 * Keep these in sync with artifacts/api-server/src/lib/eq2Formulas.ts.
 *
 * Formula matches the authentic WoW GearScoreCalc.lua script:
 *   itemGS = floor((itemLevel / rarityDivisor) * slotModifier * enchantModifier * GLOBAL_SCALE)
 */
export declare const RARITY_GS_DIVISOR: Record<string, number>;
/** @deprecated Use RARITY_GS_DIVISOR instead */
export declare const RARITY_GS_MULTIPLIER: Record<string, number>;
/**
 * Per-slot modifiers from GearScoreCalc.lua itemTypeInfo.
 * Maps our slot names to the corresponding Lua INVTYPE values.
 */
export declare const SLOT_GS_MODIFIER: Record<string, number>;
/** @deprecated Use SLOT_GS_MODIFIER instead */
export declare const SLOT_GS_WEIGHT: Record<string, number>;
/** Returns the GS contribution of a single item using the WoW GearScoreCalc.lua formula. */
export declare function computeItemGS(level: number, rarity: string, slot?: string): number;
/** Returns true for item types that have meaningful gear score (equippable gear only). */
export declare function isGearType(type: string): boolean;
/**
 * Dungeon difficulty GS gates — matches DUNGEON_GS_GATE in eq2Formulas.ts.
 * Calibrated for the WoW GearScoreCalc.lua formula (rarity as divisor, GLOBAL_SCALE=1.7).
 */
export declare const DUNGEON_GS_GATE: Record<string, number>;
//# sourceMappingURL=gear-score.d.ts.map