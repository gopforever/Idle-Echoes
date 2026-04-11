import { z } from "zod/v4";
export declare const combatStateTable: any;
export declare const combatLogTable: any;
export declare const inventoryTable: any;
export interface StatusEffect {
    id: string;
    name: string;
    icon: string;
    type: "bleed" | "stun" | "slow" | "frenzy" | "absorb" | "life_drain" | "fear" | "buff" | "dot" | "shield";
    remainingTicks: number;
    value: number;
    source: "player" | "enemy";
}
export declare const bossEncountersTable: any;
export type BossEncounter = typeof bossEncountersTable.$inferSelect;
export type InsertBossEncounter = typeof bossEncountersTable.$inferInsert;
export declare const bankItemsTable: any;
export type BankItem = typeof bankItemsTable.$inferSelect;
export declare const insertCombatLogSchema: any;
export type InsertCombatLog = z.infer<typeof insertCombatLogSchema>;
export type CombatLog = typeof combatLogTable.$inferSelect;
//# sourceMappingURL=combat.d.ts.map