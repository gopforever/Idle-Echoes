import { pgTable, text, serial, real, integer, jsonb, timestamp, boolean, uniqueIndex, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const combatStateTable = pgTable("combat_state", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  active: boolean("active").notNull().default(false),
  enemyId: text("enemy_id"),
  enemyData: jsonb("enemy_data").$type<Record<string, unknown>>(),
  enemyCurrentHp: real("enemy_current_hp").notNull().default(0),
  playerCurrentHp: real("player_current_hp").notNull().default(100),
  playerCurrentPower: real("player_current_power").notNull().default(50),
  tick: integer("tick").notNull().default(0),
  autoLoot: boolean("auto_loot").notNull().default(true),
  lastTickMs: real("last_tick_ms"),
  playerStatusEffects: jsonb("player_status_effects").$type<StatusEffect[]>().default([]),
  enemyStatusEffects: jsonb("enemy_status_effects").$type<StatusEffect[]>().default([]),
  enemyAbilityCooldowns: jsonb("enemy_ability_cooldowns").$type<Record<string, number>>().default({}),
  playerAbilityCooldowns: jsonb("player_ability_cooldowns").$type<Record<string, number>>().default({}),
  totalPlayerDamage: real("total_player_damage").notNull().default(0),
  combatStartMs: bigint("combat_start_ms", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const combatLogTable = pgTable("combat_log", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  tick: integer("tick").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  value: real("value"),
  itemData: jsonb("item_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  itemId: text("item_id").notNull(),
  itemData: jsonb("item_data").notNull().$type<Record<string, unknown>>(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  type: "bleed" | "stun" | "slow" | "frenzy" | "absorb" | "life_drain" | "fear" | "buff" | "dot" | "shield";
  remainingTicks: number;
  value: number;
  source: "player" | "enemy";
}

export const bossEncountersTable = pgTable("boss_encounters", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  bossId: text("boss_id").notNull(),
  playerKills: integer("player_kills").notNull().default(0),
  bossKills: integer("boss_kills").notNull().default(0),
  lastKillingAbility: text("last_killing_ability"),
  grudgeLevel: integer("grudge_level").notNull().default(0),
  lastEncounteredAt: timestamp("last_encountered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("boss_encounters_player_boss_unique").on(t.playerId, t.bossId)]);

export type BossEncounter = typeof bossEncountersTable.$inferSelect;
export type InsertBossEncounter = typeof bossEncountersTable.$inferInsert;

export const bankItemsTable = pgTable("bank_items", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  itemId: text("item_id").notNull(),
  itemData: jsonb("item_data").notNull().$type<Record<string, unknown>>(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BankItem = typeof bankItemsTable.$inferSelect;

export const gatheringBagItemsTable = pgTable("gathering_bag_items", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  itemId: text("item_id").notNull(),
  itemData: jsonb("item_data").notNull().$type<Record<string, unknown>>(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GatheringBagItem = typeof gatheringBagItemsTable.$inferSelect;

export const insertCombatLogSchema = createInsertSchema(combatLogTable).omit({ id: true, createdAt: true });
export type InsertCombatLog = z.infer<typeof insertCombatLogSchema>;
export type CombatLog = typeof combatLogTable.$inferSelect;
