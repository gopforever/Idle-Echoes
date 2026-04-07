import { pgTable, text, serial, real, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Hero of Norrath"),
  race: text("race").notNull().default("human"),
  class: text("class").notNull().default("Warrior"),
  archetype: text("archetype").notNull().default("Fighter"),
  alignment: text("alignment").notNull().default("Neutral"),
  level: integer("level").notNull().default(1),
  xp: real("xp").notNull().default(0),
  xpToNextLevel: real("xp_to_next_level").notNull().default(100),
  aaPoints: integer("aa_points").notNull().default(0),
  aaPointsSpent: integer("aa_points_spent").notNull().default(0),
  /** 0-100: percentage of combat XP diverted to AA points instead of level XP */
  aaXpRatio: integer("aa_xp_ratio").notNull().default(0),
  /** True once the character has used their one paid respec */
  aaRespecUsed: boolean("aa_respec_used").notNull().default(false),
  gold: real("gold").notNull().default(250),
  bankGold: real("bank_gold").notNull().default(0),
  health: real("health").notNull().default(100),
  maxHealth: real("max_health").notNull().default(100),
  power: real("power").notNull().default(50),
  maxPower: real("max_power").notNull().default(50),
  baseStats: jsonb("base_stats").notNull().$type<{
    strength: number; agility: number; stamina: number;
    intelligence: number; wisdom: number; charisma: number;
  }>(),
  gear: jsonb("gear").notNull().$type<Record<string, unknown>>(),
  zone: text("zone").notNull().default("Commonlands"),
  activeMount: text("active_mount"),
  autoLoop: boolean("auto_loop").notNull().default(true),
  autoHeal: boolean("auto_heal").notNull().default(true),
  autoPotions: boolean("auto_potions").notNull().default(false),
  isMeditating: boolean("is_meditating").notNull().default(false),
  lastRegenAt: timestamp("last_regen_at"),
  totalPlayTime: real("total_play_time").notNull().default(0),
  killCount: integer("kill_count").notNull().default(0),
  bossKills: integer("boss_kills").notNull().default(0),
  undeadKills: integer("undead_kills").notNull().default(0),
  dragonKills: integer("dragon_kills").notNull().default(0),
  itemsCrafted: integer("items_crafted").notNull().default(0),
  heroicCompleted: integer("heroic_completed").notNull().default(0),
  deathCount: integer("death_count").notNull().default(0),
  totalGoldEarned: real("total_gold_earned").notNull().default(0),
  rivals: jsonb("rivals").notNull().default([]).$type<number[]>(),
  oresGathered: integer("ores_gathered").notNull().default(0),
  logsChopped: integer("logs_chopped").notNull().default(0),
  fishCaught: integer("fish_caught").notNull().default(0),
  herbsGathered: integer("herbs_gathered").notNull().default(0),
  raresGathered: integer("rares_gathered").notNull().default(0),
  /** Per-zone kill counts: { "Commonlands": 42, "Antonica": 18, ... } */
  zoneKills: jsonb("zone_kills").notNull().default({}).$type<Record<string, number>>(),
  /** Pinned recipe IDs for quick-access crafting panels (max 10, per character) */
  pinnedRecipes: jsonb("pinned_recipes").notNull().default([]).$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
