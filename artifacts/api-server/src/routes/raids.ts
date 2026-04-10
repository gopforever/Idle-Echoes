import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { raidRunsTable, dungeonRunsTable, worldPlayersTable, worldEventsTable, recipesTable, knownRecipesTable } from "@workspace/db/schema";
import { upsertDungeonKillStats } from "../lib/dungeonProgress.js";
import { checkAndUnlockAchievements } from "./achievements.js";
import { eq, and, isNull } from "drizzle-orm";
import { getOrCreateCharacter } from "./character.js";
import { getItemById, ITEMS } from "../lib/gameData.js";
import { computeGearScore } from "../lib/eq2Formulas.js";
import { RAIDS, getRaidById, type RaidDefinition, type RaidPhase } from "../lib/raidData.js";
import { initPartyMember, fetchGhostInfo, awardGhostContributions, revivePartyOnFloorAdvance } from "../lib/partyEngine.js";
import type { PartyMember } from "../lib/partyEngine.js";
import { MASTER_RECIPES, TRADESKILL_CLASSES, generateOoakName } from "../lib/tradeskillData.js";
import type { TradeskillClass } from "../lib/tradeskillData.js";

// Class icon helper (mirrors dungeons.ts)
const CLASS_ICONS: Record<string, string> = {
  Guardian: "🛡️", Berserker: "⚔️", Monk: "👊", Bruiser: "💪",
  Paladin: "✨", Shadowknight: "💀", Templar: "🙏", Inquisitor: "⚖️",
  Mystic: "🌙", Defiler: "🕸️", Warden: "🌿", Fury: "🌪️",
  Troubador: "🎵", Dirge: "🎶", Assassin: "🗡️", Ranger: "🏹",
  Brigand: "🪙", Swashbuckler: "⚓", Wizard: "🔥", Warlock: "💜",
  Conjuror: "🌀", Necromancer: "☠️", Illusionist: "🔮", Coercer: "🌊",
};
function getClassIcon(c: string) { return CLASS_ICONS[c] ?? "⚔️"; }

// Raids don't have a maxLevel field; use this as the level window above minLevel for loot generation.
const RAID_LEVEL_RANGE = 10;

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function archetypeToRole(archetype: string): "Tank" | "Healer" | "DPS" {
  const a = archetype.toLowerCase();
  if (a === "fighter") return "Tank";
  if (a === "priest") return "Healer";
  return "DPS";
}

function formatRaidRun(run: typeof raidRunsTable.$inferSelect) {
  return {
    ...run,
    completed: run.completed ?? run.status === "completed",
    abandoned: run.abandoned ?? run.status === "abandoned",
    party: (run.party as PartyMember[]) ?? [],
    lootEarned: (run.lootEarned as string[]) ?? [],
  };
}

function buildScaledRaidBoss(raid: RaidDefinition, playerLevel: number, phaseDef?: RaidPhase): Record<string, unknown> {
  const levelFactor = Math.max(1.0, playerLevel / raid.minLevel);
  // Cap damage scaling more conservatively so players aren't one-shot
  const dmgLevelFactor = Math.max(1.0, Math.min(1.5, playerLevel / raid.minLevel));
  const baseHp = 50000;
  const baseDmg = 150;
  const phase = phaseDef ?? raid.phases[0];
  const dmgMult = phase.damageMultiplier ?? 1.0;
  const hpMult = phase.hpMultiplier ?? 1.0;
  return {
    id: raid.bossId,
    name: `${raid.bossName} (${phase.name})`,
    level: raid.minLevel + 5,
    maxHp: Math.round(baseHp * levelFactor * hpMult),
    hp: Math.round(baseHp * levelFactor * hpMult),
    damageMin: Math.round(baseDmg * dmgLevelFactor * 0.8 * dmgMult),
    damageMax: Math.round(baseDmg * dmgLevelFactor * 1.2 * dmgMult),
    // Combat formula fields — required to prevent NaN in calculateEnemyDamage / calculatePlayerDamage
    attackRating: Math.round(600 * levelFactor),
    defenseRating: Math.round(480 * levelFactor),
    mitigation: 50,   // %-based; capped at 75 in formula → ~50% melee damage reduction
    avoidance: 15,    // % avoidance roll against player attacks
    resistances: {},  // no elemental resistances by default; phases may override
    xpReward: Math.round(5000 * levelFactor),
    goldMin: Math.round(500 * levelFactor),
    goldMax: Math.round(1000 * levelFactor),
    isBoss: true,
    isRaidBoss: true,
    phaseNumber: phase.phase,
    phaseAbilities: phase.abilities,
  };
}

function generateRaidLoot(raidId: string, playerLevel: number): string[] {
  const raid = getRaidById(raidId);
  const tier = raid?.lootTier ?? "legendary";

  const raidMinLevel = raid?.minLevel ?? playerLevel;
  // Widen the search window so there are always items to draw from
  const WIDE_RANGE = RAID_LEVEL_RANGE * 2;
  const clampedLevel = Math.min(Math.max(playerLevel, raidMinLevel), raidMinLevel + RAID_LEVEL_RANGE);

  const pool = ITEMS.filter(item => {
    if (item.type === "material" || item.type === "consumable" || item.type === "quest") return false;
    if (Math.abs(item.level - clampedLevel) > WIDE_RANGE) return false;
    return true;
  });

  const legendaryPool = pool.filter(i => i.rarity === "legendary" || i.rarity === "fabled" || i.rarity === "mythical");
  const rarePool      = pool.filter(i => i.rarity === "rare");
  const fallbackPool  = pool.length > 0 ? pool : ITEMS.filter(i => i.type !== "material" && i.type !== "consumable" && i.type !== "quest");

  const pick = (from: typeof pool): string | null => {
    const src = from.length > 0 ? from : fallbackPool;
    const item = src[Math.floor(Math.random() * src.length)];
    return item?.id ?? null;
  };

  const loot: string[] = [];

  // Guarantee at least 3 legendary/fabled drops — the whole point of raiding
  const guaranteedLegCount = tier === "mythical" ? 4 : 3;
  for (let i = 0; i < guaranteedLegCount; i++) {
    const id = pick(legendaryPool);
    if (id) loot.push(id);
  }

  // Add 2-4 more rare/legendary items for depth
  const bonusCount = 2 + Math.floor(Math.random() * 3);
  const bonusPool = [...legendaryPool, ...rarePool];
  for (let i = 0; i < bonusCount; i++) {
    const id = pick(bonusPool);
    if (id) loot.push(id);
  }

  // ── Phase 2: Boss crafting material drops ─────────────────────────────────
  // Each raid boss guarantees its unique crafting material on kill.
  const RAID_BOSS_MATERIALS: Record<string, string> = {
    harla_dar: "prismatic_dragon_scale",
    mayong_mistmoore: "vampire_lord_fang",
    trakanon: "plague_dragon_spine",
  };
  const bossMaterial = RAID_BOSS_MATERIALS[raidId];
  if (bossMaterial) loot.push(bossMaterial);

  return loot;
}

// ── Phase 3: Recipe drops from raid boss kills ────────────────────────────────

interface RaidRecipeDrop {
  masterRecipe: { id: number; name: string; tier: string } | null;
  ooakRecipe: { id: number; name: string; tier: string } | null;
}

/**
 * After a raid boss kill, roll for Master and OoaK recipe drops.
 * Master recipes: 15% chance, thematically tied to the raid boss.
 * OoaK recipes:   2% chance, procedurally named and unique.
 * Side effects: inserts into recipesTable (for OoaK) and knownRecipesTable.
 */
async function awardRaidRecipeDrops(
  raidId: string,
  characterId: number,
  tick: number,
  characterName?: string,
  zone?: string,
): Promise<RaidRecipeDrop> {
  const result: RaidRecipeDrop = { masterRecipe: null, ooakRecipe: null };

  // ─ Master recipe drop (15% chance) ──────────────────────────────────────────
  if (Math.random() < 0.15) {
    const candidates = MASTER_RECIPES.filter(r => r.raidBossId === raidId);
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      // Find the DB recipe (seeded on startup)
      const [dbRecipe] = await db
        .select({ id: recipesTable.id, name: recipesTable.name, tier: recipesTable.tier })
        .from(recipesTable)
        .where(and(eq(recipesTable.name, picked.name), eq(recipesTable.tier, "master")))
        .limit(1);
      if (dbRecipe) {
        // Only grant if not already known
        const [alreadyKnown] = await db
          .select()
          .from(knownRecipesTable)
          .where(and(eq(knownRecipesTable.characterId, characterId), eq(knownRecipesTable.recipeId, String(dbRecipe.id))))
          .limit(1);
        if (!alreadyKnown) {
          await db.insert(knownRecipesTable).values({ characterId, recipeId: String(dbRecipe.id) });
        }
        result.masterRecipe = { id: dbRecipe.id, name: dbRecipe.name, tier: dbRecipe.tier };
      }
    }
  }

  // ─ OoaK recipe drop (2% chance) ─────────────────────────────────────────────
  if (Math.random() < 0.02) {
    const tsClass = TRADESKILL_CLASSES[Math.floor(Math.random() * TRADESKILL_CLASSES.length)] as TradeskillClass;
    const ooakName = generateOoakName(tsClass);

    // Build a legendary output for the OoaK recipe
    const ooakOutput = {
      name: ooakName,
      description: `A legendary One-of-a-Kind creation — ${ooakName}. Only one may ever exist.`,
      type: "weapon" as const,
      slot: "primary",
      rarity: "legendary" as const,
      stats: { weaponDamageMin: 300, weaponDamageMax: 500, attackRating: 250, strength: 80, critChance: 20 },
      sellPrice: 50000,
      quantity: 1,
      xpGained: 5000,
      spriteId: "weapon_sword",
    };

    const [insertedOoak] = await db.insert(recipesTable).values({
      name: ooakName,
      tradeskillClass: tsClass,
      tier: "master",
      minSkill: 80,
      minLevel: 60,
      craftTimeSeconds: 3600,
      ingredients: [
        { itemId: "prismatic_dragon_scale", quantity: 1 },
        { itemId: "vampire_lord_fang", quantity: 1 },
        { itemId: "plague_dragon_spine", quantity: 1 },
      ],
      output: ooakOutput,
      acquisitionType: "raid",
      vendorCost: null,
      isOoak: true,
      claimedBy: null,
    }).returning();

    if (insertedOoak) {
      // Atomically claim for the recipient (first-get binding). Verify the update succeeded.
      const [claimed] = await db
        .update(recipesTable)
        .set({ claimedBy: String(characterId) })
        .where(and(eq(recipesTable.id, insertedOoak.id), isNull(recipesTable.claimedBy)))
        .returning({ id: recipesTable.id });

      if (claimed) {
        await db.insert(knownRecipesTable).values({ characterId, recipeId: String(insertedOoak.id) });

        // Emit a world event for this legendary find
        const raid = getRaidById(raidId);
        await db.insert(worldEventsTable).values({
          type: "ooak_recipe_drop",
          message: `${characterName ?? "An adventurer"} has discovered the legendary recipe [${ooakName}] in ${raid?.name ?? raidId}!`,
          playerName: characterName ?? "Unknown",
          zone: zone ?? raid?.zone ?? "Unknown",
          importance: 8,
          tick,
        }).catch(() => {});

        result.ooakRecipe = { id: insertedOoak.id, name: insertedOoak.name, tier: insertedOoak.tier };
      }
    }
  }

  return result;
}

// ─── GET /api/raids ───────────────────────────────────────────────────────────
router.get("/raids", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, string>) || {};
    const gearScore = computeGearScore(gear);

    const raidSummaries = RAIDS.map(r => ({
      id: r.id,
      name: r.name,
      zone: r.zone,
      lore: r.lore,
      description: r.description,
      minLevel: r.minLevel,
      minGearScore: r.minGearScore,
      bossName: r.bossName,
      spriteId: r.spriteId,
      minPartySize: r.minPartySize,
      maxPartySize: r.maxPartySize,
      lootTier: r.lootTier,
      phaseCount: r.phases.length,
      phases: r.phases.map(p => ({
        phase: p.phase,
        name: p.name,
        description: p.description,
        hpThreshold: p.hpThreshold,
        abilities: p.abilities,
      })),
      unlocked: gearScore >= r.minGearScore && character.level >= r.minLevel,
      gsRequired: r.minGearScore,
    }));

    return res.json({ raids: raidSummaries, playerGearScore: gearScore, playerLevel: character.level });
  } catch (err) {
    req.log.error({ err }, "Error fetching raids");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/raids/party-suggestions ────────────────────────────────────────
router.get("/raids/party-suggestions", async (req, res) => {
  try {
    const { raidId } = req.query as { raidId?: string };
    const raid = raidId ? getRaidById(raidId) : null;
    const minLevel = raid?.minLevel ?? 50;

    const ghosts = await db
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

    const suggestions = ghosts.map(g => ({
      ...g,
      role: archetypeToRole(g.archetype),
      levelOk: g.level >= minLevel - 5,
      classIcon: getClassIcon(g.class),
    })).sort((a, b) => b.level - a.level).slice(0, 20);

    return res.json({ suggestions });
  } catch (err) {
    req.log.error({ err }, "Error fetching raid party suggestions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/raids/:raidId/start ───────────────────────────────────────────
router.post("/raids/:raidId/start", async (req, res) => {
  try {
    const raid = getRaidById(req.params.raidId);
    if (!raid) return res.status(404).json({ error: "Raid not found" });

    const { ghostIds = [] } = req.body as { ghostIds?: number[] };
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, string>) || {};
    const gearScore = computeGearScore(gear);

    if (gearScore < raid.minGearScore) {
      return res.status(400).json({
        error: `Gear Score too low for this raid`,
        yourGS: gearScore,
        required: raid.minGearScore,
      });
    }

    if (character.level < raid.minLevel) {
      return res.status(400).json({
        error: `You must be at least level ${raid.minLevel} to enter ${raid.name}`,
        yourLevel: character.level,
        required: raid.minLevel,
      });
    }

    if (ghostIds.length < raid.minPartySize) {
      return res.status(400).json({
        error: `${raid.name} requires at least ${raid.minPartySize} ghost party members`,
        provided: ghostIds.length,
        required: raid.minPartySize,
      });
    }

    if (ghostIds.length > raid.maxPartySize) {
      return res.status(400).json({
        error: `${raid.name} allows at most ${raid.maxPartySize} ghost party members`,
        provided: ghostIds.length,
        max: raid.maxPartySize,
      });
    }

    const [activeRaid] = await db.select().from(raidRunsTable).where(
      and(
        eq(raidRunsTable.characterId, character.id),
        eq(raidRunsTable.status, "active"),
      )
    ).limit(1);
    if (activeRaid) {
      const STALE_MS = 24 * 60 * 60 * 1000;
      const isStale = Date.now() - new Date(activeRaid.startedAt).getTime() > STALE_MS;
      if (isStale) {
        await db.update(raidRunsTable)
          .set({ status: "abandoned", abandoned: true })
          .where(eq(raidRunsTable.id, activeRaid.id));
      } else {
        return res.status(400).json({ error: "You already have an active raid run", run: formatRaidRun(activeRaid) });
      }
    }

    const [activeDungeon] = await db.select().from(dungeonRunsTable).where(
      and(
        eq(dungeonRunsTable.characterId, character.id),
        eq(dungeonRunsTable.status, "active"),
      )
    ).limit(1);
    if (activeDungeon) return res.status(400).json({ error: "You already have an active dungeon run" });

    const cappedGhostIds = ghostIds.slice(0, raid.maxPartySize);
    const ghosts = await fetchGhostInfo(cappedGhostIds);
    const validIds = ghosts.map(g => g.id);
    const invalidIds = cappedGhostIds.filter(id => !validIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Ghost IDs not found: ${invalidIds.join(", ")}` });
    }
    const party: PartyMember[] = ghosts.map(g => initPartyMember(g.id, g.level));

    const scaledBoss = buildScaledRaidBoss(raid, character.level);

    const [run] = await db.insert(raidRunsTable).values({
      characterId: character.id,
      raidId: raid.id,
      difficulty: "normal",
      currentPhase: 1,
      totalPhases: raid.phases.length,
      bossDefeated: false,
      status: "active",
      completed: false,
      abandoned: false,
      lootEarned: [],
      scaledBoss,
      party,
    }).returning();

    return res.json({
      success: true,
      run: formatRaidRun(run),
      raid: { id: raid.id, name: raid.name, bossName: raid.bossName, phases: raid.phases.length },
      scaledBoss,
      party,
      message: `You have entered ${raid.name}. Phase 1: ${raid.phases[0].name}`,
    });
  } catch (err) {
    req.log.error({ err }, "Error starting raid run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/raids/run/current ───────────────────────────────────────────────
router.get("/raids/run/current", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [run] = await db.select().from(raidRunsTable).where(
      and(
        eq(raidRunsTable.characterId, character.id),
        eq(raidRunsTable.status, "active"),
      )
    ).limit(1);

    if (!run) return res.json({ active: false });

    const raid = getRaidById(run.raidId);
    const currentPhase = raid?.phases.find(p => p.phase === run.currentPhase) ?? null;
    const nextPhase = raid?.phases.find(p => p.phase === run.currentPhase + 1) ?? null;

    const party = (run.party as PartyMember[]) ?? [];
    const ghostIds = party.map(m => m.ghostId);
    const ghosts = ghostIds.length > 0 ? await fetchGhostInfo(ghostIds) : [];
    const partyWithInfo = party.map(m => {
      const ghost = ghosts.find(g => g.id === m.ghostId) ?? null;
      return {
        ...m,
        ghost,
        role: ghost ? archetypeToRole(ghost.archetype) : "DPS",
        classIcon: ghost ? getClassIcon(ghost.class) : "⚔️",
      };
    });

    return res.json({
      active: true,
      run: formatRaidRun(run),
      raid: raid ? { id: raid.id, name: raid.name, bossName: raid.bossName, zone: raid.zone, totalPhases: raid.phases.length } : null,
      currentPhase,
      nextPhase,
      scaledBoss: run.scaledBoss ?? null,
      party: partyWithInfo,
      bossDefeated: run.bossDefeated,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting current raid run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/raids/run/phase-advance ────────────────────────────────────────
router.post("/raids/run/phase-advance", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [run] = await db.select().from(raidRunsTable).where(
      and(
        eq(raidRunsTable.characterId, character.id),
        eq(raidRunsTable.status, "active"),
      )
    ).limit(1);
    if (!run) return res.status(400).json({ error: "No active raid run" });

    const raid = getRaidById(run.raidId);
    if (!raid) return res.status(400).json({ error: "Raid definition not found" });

    // Require the current phase boss to be defeated before advancing
    if (!run.bossDefeated) {
      return res.status(400).json({ error: "You must defeat the boss before advancing to the next phase." });
    }

    const isFinalPhase = run.currentPhase >= raid.phases.length;

    const currentParty = (run.party as PartyMember[]) ?? [];

    if (isFinalPhase) {
      const loot = generateRaidLoot(run.raidId, character.level);
      const [completed] = await db.update(raidRunsTable).set({
        status: "completed",
        completed: true,
        bossDefeated: true,
        lootEarned: loot,
        completedAt: new Date(),
      }).where(eq(raidRunsTable.id, run.id)).returning();

      await upsertDungeonKillStats({
        characterId: character.id,
        dungeonOrRaidId: run.raidId,
        isRaid: true,
        mainBossKills: 1,
        completed: true,
      });

      await checkAndUnlockAchievements(character.id);

      await awardGhostContributions(currentParty);

      // ── Phase 3: Award Master / OoaK recipe drops ──────────────────────────
      const recipeDrop = await awardRaidRecipeDrops(
        run.raidId, character.id, 0, character.name, raid.zone,
      ).catch(() => ({ masterRecipe: null, ooakRecipe: null }));

      const goldEarned = loot.reduce((sum: number, id: string) => {
        const it = getItemById(id);
        return sum + ((it as unknown as { sellPrice?: number } | null)?.sellPrice ?? 0);
      }, 0);
      const xpEarned = Math.round(10000 + character.level * 200);

      const ghostIds = currentParty.map(m => m.ghostId);
      const ghosts = ghostIds.length > 0 ? await fetchGhostInfo(ghostIds) : [];
      const partyWithInfo = currentParty.map(m => ({
        ...m,
        ghost: ghosts.find(g => g.id === m.ghostId) ?? null,
        role: ghosts.find(g => g.id === m.ghostId) ? archetypeToRole(ghosts.find(g => g.id === m.ghostId)!.archetype) : "DPS",
      }));

      return res.json({
        success: true,
        run: formatRaidRun(completed),
        completed: true,
        lootEarned: loot,
        xpEarned,
        goldEarned,
        party: partyWithInfo,
        recipeDrop,
        message: `${raid.bossName} defeated! ${raid.name} conquered!`,
      });
    }

    const revivedParty = revivePartyOnFloorAdvance(currentParty);
    const newPhase = run.currentPhase + 1;
    const nextPhaseDef = raid.phases.find(p => p.phase === newPhase)!;

    // Rebuild scaled boss with next phase's multipliers so combat gets harder
    const nextScaledBoss = buildScaledRaidBoss(raid, character.level, nextPhaseDef);

    const [updated] = await db.update(raidRunsTable).set({
      currentPhase: newPhase,
      bossDefeated: false,
      scaledBoss: nextScaledBoss,
      party: revivedParty,
    }).where(eq(raidRunsTable.id, run.id)).returning();

    return res.json({
      success: true,
      run: formatRaidRun(updated),
      completed: false,
      newPhase,
      nextPhase: nextPhaseDef,
      party: revivedParty,
      message: `Phase ${newPhase} begins: ${nextPhaseDef.name}`,
    });
  } catch (err) {
    req.log.error({ err }, "Error advancing raid phase");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/raids/run/abandon ─────────────────────────────────────────────
router.post("/raids/run/abandon", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [updated] = await db.update(raidRunsTable)
      .set({ status: "abandoned", abandoned: true, completed: false })
      .where(
        and(
          eq(raidRunsTable.characterId, character.id),
          eq(raidRunsTable.status, "active"),
        )
      ).returning();

    if (!updated) return res.status(400).json({ error: "No active raid run to abandon" });
    return res.json({ success: true, run: formatRaidRun(updated), abandoned: true, message: "Raid run abandoned." });
  } catch (err) {
    req.log.error({ err }, "Error abandoning raid run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/raids/active ─────────────────────────────────────────────────
router.delete("/raids/active", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [updated] = await db.update(raidRunsTable)
      .set({ status: "abandoned", abandoned: true, completed: false })
      .where(
        and(
          eq(raidRunsTable.characterId, character.id),
          eq(raidRunsTable.status, "active"),
        )
      ).returning();

    if (!updated) return res.status(404).json({ error: "No active raid run found" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error abandoning active raid run");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/raids/:raidId/party ────────────────────────────────────────────
router.post("/raids/:raidId/party", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const raid = getRaidById(req.params.raidId);
    if (!raid) return res.status(404).json({ error: "Raid not found" });

    const { ghostIds } = req.body as { ghostIds: number[] };

    if (!Array.isArray(ghostIds) || ghostIds.length < raid.minPartySize || ghostIds.length > raid.maxPartySize) {
      return res.status(400).json({ error: `ghostIds must be an array of ${raid.minPartySize}–${raid.maxPartySize} ghost IDs` });
    }

    const [run] = await db.select().from(raidRunsTable).where(
      and(
        eq(raidRunsTable.characterId, character.id),
        eq(raidRunsTable.status, "active"),
      )
    ).limit(1);
    if (!run) return res.status(400).json({ error: "No active raid run" });

    const ghosts = await fetchGhostInfo(ghostIds);
    const validIds = ghosts.map(g => g.id);
    const invalidIds = ghostIds.filter(id => !validIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Ghost IDs not found: ${invalidIds.join(", ")}` });
    }
    const party: PartyMember[] = ghosts.map(g => initPartyMember(g.id, g.level));

    const [updated] = await db.update(raidRunsTable)
      .set({ party })
      .where(eq(raidRunsTable.id, run.id))
      .returning();

    return res.json({ success: true, party, run: formatRaidRun(updated) });
  } catch (err) {
    req.log.error({ err }, "Error setting raid party");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
