import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { auctionListingsTable, charactersTable, inventoryTable } from "@workspace/db/schema";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { cleanExpiredListings } from "../lib/auctionService.js";

export { cleanExpiredListings };

const router: IRouter = Router();

const LISTING_DURATION_MS = 24 * 30 * 1000; // 24 ghost-ticks (~12 real minutes)
const MAX_PLAYER_LISTINGS = 20;

// ─── GET /auction ─────────────────────────────────────────────────────────────

router.get("/auction", async (req, res) => {
  try {
    await cleanExpiredListings().catch(() => {});

    const now = new Date();
    const category = req.query.category as string | undefined;
    const craftedOnly = req.query.craftedOnly === "true";

    const listings = await db
      .select()
      .from(auctionListingsTable)
      .where(
        and(
          eq(auctionListingsTable.sold, false),
          eq(auctionListingsTable.cancelled, false),
          gt(auctionListingsTable.expiresAt, now),
        )
      )
      .orderBy(auctionListingsTable.postedAt);

    let filtered = category && category !== "all"
      ? listings.filter(l => l.category === category)
      : listings;

    if (craftedOnly) {
      filtered = filtered.filter(l => {
        const data = l.itemData as Record<string, unknown>;
        return !!data?.craftedMeta;
      });
    }

    return res.json(filtered.map(l => {
      const itemData = l.itemData as Record<string, unknown>;
      const craftedMeta = itemData?.craftedMeta as Record<string, unknown> | undefined;
      return {
        id: l.id,
        sellerId: l.sellerId,
        sellerName: l.sellerName,
        itemId: l.itemId,
        itemName: l.itemName,
        itemData: l.itemData,
        quantity: l.quantity,
        buyoutPrice: l.buyoutPrice,
        category: l.category,
        postedAt: l.postedAt,
        expiresAt: l.expiresAt,
        isPlayerListing: l.characterId !== null,
        craftedMeta: craftedMeta ?? null,
        isGhostCrafter: !!(craftedMeta && l.characterId === null),
      };
    }));
  } catch (err) {
    console.error("[Auction] GET /auction error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /auction/my-listings ─────────────────────────────────────────────────

router.get("/auction/my-listings", async (req, res) => {
  try {
    await cleanExpiredListings().catch(() => {});

    const listings = await db
      .select()
      .from(auctionListingsTable)
      .where(
        and(
          eq(auctionListingsTable.characterId, req.characterId),
          eq(auctionListingsTable.sold, false),
          eq(auctionListingsTable.cancelled, false),
        )
      )
      .orderBy(auctionListingsTable.postedAt);

    return res.json(listings.map(l => ({
      id: l.id,
      itemId: l.itemId,
      itemName: l.itemName,
      itemData: l.itemData,
      quantity: l.quantity,
      buyoutPrice: l.buyoutPrice,
      category: l.category,
      postedAt: l.postedAt,
      expiresAt: l.expiresAt,
    })));
  } catch (err) {
    console.error("[Auction] GET /auction/my-listings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auction/list ───────────────────────────────────────────────────────

router.post("/auction/list", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const { itemId, quantity = 1, buyoutPrice, category = "misc" } = req.body;

    if (!itemId || !buyoutPrice || isNaN(Number(buyoutPrice)) || Number(buyoutPrice) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid listing parameters." });
    }

    const qty = Math.max(1, Math.floor(Number(quantity)));
    const price = Math.floor(Number(buyoutPrice));

    const activeListings = await db
      .select()
      .from(auctionListingsTable)
      .where(
        and(
          eq(auctionListingsTable.characterId, character.id),
          eq(auctionListingsTable.sold, false),
          eq(auctionListingsTable.cancelled, false),
        )
      );
    if (activeListings.length >= MAX_PLAYER_LISTINGS) {
      return res.json({ success: false, message: `You can only have ${MAX_PLAYER_LISTINGS} active listings at once.` });
    }

    // Pre-read inventory outside the transaction for the early-exit check
    const [invRow] = await db
      .select()
      .from(inventoryTable)
      .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, itemId)));
    if (!invRow || invRow.quantity < qty) {
      return res.json({ success: false, message: "You don't have enough of that item." });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LISTING_DURATION_MS);
    const itemData = invRow.itemData as Record<string, unknown>;
    const itemName = (itemData?.name as string) ?? itemId;

    // Transactional: conditional inventory deduct + listing insert.
    // The WHERE clause on deduction guards concurrent listing of the same item stock.
    await db.transaction(async (tx) => {
      let deducted: { id: number }[];
      if (invRow.quantity === qty) {
        // Exact match: delete the row only if quantity hasn't changed since we read it
        deducted = await tx
          .delete(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, invRow.id),
              eq(inventoryTable.characterId, character.id),
              eq(inventoryTable.quantity, qty),
            )
          )
          .returning({ id: inventoryTable.id });
      } else {
        // Partial deduct: only if enough quantity remains (concurrent-safe)
        deducted = await tx
          .update(inventoryTable)
          .set({ quantity: sql`${inventoryTable.quantity} - ${qty}` })
          .where(
            and(
              eq(inventoryTable.id, invRow.id),
              eq(inventoryTable.characterId, character.id),
              sql`${inventoryTable.quantity} >= ${qty}`,
            )
          )
          .returning({ id: inventoryTable.id });
      }

      if (deducted.length === 0) {
        // Inventory changed between pre-read and transaction — throw to rollback
        throw Object.assign(
          new Error("Inventory changed. Please try again."),
          { isAuctionUserError: true }
        );
      }

      await tx.insert(auctionListingsTable).values({
        characterId: character.id,
        sellerId: character.id.toString(),
        sellerName: character.name,
        itemId,
        itemName,
        itemData,
        quantity: qty,
        buyoutPrice: price,
        category,
        postedAt: now,
        expiresAt,
        sold: false,
        cancelled: false,
      });
    });

    return res.json({ success: true, message: `${itemName} listed for ${price}g.` });
  } catch (err) {
    if (err && typeof err === "object" && "isAuctionUserError" in err) {
      return res.json({ success: false, message: (err as unknown as { message: string }).message });
    }
    console.error("[Auction] POST /auction/list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auction/buy/:listingId ─────────────────────────────────────────────

router.post("/auction/buy/:listingId", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const listingId = parseInt(req.params.listingId, 10);

    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    // Quick pre-check (own listing, affordability) before attempting claim
    const [listing] = await db
      .select()
      .from(auctionListingsTable)
      .where(eq(auctionListingsTable.id, listingId));

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }
    if (listing.characterId === character.id) {
      return res.json({ success: false, message: "You can't buy your own listing." });
    }
    if (character.gold < listing.buyoutPrice) {
      return res.json({ success: false, message: "Not enough gold." });
    }

    // All three steps in one transaction; a thrown AuctionError rolls back the claim.
    const result = await db.transaction(async (tx) => {
      // Step 1: claim listing atomically
      const [c] = await tx
        .update(auctionListingsTable)
        .set({ sold: true, soldAt: new Date() })
        .where(
          and(
            eq(auctionListingsTable.id, listingId),
            eq(auctionListingsTable.sold, false),
            eq(auctionListingsTable.cancelled, false),
            gt(auctionListingsTable.expiresAt, new Date()),
          )
        )
        .returning();

      if (!c) return null; // listing gone — commit no-op, caller handles

      // Step 2: conditional gold deduction — guards concurrent buys on the same character
      const [charRow] = await tx
        .update(charactersTable)
        .set({ gold: sql`${charactersTable.gold} - ${c.buyoutPrice}`, updatedAt: new Date() })
        .where(
          and(
            eq(charactersTable.id, character.id),
            sql`${charactersTable.gold} >= ${c.buyoutPrice}`,
          )
        )
        .returning({ gold: charactersTable.gold });

      if (!charRow) {
        // Player cannot afford — throw to roll back the listing claim too
        throw Object.assign(new Error("Not enough gold."), { isAuctionUserError: true });
      }

      // Step 3: add item to buyer's inventory — atomic SQL increment avoids lost-update race.
      const credited = await tx
        .update(inventoryTable)
        .set({ quantity: sql`${inventoryTable.quantity} + ${c.quantity}` })
        .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, c.itemId)))
        .returning({ id: inventoryTable.id });
      if (credited.length === 0) {
        await tx.insert(inventoryTable).values({
          characterId: character.id,
          itemId: c.itemId,
          itemData: c.itemData,
          quantity: c.quantity,
        });
      }

      // Step 4: credit ghost seller gold if the seller is a ghost character.
      // Real player sellers are identified by characterId being set; ghost sellers have null characterId.
      if (c.characterId === null) {
        const ghostId = parseInt(c.sellerId, 10);
        if (!isNaN(ghostId)) {
          await tx
            .update(charactersTable)
            .set({ gold: sql`${charactersTable.gold} + ${c.buyoutPrice}`, updatedAt: new Date() })
            .where(eq(charactersTable.id, ghostId));
        }
      }

      return { claimed: c, newGold: charRow.gold };
    });

    if (!result) {
      return res.json({ success: false, message: "This listing is no longer available." });
    }

    return res.json({
      success: true,
      message: `Purchased ${result.claimed.itemName} for ${result.claimed.buyoutPrice}g.`,
      newGold: result.newGold,
    });
  } catch (err) {
    if (err && typeof err === "object" && "isAuctionUserError" in err) {
      return res.json({ success: false, message: (err as unknown as { message: string }).message });
    }
    console.error("[Auction] POST /auction/buy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /auction/:listingId ───────────────────────────────────────────────

router.delete("/auction/:listingId", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const listingId = parseInt(req.params.listingId, 10);
    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    // Quick ownership check before attempting atomic claim
    const [preview] = await db
      .select({ characterId: auctionListingsTable.characterId })
      .from(auctionListingsTable)
      .where(eq(auctionListingsTable.id, listingId));

    if (!preview) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }
    if (preview.characterId !== character.id) {
      return res.status(403).json({ success: false, message: "You can only cancel your own listings." });
    }

    // Claim + inventory return in one transaction — if return fails, claim rolls back.
    const result = await db.transaction(async (tx) => {
      const [c] = await tx
        .update(auctionListingsTable)
        .set({ cancelled: true })
        .where(
          and(
            eq(auctionListingsTable.id, listingId),
            eq(auctionListingsTable.characterId, character.id),
            eq(auctionListingsTable.sold, false),
            eq(auctionListingsTable.cancelled, false),
          )
        )
        .returning();

      if (!c) return null; // already resolved — transaction commits a no-op

      // Atomic inventory return — SQL increment avoids lost-update under concurrency.
      const returned = await tx
        .update(inventoryTable)
        .set({ quantity: sql`${inventoryTable.quantity} + ${c.quantity}` })
        .where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, c.itemId)))
        .returning({ id: inventoryTable.id });
      if (returned.length === 0) {
        await tx.insert(inventoryTable).values({
          characterId: character.id,
          itemId: c.itemId,
          itemData: c.itemData,
          quantity: c.quantity,
        });
      }

      return c;
    });

    if (!result) {
      return res.json({ success: false, message: "Listing already resolved." });
    }

    return res.json({ success: true, message: `${result.itemName} returned to your inventory.` });
  } catch (err) {
    console.error("[Auction] DELETE /auction error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /auction/recent-sales ────────────────────────────────────────────────

router.get("/auction/recent-sales", async (_req, res) => {
  try {
    const sales = await db
      .select()
      .from(auctionListingsTable)
      .where(eq(auctionListingsTable.sold, true))
      .orderBy(desc(auctionListingsTable.soldAt))
      .limit(15);
    return res.json(sales.map(s => ({
      id: s.id,
      itemName: s.itemName,
      itemId: s.itemId,
      itemData: s.itemData,
      buyoutPrice: s.buyoutPrice,
      sellerName: s.sellerName,
      quantity: s.quantity,
      soldAt: s.soldAt,
    })));
  } catch (err) {
    console.error("[Auction] GET /auction/recent-sales error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /auction/price-suggestion ────────────────────────────────────────────

router.get("/auction/price-suggestion", async (req, res) => {
  try {
    const itemId = req.query.itemId as string;
    if (!itemId) return res.json({ suggestion: null });

    // Get last 5 sold listings for this item
    const recent = await db
      .select({ price: auctionListingsTable.buyoutPrice, qty: auctionListingsTable.quantity })
      .from(auctionListingsTable)
      .where(and(eq(auctionListingsTable.itemId, itemId), eq(auctionListingsTable.sold, true)))
      .orderBy(desc(auctionListingsTable.soldAt))
      .limit(5);

    if (recent.length === 0) {
      // Fall back to current active listings
      const active = await db
        .select({ price: auctionListingsTable.buyoutPrice })
        .from(auctionListingsTable)
        .where(and(
          eq(auctionListingsTable.itemId, itemId),
          eq(auctionListingsTable.sold, false),
          eq(auctionListingsTable.cancelled, false),
        ))
        .limit(10);
      if (active.length === 0) return res.json({ suggestion: null });
      const avg = Math.floor(active.reduce((s, r) => s + r.price, 0) / active.length);
      return res.json({ suggestion: avg, basis: "active_listings" });
    }

    const perUnit = recent.map(r => Math.floor(r.price / Math.max(1, r.qty)));
    const sorted = [...perUnit].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return res.json({ suggestion: median, basis: "recent_sales" });
  } catch {
    return res.json({ suggestion: null });
  }
});

export default router;
