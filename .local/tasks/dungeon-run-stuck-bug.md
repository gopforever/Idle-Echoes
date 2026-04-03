# Fix Stuck Dungeon Run on Leave

## What & Why
When a player leaves Blackburrow (or any dungeon) by navigating away — via the zone map, sidebar, or back button — instead of pressing "Abandon Run", the dungeon run stays marked `active` in the database. On their next attempt to enter any dungeon they get blocked by "You already have an active dungeon run" with no way to recover without manually clicking Abandon from the run page.

## Done looks like
- Navigating away from the dungeon (zone map, sidebar, etc.) automatically abandons the active run so it doesn't get stuck
- Entering a dungeon when an active run already exists for **the same dungeon** resumes that run instead of erroring
- Entering a dungeon when an active run exists for a **different dungeon** shows a clear error message with context (which dungeon is active), not a hard block
- The frontend surfaces the option to abandon a stuck run from the dungeon entry screen if one is detected

## Out of scope
- Changing the "Abandon Run" button behavior on the run page itself
- Any changes to raid runs

## Tasks
1. **Resume same-dungeon runs** — In the `POST /api/dungeons/enter` endpoint, when an existing active run is found for the same dungeon ID being entered, return that run with `resumed: true` instead of a 400 error.

2. **Better cross-dungeon block error** — When an active run exists for a *different* dungeon, include the stuck dungeon's name in the error response so the frontend can display "You have an active run in [X]. Abandon it first?" with an abandon button.

3. **Auto-abandon on zone leave** — In the dungeon entry page (`dungeons.tsx`) and any zone navigation that can take the player out of the dungeon, call `POST /api/dungeons/run/abandon` before navigating away if a run is currently active. This should be silent (no confirm dialog) since they're already choosing to leave.

4. **Frontend recovery UI** — On the dungeon entry page, when the API returns the "already active run" error, show an inline message with an "Abandon stuck run" button that calls the abandon endpoint and then retries entry, instead of just displaying the raw error.

## Relevant files
- `artifacts/api-server/src/routes/dungeons.ts:371-383`
- `artifacts/melvor-eq2/src/pages/dungeons.tsx`
- `artifacts/melvor-eq2/src/pages/dungeons-run.tsx:620-630`
