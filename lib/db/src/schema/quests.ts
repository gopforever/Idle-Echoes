import { pgTable, text, serial, boolean, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export type QuestObjective = {
  text: string;
  completed: boolean;
  progress: number;
  total: number;
  type: "kill" | "collect" | "talk" | "explore" | "faction";
  target?: string;
};

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectives: jsonb("objectives").notNull().$type<QuestObjective[]>().default([]),
  rewards: jsonb("rewards").notNull().$type<{ xp?: number; gold?: number; item?: string; aaXp?: number }>().default({}),
  zone: text("zone").notNull().default("Commonlands"),
  difficulty: text("difficulty").notNull().default("easy"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  lore: text("lore"),
  bossId: text("boss_id"),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Quest = typeof questsTable.$inferSelect;
export type NewQuest = typeof questsTable.$inferInsert;
