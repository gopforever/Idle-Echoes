import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export interface EpicQuestStepData {
  step1Done: boolean; // Level 70 reached
  step2Done: boolean; // 200 boss kills
  step3Done: boolean; // prismatic_dragon_scale in inventory (Harla Dar)
  step4Done: boolean; // plague_dragon_spine in inventory (Trakanon)
  step5Done: boolean; // vampire_lord_fang in inventory (Mayong)
}

export const epicQuestProgressTable = pgTable("epic_quest_progress", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull(),
  /** The character's class ID at quest start, e.g. "guardian" */
  classId: text("class_id").notNull(),
  /** Which step is currently unlocked / in progress (1–5) */
  currentStep: integer("current_step").notNull().default(1),
  /** Per-step completion flags */
  stepData: jsonb("step_data").notNull().$type<EpicQuestStepData>().default({
    step1Done: false,
    step2Done: false,
    step3Done: false,
    step4Done: false,
    step5Done: false,
  }),
  /** All 5 steps completed; fabled weapon awarded */
  completed: boolean("completed").notNull().default(false),
  /** Fabled weapon item ID awarded to inventory */
  fabledWeaponId: text("fabled_weapon_id"),
  /** Whether the fabled weapon was upgraded to mythical */
  mythicalAwarded: boolean("mythical_awarded").notNull().default(false),
  /** Mythical weapon item ID awarded to inventory */
  mythicalWeaponId: text("mythical_weapon_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EpicQuestProgress = typeof epicQuestProgressTable.$inferSelect;
export type NewEpicQuestProgress = typeof epicQuestProgressTable.$inferInsert;

/**
 * Ghost Epic Quest Progress — mirrors epicQuestProgressTable but keyed by
 * ghostId (worldPlayersTable.id) instead of characterId.
 *
 * Populated by the ghost simulator whenever a ghost satisfies all 5 quest
 * conditions: level 70, 200 boss kills, clears of Harla Dar, Trakanon, and
 * Mayong Mistmoore.  mythicalAwarded is set when the ghost has multiple
 * clears of each required raid boss (clearCount ≥ 3 on all three).
 */
export const ghostEpicQuestProgressTable = pgTable("ghost_epic_quest_progress", {
  id: serial("id").primaryKey(),
  ghostId: integer("ghost_id").notNull().unique(),
  /** The ghost's class ID at quest completion, e.g. "guardian" */
  classId: text("class_id").notNull(),
  /** Fabled weapon item ID awarded on completion */
  fabledWeaponId: text("fabled_weapon_id").notNull(),
  /** Whether the fabled weapon was upgraded to mythical */
  mythicalAwarded: boolean("mythical_awarded").notNull().default(false),
  /** Mythical weapon item ID (set when mythicalAwarded is true) */
  mythicalWeaponId: text("mythical_weapon_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GhostEpicQuestProgress = typeof ghostEpicQuestProgressTable.$inferSelect;
export type NewGhostEpicQuestProgress = typeof ghostEpicQuestProgressTable.$inferInsert;
