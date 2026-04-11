export type QuestObjective = {
    text: string;
    completed: boolean;
    progress: number;
    total: number;
    type: "kill" | "collect" | "talk" | "explore" | "faction";
    target?: string;
};
export declare const questsTable: any;
export type Quest = typeof questsTable.$inferSelect;
export type NewQuest = typeof questsTable.$inferInsert;
//# sourceMappingURL=quests.d.ts.map