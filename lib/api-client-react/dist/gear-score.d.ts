/**
 * Gear Score constants shared between the server (eq2Formulas.ts) and the frontend.
 * Keep these in sync with artifacts/api-server/src/lib/eq2Formulas.ts.
 *
 * Rarity multipliers are fixed by design; slot weights use the WoW GearScoreLite approach.
 */
export declare const RARITY_GS_MULTIPLIER: Record<string, number>;
/**
 * Per-slot GS weight. All weapon slots (primary, secondary, ranged) are 2.5× —
 * the heaviest tier. Body armor > standard armor > accessories > jewelry.
 * Sum of all 18 slot weights ≈ 19.25 with weapons at 2.5×.
 */
export declare const SLOT_GS_WEIGHT: Record<string, number>;
/** Returns the GS contribution of a single item (level × slotWeight × rarityMultiplier). */
export declare function computeItemGS(level: number, rarity: string, slot?: string): number;
/** Returns true for item types that have meaningful gear score (equippable gear only). */
export declare function isGearType(type: string): boolean;
/**
 * Dungeon difficulty GS gates — matches DUNGEON_GS_GATE in eq2Formulas.ts.
 * Calibrated so weapons (2.5×) dominate GS at higher tiers.
 */
export declare const DUNGEON_GS_GATE: Record<string, number>;
//# sourceMappingURL=gear-score.d.ts.map