export declare const gatheringSessionsTable: any;
/**
 * Gathering Bag — unlimited storage for items yielded by gathering.
 * Items go here instead of inventory; crafting can consume from both.
 * Unique constraint on (characterId, itemId) enables atomic upsert semantics.
 */
export declare const gatheringBagItemsTable: any;
export type GatheringBagItem = typeof gatheringBagItemsTable.$inferSelect;
/**
 * Ghost inventory stash — accumulated materials per ghost player before they list on auction.
 * ghostId corresponds to worldPlayersTable.id (stored as text for flexibility).
 * When a ghost gathers resources, the quantity is added here first.
 * ghostGatheringTick drains this stash and posts auction listings once thresholds are met.
 */
export declare const ghostInventoryTable: any;
//# sourceMappingURL=gathering.d.ts.map