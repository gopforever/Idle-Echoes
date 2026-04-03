# Fabled & Mythical Items — No-Drop Flag

## What & Why
Fabled and Mythical items are the top two rarity tiers — they should feel prestigious and earned, not tradeable commodities. Making them "No-Drop" (cannot be sold to the shop or listed on the Auction Hall) preserves the prestige of those drops, matches authentic EQ2 lore behavior (fabled gear was always no-trade in EQ2), and gives players a reason to actively use their best gear rather than flip it for gold.

## Done looks like
- All items with rarity `fabled` or `mythical` have a `noSell: true` flag in their item definition.
- The sell endpoint (`POST /inventory/sell` and `POST /inventory/sell-all`) rejects attempts to sell no-drop items and returns a clear error message.
- The Auction Hall listing endpoint rejects no-drop items with a clear error.
- On the frontend, no-drop fabled/mythical items show a small "No-Drop" or "Heirloom" badge in their tooltip and item card — the Sell/List buttons are disabled or hidden for those items.
- The item examine dialog shows a "No-Drop" line in the item properties.

## Out of scope
- Making legendary (one tier below fabled) no-drop — only fabled and mythical.
- Retroactively removing already-listed fabled items from the auction (those can stay until they sell out naturally).
- Bank or trade window restrictions.

## Tasks
1. **Item interface & data** — Add a `noSell?: boolean` field to the `Item` interface in `gameData.ts`. Set `noSell: true` on every fabled and mythical item in the `ITEMS` array. Also add a helper `isNoSell(item: Item): boolean` that returns `true` if `item.noSell` is set or if the rarity is `fabled` or `mythical` (as a fallback so procedurally-generated fabled/mythical loot is also protected).

2. **Backend enforcement** — In `inventory.ts` sell routes and in `auction.ts` listing route, call `isNoSell()` on the item. If true, return a 400 error with the message "This item is No-Drop and cannot be sold or traded." Also guard the `sell-all` bulk route so it silently skips (not errors out) no-drop items and continues selling the rest, with the response indicating how many were skipped.

3. **Frontend badge & disabled state** — In `item-icon.tsx` tooltip and `examine-dialog.tsx`, add a "No-Drop" line in red below the item name when `noSell` is true or rarity is fabled/mythical. In `shop.tsx` sell section and `auction.tsx` listing form, disable the sell/list button for those items and show a tooltip explaining why. In `inventory.tsx` item cards, show a small "NO-DROP" badge overlay on fabled/mythical items.

## Relevant files
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/routes/inventory.ts`
- `artifacts/api-server/src/routes/auction.ts`
- `artifacts/melvor-eq2/src/components/game/item-icon.tsx`
- `artifacts/melvor-eq2/src/components/game/examine-dialog.tsx`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/melvor-eq2/src/pages/shop.tsx`
