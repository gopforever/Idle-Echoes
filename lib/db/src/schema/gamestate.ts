import { pgTable, text, serial, real, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  achievementId: text("achievement_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  progress: real("progress").notNull().default(0),
  completedAt: timestamp("completed_at"),
});

export const factionsTable = pgTable("factions", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  factionId: text("faction_id").notNull(),
  standing: real("standing").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aaPointsTable = pgTable("aa_points", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  nodeId: text("node_id").notNull(),
  rank: integer("rank").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adornmentsTable = pgTable("adornments", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  gearSlot: text("gear_slot").notNull(),
  slotIndex: integer("slot_index").notNull().default(0),
  adornmentId: text("adornment_id").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const collectionsTable = pgTable("collections", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  collectionId: text("collection_id").notNull(),
  pieceId: text("piece_id").notNull(),
  foundAt: timestamp("found_at").defaultNow().notNull(),
});

export const mountsTable = pgTable("mounts", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  mountId: text("mount_id").notNull(),
  owned: boolean("owned").notNull().default(false),
  equipped: boolean("equipped").notNull().default(false),
  obtainedAt: timestamp("obtained_at").defaultNow().notNull(),
});

export const heroicStateTable = pgTable("heroic_state", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  active: boolean("active").notNull().default(false),
  progress: real("progress").notNull().default(0),
  chain: integer("chain").notNull().default(0),
  stepNumber: integer("step_number").notNull().default(0),
  triggerType: text("trigger_type").notNull().default("any"),
  bonusType: text("bonus_type"),
  bonusValue: real("bonus_value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const abilityCooldownsTable = pgTable("ability_cooldowns", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  abilityId: text("ability_id").notNull(),
  cooldownEndsAt: timestamp("cooldown_ends_at").notNull(),
});

export const loreCacheTable = pgTable("lore_cache", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Achievement = typeof achievementsTable.$inferSelect;
export type Faction = typeof factionsTable.$inferSelect;
export type AAPoint = typeof aaPointsTable.$inferSelect;
export type Adornment = typeof adornmentsTable.$inferSelect;
export type Collection = typeof collectionsTable.$inferSelect;
export type Mount = typeof mountsTable.$inferSelect;
export type HeroicState = typeof heroicStateTable.$inferSelect;
export type AbilityCooldown = typeof abilityCooldownsTable.$inferSelect;
export type LoreCache = typeof loreCacheTable.$inferSelect;
