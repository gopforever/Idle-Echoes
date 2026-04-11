import { pgTable, text, serial, real, integer, boolean, timestamp, uniqueIndex, sql } from "drizzle-orm/pg-core";

export const guildsTable = pgTable("guilds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tag: text("tag").notNull(),
  description: text("description").notNull().default(""),
  motto: text("motto").notNull().default(""),
  alignment: text("alignment").notNull().default("Neutral"),
  /** characterId of the guild leader (null for ghost guilds) */
  leaderId: integer("leader_id"),
  /** true for AI-simulated ghost guilds */
  isGhost: boolean("is_ghost").notNull().default(false),
  bankGold: real("bank_gold").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("guilds_name_unique").on(t.name),
  uniqueIndex("guilds_tag_unique").on(t.tag),
]);

export const guildMembersTable = pgTable("guild_members", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  /** Set for real player characters; null for ghost members */
  characterId: integer("character_id"),
  /** Set for ghost/AI players; null for real members */
  ghostId: integer("ghost_id"),
  /** leader | officer | member */
  rank: text("rank").notNull().default("member"),
  contributionPoints: real("contribution_points").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("guild_members_character_unique")
    .on(t.characterId)
    .where(sql`character_id IS NOT NULL`),
]);

export type Guild = typeof guildsTable.$inferSelect;
export type InsertGuild = typeof guildsTable.$inferInsert;
export type GuildMember = typeof guildMembersTable.$inferSelect;
export type InsertGuildMember = typeof guildMembersTable.$inferInsert;
