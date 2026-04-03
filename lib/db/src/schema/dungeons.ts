import { pgTable, serial, integer, text, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export interface PartyMember {
  ghostId: number;
  hp: number;
  maxHp: number;
  status: "active" | "downed" | "revived";
  damageDone: number;
  healingDone: number;
  saveCount: number;
}

export const dungeonRunsTable = pgTable("dungeon_runs", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  dungeonId: text("dungeon_id").notNull(),
  difficulty: text("difficulty").notNull().default("normal"),
  currentFloor: integer("current_floor").notNull().default(1),
  /** normalKills tracks how many floor normals have been killed this floor. Alias: floorKills. */
  normalKills: integer("normal_kills").notNull().default(0),
  /** floorKills is the spec-required column name, kept in sync with normalKills */
  floorKills: integer("floor_kills").notNull().default(0),
  miniBossDefeated: boolean("mini_boss_defeated").notNull().default(false),
  mainBossDefeated: boolean("main_boss_defeated").notNull().default(false),
  /** status text for legacy use; completed/abandoned booleans are the spec-required form */
  status: text("status").notNull().default("active"),
  completed: boolean("completed").notNull().default(false),
  abandoned: boolean("abandoned").notNull().default(false),
  lootEarned: jsonb("loot_earned").notNull().$type<Array<{ floor: number; items: string[] }>>().default([]),
  /** IDs of enemies still alive on the current floor (decremented on each kill) */
  currentFloorEnemies: jsonb("current_floor_enemies").notNull().$type<string[]>().default([]),
  /** Full scaled enemy roster for the current floor (persisted at start/advance) */
  scaledEnemies: jsonb("scaled_enemies").notNull().$type<Array<{ id: string; enemy: Record<string, unknown> }>>().default([]),
  /** Party of ghost players: ghost IDs + per-ghost HP/status */
  party: jsonb("party").$type<PartyMember[]>().default([]),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const raidRunsTable = pgTable("raid_runs", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  raidId: text("raid_id").notNull(),
  difficulty: text("difficulty").notNull().default("normal"),
  currentPhase: integer("current_phase").notNull().default(1),
  totalPhases: integer("total_phases").notNull().default(3),
  bossDefeated: boolean("boss_defeated").notNull().default(false),
  status: text("status").notNull().default("active"),
  completed: boolean("completed").notNull().default(false),
  abandoned: boolean("abandoned").notNull().default(false),
  lootEarned: jsonb("loot_earned").notNull().$type<string[]>().default([]),
  scaledBoss: jsonb("scaled_boss").$type<Record<string, unknown>>(),
  /** Party of ghost players */
  party: jsonb("party").$type<PartyMember[]>().default([]),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const dungeonKillStatsTable = pgTable("dungeon_kill_stats", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  dungeonOrRaidId: text("dungeon_or_raid_id").notNull(),
  isRaid: boolean("is_raid").notNull().default(false),
  normalKills: integer("normal_kills").notNull().default(0),
  miniBossKills: integer("mini_boss_kills").notNull().default(0),
  mainBossKills: integer("main_boss_kills").notNull().default(0),
  completions: integer("completions").notNull().default(0),
  firstClearAt: timestamp("first_clear_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  characterDungeonUnique: uniqueIndex("dungeon_kill_stats_character_dungeon_unique").on(table.characterId, table.dungeonOrRaidId),
}));

export type DungeonRun = typeof dungeonRunsTable.$inferSelect;
export type InsertDungeonRun = typeof dungeonRunsTable.$inferInsert;
export type RaidRun = typeof raidRunsTable.$inferSelect;
export type InsertRaidRun = typeof raidRunsTable.$inferInsert;
export type DungeonKillStats = typeof dungeonKillStatsTable.$inferSelect;
