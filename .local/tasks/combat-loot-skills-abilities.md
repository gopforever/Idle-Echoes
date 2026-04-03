# Combat: Loot, Skill XP & Abilities

## What & Why

Three related combat bugs are preventing core progression from feeling rewarding:

1. **Loot never lands in inventory.** Static loot-table drops (wolf hide, etc.) are logged and returned in the API response but are never written to the `inventoryTable`. Procedural and boss drops have the inventory insert — static drops are missing it entirely.

2. **Skill progression is broken and has no effect.** `combat`, `defense`, `magic`, and `archery` skills are permanently stuck at level 1. Their `xpPerHour` is 0 and the combat route only awards character XP. Worse, even if they leveled up they currently do nothing — `computeStats` in `eq2Formulas.ts` ignores skill levels entirely. Both problems must be fixed together: award XP from combat actions AND wire skill levels into the attack/defense stat formulas.

3. **Only one ability is ever used, and there aren't enough.** The autocast rotation picks the cheapest affordable ability each tick with no per-ability cooldown tracking. Classes also only have 5 abilities each — far too few for a 100-level game. The target is 40 abilities per class by level 100.

## Done looks like

- Killing a wolf gives the player Wolf Hide (and any other static loot-table drops) in their inventory, not just a log message.
- After fighting for a few minutes, Combat, Defense, Magic, and Archery skills visibly gain XP and level up; higher skill levels measurably increase the corresponding stat (Combat → attack rating, Defense → defense rating) shown on the character sheet.
- The combat log shows a variety of different abilities cycling through rather than the same one every time.
- Each class has 40 unlockable abilities covering levels 1–100, giving meaningful choices as the player progresses.

## Out of scope

- Manual ability hotbar UI redesign
- New ability effect types not already handled by the combat engine
- Meditation / out-of-combat regen (separate task)

## Tasks

1. **Fix static loot delivery** — After rolling static loot-table drops, insert each item into `inventoryTable` using the same atomic upsert pattern used for procedural drops (SQL increment for existing rows, insert for new).

2. **Award combat skill XP on kill/hit, wire into stats** — In the combat kill handler, award XP to the `combat` skill (or `archery` for Ranger/Assassin classes) based on enemy level. Award `defense` skill XP whenever the player takes damage. Award `magic` skill XP when a spell-type ability fires. Then update `computeStats` to accept skill levels and add a bonus to Attack Rating from Combat skill level and to Defense Rating from Defense skill level (e.g., `+skillLevel * 2` on top of existing formulas). The combat tick must fetch skill levels and pass them through.

3. **Fix autocast ability rotation with per-ability cooldowns** — Track each ability's last-used tick in a local map during the combat tick. Filter `autocastAbilities` to those whose cooldown (in seconds, converted to ticks) has elapsed, plus existing power and level checks. Select the next eligible ability in sequential round-robin order. This ensures variety rather than spam of the cheapest ability.

4. **Expand each class to 40 abilities** — Add abilities to each of the 12+ classes in `eq2Data.ts` so that every class has 40 total, spread across levels 1–100. Target levels: 1, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100 (with flexibility to fill out to 40 entries per class). Each ability must be thematically appropriate, use an existing supported effect type, and be marked `autocast: true`. Racial abilities do not need expansion.

## Relevant files

- `artifacts/api-server/src/routes/combat.ts:749-825`
- `artifacts/api-server/src/routes/combat.ts:443-506`
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/eq2Data.ts`
- `artifacts/api-server/src/lib/eq2Formulas.ts`
- `artifacts/api-server/src/routes/skills.ts`
