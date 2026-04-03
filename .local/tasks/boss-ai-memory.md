# Boss AI Memory & Adaptive Intelligence

## What & Why
Give every boss in the game a persistent memory of their encounters with each player, combined with AI-driven dialogue and adaptive combat behavior. This makes bosses feel personal, threatening, and alive — they react differently based on your shared history.

## Done looks like
- The game tracks every boss encounter per player: how many times the player killed the boss, how many times the boss killed the player, what abilities dealt the killing blow, and when the last fight occurred
- When a boss fight starts, its intro taunt references your history ("Back again? You've died to me 3 times...") or acknowledges a previous win ("I did not expect you to return after what you did to me last time, adventurer")
- Bosses open fights by prioritizing the ability that killed the player in a prior encounter, if one exists
- A grudge system escalates boss aggression the more times the player has killed it — after enough kills, the boss enters a special "enraged" phase with bonus damage/speed at the start of the fight
- After every fight (win or loss), the boss delivers a unique AI-generated closing line referencing the outcome and your history
- Each boss has a personality profile (arrogant, cold, ancient, feral, cunning) that shapes the tone of all AI dialogue for that boss
- All encounter history is persisted in the database and survives sessions

## Out of scope
- Bosses adapting strategy mid-fight in real-time (only pre-fight weighting of known abilities)
- Voice acting or audio for boss dialogue
- PvP boss memory

## Tasks
1. **Boss encounter schema** — Add a `boss_encounters` table to the Drizzle schema tracking: playerId, bossId, playerKills (times player killed boss), bossKills (times boss killed player), lastKillingAbility (ability id that last killed the player), grudgeLevel (derived counter), lastEncounteredAt. Add a migration.

2. **Boss personality profiles** — Add a `personality` field to each boss definition in gameData.ts and dungeonData.ts. Assign one of: `arrogant`, `cold`, `ancient`, `feral`, `cunning`. This field will be passed into all AI prompts to shape tone.

3. **Encounter tracking in combat** — In the combat routes, record the fight outcome on boss death or player death: increment the appropriate kill counter, store the last lethal ability used on the player, update grudgeLevel, and save to the `boss_encounters` table.

4. **History-aware AI narration** — Upgrade `generateBossNarration` in `gm.ts` to accept encounter history (kills, deaths, grudge level, personality) and weave that context into the intro and death speech prompts. Remove the simple in-memory cache in favor of per-player-per-boss generation (short-lived cache is fine for the same session).

5. **Post-fight closing line** — Add a new `generateBossClosingLine` AI function that fires after a fight ends (win or loss), producing a 1-sentence boss reaction to the outcome informed by history and personality. Display it in the combat HUD before the loot screen appears.

6. **Adaptive ability weighting** — In the combat engine, when a player has died to a specific boss ability before, increase that ability's trigger weight or fire it as the first ability used in the next encounter. Read from `boss_encounters.lastKillingAbility` at fight start.

7. **Grudge escalation phase** — When a player's kill count on a boss reaches a threshold (configurable per boss, default 3), inject a special "enraged" buff at fight start that boosts the boss's damage and attack speed for the first 20 seconds of the fight. Show a special banner line when this triggers.

## Relevant files
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/dungeonData.ts`
- `artifacts/api-server/src/routes/combat.ts`
- `artifacts/api-server/src/routes/gm.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/src/schema/combat.ts`
- `artifacts/melvor-eq2/src/components/game/combat-hud.tsx`
