# QoL: Item Display & Combat Power Fixes

  ## What & Why
  A batch of polish items and bugs discovered in live play:
  1. The combat screen power bar shows a stale value from the previous fight instead of the current full power when the player is idle.
  2. Equipped earrings and rings are invisible on the paperdoll because procedural accessories use generic slot names ("ear", "ring") and one unique item uses "finger" — none matching the paperdoll's expected earLeft/earRight/ringLeft/ringRight keys.
  3. The paperdoll (character screen) has no hover tooltips on equipped items.
  4. All gear items (inventory, paperdoll, shop) need a right-click context menu with Equip/Unequip and Examine options — a standard MMO interaction.
  5. Examine should open a full modal showing every detail: GS, all stats, item level, description, rarity, sell price, and source/drop location when known.

  ## Done looks like
  - Power bar in the combat screen always matches the header bar value when idle (not fighting).
  - Equipping a ring or earring (from any source: static items, procedural drops, dungeon loot) shows it in the correct paperdoll slot and reflects it visually.
  - Hovering over any slot in the paperdoll shows the same ItemTooltipContent as in the inventory page.
  - Right-clicking any gear item in the inventory grid or the paperdoll opens a context menu with "Equip"/"Unequip" and "Examine" options.
  - The Examine dialog shows: item name (rarity-colored), icon, type, slot, level, GS badge for gear, all stats (with labels and values), description flavor text, sell price, and a drop source line ("Dropped in: Zone / from Boss") when the item's origin is known.

  ## Out of scope
  - Changing how tooltips appear on non-gear items (materials, consumables).
  - Redesigning the inventory comparison panel.
  - Adding right-click to the auction hall or bank.

  ## Tasks
  1. **Fix power bar idle display** — When no active combat tick has occurred (idle state), the combat HUD should display character.power / character.maxPower instead of the stale combatState.playerCurrentPower.

  2. **Fix ring/ear slot name normalization** — In the procedural item generator, alternate slot outputs to earLeft/earRight and ringLeft/ringRight (round-robin or random). Fix the everling_signet unique item's slot "finger" → "ringLeft". Add a slot alias mapper in the equip route so legacy values (ring, ear, finger) are mapped to their Left/Right counterparts when equipping.

  3. **Paperdoll hover tooltips** — Wrap each SlotBox in the PaperDoll component with a Tooltip that shows ItemTooltipContent for the equipped item, matching the style used in the inventory page.

  4. **Right-click context menu on gear items** — Use the existing context-menu.tsx Radix component to wrap all gear item tiles in the inventory grid and the paperdoll. The menu should have "Equip" (or "Unequip" if already equipped) and "Examine" entries, wired to the existing equip/unequip API calls.

  5. **Examine modal** — Create a new ExamineDialog component that renders full item details: rarity-colored name, icon, type/slot/level, GS badge for gear types, all stats in a labeled list, description italics, sell price, and a source line for items that have a zone or known boss drop origin. Trigger this from the Examine context-menu action.

  ## Relevant files
  - `artifacts/melvor-eq2/src/components/game/combat-hud.tsx`
  - `artifacts/melvor-eq2/src/pages/character.tsx`
  - `artifacts/melvor-eq2/src/pages/inventory.tsx`
  - `artifacts/melvor-eq2/src/components/game/item-icon.tsx`
  - `artifacts/melvor-eq2/src/components/ui/context-menu.tsx`
  - `artifacts/api-server/src/lib/proceduralItems.ts`
  - `artifacts/api-server/src/lib/gameData.ts`
  