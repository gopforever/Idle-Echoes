# QoL Fixes — Playtime & Ghost Reset

  ## What & Why
  Two small but noticeable issues: playtime never increments (the counter always shows 0), and there's no way to wipe ghost players when starting fresh. Both are quick wins that make the game feel more polished and let the player fully restart their experience.

  ## Done looks like
  - The playtime counter on the character sheet increases over time as the player is active — it increments on every combat tick or at regular intervals server-side.
  - A "Reset Ghosts" button exists in the settings or world panel. Clicking it clears all 30 ghost players and re-seeds them from scratch, showing fresh level-1 ghosts in the world feed.
  - Resetting ghosts also clears world events and resets ghost market demand scores to neutral.

  ## Out of scope
  - Resetting the real player's own character (separate destructive action).
  - Configurable ghost count or custom seeds.

  ## Tasks
  1. **Fix playtime tracking** — Add server-side logic to increment `totalPlayTime` on each combat tick (or via a heartbeat ping from the client). Expose an update endpoint or integrate into the existing combat tick handler so the value persists in the DB.
  2. **Ghost reset endpoint** — Add a `POST /api/admin/reset-ghosts` route that deletes all rows from `world_players`, `world_events`, and resets `ghost_market_demand` to neutral, then re-runs ghost seeding.
  3. **Reset Ghosts UI** — Add a "Reset World" or "Reset Ghosts" button in the world/settings area of the frontend. On click it calls the reset endpoint and shows a toast confirmation.

  ## Relevant files
  - `artifacts/api-server/src/routes/character.ts`
  - `artifacts/api-server/src/routes/combat.ts`
  - `artifacts/api-server/src/lib/ghostSimulator.ts`
  - `lib/db/src/schema/character.ts:31`
  - `lib/db/src/schema/world.ts`
  - `artifacts/melvor-eq2/src/pages/character.tsx`
  