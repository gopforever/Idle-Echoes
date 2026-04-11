export interface RecipeIngredient {
    itemId: string;
    quantity: number;
}
export interface RecipeOutput {
    name: string;
    description: string;
    type: "weapon" | "armor" | "accessory" | "consumable";
    slot: string;
    rarity: "common" | "uncommon" | "rare" | "legendary";
    stats: Record<string, number>;
    sellPrice: number;
    armorType?: "plate" | "chain" | "leather" | "cloth";
    quantity: number;
    xpGained: number;
    spriteId?: string;
    stackable?: boolean;
    effect?: {
        type: string;
        value: number;
    };
}
export declare const recipesTable: any;
export declare const ghostLegacyTable: any;
export declare const craftQueueTable: any;
export type Recipe = typeof recipesTable.$inferSelect;
export type CraftQueue = typeof craftQueueTable.$inferSelect;
export type GhostLegacy = typeof ghostLegacyTable.$inferSelect;
//# sourceMappingURL=tradeskills.d.ts.map