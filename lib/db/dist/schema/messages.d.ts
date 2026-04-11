import { z } from "zod/v4";
export declare const messages: any;
export declare const insertMessageSchema: any;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
//# sourceMappingURL=messages.d.ts.map