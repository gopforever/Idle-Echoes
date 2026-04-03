# Ghost Party — Dungeons & Raids

## What & Why
Players can now group with ghost players to tackle dungeons and raids together. Ghosts contribute real combat value based on their archetype (tanks absorb damage, priests heal, scouts and mages deal damage), take damage themselves, and can die mid-run. This transforms dungeons from a solo grind into a social co-op experience and is the core feature needed for beta.

## Done looks like

**Party Formation:**
- On the dungeon selection screen, a "Form Party" panel lets the player invite 1–3 ghost players. Suggested ghosts are pulled from rivals first, then nearby ghosts (same zone or adjacent). Each ghost card shows their portrait, class icon, level, and archetype role (Tank / Healer / DPS).
- A "Ready" button starts the dungeon run with the selected party. Solo runs remain available.

**In-Run Party HUD:**
- During a dungeon run, a compact party panel sits alongside the combat HUD, showing each ghost's name, portrait thumbnail, HP bar, and status (Active / Downed / Revived).
- Ghosts actively contribute each combat tick: Fighters draw partial aggro (player takes ~30% less damage), Priests heal the player for a small amount per tick, Scouts and Mages add bonus damage proportional to their level vs. the enemy's level.
- Ghosts take a share of incoming enemy damage. If a ghost's HP hits 0 they are "Downed" — they stop contributing but can be revived between floors at 50% HP.

**Floor & Run Completion:**
- Party state (each ghost's current HP, alive/downed status) persists through floor transitions.
- The post-run summary screen shows each ghost's contribution: damage dealt, healing done, times they saved the player, and gold/XP they "earn" (reflected as a boost to their world_players record).

**Raids:**
- A new "Raids" tab appears in the Dungeons page. Raids support parties of 4–6 ghosts and feature scaled-up, multi-phase raid bosses (3 phases with phase-transition abilities) drawn from EQ2 raid lore (e.g., Harla Dar, Mayong Mistmoore).
- Raid bosses require a minimum Gear Score higher than dungeon equivalents and reward the best loot tier in the game.
- Raid runs use the same floor/combat infrastructure as dungeons but with a single boss encounter per "wing" instead of floor-by-floor clearing.

## Out of scope
- Real-time multiplayer with other human players (ghost party only)
- Ghost loot needs or gear upgrades from dungeon/raid drops (ghosts earn XP/gold stats only)
- Voice lines or per-ghost dialogue during combat (covered by the LLM GM system separately)
- More than 3 raid bosses at launch

## Tasks
1. **Party state schema & backend** — Add a `party` JSONB column to `dungeon_runs` storing ghost IDs and their per-ghost HP/status. Create API endpoints: `POST /api/dungeons/:id/party` (set party), `GET /api/dungeons/run/party` (current party state). Validate ghost IDs against `world_players`.

2. **Ghost combat contribution engine** — In the dungeon combat tick, calculate each living ghost's contribution based on archetype: Fighter aggro reduction (damage mitigation %), Priest heal per tick, Scout/Mage damage bonus. Apply ghost incoming damage share and update party HP state in DB. Persist downed status when HP hits 0; revive at 50% HP on floor advance.

3. **Party formation UI** — Add a party picker to the dungeon selection screen: ghost suggestion list (rivals first, then zone neighbors), invite/remove controls, role badge per ghost (Tank/Healer/DPS), and a party-aware "Start Run" button.

4. **In-run party HUD** — Add a party panel to `dungeons-run.tsx` showing each ghost's portrait thumbnail, class icon, HP bar, and status. Update in real-time via the existing run polling interval.

5. **Raid data & boss definitions** — Define 3 raid instances in a new `raidData.ts`: each with a single multi-phase boss (3 phases), min GS/level, loot table, and boss abilities per phase. Add `raid_runs` table (mirrors `dungeon_runs` structure but single-floor with phase tracking).

6. **Raid backend routes** — Implement `POST /api/raids/:raidId/start`, `POST /api/raids/run/phase-advance`, and `POST /api/raids/run/abandon` mirroring the dungeon route pattern. Wire into the existing combat kill hook to detect raid boss kills.

7. **Raids frontend** — Add a "Raids" tab to the Dungeons page listing the 3 raid bosses with lore blurb, GS requirement, and phase preview. Reuse `dungeons-run.tsx` layout with a phase progress indicator instead of a floor tracker.

8. **Post-run summary with ghost contributions** — Extend the `DungeonCompleteModal` and add a matching `RaidCompleteModal` showing per-ghost stats (damage, healing, saves) and updating each ghost's `kill_count` and `gold` in `world_players` to reflect their contribution.

## Relevant files
- `artifacts/api-server/src/routes/dungeons.ts`
- `artifacts/api-server/src/lib/dungeonData.ts`
- `artifacts/api-server/src/lib/dungeonProgress.ts`
- `lib/db/src/schema/dungeons.ts`
- `lib/db/src/schema/world.ts`
- `artifacts/api-server/src/lib/ghostSimulator.ts`
- `artifacts/api-server/src/lib/ghostSeeds.ts`
- `artifacts/melvor-eq2/src/pages/dungeons.tsx`
- `artifacts/melvor-eq2/src/pages/dungeons-run.tsx`
