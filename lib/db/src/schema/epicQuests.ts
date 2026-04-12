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
