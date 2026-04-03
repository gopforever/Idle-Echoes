# Leaderboard — Full Player Cards (No GS, Show Gear & Stats)

## What & Why
The current leaderboard shows a simple ranked list with Gear Score as a column. The user wants to remove individual Gear Score from public display and instead show richer, more social information: which zones each player has killed enemies in and how many kills per zone, which dungeons they've cleared and how many times, and a full view of each player's equipped gear and stats. This transforms the leaderboard from a "who has the best gear score" scoreboard into a detailed adventurer profile browser.

## Done looks like
- Gear Score column is removed from the leaderboard table entirely.
- The Overall ranking tab now ranks players by a combination of total kills, boss kills, dungeon completions, and level — not GS.
- Each player row is expandable (or links to a profile card) that shows:
  - **Zone kills breakdown**: a list of every zone the player has killed enemies in, with a kill count per zone (e.g., "Qeynos Hills: 42 kills, Blackburrow: 18 kills").
  - **Dungeon clears**: every dungeon the player has completed, the difficulty, and how many times they've cleared it (e.g., "Blackburrow Depths — Expert: 3 clears, Legendary: 1 clear").
  - **Equipped gear**: all 18 gear slots shown with item name, level, rarity color, and slot icon — matching the in-game character sheet style.
  - **Stats panel**: the player's combat stats (Attack, Defense, HP, DPS, Haste, Crit Chance, etc.) computed from their equipped gear.
- Ghost NPC player rows also show this detail where data is available.
- The Dungeon tab keeps tracking dungeon progression but also shows per-dungeon clear counts.

## Out of scope
- Real-time live updates (still 30-second poll is fine).
- Clicking a player's gear to inspect full item tooltips (names + rarity only for now).
- Replacing the Raids tab (keep it as-is).

## Tasks
1. **Backend: zone kill tracking** — Add a `zone_kills` table (or JSONB column on `characters`) to track kill counts per zone per character. In the combat tick route, when an enemy is killed, record the zone name and increment the character's zone kill counter. Expose this via a new `GET /leaderboard/player/:characterId/profile` endpoint that returns zone kills, dungeon clears with counts, gear, and computed stats.

2. **Backend: leaderboard query changes** — Remove Gear Score from the `/api/leaderboard/overall` query and response. Update the ranking score formula to use `level * 1000 + kills * 0.5 + bossKills * 10 + dungeons * 50 + heroic * 100 + raids * 200`. Ensure the `/api/leaderboard/dungeons` endpoint also returns per-dungeon clear counts broken down by difficulty.

3. **Leaderboard frontend — row expansion** — In the leaderboard site, make each player row clickable/expandable. When expanded, it fetches the player profile from the new endpoint and renders three panels side by side: Zone Kills list, Dungeon Clears list, and a Gear + Stats panel. Use the same rarity color scheme from the main game for item names.

4. **Gear & stats panel** — Build the gear panel as a compact 18-slot grid (matching in-game slots) with slot labels and item names colored by rarity. Below it, show the player's computed combat stats in a two-column grid (HP, Attack, Defense, Haste, Crit, DPS, Avoidance, Mitigation). Pull these from the profile endpoint which runs the same `computeGearStats` formula as the game server.

## Relevant files
- `artifacts/leaderboard/src/pages/Leaderboard.tsx`
- `artifacts/leaderboard/src/lib/api.ts`
- `artifacts/api-server/src/routes/leaderboard.ts`
- `artifacts/api-server/src/routes/combat.ts`
- `artifacts/api-server/src/lib/eq2Formulas.ts`
- `lib/db/src/schema/character.ts`
- `lib/db/src/schema/combat.ts`
