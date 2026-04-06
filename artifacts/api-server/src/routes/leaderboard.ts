import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, dungeonRunsTable, raidRunsTable, worldPlayersTable, ghostDungeonClearsTable, ghostRaidClearsTable } from "@workspace/db/schema";
import { asc, and, eq, sql, desc } from "drizzle-orm";
import { computeStats, makeZeroAABonuses, computeGearScore } from "../lib/eq2Formulas.js";
import { getItemById } from "../lib/gameData.js";
import { getDungeonById } from "../lib/dungeonData.js";

const router: IRouter = Router();

/** Compute derived gear stats (attack, defense, mitigation, etc.) from a gear object */
function resolveGearStats(gear: Record<string, unknown>, level: number, baseStats: { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number }) {
  let gearAttackRating = 0, gearDefenseRating = 0, gearMitigation = 0;
  let gearHaste = 0, gearCritChance = 0, gearWeaponDamageMin = 0, gearWeaponDamageMax = 0, gearWeaponDelay = 2.0;
  let gearHealth = 0, gearPower = 0, hasWeapon = false;

  for (const slotValue of Object.values(gear)) {
    let s: Record<string, number> | null = null;
    if (typeof slotValue === "string") {
      const item = getItemById(slotValue);
      if (item?.stats) s = item.stats as Record<string, number>;
    } else if (slotValue && typeof slotValue === "object") {
      const obj = slotValue as Record<string, unknown>;
      if (obj.stats && typeof obj.stats === "object") s = obj.stats as Record<string, number>;
    }
    if (!s) continue;
    gearAttackRating += s.attackRating || 0;
    gearDefenseRating += s.defenseRating || 0;
    gearMitigation += s.mitigation || 0;
    gearHaste += s.haste || 0;
    gearCritChance += s.critChance || 0;
    gearHealth += s.health || 0;
    gearPower += s.power || 0;
    if (s.weaponDamageMin) {
      gearWeaponDamageMin = s.weaponDamageMin;
      gearWeaponDamageMax = s.weaponDamageMax || s.weaponDamageMin * 2;
      gearWeaponDelay = s.weaponDelay || 2.0;
      hasWeapon = true;
    }
  }
  if (!hasWeapon) {
    gearWeaponDamageMin = baseStats.strength * 0.5 + level;
    gearWeaponDamageMax = baseStats.strength * 1.0 + level * 2;
  }
  return { gearAttackRating, gearDefenseRating, gearMitigation, gearHaste, gearCritChance, gearWeaponDamageMin, gearWeaponDamageMax, gearWeaponDelay, gearHealth, gearPower };
}

/** Resolve equipped gear items to display objects for the profile panel */
function resolveGearItems(gear: Record<string, unknown>): Array<{ slot: string; name: string; rarity: string; level: number; type: string }> {
  const items: Array<{ slot: string; name: string; rarity: string; level: number; type: string }> = [];
  for (const [slot, val] of Object.entries(gear)) {
    if (!val) continue;
    if (typeof val === "string") {
      const item = getItemById(val);
      if (item) items.push({ slot, name: item.name, rarity: item.rarity, level: item.level, type: item.type });
    } else if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      items.push({
        slot,
        name: (obj.name as string) || "Unknown Item",
        rarity: (obj.rarity as string) || "common",
        level: (obj.level as number) || 1,
        type: (obj.type as string) || "armor",
      });
    }
  }
  return items;
}

router.get("/leaderboard/overall", async (_req, res) => {
  try {
    const [realPlayers, ghostPlayers, dungeonAgg, raidAgg, ghostDungAgg, ghostRaidAgg] = await Promise.all([
      db.select().from(charactersTable).orderBy(asc(charactersTable.id)),
      db.select().from(worldPlayersTable).orderBy(asc(worldPlayersTable.id)),
      db
        .select({
          characterId: dungeonRunsTable.characterId,
          dungeonsCompleted: sql<number>`count(*)`.as("dungeons_completed"),
          heroicCompletions: sql<number>`sum(case when ${dungeonRunsTable.difficulty} in ('expert','legendary','mythical') then 1 else 0 end)`.as("heroic_completions"),
        })
        .from(dungeonRunsTable)
        .where(eq(dungeonRunsTable.completed, true))
        .groupBy(dungeonRunsTable.characterId),
      db
        .select({
          characterId: raidRunsTable.characterId,
          raidsCompleted: sql<number>`count(*)`.as("raids_completed"),
          maxPhase: sql<number>`max(${raidRunsTable.currentPhase})`.as("max_phase"),
        })
        .from(raidRunsTable)
        .where(eq(raidRunsTable.completed, true))
        .groupBy(raidRunsTable.characterId),
      db.select({
        ghostId: ghostDungeonClearsTable.ghostId,
        totalClears: sql<number>`sum(${ghostDungeonClearsTable.clearCount})`.as("total_clears"),
      }).from(ghostDungeonClearsTable).groupBy(ghostDungeonClearsTable.ghostId),
      db.select({
        ghostId: ghostRaidClearsTable.ghostId,
        totalClears: sql<number>`sum(${ghostRaidClearsTable.clearCount})`.as("total_clears"),
        maxPhase: sql<number>`max(${ghostRaidClearsTable.maxPhase})`.as("max_phase"),
      }).from(ghostRaidClearsTable).groupBy(ghostRaidClearsTable.ghostId),
    ]);

    const dungeonMap = new Map(dungeonAgg.map(d => [d.characterId, d]));
    const raidMap = new Map(raidAgg.map(r => [r.characterId, r]));
    const ghostDungMap = new Map(ghostDungAgg.map(d => [d.ghostId, d]));
    const ghostRaidMap = new Map(ghostRaidAgg.map(r => [r.ghostId, r]));

    const entries: Array<{
      id: string;
      type: "player" | "ghost";
      name: string;
      class: string;
      level: number;
      xp: number;
      killCount: number;
      bossKills: number;
      dungeonsCompleted: number;
      heroicCompletions: number;
      raidsCompleted: number;
      highestPhase: number;
      _score: number;
    }> = [];

    for (const p of realPlayers) {
      const dungData = dungeonMap.get(p.id);
      const raidData = raidMap.get(p.id);
      const dungCompleted = Number(dungData?.dungeonsCompleted ?? 0);
      const heroic = Number(dungData?.heroicCompletions ?? 0);
      const raidsCompleted = Number(raidData?.raidsCompleted ?? 0);
      const maxPhase = Number(raidData?.maxPhase ?? 0);

      const score =
        p.level * 1000 +
        p.killCount * 0.5 +
        p.bossKills * 10 +
        dungCompleted * 50 +
        heroic * 100 +
        raidsCompleted * 200;

      entries.push({
        id: `player_${p.id}`,
        type: "player",
        name: p.name,
        class: p.class,
        level: p.level,
        xp: p.xp,
        killCount: p.killCount,
        bossKills: p.bossKills,
        dungeonsCompleted: dungCompleted,
        heroicCompletions: heroic,
        raidsCompleted,
        highestPhase: maxPhase,
        _score: score,
      });
    }

    for (const g of ghostPlayers) {
      const gDung = ghostDungMap.get(g.id);
      const gRaid = ghostRaidMap.get(g.id);
      const dungCompleted = Number(gDung?.totalClears ?? 0);
      const raidsCompleted = Number(gRaid?.totalClears ?? 0);
      const maxPhase = Number(gRaid?.maxPhase ?? 0);

      const score =
        g.level * 1000 +
        g.killCount * 0.5 +
        g.bossKills * 10 +
        dungCompleted * 50 +
        raidsCompleted * 200;

      entries.push({
        id: `ghost_${g.id}`,
        type: "ghost",
        name: g.name,
        class: g.class,
        level: g.level,
        xp: g.xp,
        killCount: g.killCount,
        bossKills: g.bossKills,
        dungeonsCompleted: dungCompleted,
        heroicCompletions: 0,
        raidsCompleted,
        highestPhase: maxPhase,
        _score: score,
      });
    }

    entries.sort((a, b) => b._score - a._score);

    const ranked = entries.slice(0, 100).map(({ _score, ...e }, i) => ({ ...e, rank: i + 1 }));
    const firstRealPlayer = realPlayers.length > 0 ? `player_${realPlayers[0].id}` : null;
    res.json({ entries: ranked, currentPlayerId: firstRealPlayer });
  } catch (err) {
    console.error("leaderboard/overall error", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/leaderboard/dungeons", async (_req, res) => {
  try {
    const [realAgg, perDungeonAgg, realPlayers, ghostPlayers, ghostDungAgg, ghostPerDungAgg] = await Promise.all([
      db
        .select({
          characterId: dungeonRunsTable.characterId,
          dungeonsCompleted: sql<number>`count(*)`.as("dungeons_completed"),
          floorsCleared: sql<number>`sum(${dungeonRunsTable.currentFloor})`.as("floors_cleared"),
          heroicCompletions: sql<number>`sum(case when ${dungeonRunsTable.difficulty} in ('expert','legendary','mythical') then 1 else 0 end)`.as("heroic_completions"),
        })
        .from(dungeonRunsTable)
        .where(eq(dungeonRunsTable.completed, true))
        .groupBy(dungeonRunsTable.characterId),
      db
        .select({
          characterId: dungeonRunsTable.characterId,
          dungeonId: dungeonRunsTable.dungeonId,
          difficulty: dungeonRunsTable.difficulty,
          clearCount: sql<number>`count(*)`.as("clear_count"),
        })
        .from(dungeonRunsTable)
        .where(eq(dungeonRunsTable.completed, true))
        .groupBy(dungeonRunsTable.characterId, dungeonRunsTable.dungeonId, dungeonRunsTable.difficulty),
      db.select().from(charactersTable).orderBy(asc(charactersTable.id)),
      db.select().from(worldPlayersTable).orderBy(asc(worldPlayersTable.id)),
      db.select({
        ghostId: ghostDungeonClearsTable.ghostId,
        totalClears: sql<number>`sum(${ghostDungeonClearsTable.clearCount})`.as("total_clears"),
      }).from(ghostDungeonClearsTable).groupBy(ghostDungeonClearsTable.ghostId),
      db.select().from(ghostDungeonClearsTable),
    ]);

    const realAggMap = new Map(realAgg.map(r => [r.characterId, r]));
    // Build per-character dungeon breakdown map
    const perDungeonMap = new Map<number, Array<{ dungeonId: string; dungeonName: string; difficulty: string; clearCount: number }>>();
    for (const row of perDungeonAgg) {
      const def = getDungeonById(row.dungeonId);
      const entry = { dungeonId: row.dungeonId, dungeonName: def?.name ?? row.dungeonId, difficulty: row.difficulty, clearCount: Number(row.clearCount) };
      const existing = perDungeonMap.get(row.characterId) ?? [];
      existing.push(entry);
      perDungeonMap.set(row.characterId, existing);
    }

    // Build ghost dungeon aggregate maps
    const ghostDungMap = new Map(ghostDungAgg.map(d => [d.ghostId, d]));
    const ghostPerDungMap = new Map<number, Array<{ dungeonId: string; dungeonName: string; difficulty: string; clearCount: number }>>();
    for (const row of ghostPerDungAgg) {
      const def = getDungeonById(row.dungeonId);
      const entry = { dungeonId: row.dungeonId, dungeonName: def?.name ?? row.dungeonId, difficulty: row.bestDifficulty, clearCount: row.clearCount };
      const existing = ghostPerDungMap.get(row.ghostId) ?? [];
      existing.push(entry);
      ghostPerDungMap.set(row.ghostId, existing);
    }

    const entries: Array<{
      id: string;
      type: "player" | "ghost";
      name: string;
      dungeonsCompleted: number;
      floorsCleared: number;
      heroicCompletions: number;
      dungeonBreakdown: Array<{ dungeonId: string; dungeonName: string; difficulty: string; clearCount: number }>;
      _score: number;
    }> = [];

    for (const p of realPlayers) {
      const agg = realAggMap.get(p.id);
      const dungCompleted = Number(agg?.dungeonsCompleted ?? 0);
      const floors = Number(agg?.floorsCleared ?? 0);
      const heroic = Number(agg?.heroicCompletions ?? 0);
      entries.push({
        id: `player_${p.id}`,
        type: "player",
        name: p.name,
        dungeonsCompleted: dungCompleted,
        floorsCleared: floors,
        heroicCompletions: heroic,
        dungeonBreakdown: perDungeonMap.get(p.id) ?? [],
        _score: dungCompleted * 100 + floors * 5 + heroic * 50,
      });
    }

    for (const g of ghostPlayers) {
      const gAgg = ghostDungMap.get(g.id);
      const dungCompleted = Number(gAgg?.totalClears ?? 0);
      entries.push({
        id: `ghost_${g.id}`,
        type: "ghost",
        name: g.name,
        dungeonsCompleted: dungCompleted,
        floorsCleared: 0,
        heroicCompletions: 0,
        dungeonBreakdown: ghostPerDungMap.get(g.id) ?? [],
        _score: dungCompleted * 100,
      });
    }

    entries.sort((a, b) => b._score - a._score);

    const ranked = entries.slice(0, 100).map(({ _score, ...e }, i) => ({ ...e, rank: i + 1 }));
    const firstRealPlayer = realPlayers.length > 0 ? `player_${realPlayers[0].id}` : null;
    res.json({ entries: ranked, currentPlayerId: firstRealPlayer });
  } catch (err) {
    console.error("leaderboard/dungeons error", err);
    res.status(500).json({ error: "Failed to fetch dungeon leaderboard" });
  }
});

router.get("/leaderboard/raids", async (_req, res) => {
  try {
    const [raidAgg, realPlayers, ghostPlayers, ghostRaidAgg] = await Promise.all([
      db
        .select({
          characterId: raidRunsTable.characterId,
          raidsCompleted: sql<number>`count(*)`.as("raids_completed"),
          maxPhase: sql<number>`max(${raidRunsTable.currentPhase})`.as("max_phase"),
          totalRaidKills: sql<number>`sum(${raidRunsTable.currentPhase})`.as("total_raid_kills"),
        })
        .from(raidRunsTable)
        .where(eq(raidRunsTable.completed, true))
        .groupBy(raidRunsTable.characterId),
      db.select().from(charactersTable).orderBy(asc(charactersTable.id)),
      db.select().from(worldPlayersTable).orderBy(asc(worldPlayersTable.id)),
      db.select({
        ghostId: ghostRaidClearsTable.ghostId,
        raidsCompleted: sql<number>`sum(${ghostRaidClearsTable.clearCount})`.as("raids_completed"),
        maxPhase: sql<number>`max(${ghostRaidClearsTable.maxPhase})`.as("max_phase"),
      }).from(ghostRaidClearsTable).groupBy(ghostRaidClearsTable.ghostId),
    ]);

    const raidMap = new Map(raidAgg.map(r => [r.characterId, r]));
    const ghostRaidMap = new Map(ghostRaidAgg.map(r => [r.ghostId, r]));

    const entries: Array<{
      id: string;
      type: "player" | "ghost";
      name: string;
      raidsCompleted: number;
      highestPhase: number;
      totalRaidKills: number;
      _score: number;
    }> = [];

    for (const p of realPlayers) {
      const agg = raidMap.get(p.id);
      const raidsCompleted = Number(agg?.raidsCompleted ?? 0);
      const highestPhase = Number(agg?.maxPhase ?? 0);
      const totalRaidKills = Number(agg?.totalRaidKills ?? 0);
      entries.push({
        id: `player_${p.id}`,
        type: "player",
        name: p.name,
        raidsCompleted,
        highestPhase,
        totalRaidKills,
        _score: raidsCompleted * 1000 + highestPhase * 100 + totalRaidKills,
      });
    }

    for (const g of ghostPlayers) {
      const gAgg = ghostRaidMap.get(g.id);
      const raidsCompleted = Number(gAgg?.raidsCompleted ?? 0);
      const highestPhase = Number(gAgg?.maxPhase ?? 0);
      entries.push({
        id: `ghost_${g.id}`,
        type: "ghost",
        name: g.name,
        raidsCompleted,
        highestPhase,
        totalRaidKills: 0,
        _score: raidsCompleted * 1000 + highestPhase * 100,
      });
    }

    entries.sort((a, b) => b._score - a._score);

    const ranked = entries.slice(0, 100).map(({ _score, ...e }, i) => ({ ...e, rank: i + 1 }));
    const firstRealPlayer = realPlayers.length > 0 ? `player_${realPlayers[0].id}` : null;
    res.json({ entries: ranked, currentPlayerId: firstRealPlayer });
  } catch (err) {
    console.error("leaderboard/raids error", err);
    res.status(500).json({ error: "Failed to fetch raid leaderboard" });
  }
});

/**
 * GET /leaderboard/player/:characterId/profile
 * Returns full profile: zone kills, per-dungeon clears, equipped gear, computed stats.
 * characterId is the numeric row id (not prefixed with "player_").
 */
router.get("/leaderboard/player/:characterId/profile", async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId, 10);
    if (isNaN(characterId)) return res.status(400).json({ error: "Invalid character id" });

    const [playerRows, dungeonRuns, raidRuns] = await Promise.all([
      db.select().from(charactersTable).where(eq(charactersTable.id, characterId)).limit(1),
      db
        .select({
          dungeonId: dungeonRunsTable.dungeonId,
          difficulty: dungeonRunsTable.difficulty,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(dungeonRunsTable)
        .where(and(eq(dungeonRunsTable.characterId, characterId), eq(dungeonRunsTable.completed, true)))
        .groupBy(dungeonRunsTable.dungeonId, dungeonRunsTable.difficulty),
      db
        .select({
          raidId: raidRunsTable.raidId,
          difficulty: raidRunsTable.difficulty,
          count: sql<number>`count(*)`.as("count"),
          maxPhase: sql<number>`max(${raidRunsTable.currentPhase})`.as("max_phase"),
        })
        .from(raidRunsTable)
        .where(and(eq(raidRunsTable.characterId, characterId), eq(raidRunsTable.completed, true)))
        .groupBy(raidRunsTable.raidId, raidRunsTable.difficulty),
    ]);

    if (playerRows.length === 0) return res.status(404).json({ error: "Character not found" });
    const p = playerRows[0];

    // Zone kills
    const zoneKills = (p.zoneKills as Record<string, number> | null) ?? {};

    // Dungeon clears (completed only) with dungeon name lookup
    const dungeonClears = dungeonRuns.map(d => {
      const def = getDungeonById(d.dungeonId);
      return {
        dungeonId: d.dungeonId,
        dungeonName: def?.name ?? d.dungeonId,
        difficulty: d.difficulty,
        clearCount: Number(d.count),
      };
    });

    // Raid clears (completed only)
    const raidClears = raidRuns.map(r => ({
      raidId: r.raidId,
      difficulty: r.difficulty,
      clearCount: Number(r.count),
      maxPhase: Number(r.maxPhase),
    }));

    // Gear — full 18-slot grid including empty slots
    const gear = (p.gear as Record<string, unknown>) || {};
    const gearItems = resolveGearItems(gear);

    // Computed stats including HP
    const baseStats = p.baseStats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };
    const gearData = resolveGearStats(gear, p.level, baseStats);
    const aa = makeZeroAABonuses();
    const computedStats = computeStats({ level: p.level, ...baseStats, ...gearData, gearCritBonus: 0 }, aa);
    const maxHp = Math.floor(baseStats.stamina * 10 + 50 + (p.level - 1) * 15);

    return res.json({
      characterId,
      name: p.name,
      class: p.class,
      level: p.level,
      zoneKills,
      dungeonClears,
      raidClears,
      gear: gearItems,
      stats: {
        maxHp,
        attackRating: computedStats.attackRating,
        defenseRating: computedStats.defenseRating,
        mitigation: computedStats.mitigation,
        avoidance: computedStats.avoidance,
        critChance: computedStats.critChance,
        critBonus: computedStats.critBonus,
        haste: computedStats.haste,
        dps: computedStats.dps,
        totalPower: computedStats.totalPower,
      },
    });
  } catch (err) {
    console.error("leaderboard/player/profile error", err);
    return res.status(500).json({ error: "Failed to fetch player profile" });
  }
});

/**
 * GET /leaderboard/ghost/:ghostId/profile
 * Returns full profile for a ghost NPC including real gear, dungeon/raid clears, generation data.
 */
router.get("/leaderboard/ghost/:ghostId/profile", async (req, res) => {
  try {
    const ghostId = parseInt(req.params.ghostId, 10);
    if (isNaN(ghostId)) return res.status(400).json({ error: "Invalid ghost id" });

    const [ghostResults, dungeonClears, raidClears] = await Promise.all([
      db.select().from(worldPlayersTable).where(eq(worldPlayersTable.id, ghostId)).limit(1),
      db.select().from(ghostDungeonClearsTable).where(eq(ghostDungeonClearsTable.ghostId, ghostId)),
      db.select().from(ghostRaidClearsTable).where(eq(ghostRaidClearsTable.ghostId, ghostId)),
    ]);
    const ghostRows = ghostResults[0];
    if (!ghostRows) return res.status(404).json({ error: "Ghost not found" });
    const g = ghostRows;

    const baseStats = g.stats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };
    const gear = (g.gear as Record<string, unknown>) ?? {};
    const gearItems = resolveGearItems(gear);
    const gearScore = computeGearScore(
      Object.entries(gear).map(([slot, val]) => ({
        level: (val as Record<string, unknown>)?.level as number ?? 0,
        rarity: (val as Record<string, unknown>)?.rarity as string ?? "common",
        slot,
      })),
    );

    const gearData = resolveGearStats(gear, g.level, baseStats);
    const aa = makeZeroAABonuses();
    const computedStats = computeStats({ level: g.level, ...baseStats, ...gearData, gearCritBonus: 0 }, aa);
    const maxHp = Math.floor(baseStats.stamina * 10 + 50 + (g.level - 1) * 15);

    return res.json({
      characterId: ghostId,
      ghostId,
      name: g.name,
      class: g.class,
      race: g.race,
      level: g.level,
      zone: g.zone,
      killCount: g.killCount,
      bossKills: g.bossKills,
      generation: g.generation ?? 1,
      parentId: g.parentId ?? null,
      inheritedTraits: (g.inheritedTraits as string[]) ?? [],
      gearScore,
      zoneKills: {},
      dungeonClears: dungeonClears.map(d => ({
        dungeonId: d.dungeonId,
        bestDifficulty: d.bestDifficulty,
        clearCount: d.clearCount,
        lastClearedAt: d.lastClearedAt,
      })),
      raidClears: raidClears.map(r => ({
        raidId: r.raidId,
        maxPhase: r.maxPhase,
        clearCount: r.clearCount,
        lastClearedAt: r.lastClearedAt,
      })),
      gear: gearItems,
      stats: {
        maxHp,
        attackRating: computedStats.attackRating,
        defenseRating: computedStats.defenseRating,
        mitigation: computedStats.mitigation,
        avoidance: computedStats.avoidance,
        critChance: computedStats.critChance,
        critBonus: computedStats.critBonus,
        haste: computedStats.haste,
        dps: computedStats.dps,
        totalPower: computedStats.totalPower,
      },
    });
  } catch (err) {
    console.error("leaderboard/ghost/profile error", err);
    return res.status(500).json({ error: "Failed to fetch ghost profile" });
  }
});

/**
 * GET /leaderboard/ghosts/top-by-role
 * Returns top 5 ghosts per role (Tank/Healer/DPS) ranked by composite score.
 */
router.get("/leaderboard/ghosts/top-by-role", async (_req, res) => {
  try {
    const [ghostPlayers, ghostDungAgg] = await Promise.all([
      db.select().from(worldPlayersTable),
      db.select({
        ghostId: ghostDungeonClearsTable.ghostId,
        totalClears: sql<number>`sum(${ghostDungeonClearsTable.clearCount})`.as("total_clears"),
      }).from(ghostDungeonClearsTable).groupBy(ghostDungeonClearsTable.ghostId),
    ]);

    const dungMap = new Map(ghostDungAgg.map(d => [d.ghostId, Number(d.totalClears ?? 0)]));

    function ghostRole(archetype: string, cls: string): string {
      const archetypeLower = archetype.toLowerCase();
      const clsLower = cls.toLowerCase();
      if (archetypeLower === "fighter" && (clsLower.includes("guard") || clsLower.includes("brawl") || clsLower.includes("shadow") || clsLower.includes("paladin") || clsLower.includes("shadow knight"))) return "Tank";
      if (archetypeLower === "fighter") return "Tank";
      if (archetypeLower === "priest") return "Healer";
      return "DPS";
    }

    type GhostRoleEntry = {
      id: number; name: string; class: string; race: string; level: number;
      zone: string; killCount: number; bossKills: number; gearScore: number;
      dungeonClears: number; personality: string; role: string; generation: number;
      _score: number;
    };

    const tanks: GhostRoleEntry[] = [];
    const healers: GhostRoleEntry[] = [];
    const dps: GhostRoleEntry[] = [];

    for (const g of ghostPlayers) {
      const gear = (g.gear as Record<string, unknown>) ?? {};
      const gearScore = computeGearScore(
        Object.entries(gear).map(([slot, val]) => ({
          level: (val as Record<string, unknown>)?.level as number ?? 0,
          rarity: (val as Record<string, unknown>)?.rarity as string ?? "common",
          slot,
        })),
      );
      const dungeonClears = dungMap.get(g.id) ?? 0;
      const role = ghostRole(g.archetype, g.class);
      const score = gearScore * 2 + g.level * 50 + g.killCount * 0.1 + dungeonClears * 100;

      const entry: GhostRoleEntry = {
        id: g.id, name: g.name, class: g.class, race: g.race, level: g.level,
        zone: g.zone, killCount: g.killCount, bossKills: g.bossKills,
        gearScore, dungeonClears, personality: g.personality,
        role, generation: g.generation ?? 1, _score: score,
      };
      if (role === "Tank") tanks.push(entry);
      else if (role === "Healer") healers.push(entry);
      else dps.push(entry);
    }

    const top5 = (arr: GhostRoleEntry[]) =>
      arr.sort((a, b) => b._score - a._score).slice(0, 5).map(({ _score, ...e }) => e);

    return res.json({ tanks: top5(tanks), healers: top5(healers), dps: top5(dps) });
  } catch (err) {
    console.error("leaderboard/ghosts/top-by-role error", err);
    return res.status(500).json({ error: "Failed to fetch ghost role leaderboard" });
  }
});

export default router;
