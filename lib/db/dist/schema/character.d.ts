import { z } from "zod/v4";
export declare const charactersTable: any;
export declare const insertCharacterSchema: any;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
//# sourceMappingURL=character.d.ts.map