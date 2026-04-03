---
title: Ghost Players & Living World Engine
---
# Ghost Players & Living World Engine

## What & Why
Populate the game world with AI-simulated "ghost" player characters that run autonomously — fighting enemies in their zones, earning XP, leveling up, accumulating gold and gear, and shifting faction standings. This makes Norrath feel like a real persistent server with other adventurers even when the real player is offline. A new World page shows live activity across all zones.

## Done looks like
- 20–50 named ghost player characters exist in the database, each with a full EQ2 character sheet (race, class, level, zone, stats, gear)
- A background simulation worker ticks all ghost players every 30 seconds: each ghost fights a zone-appropriate enemy, gains XP/gold, levels up when ready, and moves zones as they progress
- Ghost players generate a feed of world events ("Kael'dan the Barbarian Warrior slew a Gnoll Chief in Antonica!", "Mira Swiftblade reached level 20!")
- A new "World" page in the UI shows: active zone populations (real + ghosts), a live activity feed, a leaderboard comparing ghost and real player stats, and a "World Events" panel for major happenings (boss kills, level milestones, faction shifts)
- Ghost player activity influences faction standings globally (e.g., frequent kills of Freeport enemies boosts Qeynos faction world-wide)
- The dashboard shows "X adventurers online" with a breakdown by zone

## Out of scope
- LLM-generated ghost player dialogue (covered in the LLM Game Master task)
- Real-time push of ghost activity (covered in the Supabase/Vercel task — this task uses polling)
- Real player-to-player interaction or grouping with ghosts
- Ghost players using inventory, crafting, or adornments

## Tasks
1. **Ghost player DB schema** — Create `world_players` table (id, name, race, class, archetype, level, xp, gold, zone, stats jsonb, kill_count, death_count, created_at) and `world_events` table (id, type, message, player_name, zone, tick, created_at). Add to schema barrel and push migration.

2. **Ghost player seed data** — Generate 30 ghost player characters with authentic EQ2 names, varied races/classes/levels (1–50), and starting zones appropriate for their level. Persist to DB on first boot if the world_players table is empty.

3. **Ghost simulation worker** — Background interval in the API server (runs every 30 seconds) that: loads all ghost players, picks a level-appropriate enemy for each ghost's zone, runs a simplified combat calculation (hit/miss/crit using same formulas as player combat), credits XP/gold, handles level-up, moves the ghost to next zone if level threshold reached, inserts a world_event row for significant events (kills, level-ups, zone moves, boss kills).

4. **World events API** — Endpoints: `GET /world/players` (all ghost players + real player, sorted by level), `GET /world/events` (last 50 world events, most recent first), `GET /world/zones` (player count per zone including ghosts), `GET /world/leaderboard` (top 10 by level then kill_count). Add to API spec and run codegen.

5. **World page UI** — New `/world` route with four panels: Zone Map (zone names with avatar count badges showing real vs ghost population), Live Activity Feed (scrolling world events with colored icons by event type), Leaderboard (rank, name, class, race, level, kills), and World Status (total adventurers, bosses killed today, most active zone). Poll every 10 seconds.

6. **Dashboard integration** — Add "Adventurers Online" stat card to the dashboard and a mini activity feed showing the 3 most recent world events. Link to the World page.

## Relevant files
- `lib/db/src/schema/character.ts`
- `lib/db/src/schema/gamestate.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/drizzle.config.ts`
- `artifacts/api-server/src/lib/eq2Formulas.ts`
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/eq2Data.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/melvor-eq2/src/pages/dashboard.tsx`
- `lib/api-spec/openapi.yaml`