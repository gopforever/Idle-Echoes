import { z } from "zod/v4";
export declare const skillsTable: any;
export declare const insertSkillSchema: any;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skillsTable.$inferSelect;
//# sourceMappingURL=skills.d.ts.map