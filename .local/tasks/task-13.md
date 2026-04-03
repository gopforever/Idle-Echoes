---
title: Zone & Dungeon Content Expansion
---
# Zone & Dungeon Content Expansion

## What & Why

The game currently has 11 zones defined but only 6 have any enemies — 5 zones are completely empty. Outside of Qeynos Hills (level 10-20) the rest of the level curve has almost nothing: only 6 enemies total across levels 20-55, and only 1 dungeon (Blackburrow). A player hits a wall immediately after level 20. This task fills all zones with full enemy rosters and adds 4 new dungeons to cover the full level range.

## Done looks like

- Every zone has 6-8 enemies with full loot tables, resistances, and at least 1 named boss
- Antonica (Lv 1-10) has 6 enemies — starter wolves, skeletons, bandits
- Thundering Steppes (Lv 10-20) expanded from 4 to 8 enemies with centaurs, steppe griffins, storm elementals
- Nektulos Forest (Lv 20-30) expanded from 2 to 8 enemies with dark elves, shadow spiders, corrupted treants
- Enchanted Lands (Lv 20-30) gets 6 enemies: corrupted fae, boglings, brownie brigands
- Zek, the Orcish Wastes (Lv 25-35) gets 7 enemies: orcish soldiers, shamans, siege engineers, warlords
- Everfrost Peaks (Lv 30-40) expanded from 2 to 8 enemies: ice wolves, frost giants, yeti shamans, mammoth bulls
- Lavastorm Mountains (Lv 40-50) expanded from 2 to 8 enemies: lava elementals, fire giants, magma drakes, efreet
- Lesser Faydark (Lv 35-45) gets 6 enemies: corrupted fae guardians, spriggan champions, brownie elders
- Feerrott (Lv 45-55) gets 6 enemies: lizardman soldiers, swamp trolls, ogre shamans, Cazic constructs
- 4 new fully playable dungeons with 5 floors each, all enemies, mini-bosses, and main boss:
  - **Ruins of Varsoon** (Lv 20-30, Thundering Steppes) — undead mage tower, Varsoon the Undying as final boss (already exists in gameData)
  - **Nektropos Castle** (Lv 25-35, Nektulos Forest) — haunted dark elf castle, Lord Rikantus Everling as final boss
  - **Permafrost Keep** (Lv 35-45, Everfrost Peaks) — frozen dragon lair, Lady Vox as final boss
  - **Solusek's Eye** (Lv 42-52, Lavastorm Mountains) — volcanic dragon den, Lord Nagafen as final boss (already exists in gameData)
- Each dungeon's boss has a named legendary item drop (using the AI named-item system from Task #11)
- Zone-specific items added to loot tables matching zone theme and level (frost gems, orc trophies, dark elf relics, etc.)
- Dungeon floors have thematic enemy sets matching the zone aesthetic

## Out of scope

- New zones beyond the 11 already defined
- New quest lines or NPC dialogue tied to these zones
- New UI components — uses the existing dungeon browser and zone UI unchanged
- Heroic dungeon variants (existing difficulty scaling handles this)

## Tasks

1. **Enemy rosters for all empty/thin zones** — Add 6-8 enemy definitions per zone for Antonica, Thundering Steppes (expand), Nektulos Forest (expand), Enchanted Lands, Zek, Everfrost Peaks (expand), Lavastorm Mountains (expand), Lesser Faydark, and Feerrott. Each enemy needs full stats (hp, damage, xp, gold), at least 1 special ability using the existing `EnemyAbility` interface, resistances appropriate to zone theme, a loot table with 3-5 zone-themed item entries, and `isBoss: true` flagged on one named boss per zone.

2. **Zone-specific loot items** — Add 4-6 new items per zone (totaling ~45 new items) to the `ITEMS` array in `gameData.ts`: materials (steppe grass, everfrost ice shard, volcanic pumice stone), zone drops (orc battle standard, dark elf shadow cloak, corrupted fae wing), and zone boss drops (Varsoon's phylactery shard, Vox's icy scale, Nagafen's ember scale). These complement the procedural item engine — static named drops alongside procedural generic gear.

3. **Ruins of Varsoon dungeon** — Define a 5-floor dungeon in `dungeonData.ts` set in Thundering Steppes (Lv 20-30). Floors: Outer Ward (skeletons/zombies), Inner Crypts (liches/ghasts), Arcane Library (spell-bound guardians/runic constructs), Phylactery Chamber (wraiths/soul-bound shades), Varsoon's Sanctum (Varsoon the Undying as final boss, using the existing boss enemy). Enemy ids must reference actual enemies defined in Task 1 or new enemies specific to this dungeon added here.

4. **Nektropos Castle dungeon** — Define a 5-floor dungeon in `dungeonData.ts` set in Nektulos Forest (Lv 25-35). Floors: Grand Foyer (spectral servants), Trophy Hall (animated armors/shadow hounds), Family Crypts (undead Everlings), Tower Sanctum (dark elf cultists), Lord Everling's Chamber (Lord Rikantus Everling as final boss — add this new boss enemy in gameData). Include at least 2 unique abilities on the final boss.

5. **Permafrost Keep dungeon** — Define a 5-floor dungeon in `dungeonData.ts` set in Everfrost Peaks (Lv 35-45). Floors: Frozen Gates (frost giant sentinels), Ice Caverns (ice wolf packs/crystal golems), Mammoth Pens (frost mammoth bulls), Dragon's Antechamber (ice drakes/frost wyrms), Lady Vox's Lair (Lady Vox as final boss — add this new boss enemy). Lady Vox should have cold-based abilities and a self-heal mechanic.

6. **Solusek's Eye dungeon** — Define a 5-floor dungeon in `dungeonData.ts` set in Lavastorm Mountains (Lv 42-52). Floors: Lava Tubes (lava elementals/magma spiders), Fire Giant Barracks (fire giant warriors/shamans), Efreet Bazaar (efreet merchants/fire djinn), Nagafen's Antechamber (fire drakes/elder magma golems), Nagafen's Lair (Lord Nagafen as final boss, using the existing boss enemy). Nagafen should have fire-immunity and a frenzy-at-low-HP mechanic.

## Relevant files

- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/dungeonData.ts`
- `artifacts/api-server/src/lib/eq2Data.ts`
- `artifacts/api-server/src/lib/proceduralItems.ts`
- `artifacts/api-server/src/routes/dungeons.ts`
- `artifacts/api-server/src/routes/combat.ts`