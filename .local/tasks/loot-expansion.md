# Loot Expansion — Procedural Items & Named Uniques

## What & Why
The current ~65 static items are a solid foundation but feel thin for an idle RPG where loot is the core dopamine loop. This task adds a procedural item generation engine that creates thousands of unique items from base templates × prefix × suffix modifiers, zone-themed drop pools so every area has its own flavor, and AI-generated named/legendary items (like classic EQ2 "named" drops) with unique lore per zone boss. Also expands crafting recipes to match the new material and gear tiers.

## Done looks like
- Killing an enemy in any zone can drop a procedurally generated item with a zone-appropriate name, stats, and rarity (e.g. "Ancient Gnoll-Carved Short Sword of the Bear" dropping in Commonlands)
- Item names follow the classic EQ2 pattern: optional prefix + base name + optional suffix
- Rarities feel meaningful: common drops are plentiful but weak; rare/legendary drops are exciting and powerful
- Each zone has 3–5 AI-generated "named" items (boss-only, legendary or fabled rarity) with a one-sentence lore flavor text — these have unique names like "Drek'Eth's Warfang" or "Cloak of Nagafen's Fury"
- The shop across zones sells a rotating selection of procedurally generated items appropriate to zone level
- New crafting recipes exist for mid-tier and high-tier gear using zone-appropriate materials
- Inventory and item tooltips correctly display procedurally generated item stats, name, and lore

## Out of scope
- Item sprites/icons for procedural items (handled by Task #9 — procedural items use category-based fallback sprites by type+rarity)
- Set items / item sets (future task)
- Player-to-player trading
- Socketing or adornment slots on procedural items (existing adornment system unchanged)

## Tasks

1. **Procedural item engine** — Create a `proceduralItems.ts` module with: ~15 base weapon templates, ~12 base armor templates, ~8 accessory templates (each with base stats and valid slots); ~20 prefix modifiers ("Ancient", "Warrior's", "Corrupted", "Frostforged", etc.) with stat bonuses; ~20 suffix modifiers ("of the Bear", "of Nagafen's Fury", "of the Deep", etc.) with additional stat bonuses; a `rollItem(zone, level, forcedRarity?)` function that picks zone-appropriate base × prefix × suffix, scales stats to level, and returns a complete `Item` object with a generated `id` and `spriteId` mapped by type. Rarities weight: common 60%, uncommon 25%, rare 10%, legendary 4%, fabled 1%.

2. **Zone loot pools** — Define a `ZONE_LOOT_CONFIG` per zone (11 zones) specifying which base item types can drop (e.g., Commonlands: rusty iron swords/leather armor; Everfrost: ice-forged blades/thick fur armor; Lavastorm: fire-infused weapons/obsidian plate). Update the combat loot resolution in `combat.ts` to call `rollItem(zone, enemyLevel)` for non-boss kills (replacing or supplementing the static lootTable entries for generic drops).

3. **AI-generated named boss drops** — Add a `generateNamedItem(bossName, zone, level)` function to the GM route that prompts GPT for a unique item name + one-sentence lore, then calls `rollItem` with `forcedRarity: "legendary"` and applies the AI-generated name/lore on top. Cache results by `boss_drop_{bossId}` in `lore_cache`. Wire into the boss death loot resolution so each boss has a chance (25%) to drop their named unique on kill.

4. **Crafting recipe expansion** — Add 30+ new crafting recipes covering: mid-tier weapons (iron → steel → mithril progression per weapon type), mid-tier armor sets (chain, plate tiers), zone-specific material conversions (e.g., Everfrost ice crystal → Frostforged Bar), and consumable upgrades (minor → regular → major potions). Recipes added to `CRAFTING_RECIPES` in `gameData.ts`.

5. **Shop loot integration** — Update the shop route to supplement zone-specific `SHOP_ITEMS` with 3–5 procedurally generated items per zone visit (generated fresh on each shop page load, seeded by zone so they stay stable within a session). These show up as "Traveling Merchant Wares" in a distinct section of the shop UI.

6. **Item tooltip & display upgrade** — Ensure the inventory item tooltip correctly renders procedural item fields: the full prefixed name, lore text (for named uniques), stat comparison vs equipped item in same slot, and rarity glow. No new stats fields needed — uses existing `Item` interface with the `description` field carrying lore.

## Relevant files
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/eq2Data.ts`
- `artifacts/api-server/src/routes/combat.ts`
- `artifacts/api-server/src/routes/shop.ts`
- `artifacts/api-server/src/routes/gm.ts`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/melvor-eq2/src/pages/shop.tsx`
- `lib/db/src/schema/quests.ts`
- `artifacts/api-server/src/lib/questProgress.ts`
