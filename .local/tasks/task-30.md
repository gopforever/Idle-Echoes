---
title: DPS Meter
---
# DPS Meter in Combat HUD

## What & Why
Players have no visibility into how much damage they're dealing per second. A DPS meter is a standard feature in MMOs that helps players understand their combat effectiveness, evaluate gear upgrades, and optimize their builds.

## Done looks like
- A "DPS" stat is displayed in the combat HUD during active combat, showing damage dealt per second (rolling average over the current fight or last 10 seconds).
- The meter resets to zero when combat ends or a new enemy is engaged.
- The value is visible during both zone combat and dungeon combat.
- Display is compact and fits within the existing combat HUD layout without cluttering it.
- Optionally: show total damage dealt for the current fight alongside the DPS value.

## Out of scope
- Party/ghost DPS breakdown (solo player DPS only for now).
- Historical DPS charts or session logs.
- Healing-per-second or tank meters.

## Tasks
1. **Track damage dealt in combat state** — Each combat tick already processes player damage. Accumulate a `totalPlayerDamage` field in the combat state table (or derive it from the combat log entries of type "player_attack") so the front end can calculate DPS without a separate endpoint.

2. **Add DPS display to combat HUD** — In the `CombatHud` component, read the accumulated damage and elapsed combat time from the combat state query. Compute DPS as `totalPlayerDamage / combatDurationSeconds`. Display it as a compact stat row (e.g. "DPS: 142") near the player power/health bars. Reset to 0 between fights.

## Relevant files
- `artifacts/melvor-eq2/src/components/game/combat-hud.tsx`
- `artifacts/api-server/src/routes/combat.ts`
- `lib/db/schema.ts` (combat state table definition)