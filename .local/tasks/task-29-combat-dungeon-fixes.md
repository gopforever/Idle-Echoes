# Combat & Dungeon Bug Fixes

## What & Why
Two related bugs are breaking core gameplay since the auto-abandon removal in Task #28:

1. **Zone combat completely blocked when a dungeon run is active.** The anti-farm guard in the combat/start route checks whether an enemy is in the dungeon's floor enemy list. Zone enemies are never in that list, so every zone combat attempt returns a 400 error while a dungeon run exists.

2. **Players get "booted" from dungeon on completion.** The completion screen check happens AFTER the `!runState?.active` guard in `DungeonsRunPage`. When a dungeon completes: `completedRun` state is set → completion screen shows → 3 seconds later the poll returns `{ active: false }` → the early-return skeleton fires instead of the completion screen → the redirect effect navigates to `/dungeons`. The user sees the completion screen flash and disappear, appearing as if they were booted mid-run.

## Done looks like
- Players can fight zone enemies normally even while an active dungeon run exists in the database.
- Defeating a dungeon enemy that has already been killed on the current floor still returns 400 (anti-farm guard preserved for dungeon enemies only).
- After completing a dungeon's final boss and clicking "Advance Floor", the full completion/loot screen displays and stays visible until the player clicks "Collect & Return" — no premature redirect.
- Navigating away from the dungeon page mid-run and returning still shows the active run correctly.

## Out of scope
- Any changes to the DPS meter (separate task).
- Changes to how the dungeon run is started or abandoned.
- Raid run changes.

## Tasks
1. **Fix zone combat anti-farm guard** — In `combat.ts`, inside the `if (activeDungeonRun)` block, first check whether the requested enemy is actually a dungeon-scaled enemy (present in `scaledEnemies`). Only apply the "already defeated" 400 guard when the enemy is a dungeon enemy. Zone enemies (not in `scaledEnemies`) should fall through to base game data as if no dungeon run were active.

2. **Fix completion screen render order** — In `DungeonsRunPage`, move the `completedRun` check to run BEFORE the `isLoading || !runState?.active` early-return guard. Additionally, update the redirect effect to skip navigation when `completedRun` is set so the completion screen is never pre-empted by the redirect.

## Relevant files
- `artifacts/api-server/src/routes/combat.ts:182-197`
- `artifacts/melvor-eq2/src/pages/dungeons-run.tsx:638-674`
