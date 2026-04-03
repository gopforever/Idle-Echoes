import { pgTable, text, serial, real, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id"),
  skillId: text("skill_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  level: integer("level").notNull().default(1),
  xp: real("xp").notNull().default(0),
  xpToNextLevel: real("xp_to_next_level").notNull().default(83),
  isTraining: boolean("is_training").notNull().default(false),
  trainingAction: text("training_action"),
  xpPerHour: real("xp_per_hour").notNull().default(0),
  icon: text("icon").notNull().default("sword"),
  maxLevel: integer("max_level").notNull().default(100),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("skills_character_skill_unique").on(t.characterId, t.skillId),
]);

export const insertSkillSchema = createInsertSchema(skillsTable).omit({ id: true, updatedAt: true });
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skillsTable.$inferSelect;
