import { pgTable, text, serial, real, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  /** Total gold ever deposited to this guild bank (lifetime stat) */
  totalGoldDeposited: real("total_gold_deposited").notNull().default(0),
  // ─── Phase 2: Recruitment & settings ────────────────────────────────────────
  isRecruiting: boolean("is_recruiting").notNull().default(false),
  recruitDescription: text("recruit_description").notNull().default(""),
  maxMembers: integer("max_members").notNull().default(25),
  officerDailyWithdrawLimit: real("officer_daily_withdraw_limit").notNull().default(500),
  memberDailyWithdrawLimit: real("member_daily_withdraw_limit").notNull().default(0),
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
  // ─── Phase 1: Weekly activity tracking ───────────────────────────────────────
  /** Contribution accrued in the current week (lazy-reset each Sunday) */
  weeklyContributionPoints: real("weekly_contribution_points").notNull().default(0),
  /** When this member's weekly total was last zeroed (Sunday 00:00 UTC) */
  weeklyResetAt: timestamp("weekly_reset_at"),
  /** Updated whenever contribution is refreshed — used for inactivity detection */
  lastActiveAt: timestamp("last_active_at"),
  // ─── Phase 2: Bank withdrawal tracking ───────────────────────────────────────
  dailyWithdrawn: real("daily_withdrawn").notNull().default(0),
  withdrawResetAt: timestamp("withdraw_reset_at"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("guild_members_character_unique")
    .on(t.characterId)
    .where(sql`character_id IS NOT NULL`),
]);

// ─── Phase 1: Per-week per-member contribution breakdown ──────────────────────
/** Stores the contribution breakdown per member per week. Rows older than 4 weeks are pruned lazily. */
export const guildContributionBreakdownTable = pgTable("guild_contribution_breakdown", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  /** null for ghost members */
  characterId: integer("character_id"),
  /** null for real members */
  ghostId: integer("ghost_id"),
  /** Start of the week (Sunday 00:00 UTC) */
  weekStart: timestamp("week_start").notNull(),
  combatKills: integer("combat_kills").notNull().default(0),
  bossKills: integer("boss_kills").notNull().default(0),
  dungeonClears: integer("dungeon_clears").notNull().default(0),
  craftedItems: integer("crafted_items").notNull().default(0),
  goldDonated: real("gold_donated").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Phase 2: Bank transaction log ───────────────────────────────────────────
export const guildBankTransactionsTable = pgTable("guild_bank_transactions", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  /** null for ghost/system actions */
  characterId: integer("character_id"),
  ghostId: integer("ghost_id"),
  /** deposit | withdraw | payout */
  transactionType: text("transaction_type").notNull(),
  amount: real("amount").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Phase 2: Guild weekly challenges ────────────────────────────────────────
export const guildChallengesTable = pgTable("guild_challenges", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  /** kills | boss_kills | dungeons | crafts | gold_deposited */
  challengeType: text("challenge_type").notNull(),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  /** Flat guild score bonus awarded on completion */
  rewardXpBonus: integer("reward_xp_bonus").notNull().default(0),
  completedAt: timestamp("completed_at"),
});

// ─── Phase 2: Guild applications ─────────────────────────────────────────────
export const guildApplicationsTable = pgTable("guild_applications", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  characterId: integer("character_id").notNull(),
  message: text("message").notNull().default(""),
  /** pending | approved | denied */
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// ─── Phase 3: Weekly rank snapshots (for delta tracking) ─────────────────────
export const guildRankSnapshotsTable = pgTable("guild_rank_snapshots", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  rank: integer("rank").notNull(),
  score: integer("score").notNull(),
});

export type Guild = typeof guildsTable.$inferSelect;
export type InsertGuild = typeof guildsTable.$inferInsert;
export type GuildMember = typeof guildMembersTable.$inferSelect;
export type InsertGuildMember = typeof guildMembersTable.$inferInsert;
export type GuildContributionBreakdown = typeof guildContributionBreakdownTable.$inferSelect;
export type GuildBankTransaction = typeof guildBankTransactionsTable.$inferSelect;
export type GuildChallenge = typeof guildChallengesTable.$inferSelect;
export type GuildApplication = typeof guildApplicationsTable.$inferSelect;
export type GuildRankSnapshot = typeof guildRankSnapshotsTable.$inferSelect;