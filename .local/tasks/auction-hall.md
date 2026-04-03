# Auction Hall — Player & Ghost Economy

  ## What & Why
  The current shop is a static merchant with ghost-demand-influenced prices. Replace it with a true auction hall where the real player can list items for sale, ghost players bid and buy, and other ghost players also list items the real player can purchase. This makes the economy feel alive and ties gathering/crafting output to real value.

  ## Done looks like
  - The "Shop" page is renamed/replaced by an "Auction Hall" page.
  - The player can post items from their inventory for sale with a buyout price (no bidding complexity needed — direct sale listings).
  - Ghost players automatically browse listings and purchase items that fit their personality/needs, removing the listing and sending gold to the real player.
  - Ghost players post their own listings (resources, crafted goods, loot) at personality-weighted prices that the real player can buy.
  - Listings have a duration (e.g., 24 in-game ticks / ~12 minutes). Expired listings return items to the poster.
  - Market Pulse from the existing ghost demand system still influences ghost listing/buying behavior.
  - The old static merchant shop is removed or folded into a simple "Vendor" tab inside the auction hall for base consumables.

  ## Out of scope
  - Bidding/auction format (buy-now only for now).
  - Cross-player trading (no multi-player backend needed, ghost economy only).
  - Mobile/Expo app changes.

  ## Tasks
  1. **DB schema** — Add an `auction_listings` table with fields: id, sellerId (ghost or "player"), sellerName, itemId, itemName, quantity, buyoutPrice, postedAt, expiresAt, sold.
  2. **Auction API routes** — Add endpoints: `GET /api/auction` (browse listings), `POST /api/auction/list` (player lists an item), `POST /api/auction/buy/:listingId` (player buys), `DELETE /api/auction/:listingId` (player cancels own listing). Include expiry cleanup logic.
  3. **Ghost participation** — In the ghost simulator tick, have ghosts occasionally post items from their "loot" to the auction, and have ghosts buy player listings that fit their spending profile. Use existing Market Pulse demand scores to influence ghost buying behavior.
  4. **Auction Hall UI** — Replace the shop page with an Auction Hall page showing: browse tab (all listings with search/filter by category), my listings tab (player's active listings with cancel button), and a Vendor tab (old basic merchant for consumables). Show time remaining, seller name, and price per unit.

  ## Relevant files
  - `artifacts/api-server/src/routes/shop.ts`
  - `artifacts/api-server/src/lib/ghostSimulator.ts`
  - `artifacts/api-server/src/lib/ghostSeeds.ts`
  - `lib/db/src/schema/world.ts`
  - `artifacts/melvor-eq2/src/pages/shop.tsx`
  - `artifacts/api-server/src/lib/gameData.ts`
  