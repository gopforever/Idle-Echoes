---
title: Combat Fixes, Potions & Sell-All
---
# Combat Fixes, Potions & Inventory Actions

## What & Why
Several core game systems are broken or missing from the combat screen: meditation can only be toggled from the character page, haste from AA points isn't showing up in computed stats, potions exist in inventory but can't actually be used, and there's no way to bulk-sell items. This task fixes all of these together since they share backend routes and the inventory page.

## Done looks like
- A Meditate toggle appears inside CombatHud (same one used on the combat page and in dungeons), letting players start/stop meditation without leaving the combat screen. It is hidden while combat is active.
- The "Haste" stat in the character "At a Glance" panel reflects AA bonuses (e.g. Armor Mastery and Swift Footing ranks). The root cause (hasteBonus not flowing through to the stat display) is identified and fixed in `eq2Formulas.ts` or wherever `computeStats` is called.
- A "Use" button appears on consumable items (potions) in the inventory panel. Clicking it calls a new `POST /inventory/use` endpoint that applies the potion's effect (restore HP or Power) to the character immediately.
- Auto-Potions setting is wired end-to-end: the toggle is visible in combat settings, the server saves it properly, and the combat tick logic checks inventory for a health potion and consumes one when the player's HP drops below 40%.
- A "Sell All" button in the inventory page lets players instantly sell every non-equipped item in a single click. A confirmation dialog prevents accidents. The response shows total gold earned.

## Out of scope
- Crafting new potions (alchemy skill is separate)
- Bank / item storage (separate task)
- Item tooltip changes (separate task)

## Tasks
1. **Add Meditate toggle to CombatHud** — Add the same meditate toggle button that exists on the character page into the CombatHud component, positioned below the player HP/Power bars. It should read from `isMeditating` character state and call `PUT /character/settings`, hidden when `combatState.active` is true.

2. **Fix haste AA calculation** — Trace the flow from `applyAABonuses` through `computeStats` to the `/character/stats` response. Confirm that `hasteBonus` is passed correctly and not zeroed out. Check the AA node definitions for `armor_mastery` and `swift_footing` to ensure `effectValue` and `effectPerRank` produce non-zero output when ranks > 0. Fix the bug so Haste % in "At a Glance" reflects invested AA.

3. **Implement potion use endpoint** — Add `POST /inventory/use` route that accepts `{ itemId }`, looks up the item in inventory (type must be `consumable`), applies its effect (health potion → restore HP; mana potion → restore Power, capped at max), decrements quantity or removes the row, and returns updated HP/Power values.

4. **Wire auto-potions in combat tick** — In the combat tick handler, when `autoHeal` or a new `autoPotions` flag is enabled and player HP falls below 40%, check the inventory for a health potion and call the use-potion logic if one exists. Fix the backend settings route to actually save and return `autoPotions`. Add the auto-potions toggle to the combat settings UI.

5. **Add Use button to consumables in inventory UI** — In the inventory page, consumable items (type `consumable`) should show a "Use" button alongside the existing "Sell" button. Clicking it calls the new use endpoint and invalidates the character and inventory queries so bars update immediately.

6. **Add Sell All button to inventory** — Add a "Sell All" button to the inventory page toolbar. It calls a new `POST /inventory/sell-all` backend route that sells every non-equipped item and returns `{ goldEarned, newGoldTotal, itemCount }`. Show a confirmation dialog first, then display the gold earned in a toast.

## Relevant files
- `artifacts/melvor-eq2/src/components/game/combat-hud.tsx`
- `artifacts/melvor-eq2/src/pages/combat.tsx`
- `artifacts/melvor-eq2/src/pages/character.tsx:367-382`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/api-server/src/routes/inventory.ts`
- `artifacts/api-server/src/routes/combat.ts`
- `artifacts/api-server/src/routes/character.ts`
- `artifacts/api-server/src/lib/eq2Formulas.ts:85-118,162-167`
- `artifacts/api-server/src/lib/eq2Data.ts:1527,1570`