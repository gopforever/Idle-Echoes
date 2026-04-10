/**
 * Shared auction maintenance logic consumed by both the auction router and
 * the ghost simulator — extracted to avoid coupling domain simulation code
 * to Express route modules.
 *
 * Ghost expiry design note: when ghost listings expire they are marked
 * cancelled with no item return. This is intentional — ghosts have no
 * persistent inventory model, so their expired items are an economic sink
 * (items enter the market via ghost loot drops and permanently leave it on
 * expiry or purchase). Player listings, by contrast, are always returned to
 * the player's inventory on expiry.
 */

import { db } from "@workspace/db";
import { auctionListingsTable, inventoryTable } from "@workspace/db/schema";
import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

/**
 * Idempotent expiry sweep. For each expired player listing, the cancellation
 * and inventory return are performed in a single transaction — if the return
 * fails the claim is rolled back, leaving the listing claimable on the next
 * sweep (no item loss). Ghost listings are swept atomically in a single batch
 * with no return (deliberate economic sink).
 *
 * Safe to call concurrently: per-row claim inside each transaction prevents
 * two concurrent sweeps from settling the same listing.
 */
export async function cleanExpiredListings(): Promise<void> {
  const now = new Date();

  // Find expired unsold player listings (characterId IS NOT NULL = player-owned).
  const expiredPlayer = await db
    .select()
    .from(auctionListingsTable)
    .where(
      and(
        isNotNull(auctionListingsTable.characterId),
        eq(auctionListingsTable.sold, false),
        eq(auctionListingsTable.cancelled, false),
        lt(auctionListingsTable.expiresAt, now),
      )
    );

  // Settle each listing atomically: claim + inventory return in one transaction.
  // If any step fails the transaction rolls back — the listing stays active and
  // the next sweep can retry it, guaranteeing no item loss.
  for (const listing of expiredPlayer) {
    try {
      await db.transaction(async (tx) => {
        // Claim this specific listing — concurrent sweeps see zero rows and skip.
        const claimed = await tx
          .update(auctionListingsTable)
          .set({ cancelled: true })
          .where(
            and(
              eq(auctionListingsTable.id, listing.id),
              eq(auctionListingsTable.sold, false),
              eq(auctionListingsTable.cancelled, false),
            )
          )
          .returning({ id: auctionListingsTable.id });

        if (claimed.length === 0) return; // Already settled by a concurrent sweep.

        // Return items to player inventory — atomic SQL increment avoids lost-update.
        const returned = await tx
          .update(inventoryTable)
          .set({ quantity: sql`${inventoryTable.quantity} + ${listing.quantity}` })
          .where(
            and(
              eq(inventoryTable.characterId, listing.characterId!),
              eq(inventoryTable.itemId, listing.itemId),
            )
          )
          .returning({ id: inventoryTable.id });
        if (returned.length === 0) {
          await tx.insert(inventoryTable).values({
            characterId: listing.characterId!,
            itemId: listing.itemId,
            itemData: listing.itemData,
            quantity: listing.quantity,
          });
        }
      });
    } catch (err) {
      // Log and continue — failed listings remain active for the next sweep.
      console.error("[Auction] expiry settlement failed for listing", listing.id, err);
    }
  }

  // Sweep expired ghost listings only (characterId IS NULL = ghost-owned).
  await db
    .update(auctionListingsTable)
    .set({ cancelled: true })
    .where(
      and(
        isNull(auctionListingsTable.characterId),
        eq(auctionListingsTable.sold, false),
        eq(auctionListingsTable.cancelled, false),
        lt(auctionListingsTable.expiresAt, now),
      )
    );
}
