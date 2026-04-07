import { pgTable, serial, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

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
  effect?: { type: string; value: number };
}

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tradeskillClass: text("tradeskill_class").notNull(),
  tier: text("tier").notNull().default("apprentice"),
  minSkill: integer("min_skill").notNull().default(1),
  minLevel: integer("min_level").notNull().default(1),
  craftTimeSeconds: integer("craft_time_seconds").notNull().default(60),
  ingredients: jsonb("ingredients").notNull().$type<RecipeIngredient[]>(),
  output: jsonb("output").notNull().$type<RecipeOutput>(),
  acquisitionType: text("acquisition_type").notNull().default("vendor"),
  vendorCost: integer("vendor_cost"),
  isOoak: boolean("is_ooak").notNull().default(false),
  spriteId: text("sprite_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const craftQueueTable = pgTable("craft_queue", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  recipeId: integer("recipe_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  quantityCompleted: integer("quantity_completed").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  nextCompletesAt: timestamp("next_completes_at").notNull(),
  status: text("status").notNull().default("crafting"),
});

export type Recipe = typeof recipesTable.$inferSelect;
export type CraftQueue = typeof craftQueueTable.$inferSelect;
