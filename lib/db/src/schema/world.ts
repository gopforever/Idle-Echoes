import { pgTable, text, serial, real, integer, jsonb, timestamp, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const worldPlayersTable = pgTable("world_players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  race: text("race").notNull(),
  class: text("class").notNull(),
  archetype: text("archetype").notNull(),
  alignment: text("alignment").notNull().default("Neutral"),
  personality: text("personality").notNull().default("Aggressive"),
  level: integer("level").notNull().default(1),
  xp: real("xp").notNull().default(0),
  xpToNextLevel: real("xp_to_next_level").notNull().default(100),
  gold: real("gold").notNull().default(0),
  zone: text("zone").notNull().default("Commonlands"),
  killCount: integer("kill_count").notNull().default(0),
  deathCount: integer("death_count").notNull().default(0),
  bossKills: integer("boss_kills").notNull().default(0),
  totalGoldEarned: real("total_gold_earned").notNull().default(0),
  totalGoldSpent: real("total_gold_spent").notNull().default(0),
  stats: jsonb("stats").notNull().$type<{
    strength: number; agility: number; stamina: number;
    intelligence: number; wisdom: number; charisma: number;
  }>(),
  gear: jsonb("gear").$type<Record<string, unknown>>().default({}),
  generation: integer("generation").notNull().default(1),
  parentId: integer("parent_id"),
  inheritedTraits: jsonb("inherited_traits").$type<string[]>().default([]),
  lastTickAt: timestamp("last_tick_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const worldEventsTable = pgTable("world_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  playerName: text("player_name").notNull(),
  zone: text("zone").notNull(),
  importance: integer("importance").notNull().default(1),
  tick: integer("tick").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ghostMarketDemandTable = pgTable("ghost_market_demand", {
  category: text("category").primaryKey(),
  demandScore: real("demand_score").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auctionListingsTable = pgTable("auction_listings", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  sellerId: text("seller_id").notNull(),
  sellerName: text("seller_name").notNull(),
  itemId: text("item_id").notNull(),
  itemName: text("item_name").notNull(),
  itemData: jsonb("item_data").notNull().$type<Record<string, unknown>>(),
  quantity: integer("quantity").notNull().default(1),
  buyoutPrice: real("buyout_price").notNull(),
  category: text("category").notNull().default("misc"),
  postedAt: timestamp("posted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  sold: boolean("sold").notNull().default(false),
  cancelled: boolean("cancelled").notNull().default(false),
  soldAt: timestamp("sold_at"),
  sellerPersonality: text("seller_personality"),
});

export const knownRecipesTable = pgTable("known_recipes", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  recipeId: text("recipe_id").notNull(),
  learnedAt: timestamp("learned_at").defaultNow().notNull(),
});

export const ghostKnownRecipesTable = pgTable("ghost_known_recipes", {
  id: serial("id").primaryKey(),
  ghostId: integer("ghost_id").notNull(),
  recipeId: text("recipe_id").notNull(),
  learnedAt: timestamp("learned_at").defaultNow().notNull(),
});

export const oneOfAKindCraftedTable = pgTable("one_of_a_kind_crafted", {
  recipeId: text("recipe_id").primaryKey(),
  craftedBy: text("crafted_by").notNull(),
  craftedAt: timestamp("crafted_at").defaultNow().notNull(),
});

export const ghostDungeonClearsTable = pgTable("ghost_dungeon_clears", {
  id: serial("id").primaryKey(),
  ghostId: integer("ghost_id").notNull(),
  dungeonId: text("dungeon_id").notNull(),
  clearCount: integer("clear_count").notNull().default(1),
  bestDifficulty: text("best_difficulty").notNull().default("normal"),
  lastClearedAt: timestamp("last_cleared_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("ghost_dungeon_clears_ghost_dungeon_idx").on(t.ghostId, t.dungeonId),
]);

export const ghostRaidClearsTable = pgTable("ghost_raid_clears", {
  id: serial("id").primaryKey(),
  ghostId: integer("ghost_id").notNull(),
  raidId: text("raid_id").notNull(),
  clearCount: integer("clear_count").notNull().default(1),
  maxPhase: integer("max_phase").notNull().default(1),
  lastClearedAt: timestamp("last_cleared_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("ghost_raid_clears_ghost_raid_idx").on(t.ghostId, t.raidId),
]);

export type WorldPlayer = typeof worldPlayersTable.$inferSelect;
export type WorldEvent = typeof worldEventsTable.$inferSelect;
export type GhostMarketDemand = typeof ghostMarketDemandTable.$inferSelect;
export type AuctionListing = typeof auctionListingsTable.$inferSelect;
export type KnownRecipe = typeof knownRecipesTable.$inferSelect;
export type OneOfAKindCrafted = typeof oneOfAKindCraftedTable.$inferSelect;
export type GhostDungeonClear = typeof ghostDungeonClearsTable.$inferSelect;
export type GhostRaidClear = typeof ghostRaidClearsTable.$inferSelect;
