import { z } from "zod/v4";
export declare const conversations: any;
export declare const insertConversationSchema: any;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
//# sourceMappingURL=conversations.d.ts.map