# Deep Crafting System — SWG/LOTRO/EQ2

## What & Why
Fully replace the basic idle-style crafting system with a deep, economy-driving crafting experience inspired by Star Wars Galaxies and LOTRO, producing EQ2-quality items. Crafted gear is genuinely valuable — shaped by the quality of materials used, the crafter's focus, and the rarity of the recipe. Both human players and ghost players participate as crafters, feeding the Auction Hall economy.

## Done looks like
- The crafting page is rebuilt around recipe scrolls learned by the character (recipes are no longer universally known — they must be learned from scrolls)
- Materials have a **Resource Quality** rating (1–100) visible in inventory tooltips; higher quality input = better baseline stats on the output item
- During crafting, the player allocates **Experimentation Points** (a point budget based on crafter skill level) into one stat focus: Attack, Defense, or Utility — the chosen focus boosts that stat line on the output item proportionally
- A **Critical Success** roll (chance improves with skill level and resource quality) bumps the finished item's rarity tier up by one (e.g., Rare → Legendary)
- Finished crafted items carry metadata: crafter name, resource quality used, focus stat chosen, and whether it was a critical — shown in the item tooltip
- Items are flagged `craftedBy` and display "Handcrafted by [Name]" in the Auction Hall listing
- **Recipe Tiers:**
  - **Journeyman** — A small set of starter recipes every character knows by default
  - **Expert** — Recipe scrolls that drop from named enemies and bosses; learned on use, destroyed after
  - **Mythic** — Recipe scrolls that drop only from Mythic-tier or Raid bosses; some are flagged `oneOfAKind: true` — once the scroll is crafted, it is permanently removed from all loot tables server-wide and the item description states it is unique in the world
- Ghost players with crafting skill levels use this system autonomously — they gather materials, pick recipes from their known list, run the craft, and list the result on the Auction Hall with a "Ghost Crafter" badge
- The Auction Hall filters and displays crafted items distinctly, showing crafter, quality, and focus stat in the listing card

## Out of scope
- Auction bidding / multi-step experimentation bars (SWG Deep mode) — kept simple per user direction
- Crafting stations or physical world locations for crafting
- Crafting guild system
- Recipe trading between players (future)

## Tasks

1. **Resource Quality on Materials** — Add a `quality` field (1–100) to material/ingredient item instances. Update the procedural item generator and loot drops to assign quality values to dropped materials. Update inventory tooltips to display quality. Gathering yields should reflect zone difficulty in average quality output.

2. **Recipe Scroll System & Recipe Database** — Replace the hardcoded recipe list with a learned-recipe system stored per character in the DB. Define recipe tiers (Journeyman, Expert, Mythic) with a `tier` field and an `oneOfAKind` boolean. Add a `knownRecipes` table or column. Add a `recipeScrolls` item type — when used from inventory, the scroll is consumed and the recipe is added to the character's known list. Journeyman recipes are pre-known at character creation.

3. **Loot Table Integration for Recipe Scrolls** — Wire Expert recipe scrolls into boss/named-mob loot tables. Wire Mythic recipe scrolls into Mythic boss and Raid boss loot tables. For `oneOfAKind` recipes: track a server-wide `craftedOnce` flag in the DB; once a recipe is crafted, set the flag and remove it from all future loot table rolls. Include a handful of Mythic one-of-a-kind recipe scrolls in the game data.

4. **Crafting Engine Rebuild — Backend** — Rewrite the `/craft` endpoint to: (a) verify the recipe is in the character's known list, (b) consume ingredients weighted by their quality values to compute a `resourceQuality` score for the craft session, (c) accept an `experimentFocus` param (attack/defense/utility) and `experimentPoints` allocation (budget = `floor(skillLevel / 10)`, min 1), (d) apply the focus boost to the appropriate stat group on the output item, (e) roll for critical success using `(skillLevel + resourceQuality) / 200` as the probability, bumping rarity tier on crit, (f) stamp the item with `craftedBy`, `resourceQuality`, `experimentFocus`, and `isCritical` metadata, (g) handle `oneOfAKind` recipe locking server-wide.

5. **Crafting UI Rebuild — Frontend** — Replace the recipe card grid with: a learned-recipe browser (filterable by tier/type), an ingredient panel showing each material's quality rating with a color indicator (green/yellow/red), an experiment focus selector (Attack / Defense / Utility radio) with a point-budget allocator that shows the projected stat boost, a craft button with a live crit-chance preview, and a result modal that shows the finished item with all its metadata highlighted. Show one-of-a-kind recipes with a distinctive visual treatment.

6. **Crafted Item Display in Auction Hall** — Update Auction Hall listing cards to surface crafting metadata: "Handcrafted by [Name]", resource quality badge, focus stat tag, and a crown/star icon for critical crafts. One-of-a-kind items get a unique border treatment. Filter sidebar gains a "Crafted Items" toggle.

7. **Ghost Crafter Behavior** — Give ghost players a crafting routine: ghosts with crafting skill ≥ 10 periodically select a known recipe matching their materials on hand, run the craft logic (same backend endpoint or shared service), and list the result on the Auction Hall. Ghosts start knowing Journeyman recipes; high-level ghosts can learn Expert recipes from loot. Ghost crafter listings show a "Ghost Crafter" badge instead of a player name.

## Relevant files
- `artifacts/api-server/src/routes/crafting.ts`
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/proceduralItems.ts`
- `artifacts/api-server/src/lib/auctionService.ts`
- `artifacts/api-server/src/routes/auction.ts`
- `artifacts/api-server/src/routes/items.ts`
- `artifacts/melvor-eq2/src/pages/crafting.tsx`
- `lib/api-zod/src/generated/types/craftingRecipe.ts`
- `lib/api-zod/src/generated/types/item.ts`
- `lib/api-zod/src/generated/types/itemRarity.ts`
