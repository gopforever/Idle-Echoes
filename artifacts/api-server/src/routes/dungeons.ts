import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { dungeonRunsTable, raidRunsTable, worldPlayersTable, dungeonKillStatsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { getEnemyById, getItemById } from "../lib/gameData.js";
import { getDungeonById, DUNGEONS, scaleEnemyForDifficulty, DUNGEON_GS_GATE, DUNGEON_DIFFICULTY_MULTIPLIER } from "../lib/dungeonData.js";
import { RAIDS } from "../lib/raidData.js";
import { computeGearScore } from "../lib/eq2Formulas.js";
import { progressDungeonKill, generateDungeonLoot, awardItemsToInventory, upsertDungeonKillStats } from "../lib/dungeonProgress.js";
import { checkAndUnlockAchievements } from "./achievements.js";
import { initPartyMember, fetchGhostInfo, revivePartyOnFloorAdvance, awardGhostContributions } from "../lib/partyEngine.js";
import type { PartyMember } from "../lib/partyEngine.js";

export { progressDungeonKill };

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildScaledFloorRoster(
  dungeonId: string,
  floorNumber: number,
  difficulty: string,
  playerLevel: number,
): Array<{ id: string; enemy: Record<string, unknown> }> {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return [];
  const floorDef = dungeon.floors.find(f => f.floorNumber === floorNumber);
  if (!floorDef) return [];

  const entries: Array<{ id: string; enemy: Record<string, unknown> }> = [];

  for (const id of floorDef.enemyIds) {
    const e = getEnemyById(id);
    if (e) entries.push({ id, enemy: scaleEnemyForDifficulty(e, difficulty, playerLevel, dungeon.minLevel) as unknown as Record<string, unknown> });
  }

  const mini = getEnemyById(floorDef.miniBossId);
  if (mini) entries.push({ id: floorDef.miniBossId, enemy: scaleEnemyForDifficulty(mini, difficulty, playerLevel, dungeon.minLevel) as unknown as Record<string, unknown> });

  if (floorNumber === dungeon.floors.length) {
    const boss = getEnemyById(dungeon.mainBossId);
    if (boss) entries.push({ id: dungeon.mainBossId, enemy: scaleEnemyForDifficulty(boss, difficulty, playerLevel, dungeon.minLevel) as unknown as Record<string, unknown> });
  }

  return entries;
}

function deriveRemainingEnemies(
  scaledEnemies: Array<{ id: string; enemy: Record<string, unknown> }>,
  remainingIds: string[],
): Array<{ id: string; enemy: Record<string, unknown> }> {
  const idCount = new Map<string, number>();
  for (const id of remainingIds) idCount.set(id, (idCount.get(id) ?? 0) + 1);

  const result: Array<{ id: string; enemy: Record<string, unknown> }> = [];
  for (const entry of scaledEnemies) {
    const remaining = idCount.get(entry.id) ?? 0;
    if (remaining > 0) {
      result.push(entry);
      idCount.set(entry.id, remaining - 1);
    }
  }
  return result;
}

function formatRun(run: typeof dungeonRunsTable.$inferSelect) {
  const rawLoot = (run.lootEarned as Array<{ floor: number; items: string[] }> | null) ?? [];
  const expandedLoot = rawLoot.map(floorLoot => ({
    floor: floorLoot.floor,
    items: floorLoot.items.map(idOrObj => {
      if (typeof idOrObj !== "string") return idOrObj;
      const item = getItemById(idOrObj);
      return item ?? { id: idOrObj, name: idOrObj, rarity: "common", level: 1, type: "unknown", slot: null };
    }),
  }));

  return {
    ...run,
    lootEarned: expandedLoot,
    floorKills: run.floorKills ?? run.normalKills,
    completed: run.completed ?? run.status === "completed",
    abandoned: run.abandoned ?? run.status === "abandoned",
    party: (run.party as PartyMember[]) ?? [],
  };
}

// ─── GET /api/dungeons ────────────────────────────────────────────────────────
router.get("/dungeons", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, string>) || {};
    const gearScore = computeGearScore(gear);

    const dungeonSummaries = DUNGEONS.map(d => ({
      id: d.id,
      name: d.name,
      zone: d.zone,
      description: d.description,
      lore: d.lore,
      minLevel: d.minLevel,
      maxLevel: d.maxLevel,
      floorCount: d.floors.length,
      mainBossId: d.mainBossId,
      spriteId: d.spriteId,
      difficulties: (["normal", "expert", "legendary", "mythical"] as const).map(diff => ({
        id: diff,
        gsRequired: DUNGEON_GS_GATE[diff] ?? 0,
        hpMultiplier: DUNGEON_DIFFICULTY_MULTIPLIER[diff] ?? 1,
        damageMultiplier: DUNGEON_DIFFICULTY_MULTIPLIER[diff] ?? 1,
        unlocked: gearScore >= (DUNGEON_GS_GATE[diff] ?? 0),
      })),
      floors: d.floors.map(f => ({
        floorNumber: f.floorNumber,
        name: f.name,
        description: f.description,
        normalsRequired: f.normalsRequired,
        miniBossId: f.miniBossId,
        enemyCount: f.enemyIds.length,
      })),
    }));

    return res.json({ dungeons: dungeonSummaries, playerGearScore: gearScore });
  } catch (err) {
    req.log.error({ err }, "Error fetching dungeons");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/dungeons/kill-stats ────────────────────────────────────────────
router.get("/dungeons/kill-stats", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [stats, dungeonRuns, raidRuns] = await Promise.all([
      db.select().from(dungeonKillStatsTable).where(eq(dungeonKillStatsTable.characterId, character.id)),
      db.select({ dungeonId: dungeonRunsTable.dungeonId }).from(dungeonRunsTable)
        .where(eq(dungeonRunsTable.characterId, character.id)),
      db.select({ raidId: raidRunsTable.raidId }).from(raidRunsTable)
        .where(eq(raidRunsTable.characterId, character.id)),
    ]);

    const allDungeons = DUNGEONS.map(d => ({
      id: d.id, name: d.name, zone: d.zone, isRaid: false, totalFloors: d.floors.length,
    }));
    const allRaids = RAIDS.map(r => ({
      id: r.id, name: r.name, zone: r.zone, isRaid: true, totalFloors: r.phases.length,
    }));

    const statsMap = new Map(stats.map(s => [s.dungeonOrRaidId, s]));

    // Count runs started per dungeon/raid
    const dungeonRunsCount: Record<string, number> = {};
    for (const r of dungeonRuns) { dungeonRunsCount[r.dungeonId] = (dungeonRunsCount[r.dungeonId] ?? 0) + 1; }
    const raidRunsCount: Record<string, number> = {};
    for (const r of raidRuns) { raidRunsCount[r.raidId] = (raidRunsCount[r.raidId] ?? 0) + 1; }

    const result = [...allDungeons, ...allRaids].map(def => {
      const s = statsMap.get(def.id);
      const runsStarted = def.isRaid ? (raidRunsCount[def.id] ?? 0) : (dungeonRunsCount[def.id] ?? 0);
      return {
        id: def.id,
        name: def.name,
        zone: def.zone,
        isRaid: def.isRaid,
        totalFloors: def.totalFloors,
        runsStarted,
        normalKills: s?.normalKills ?? 0,
        miniBossKills: s?.miniBossKills ?? 0,
        mainBossKills: s?.mainBossKills ?? 0,
        completions: s?.completions ?? 0,
        firstClearAt: s?.firstClearAt?.toISOString() ?? null,
      };
    });

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting dungeon kill stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/dungeons/:dungeonId ─────────────────────────────────────────────
router.get("/dungeons/:dungeonId", (req, res) => {
  const dungeon = getDungeonById(req.params.dungeonId);
  if (!dungeon) return res.status(404).json({ error: "Dungeon not found" });

  const { difficulty = "normal" } = req.query as { difficulty?: string };
  const floors = dungeon.floors.map(f => {
    const enemies = f.enemyIds.map(id => {
      const e = getEnemyById(id);
      return e ? scaleEnemyForDifficulty(e, difficulty) : null;
    }).filter(Boolean);
    const miniBoss = getEnemyById(f.miniBossId);
    const isLastFloor = f.floorNumber === dungeon.floors.length;
    const mainBoss = isLastFloor ? getEnemyById(dungeon.mainBossId) : null;
    return {
      ...f,
      enemies,
      miniBoss: miniBoss ? scaleEnemyForDifficulty(miniBoss, difficulty) : null,
      mainBoss: mainBoss ? scaleEnemyForDifficulty(mainBoss, difficulty) : undefined,
    };
  });

  const mainBoss = getEnemyById(dungeon.mainBossId);

  return res.json({
    ...dungeon,
    floors,
    mainBoss: mainBoss ? scaleEnemyForDifficulty(mainBoss, difficulty) : null,
    difficulty,
    gsRequired: DUNGEON_GS_GATE[difficulty] ?? 0,
  });
});

// Class sprite/icon mappings for HUD
const CLASS_ICONS: Record<string, string> = {
  Guardian: "🛡️", Berserker: "⚔️", Monk: "👊", Bruiser: "💪",
  Paladin: "✨", Shadowknight: "💀", Templar: "🙏", Inquisitor: "⚖️",
  Mystic: "🌙", Defiler: "🕸️", Warden: "🌿", Fury: "🌪️",
  Troubador: "🎵", Dirge: "🎶", Assassin: "🗡️", Ranger: "🏹",
  Brigand: "🪙", Swashbuckler: "⚓", Wizard: "🔥", Warlock: "💜",
  Conjuror: "🌀", Necromancer: "☠️", Illusionist: "🔮", Coercer: "🌊",
};

function getClassIcon(className: string): string {
  return CLASS_ICONS[className] ?? "⚔️";
}

// Adjacent zone groupings for "nearby" prioritization
const ZONE_ADJACENCY: Record<string, string[]> = {
  "Commonlands": ["Nektulos Forest", "Thundering Steppes"],
  "Antonica": ["Thundering Steppes", "Qeynos Hills"],
  "Qeynos Hills": ["Antonica", "Commonlands"],
  "Thundering Steppes": ["Antonica", "Nektulos Forest", "Commonlands"],
  "Nektulos Forest": ["Commonlands", "Thundering Steppes"],
  "Everfrost Peaks": ["Permafrost", "Lavastorm Mountains"],
  "Lavastorm Mountains": ["Everfrost Peaks", "Nektulos Forest"],
  "Enchanted Lands": ["Antonica", "Lesser Faydark"],
  "Lesser Faydark": ["Enchanted Lands", "Greater Faydark"],
  "Greater Faydark": ["Lesser Faydark", "Butcherblock Mountains"],
  "Butcherblock Mountains": ["Greater Faydark", "Kaladim"],
};

// ─── GET /api/dungeons/:dungeonId/party-suggestions ──────────────────────────
// Returns suggested ghosts for party formation: rivals first (same level range),
// then same-zone neighbors, then adjacent-zone neighbors.
router.get("/dungeons/:dungeonId/party-suggestions", async (req, res) => {
  try {
    const dungeon = getDungeonById(req.params.dungeonId);
    if (!dungeon) return res.status(404).json({ error: "Dungeon not found" });

    const character = await getOrCreateCharacter(req.characterId);

    const allGhosts = await db
      .select({
        id: worldPlayersTable.id,
        name: worldPlayersTable.name,
        race: worldPlayersTable.race,
        class: worldPlayersTable.class,
        archetype: worldPlayersTable.archetype,
        level: worldPlayersTable.level,
        zone: worldPlayersTable.zone,
        killCount: worldPlayersTable.killCount,
      })
      .from(worldPlayersTable)
      .orderBy(worldPlayersTable.level);

    const dungeonZone = dungeon.zone;
    const minLevel = dungeon.minLevel;
    const adjacentZones = ZONE_ADJACENCY[dungeonZone] ?? [];

    const withPriority = allGhosts.map(g => {
      const levelOk = g.level >= minLevel - 5;
      const sameZone = g.zone === dungeonZone;
      const adjacent = !sameZone && adjacentZones.includes(g.zone);
      // "Rival" = within 5 levels of the player character (same power bracket)
      const isRival = Math.abs(g.level - character.level) <= 5;

      let priority: number;
      if (isRival && sameZone) priority = 4;
      else if (isRival) priority = 3;
      else if (sameZone) priority = 2;
      else if (adjacent) priority = 1;
      else priority = 0;

      return {
        id: g.id,
        name: g.name,
        race: g.race,
        class: g.class,
        archetype: g.archetype,
        level: g.level,
        zone: g.zone,
        killCount: g.killCount,
        levelOk,
        priority,
        role: archetypeToRole(g.archetype),
        classIcon: getClassIcon(g.class),
        isRival,
        sameZone,
      };
    });

    withPriority.sort((a, b) => b.priority - a.priority || b.level - a.level);
    const suggestions = withPriority.slice(0, 20);

    return res.json({ suggestions });
  } catch (err) {
    req.log.error({ err }, "Error fetching party suggestions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function archetypeToRole(archetype: string): "Tank" | "Healer" | "DPS" {
  const a = archetype.toLowerCase();
  if (a === "fighter") return "Tank";
  if (a === "priest") return "Healer";
  return "DPS";
}

// ─── POST /api/dungeons/:dungeonId/party ─────────────────────────────────────
// Set party for the active dungeon run (or pre-start).
// Must be called after /start. ghostIds: number[] (1–3 ghosts).
router.post("/dungeons/:id/party", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const { ghostIds } = req.body as { ghostIds: number[] };

    if (!Array.isArray(ghostIds) || ghostIds.length < 1 || ghostIds.length > 3) {
      return res.status(400).json({ error: "ghostIds must be an array of 1–3 ghost IDs" });
    }

    const [run] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);
    if (!run) return res.status(400).json({ error: "No active dungeon run" });

    const ghosts = await fetchGhostInfo(ghostIds);
    const validIds = ghosts.map(g => g.id);
    const invalidIds = ghostIds.filter(id => !validIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Ghost IDs not found: ${invalidIds.join(", ")}` });
    }

    const party: PartyMember[] = ghosts.map(g => initPartyMember(g.id, g.level));

    const [updated] = await db.update(dungeonRunsTable)
      .set({ party })
      .where(eq(dungeonRunsTable.id, run.id))
      .returning();

    return res.json({ success: true, party, run: formatRun(updated) });
  } catch (err) {
    req.log.error({ err }, "Error setting dungeon party");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/dungeons/run/party ─────────────────────────────────────────────
router.get("/dungeons/run/party", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [run] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);
    if (!run) return res.json({ party: [], ghosts: [] });

    const party = (run.party as PartyMember[]) ?? [];
    const ghostIds = party.map(m => m.ghostId);
    const ghosts = await fetchGhostInfo(ghostIds);

    const partyWithInfo = party.map(m => {
      const ghost = ghosts.find(g => g.id === m.ghostId) ?? null;
      return {
        ...m,
        ghost,
        role: ghost ? archetypeToRole(ghost.archetype) : "DPS",
        classIcon: ghost ? getClassIcon(ghost.class) : "⚔️",
      };
    });

    return res.json({ party: partyWithInfo });
  } catch (err) {
    req.log.error({ err }, "Error fetching dungeon party");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/dungeons/:dungeonId/start ──────────────────────────────────────
router.post("/dungeons/:dungeonId/start", async (req, res) => {
  try {
    const dungeon = getDungeonById(req.params.dungeonId);
    if (!dungeon) return res.status(404).json({ error: "Dungeon not found" });

    const { difficulty = "normal", ghostIds } = req.body as { difficulty?: string; ghostIds?: number[] };
    const character = await getOrCreateCharacter(req.characterId);

    const [existing] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);

    if (existing) {
      if (existing.dungeonId === dungeon.id) {
        const existingDungeon = getDungeonById(existing.dungeonId);
        const floor = existingDungeon?.floors[(existing.currentFloor ?? 1) - 1];
        return res.status(200).json({
          run: formatRun(existing),
          currentFloor: existing.currentFloor,
          currentFloorName: floor?.name ?? `Floor ${existing.currentFloor}`,
          resumed: true,
        });
      }
      const stuckDungeon = getDungeonById(existing.dungeonId);
      return res.status(400).json({
        error: `You have an active run in ${stuckDungeon?.name ?? existing.dungeonId}. Abandon it first.`,
        stuckDungeonId: existing.dungeonId,
        stuckDungeonName: stuckDungeon?.name ?? existing.dungeonId,
        run: formatRun(existing),
      });
    }

    const gear = (character.gear as Record<string, string>) || {};
    const gearScore = computeGearScore(gear);
    const gsRequired = DUNGEON_GS_GATE[difficulty] ?? 0;

    if (gearScore < gsRequired) {
      return res.status(400).json({
        error: `Gear Score too low for ${difficulty} difficulty`,
        yourGS: gearScore,
        required: gsRequired,
      });
    }

    if (character.level < dungeon.minLevel) {
      return res.status(400).json({
        error: `You must be at least level ${dungeon.minLevel} to enter ${dungeon.name}`,
        yourLevel: character.level,
        required: dungeon.minLevel,
      });
    }

    const scaledEnemies = buildScaledFloorRoster(dungeon.id, 1, difficulty, character.level);
    const floorEnemyIds = scaledEnemies.map(e => e.id);

    let party: PartyMember[] = [];
    if (ghostIds && Array.isArray(ghostIds) && ghostIds.length > 0) {
      const cappedIds = ghostIds.slice(0, 3);
      const ghosts = await fetchGhostInfo(cappedIds);
      const validIds = ghosts.map(g => g.id);
      const invalidIds = cappedIds.filter(id => !validIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: `Ghost IDs not found: ${invalidIds.join(", ")}` });
      }
      party = ghosts.map(g => initPartyMember(g.id, g.level));
    }

    const [run] = await db.insert(dungeonRunsTable).values({
      characterId: character.id,
      dungeonId: dungeon.id,
      difficulty,
      currentFloor: 1,
      normalKills: 0,
      floorKills: 0,
      miniBossDefeated: false,
      mainBossDefeated: false,
      status: "active",
      completed: false,
      abandoned: false,
      lootEarned: [],
      currentFloorEnemies: floorEnemyIds,
      scaledEnemies,
      party,
    }).returning();

    const floor1Def = dungeon.floors[0];

    return res.json({
      success: true,
      run: formatRun(run),
      dungeon: { id: dungeon.id, name: dungeon.name, floors: dungeon.floors.length },
      message: `You have entered ${dungeon.name} on ${difficulty} difficulty. Floor 1: ${floor1Def.name}.`,
      floor: {
        floorNumber: 1,
        name: floor1Def.name,
        description: floor1Def.description,
        normalsRequired: floor1Def.normalsRequired,
        enemies: scaledEnemies,
      },
      party,
    });
  } catch (err) {
    req.log.error({ err }, "Error starting dungeon run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/dungeons/run/current ───────────────────────────────────────────
router.get("/dungeons/run/current", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [run] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);

    if (!run) return res.json({ active: false });

    const dungeon = getDungeonById(run.dungeonId);
    const currentFloorDef = dungeon?.floors.find(f => f.floorNumber === run.currentFloor);
    const nextFloorDef = dungeon?.floors.find(f => f.floorNumber === run.currentFloor + 1);
    const totalFloors = dungeon?.floors.length ?? 5;
    const isLastFloor = run.currentFloor === totalFloors;

    const storedScaled = (run.scaledEnemies as Array<{ id: string; enemy: Record<string, unknown> }>) ?? [];
    const storedRemaining = (run.currentFloorEnemies as string[]) ?? [];
    const remainingEnemies = deriveRemainingEnemies(storedScaled, storedRemaining);

    const normalsRequired = currentFloorDef?.normalsRequired ?? 5;
    const floorClear = run.normalKills >= normalsRequired && run.miniBossDefeated &&
      (!isLastFloor || run.mainBossDefeated);

    const party = (run.party as PartyMember[]) ?? [];
    const ghostIds = party.map(m => m.ghostId);
    const ghosts = ghostIds.length > 0 ? await fetchGhostInfo(ghostIds) : [];
    const partyWithInfo = party.map(m => ({
      ...m,
      ghost: ghosts.find(g => g.id === m.ghostId) ?? null,
      role: ghosts.find(g => g.id === m.ghostId) ? archetypeToRole(ghosts.find(g => g.id === m.ghostId)!.archetype) : "DPS",
    }));

    return res.json({
      active: true,
      run: formatRun(run),
      dungeon: dungeon ? { id: dungeon.id, name: dungeon.name, zone: dungeon.zone } : null,
      currentFloor: currentFloorDef ?? null,
      nextFloor: nextFloorDef ?? null,
      scaledEnemies: storedScaled,
      remainingEnemies,
      party: partyWithInfo,
      progress: {
        normalKills: run.normalKills,
        floorKills: run.floorKills ?? run.normalKills,
        normalsRequired,
        miniBossDefeated: run.miniBossDefeated,
        mainBossDefeated: run.mainBossDefeated,
        floorClear,
        totalFloors,
        percentComplete: Math.round(
          ((run.currentFloor - 1 + Math.min(1, run.normalKills / Math.max(1, normalsRequired)) * 0.5) / totalFloors) * 100
        ),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error getting current run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/dungeons/run/kill ─────────────────────────────────────────────
router.post("/dungeons/run/kill", async (req, res) => {
  try {
    const { enemyId } = req.body as { enemyId: string };
    if (!enemyId) return res.status(400).json({ error: "enemyId is required" });

    const character = await getOrCreateCharacter(req.characterId);
    const result = await progressDungeonKill(enemyId, character.id);
    if (!result) return res.status(400).json({
      error: "No active run, enemy already killed, or enemy not in current floor roster",
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    req.log.error({ err }, "Error tracking dungeon kill");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/dungeons/run/advance ──────────────────────────────────────────
router.post("/dungeons/run/advance", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [run] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);

    if (!run) return res.status(400).json({ error: "No active dungeon run" });

    const dungeon = getDungeonById(run.dungeonId);
    if (!dungeon) return res.status(400).json({ error: "Dungeon not found" });

    const currentFloorDef = dungeon.floors.find(f => f.floorNumber === run.currentFloor);
    if (!currentFloorDef) return res.status(400).json({ error: "Floor definition not found" });

    const isLastFloor = run.currentFloor === dungeon.floors.length;

    if (run.normalKills < currentFloorDef.normalsRequired) {
      return res.status(400).json({
        error: "Floor not cleared: normal kill requirement not met",
        floorKills: run.floorKills ?? run.normalKills,
        normalKills: run.normalKills,
        normalsRequired: currentFloorDef.normalsRequired,
      });
    }
    if (!run.miniBossDefeated) {
      return res.status(400).json({ error: "Floor not cleared: mini-boss not defeated" });
    }
    if (isLastFloor && !run.mainBossDefeated) {
      return res.status(400).json({ error: "Final floor not cleared: main boss not yet defeated" });
    }

    const loot = generateDungeonLoot(character.level, run.currentFloor, run.difficulty);
    await awardItemsToInventory(loot, character.id);
    const existingLoot = (run.lootEarned as Array<{ floor: number; items: string[] }>) ?? [];
    const newLoot = [...existingLoot, { floor: run.currentFloor, items: loot }];

    const currentParty = (run.party as PartyMember[]) ?? [];

    if (isLastFloor) {
      const [completed] = await db.update(dungeonRunsTable).set({
        status: "completed",
        completed: true,
        abandoned: false,
        lootEarned: newLoot,
        completedAt: new Date(),
      }).where(eq(dungeonRunsTable.id, run.id)).returning();

      await upsertDungeonKillStats({
        characterId: character.id,
        dungeonOrRaidId: run.dungeonId,
        isRaid: false,
        completed: true,
      });

      await checkAndUnlockAchievements(character.id);

      await awardGhostContributions(currentParty);

      const diffXpMult: Record<string, number> = { normal: 1, expert: 1.5, legendary: 2, mythical: 3 };
      const xpMult = diffXpMult[run.difficulty] ?? 1;
      const allItemIds = newLoot.flatMap(l => l.items);
      const goldEarned = allItemIds.reduce((sum: number, id: string) => {
        const it = getItemById(id);
        return sum + ((it as unknown as { sellPrice?: number } | null)?.sellPrice ?? 0);
      }, 0);
      const xpEarned = Math.round(dungeon.floors.length * 500 * xpMult + character.level * 50);

      const ghostIds = currentParty.map(m => m.ghostId);
      const ghosts = ghostIds.length > 0 ? await fetchGhostInfo(ghostIds) : [];
      const partyWithInfo = currentParty.map(m => ({
        ...m,
        ghost: ghosts.find(g => g.id === m.ghostId) ?? null,
        role: ghosts.find(g => g.id === m.ghostId) ? archetypeToRole(ghosts.find(g => g.id === m.ghostId)!.archetype) : "DPS",
      }));

      return res.json({
        success: true,
        run: formatRun(completed),
        completed: true,
        abandoned: false,
        lootAwarded: loot,
        xpEarned,
        goldEarned,
        party: partyWithInfo,
        message: `${dungeon.name} conquered! All ${dungeon.floors.length} floors cleared.`,
      });
    }

    const revivedParty = revivePartyOnFloorAdvance(currentParty);

    const newFloor = run.currentFloor + 1;
    const nextFloorDef = dungeon.floors.find(f => f.floorNumber === newFloor)!;

    const nextScaledEnemies = buildScaledFloorRoster(dungeon.id, newFloor, run.difficulty, character.level);
    const nextFloorEnemyIds = nextScaledEnemies.map(e => e.id);

    const [updated] = await db.update(dungeonRunsTable).set({
      currentFloor: newFloor,
      normalKills: 0,
      floorKills: 0,
      miniBossDefeated: false,
      mainBossDefeated: false,
      lootEarned: newLoot,
      currentFloorEnemies: nextFloorEnemyIds,
      scaledEnemies: nextScaledEnemies,
      party: revivedParty,
    }).where(eq(dungeonRunsTable.id, run.id)).returning();

    return res.json({
      success: true,
      run: formatRun(updated),
      completed: false,
      abandoned: false,
      newFloor,
      lootAwarded: loot,
      party: revivedParty,
      nextFloor: {
        floorNumber: newFloor,
        name: nextFloorDef.name,
        description: nextFloorDef.description,
        normalsRequired: nextFloorDef.normalsRequired,
        enemies: nextScaledEnemies,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error advancing dungeon floor");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/dungeons/run/abandon ──────────────────────────────────────────
router.post("/dungeons/run/abandon", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [updated] = await db.update(dungeonRunsTable)
      .set({ status: "abandoned", abandoned: true, completed: false })
      .where(
        and(
          eq(dungeonRunsTable.characterId, character.id),
          eq(dungeonRunsTable.status, "active"),
        )
      ).returning();

    if (!updated) return res.status(400).json({ error: "No active dungeon run to abandon" });
    return res.json({ success: true, run: formatRun(updated), completed: false, abandoned: true, message: "Dungeon run abandoned." });
  } catch (err) {
    req.log.error({ err }, "Error abandoning dungeon run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/dungeons/:dungeonId/history ────────────────────────────────────
router.get("/dungeons/:dungeonId/history", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const runs = await db.select().from(dungeonRunsTable)
      .where(eq(dungeonRunsTable.characterId, character.id))
      .orderBy(dungeonRunsTable.startedAt);
    return res.json(runs.map(formatRun));
  } catch (err) {
    req.log.error({ err }, "Error getting dungeon history");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
