# Gathering & Crafting Expansion

  ## What & Why
  Gathering skills (Mining, Woodcutting, Fishing, Herbalism) exist in the skill system but ghosts don't gather, and crafting is a thin overlay on inventory. Making these systems more central turns the game into a proper idle RPG with a production loop: gather → craft → equip/sell.

  ## Done looks like
  - Ghosts participate in gathering during their simulation ticks based on personality (Scholarly ghosts gather more, Greedy ghosts mine for ore). Ghost gathering generates resources that feed into their auction listings.
  - The gathering skills page shows what resources each skill produces per hour, with an idle mode toggle (already exists) that auto-adds gathered resources to inventory over time.
  - Crafting has a queue: the player can queue up multiple crafts. Each craft has a timer (based on `craftingTime` in recipe data) that ticks down, completing one at a time automatically.
  - Crafting recipes are grouped by skill (Smithing, Tailoring, Alchemy, Jeweling, Tinkering) with clearer ingredient source hints (shows where to gather each ingredient).
  - At least 10 new crafting recipes are added across the five crafting skills to fill out the progression, covering mid-tier and high-tier items.
  - A dedicated "Gathering" tab in the skills page shows live output rates for each gathering skill and a resource inventory summary.

  ## Out of scope
  - Procedural resource nodes on a map (click-to-gather stays idle/timer-based).
  - Selling crafted items directly — use the Auction Hall task for that.
  - Guild or cooperative crafting.

  ## Tasks
  1. **Ghost gathering simulation** — In the ghost simulator tick, for each ghost determine a gathering action based on personality (Scholarly/Greedy prefer mining, Explorers prefer herbalism). Add gathered resources to a virtual ghost inventory tracked in the `world_players` JSONB stats field, so ghosts can later post those resources in the auction hall.
  2. **Crafting queue backend** — Add a `crafting_queue` table (characterId, recipeId, quantity, startedAt, completesAt, status). Add endpoints to enqueue a craft, check queue status, and a server-side tick (or lazy evaluation on next request) to complete finished crafts and add items to inventory.
  3. **Gathering UI improvements** — In the skills page, add a "Gathering" section showing resource output per hour per gathering skill and a resource breakdown of current inventory. Show which crafting recipes each resource feeds into as a tooltip.
  4. **Crafting UI — queue and grouping** — Update the crafting page to show a queue panel on the side. Add a quantity selector to craft multiple at once. Group recipes by skill tab. Add ingredient source hints showing which gathering skill or enemy drops each ingredient.
  5. **New crafting recipes** — Add at least 10 new recipes across skill tiers: mid-tier smithing (mithril gear), alchemy (advanced potions), jeweling (enchanted rings), tailoring (enchanted cloaks), tinkering (compound bows). Ensure ingredients come from gathering skills.

  ## Relevant files
  - `artifacts/api-server/src/lib/ghostSimulator.ts`
  - `artifacts/api-server/src/routes/crafting.ts`
  - `artifacts/api-server/src/routes/skills.ts`
  - `artifacts/api-server/src/lib/gameData.ts`
  - `lib/db/src/schema/character.ts`
  - `lib/db/src/schema/world.ts`
  - `artifacts/melvor-eq2/src/pages/crafting.tsx`
  - `artifacts/melvor-eq2/src/pages/skills.tsx`
  