# Item Tooltips & Gear Score Everywhere

## What & Why
Players can't easily see item stats or gear score values while browsing the inventory, paper doll, or shop. The existing `ItemIcon` tooltip component has the structure but is not used consistently across all item surfaces, and it doesn't show individual item gear score contribution. This task ensures rich hover tooltips appear everywhere items are displayed and that gear score is visible per item.

## Done looks like
- Hovering over any item anywhere in the game (inventory grid, paper doll slots, shop/auction listings, loot drops in combat log) shows a tooltip with: item name (rarity-colored), type/slot, level, gear score contribution (e.g. "GS: 14"), all stats with +value format, description flavor text, and sell price.
- Each item card/slot in the inventory grid and paper doll shows a small "GS: N" badge on the item tile (not just in the tooltip).
- The shop/auction hall item listings show a gear score badge alongside the rarity color.
- The `ItemIcon` tooltip component is updated to include the per-item gear score calculation inline (item level × rarity multiplier).
- Items without stats (materials, scrolls, crafting components) show their quality bar and description in the tooltip but omit the empty stats section.

## Out of scope
- Changing how overall character gear score is computed (already correct)
- Inventory page layout restructuring (covered in Task #24)
- Tooltip animations or custom delay tuning

## Tasks
1. **Add gear score to ItemIcon tooltip** — Calculate per-item GS (level × rarity multiplier matching the server formula) inside the `ItemIcon` component and display it as a highlighted line in the tooltip header between the item name and the stats list.

2. **Add GS badge to item tiles** — In the inventory grid and paper doll slot cells, overlay a small "GS N" pill badge on each item tile (bottom-right corner, semi-transparent dark background, white text). Skip the badge for items with GS = 0 (materials/consumables).

3. **Ensure ItemIcon is used on all item surfaces** — Audit the inventory grid cells, paper doll slot buttons, shop listing cards, and combat log loot mentions. Any surface that shows an item icon or name but is NOT already wrapped with `ItemIcon` should be updated to use it so the tooltip fires on hover.

4. **Tooltip for materials and consumables** — For non-gear items (crafting materials, recipe scrolls, potions), show a simplified tooltip: quality bar (if quality > 0), description, type, and sell price. Use the same `ItemIcon` wrapper.

5. **Gear score in shop listings** — Add a small GS badge to auction hall item listing cards alongside the rarity border so buyers can quickly assess value without opening detail.

## Relevant files
- `artifacts/melvor-eq2/src/components/game/item-icon.tsx`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/melvor-eq2/src/pages/shop.tsx`
- `artifacts/api-server/src/lib/eq2Formulas.ts`
