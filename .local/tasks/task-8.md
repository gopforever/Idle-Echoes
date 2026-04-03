---
title: Ghost Players — Level Progression, Personalities & Economy
---
# Ghost Player Progression, Personalities & Economy

## What & Why

Right now ghost players are seeded at high levels (8–50) with pre-built stats and fixed behaviour — they all behave identically and never feel like real adventurers. This task makes them first-class citizens of the world: they start at level 1 and earn every level just like the human player, each one has a distinct personality that shapes what they do, they generate richer world-building content, and they participate in the economy by spending gold on goods whose demand then shifts prices for the real player.

## Done looks like

- All 30 ghost players reset to level 1, starting in the newbie zones (Commonlands / Antonica). Their kill counts, gold, and XP all reset to 0.
- Each ghost has a personality (Aggressive, Cautious, Explorer, Greedy, Scholarly, or Devout) visible on the World Leaderboard / player card.
- Personality visibly changes simulator behaviour:
  - **Aggressive** — boss encounter chance 20% (vs 8% default), generates brutal kill messages.
  - **Cautious** — boss encounter chance 2%, lingers in safe zones, rarely dies.
  - **Explorer** — travels to a new zone every 3–4 ticks regardless of level-up, generates "discovery" world events naming landmarks.
  - **Greedy** — 25% bonus loot chance, hoards gold, generates treasure-find world events often.
  - **Scholarly** — generates lore-rich world events ("studied ancient runes", "translated a tome"), buys materials/adornments in the ghost market.
  - **Devout** — faction-aligned, prefers zones matching their alignment's faction, generates deeper faction narrative events.
- Ghost players spend gold in a simulated market: each tick they have a personality-weighted chance to "purchase" items from a category (weapons, armor, consumables, mounts, adornments, materials), spending gold and recording demand.
- A new `ghost_market_demand` DB table tracks running demand per item category (rolling 24-hour window), updated each tick.
- Shop prices for the real player reflect ghost demand — categories with high ghost demand cost up to 15% more; categories with low/no demand cost up to 10% less.
- The Shop page shows a live "Market Pulse" section — a small row of category badges showing whether demand is High / Normal / Low for each item type.
- World events become personality-flavoured: each personality has its own message pool for kills, boss kills, travel, loot, and discoveries. Explorer and Scholarly ghosts can generate a new event type ("discovery") that names a fictional landmark, adding lore to the world feed.

## Out of scope

- Ghost players grouping or interacting with each other.
- Ghosts entering dungeons.
- Real-time price auction / bidding between ghosts.
- Persistent market history chart (future work).

## Tasks

1. **DB schema additions** — Add `personality` (text) and `totalGoldSpent` (real, default 0) columns to `world_players`. Create a new `ghost_market_demand` table with columns: `category` (text PK), `demandScore` (real), `updatedAt` (timestamp). Push schema with the project's db-push command.

2. **Ghost seed reset** — Update all 30 entries in `ghostSeeds.ts` to: level 1, xp 0, gold 0, killCount 0, deathCount 0, bossKills 0, totalGoldEarned 0, zone "Commonlands" or "Antonica". Add a `personality` field to each seed, distributing the 6 personality types across the 30 characters in a way that matches their race/class flavour (e.g., Mages → Scholarly, Ogres → Aggressive, Fae → Cautious, Gnomes → Explorer, Dark Elfs → Greedy, Priests/Paladins → Devout). Add a `resetGhostPlayers()` export to `ghostSimulator.ts` that truncates `world_players` and re-runs the seed (called once on first boot if existing players are at level >1 or if a VERSION flag differs).

3. **Personality-driven simulator** — Rewrite `tickGhostSimulation` to read each ghost's personality and apply per-personality modifiers: boss chance, zone-travel frequency, loot chance, and which message pool to use. Add 5–6 message arrays per personality per event type (kill, boss_kill, loot, zone_travel) plus a new "discovery" event type for Explorer/Scholarly ghosts that inserts a named fictional landmark into the world event message.

4. **Ghost economy — market spending** — After each winning combat tick, each ghost has a personality-weighted chance (e.g., Greedy 5%, Scholarly 20%, Mercantile-style weighting for others) to spend gold on a random item category. Deduct gold from the ghost, increment `totalGoldSpent`, and upsert the matching row in `ghost_market_demand` (add a weighted demand score). Prune demand scores by decaying them 10% each tick so old demand fades. Ghosts with 0 gold skip spending. Generate a new "purchase" world event ("Tharindel pays a Lavastorm merchant for new adornments") at importance 1.

5. **Dynamic shop pricing** — In `routes/shop.ts`, before returning any item list or individual item price, fetch `ghost_market_demand` and compute a price multiplier per category (demand score maps to ±15% range). Apply the multiplier to the `price` field in the response. Add a `GET /shop/market-pulse` endpoint that returns `{ category, demandScore, trend: "high"|"normal"|"low" }[]` for all categories.

6. **Market Pulse UI in Shop** — On the Shop page, below the zone/merchant header and above the item tabs, add a compact "Market Pulse" strip: a horizontal row of small coloured badges showing each item category with an icon and a High / Normal / Low label. Badges pull from the `/shop/market-pulse` endpoint (cached 30 seconds). Prices already fetched from the server will reflect the adjusted values automatically.

7. **Personality on Leaderboard** — On the World Leaderboard page and the ghost "quote bubble" hover card, display the ghost's personality as a small coloured badge next to their class/archetype label.

## Relevant files

- `lib/db/src/schema/world.ts`
- `artifacts/api-server/src/lib/ghostSeeds.ts`
- `artifacts/api-server/src/lib/ghostSimulator.ts`
- `artifacts/api-server/src/routes/world.ts`
- `artifacts/api-server/src/routes/shop.ts`
- `artifacts/melvor-eq2/src/pages/shop.tsx`
- `artifacts/melvor-eq2/src/pages/dashboard.tsx`