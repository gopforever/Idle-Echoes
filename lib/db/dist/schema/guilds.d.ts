export declare const guildsTable: any;
export declare const guildMembersTable: any;
/** Stores the contribution breakdown per member per week. Rows older than 4 weeks are pruned lazily. */
export declare const guildContributionBreakdownTable: any;
export declare const guildBankTransactionsTable: any;
export declare const guildChallengesTable: any;
export declare const guildApplicationsTable: any;
export declare const guildRankSnapshotsTable: any;
export type Guild = typeof guildsTable.$inferSelect;
export type InsertGuild = typeof guildsTable.$inferInsert;
export type GuildMember = typeof guildMembersTable.$inferSelect;
export type InsertGuildMember = typeof guildMembersTable.$inferInsert;
export type GuildContributionBreakdown = typeof guildContributionBreakdownTable.$inferSelect;
export type GuildBankTransaction = typeof guildBankTransactionsTable.$inferSelect;
export type GuildChallenge = typeof guildChallengesTable.$inferSelect;
export type GuildApplication = typeof guildApplicationsTable.$inferSelect;
export type GuildRankSnapshot = typeof guildRankSnapshotsTable.$inferSelect;
//# sourceMappingURL=guilds.d.ts.map