# Blackburrow Dungeon — Data, Gear Score & API

## What & Why
Add the Blackburrow dungeon (Qeynos Hills, 5 floors) plus a Gear Score system that gates four difficulty tiers: Normal, Expert, Legendary, Mythical. This is the complete backend layer — zone data, enemy roster, DB table, API routes, and combat integration.

## Done looks like
- A new `qeynos_hills` zone appears in the zones list (level 10–20, Antonica continent)
- Blackburrow dungeon has 5 floors: each floor has 5 uniquely defined gnoll/Blackburrow enemies + 1 mini-boss; floor 5 adds a named AI main boss (Overlord Narlock)
- `GET /api/dungeons` returns available dungeons with gear-score gates per difficulty tier and the player's current gear score
- `POST /api/dungeons/blackburrow/start` starts a run and returns the floor 1 enemy roster (stat-scaled to player level × difficulty multiplier)
- `GET /api/dungeons/run/current` returns the active run state (floor, kills, mini-boss status, remaining enemies)
- `POST /api/dungeons/run/kill` records a kill; when 5 kills + mini-boss are complete, marks floor as clearable
- `POST /api/dungeons/run/advance` advances to the next floor (or completes the run on floor 5)
- `POST /api/dungeons/run/abandon` abandons the current run
- When an enemy dies inside a dungeon run, `combat.ts` calls `progressDungeonKill()` to update the run state (fire-and-forget)
- On dungeon completion, loot items scaled to `playerLevel + floor − 1` are generated and inserted into the player's inventory; rarity skews by difficulty (Normal: mostly common/uncommon; Mythical: mostly legendary/fabled)
- Gear Score (sum of `equippedItem.level × rarityMultiplier`) is returned from `GET /api/character/stats`; difficulty tier gates: Normal=0 GS, Expert=60, Legendary=150, Mythical=300
- Overlord Narlock is added to `BOSS_LORE` in `gm.ts`; intro and death narration are injected into the combat log exactly as existing bosses do

## Out of scope
- Dungeon frontend UI (next task)
- Group/party system (separate future task)
- Dungeon leaderboards or history pages
- Any changes to existing zone travel logic or zone enemy pools

## Tasks
1. **Qeynos Hills zone** — Add `qeynos_hills` to the `ZONES` array in `eq2Data.ts` (level 10–20, Antonica, factionId qeynos).

2. **Blackburrow enemy roster** — Add 25 normal enemies + 6 mini-bosses + 1 AI main boss (`bb_*` IDs) to the `ENEMIES` array in `gameData.ts`. Each floor's enemies scale in level and HP (~20% per floor). The floor-5 main boss (`bb_overlord_narlock`) is a boss-flagged enemy with unique abilities. Add `bb_overlord_narlock` to `BOSS_LORE` in `gm.ts`.

3. **Dungeon data registry** — Create `artifacts/api-server/src/lib/dungeonData.ts` defining the `DungeonDefinition` type, `DungeonFloor` type, and the `DUNGEONS` registry with Blackburrow fully specified (5 floors, enemy IDs per floor, mini-boss per floor, main boss on floor 5, difficulty tier stat/loot multipliers, gear score gates).

4. **DB schema** — Add `dungeonRunsTable` to `lib/db/src/schema/` with fields: id, characterId, dungeonId, difficulty, currentFloor (default 1), floorKills (default 0), miniBossDefeated (default false), completed, abandoned, lootEarned (jsonb array), startedAt, completedAt. Export from schema index. Run `pnpm --filter @workspace/db run push`.

5. **Gear Score helper** — Add `computeGearScore(gear: Record<string,string>): number` to `eq2Formulas.ts` using `item.level × rarityMultiplier` (common=1, uncommon=2, rare=4, legendary=8, fabled=12, mythical=16). Expose `gearScore` in `GET /api/character/stats` response.

6. **Dungeon API router** — Create `artifacts/api-server/src/routes/dungeons.ts` with all six routes listed above. Scale enemy HP and damage by the difficulty multiplier (Normal 1×, Expert 1.5×, Legendary 2×, Mythical 3×). Store scaled enemy list in the run's `scaledEnemies` jsonb for the duration of that run. Register the router in `app.ts`.

7. **Dungeon loot generator** — Add `generateDungeonLoot(playerLevel, floor, difficulty)` in `dungeons.ts` that returns 1–3 items with level = playerLevel + floor − 1 and rarity drawn from difficulty-weighted tables. On run completion, award loot to inventory and return item list.

8. **Combat integration** — In `combat.ts` tick, inside the `enemyDied` block, call `progressDungeonKill(enemy.id)` (imported from a new `lib/dungeonProgress.ts`). This function finds the active run, matches the enemy to the floor, and updates floorKills or miniBossDefeated accordingly.

## Relevant files
- `artifacts/api-server/src/lib/eq2Data.ts:517-530`
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/eq2Formulas.ts`
- `artifacts/api-server/src/routes/gm.ts:404-445`
- `artifacts/api-server/src/routes/combat.ts:490-620`
- `artifacts/api-server/src/app.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/src/schema/character.ts`
