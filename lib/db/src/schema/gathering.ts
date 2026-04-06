import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";

export const gatheringSessionsTable = pgTable("gathering_sessions", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  skillId: text("skill_id").notNull(),
  nodeId: text("node_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastTickAt: timestamp("last_tick_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  totalGathered: integer("total_gathered").notNull().default(0),
}, (t) => [
  index("gathering_sessions_character_skill_active_idx").on(t.characterId, t.skillId, t.isActive),
  // NOTE: A partial unique index "gathering_sessions_active_unique_idx" ON (character_id, skill_id)
  // WHERE is_active = true is applied directly via SQL (see 0009_gathering.sql) to enforce
  // at most one active session per character+skill. Drizzle does not support partial indexes
  // in schema definitions, so this constraint is SQL-only and does not appear here.
]);

/**
 * Gathering Bag — unlimited storage for items yielded by gathering.
 * Items go here instead of inventory; crafting can consume from both.
 * Unique constraint on (characterId, itemId) enables atomic upsert semantics.
 */
export const gatheringBagItemsTable = pgTable("gathering_bag_items", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  itemId: text("item_id").notNull(),
  itemData: jsonb("item_data").notNull().$type<Record<string, unknown>>(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("gathering_bag_items_character_item_idx").on(t.characterId, t.itemId),
]);

export type GatheringBagItem = typeof gatheringBagItemsTable.$inferSelect;

/**
 * Ghost inventory stash — accumulated materials per ghost player before they list on auction.
 * ghostId corresponds to worldPlayersTable.id (stored as text for flexibility).
 * When a ghost gathers resources, the quantity is added here first.
 * ghostGatheringTick drains this stash and posts auction listings once thresholds are met.
 */
export const ghostInventoryTable = pgTable("ghost_inventory", {
  id: serial("id").primaryKey(),
  ghostId: text("ghost_id").notNull(),
  ghostName: text("ghost_name").notNull(),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("ghost_inventory_ghost_item_idx").on(t.ghostId, t.itemId),
]);
