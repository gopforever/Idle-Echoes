---
title: Dungeon Achievements & Kill Tracking
---
# Dungeon Achievements & Kill Tracking

## What & Why
There are no achievements for completing specific dungeons or raids, and there is no way to see how many enemies you've killed in each dungeon. Adding per-dungeon kill counters and a full set of dungeon/raid achievements (both solo and group) gives players meaningful milestones to chase and reflects the EQ2 legacy of named boss kills as prestige markers.

## Done looks like
- A new "Dungeon Kills" section on the Achievements page (or character profile) shows a table of every dungeon and raid with: total runs started, total normal kills, mini-boss kills, and main boss kills for that dungeon.
- The following dungeon achievements are tracked and displayed:
  - Solo dungeon clears: "Blackburrow Vanquisher", "Ruins of Varsoon Cleared", "Nektropos Delver", "Permafrost Survivor", "Lord of the Eye" (Solusek's Eye) — one per dungeon, awarded on first main boss kill.
  - Boss-kill-count achievements: "Boss Slayer I/II/III" at 1, 25, 100 total boss kills across all dungeons.
  - Raid clears: "Dragon Touched" (Harla Dar), "Trakanon's End" (Trakanon Depths), "Mistmoore Reaver" (Mistmoore Catacombs) — awarded on first successful raid completion.
  - Speed achievements (optional bonus): "Speed Runner" for clearing a dungeon within a time limit.
- Kill stats persist per dungeon: the `dungeon_runs` table records are aggregated into a per-character summary stored in a new `dungeon_kill_stats` table.
- Dungeon completion is recorded when the main boss is defeated: a `dungeon_completions` counter per dungeon ID is tracked on the character (or in a new table).
- Achievements can be checked/unlocked through the existing `/achievements` endpoint flow.

## Out of scope
- Group dungeon party system (achievements track solo runs only for dungeons; raid completions are recorded as-is)
- Leaderboard integration for dungeon clears
- Time-based achievements (speed runner is marked optional)

## Tasks
1. **Per-dungeon kill tracking schema** — Add a `dungeon_kill_stats` table with columns: `characterId`, `dungeonId`, `normalKills`, `miniBossKills`, `mainBossKills`, `completions`, `firstClearAt`. Upsert a row each time a dungeon floor or boss is completed in the dungeon routes.

2. **Record dungeon/raid completions on victory** — In the dungeon advance and raid tick routes, when a main boss is defeated, insert/update the `dungeon_kill_stats` row for that dungeon and trigger achievement checking. For raids, record the completion in the same table (use raid ID as `dungeonId`).

3. **New dungeon achievement definitions** — Add achievement definitions to `eq2Data.ts` for: per-dungeon first-clear achievements (5 dungeons), raid first-clear achievements (3 raids), and tiered boss-kill-count achievements (1/25/100). Wire them into `checkAndUnlockAchievements` using the new per-dungeon stats.

4. **Dungeon kill stats API route** — Add `GET /dungeons/kill-stats` that returns the character's `dungeon_kill_stats` rows joined with dungeon name and zone.

5. **Dungeon kill stats UI** — Add a "Dungeon Progress" section to the Achievements page (or as a new sub-tab). Show a card per dungeon with: dungeon name, zone, completions count, normal kills, boss kills, and which achievements are unlocked for that dungeon.

## Relevant files
- `lib/db/src/schema/dungeons.ts`
- `lib/db/src/schema/character.ts`
- `artifacts/api-server/src/routes/dungeons.ts`
- `artifacts/api-server/src/routes/achievements.ts`
- `artifacts/api-server/src/lib/eq2Data.ts`
- `artifacts/api-server/src/lib/dungeonData.ts`
- `artifacts/api-server/src/lib/raidData.ts`
- `artifacts/melvor-eq2/src/pages/character.tsx`