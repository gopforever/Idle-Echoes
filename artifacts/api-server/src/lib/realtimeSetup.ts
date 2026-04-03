/**
 * Supabase Realtime — database replication setup
 *
 * For Realtime subscriptions to receive full row data (old + new) on every
 * change event, the relevant tables must use REPLICA IDENTITY FULL.
 * This is a no-op on standard Postgres and a safe idempotent operation on
 * Supabase-managed Postgres.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const REALTIME_TABLES = ["world_events", "combat_log"];

export async function setupRealtimeReplication(): Promise<void> {
  for (const table of REALTIME_TABLES) {
    // ALTER TABLE … REPLICA IDENTITY FULL is idempotent — safe to run on
    // every startup. It is also harmless on non-Supabase Postgres instances.
    await db.execute(
      sql.raw(`ALTER TABLE "${table}" REPLICA IDENTITY FULL`),
    );
  }
}
