export interface PartyMember {
    ghostId: number;
    hp: number;
    maxHp: number;
    status: "active" | "downed" | "revived";
    damageDone: number;
    healingDone: number;
    saveCount: number;
}
export declare const dungeonRunsTable: any;
export declare const raidRunsTable: any;
export declare const dungeonKillStatsTable: any;
export type DungeonRun = typeof dungeonRunsTable.$inferSelect;
export type InsertDungeonRun = typeof dungeonRunsTable.$inferInsert;
export type RaidRun = typeof raidRunsTable.$inferSelect;
export type InsertRaidRun = typeof raidRunsTable.$inferInsert;
export type DungeonKillStats = typeof dungeonKillStatsTable.$inferSelect;
//# sourceMappingURL=dungeons.d.ts.map