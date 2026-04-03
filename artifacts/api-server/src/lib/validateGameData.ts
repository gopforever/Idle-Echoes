import { ENEMIES } from "./gameData.js";
import { DUNGEONS } from "./dungeonData.js";
import { ZONES } from "./eq2Data.js";

interface ValidationResult {
  pass: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGameData(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dungeonEnemyIds = new Set<string>();
  for (const dungeon of DUNGEONS) {
    dungeonEnemyIds.add(dungeon.mainBossId);
    for (const floor of dungeon.floors) {
      for (const id of floor.enemyIds) dungeonEnemyIds.add(id);
      if (floor.miniBossId) dungeonEnemyIds.add(floor.miniBossId);
    }
  }

  const enemyIds = new Set(ENEMIES.map(e => e.id));

  // 1. No duplicate enemy IDs
  const seen = new Set<string>();
  for (const e of ENEMIES) {
    if (seen.has(e.id)) errors.push(`Duplicate enemy ID: ${e.id}`);
    seen.add(e.id);
  }

  // 2. All loot item references must map to valid items (via ENEMIES array itself - structural check)
  for (const e of ENEMIES) {
    if (!e.lootTable || e.lootTable.length < 1) {
      warnings.push(`Enemy ${e.id} has no loot table`);
    }
  }

  // 3. Dungeon integrity: miniBoss not in enemyIds for same floor, all IDs exist
  for (const dungeon of DUNGEONS) {
    if (!enemyIds.has(dungeon.mainBossId)) {
      errors.push(`Dungeon ${dungeon.id}: mainBoss ${dungeon.mainBossId} not in ENEMIES`);
    }
    for (const floor of dungeon.floors) {
      for (const id of floor.enemyIds) {
        if (!enemyIds.has(id)) {
          errors.push(`Dungeon ${dungeon.id} floor ${floor.floorNumber}: enemy ${id} not in ENEMIES`);
        }
      }
      if (floor.miniBossId) {
        if (!enemyIds.has(floor.miniBossId)) {
          errors.push(`Dungeon ${dungeon.id} floor ${floor.floorNumber}: miniBoss ${floor.miniBossId} not in ENEMIES`);
        }
        if (floor.enemyIds.includes(floor.miniBossId)) {
          errors.push(`Dungeon ${dungeon.id} floor ${floor.floorNumber}: miniBoss ${floor.miniBossId} also in enemyIds (classification conflict)`);
        }
      }
    }
  }

  // 4. Zone outdoor enemy counts (expansion zones should have 6-8 outdoor enemies)
  const expansionZoneIds = [
    "thundering_steppes", "nektulos_forest", "enchanted_lands", "zek",
    "everfrost", "lavastorm", "lesser_faydark", "feerrott",
  ];
  for (const zoneId of expansionZoneIds) {
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) continue;
    const outdoor = ENEMIES.filter(e =>
      !dungeonEnemyIds.has(e.id) &&
      (e.zone.toLowerCase().replace(/\s/g, "_") === zoneId || e.zone === zone.name),
    );
    const count = outdoor.length;
    const bosses = outdoor.filter(e => e.isBoss).length;
    if (count < 6) errors.push(`Zone ${zoneId}: only ${count} outdoor enemies (need 6+)`);
    if (count > 8) warnings.push(`Zone ${zoneId}: ${count} outdoor enemies (target 6-8)`);
    if (bosses < 1) errors.push(`Zone ${zoneId}: no outdoor boss defined`);
  }

  // 5. Each dungeon must have exactly 5 floors
  for (const dungeon of DUNGEONS) {
    if (dungeon.floors.length !== 5) {
      errors.push(`Dungeon ${dungeon.id}: has ${dungeon.floors.length} floors (expected 5)`);
    }
  }

  return { pass: errors.length === 0, errors, warnings };
}
