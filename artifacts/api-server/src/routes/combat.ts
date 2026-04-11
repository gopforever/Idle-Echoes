import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { charactersTable, combatStateTable, combatLogTable, heroicStateTable, factionsTable, aaPointsTable, dungeonRunsTable, raidRunsTable, inventoryTable, bossEncountersTable, skillsTable, oneOfAKindCraftedTable } from "@workspace/db/schema";
import { eq, desc, gt, and } from "drizzle-orm";
import { computeStats, calculatePlayerDamage, calculateEnemyDamage, calculateXpGain, xpForLevel, applyAABonuses, type SkillLevels } from "../lib/eq2Formulas.js";
import { getEnemyById, getItemById, ENEMIES, CRAFTING_RECIPES, getOneOfAKindScrollMap, type Enemy, type EnemyAbility } from "../lib/gameData.js";
import { CLASSES, HEROIC_CHAINS, ALL_AA_TABS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { applySkillXp } from "../lib/skillXp.js";
import type { StatusEffect } from "@workspace/db/schema";
import { progressKillObjectives, progressFactionObjectives } from "../lib/questProgress.js";
import { generateBossNarration, generateBossClosingLine, generateNamedItem, invalidateBossNarrationCache, type BossEncounterContext } from "./gm.js";
import { rollLootDrop, serializeForDb } from "../lib/proceduralItems.js";
import { checkAndUnlockAchievements } from "./achievements.js";
import { progressDungeonKill } from "../lib/dungeonProgress.js";
import { recordBestiaryKill } from "./bestiary.js";
import { calculateContributions, applyPartyDamage, updateGhostStats, fetchGhostInfo } from "../lib/partyEngine.js";
import type { PartyMember } from "../lib/partyEngine.js";

const GRUDGE_ENRAGE_DURATION_TICKS = 10;

const ZONE_QUALITY_RANGES: Record<string, [number, number]> = {
  "Commonlands": [15, 45],
  "Antonica": [20, 50],
  "The Thundering Steppes": [30, 60],
  "Enchanted Lands": [35, 65],
  "Zek, the Orcish Wastes": [35, 65],
  "Nektulos Forest": [35, 65],
  "Everfrost Peaks": [50, 80],
  "Lavastorm Mountains": [60, 90],
  "The Feerrott": [55, 85],
  "Rivervale": [25, 55],
};
const DEFAULT_QUALITY_RANGE: [number, number] = [25, 60];

function rollZoneQuality(zone: string): number {
  const [min, max] = ZONE_QUALITY_RANGES[zone] ?? DEFAULT_QUALITY_RANGE;
  const base = min + Math.floor(Math.random() * (max - min + 1));
  const jitter = Math.floor(Math.random() * 11) - 5;
  return Math.max(1, Math.min(100, base + jitter));
}

/** Structured float event returned per tick so the frontend can render per-event floaters */
export interface FloatEvent {
  value: number;
  type: "hit" | "crit" | "enemy" | "enemyCrit" | "heal" | "miss" | "resist" | "dot";
}

const router: IRouter = Router();

// Flat list of all AA node definitions for quick lookup
const ALL_AA_NODES = ALL_AA_TABS.flatMap(tab => tab.nodes);

async function getOrCreateCombatState(characterId: number) {
  const states = await db.select().from(combatStateTable).where(eq(combatStateTable.characterId, characterId)).limit(1);
  if (states.length > 0) return states[0];
  const [state] = await db.insert(combatStateTable).values({
    characterId, active: false, enemyCurrentHp: 0, playerCurrentHp: 100, playerCurrentPower: 50, tick: 0, autoLoot: true,
  }).returning();
  return state;
}

function formatCombatState(state: typeof combatStateTable.$inferSelect, extraFields?: Record<string, unknown>) {
  const totalPlayerDamage = state.totalPlayerDamage ?? 0;
  const combatStartMs = state.combatStartMs ?? null;
  const fightDps = (combatStartMs && totalPlayerDamage > 0)
    ? Math.round(totalPlayerDamage / Math.max(1, (Date.now() - combatStartMs) / 1000))
    : 0;
  return {
    active: state.active,
    enemy: state.enemyData || undefined,
    enemyCurrentHp: state.enemyCurrentHp,
    playerCurrentHp: state.playerCurrentHp,
    playerCurrentPower: state.playerCurrentPower,
    tick: state.tick,
    autoLoot: state.autoLoot,
    lastTickMs: state.lastTickMs || undefined,
    playerStatusEffects: (state.playerStatusEffects as StatusEffect[] | null) ?? [],
    enemyStatusEffects: (state.enemyStatusEffects as StatusEffect[] | null) ?? [],
    heroicProgress: 0,
    heroicChain: 0,
    totalPlayerDamage,
    combatStartMs,
    fightDps,
    ...extraFields,
  };
}

function getChainForArchetype(archetype: string) {
  if (archetype === "Mage") return HEROIC_CHAINS.find(c => c.id === "mage_chain")!;
  if (archetype === "Priest") return HEROIC_CHAINS.find(c => c.id === "divine_chain")!;
  if (archetype === "Scout") return HEROIC_CHAINS.find(c => c.id === "scout_chain")!;
  return HEROIC_CHAINS.find(c => c.id === "warrior_chain")!;
}

function computeGearStats(gear: Record<string, unknown>, baseStats: { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number; }, level: number) {
  let gearAttackRating = 0, gearDefenseRating = 0, gearMitigation = 0;
  let gearHaste = 0, gearCritChance = 0, gearWeaponDamageMin = 0, gearWeaponDamageMax = 0, gearWeaponDelay = 2.0;
  let gearHealth = 0, gearPower = 0, hasWeapon = false;
  let gearStrength = 0, gearAgility = 0, gearStamina = 0;
  let gearIntelligence = 0, gearWisdom = 0, gearCharisma = 0;
  let gearResistPierce = 0, gearResistSlash = 0, gearResistCrush = 0;
  let gearResistHeat = 0, gearResistCold = 0, gearResistDivine = 0, gearResistMagic = 0;

  for (const slotValue of Object.values(gear)) {
    let s: Record<string, number> | null = null;
    if (typeof slotValue === "string") {
      // Static item stored as itemId string
      const item = getItemById(slotValue);
      if (item?.stats) s = item.stats as Record<string, number>;
    } else if (slotValue && typeof slotValue === "object") {
      // Procedural item stored as full object
      const obj = slotValue as Record<string, unknown>;
      if (obj.stats && typeof obj.stats === "object") {
        s = obj.stats as Record<string, number>;
      }
    }
    if (!s) continue;
    gearAttackRating += s.attackRating || 0;
    gearDefenseRating += s.defenseRating || 0;
    gearMitigation += s.mitigation || 0;
    gearHaste += s.haste || 0;
    gearCritChance += s.critChance || 0;
    gearHealth += s.health || 0;
    gearPower += s.power || 0;
    gearStrength     += s.strength     || 0;
    gearAgility      += s.agility      || 0;
    gearStamina      += s.stamina      || 0;
    gearIntelligence += s.intelligence || 0;
    gearWisdom       += s.wisdom       || 0;
    gearCharisma     += s.charisma     || 0;
    gearResistPierce += s.resistPierce || 0;
    gearResistSlash  += s.resistSlash  || 0;
    gearResistCrush  += s.resistCrush  || 0;
    gearResistHeat   += s.resistHeat   || 0;
    gearResistCold   += s.resistCold   || 0;
    gearResistDivine += s.resistDivine || 0;
    gearResistMagic  += s.resistMagic  || 0;
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
  return { gearAttackRating, gearDefenseRating, gearMitigation, gearHaste, gearCritChance, gearWeaponDamageMin, gearWeaponDamageMax, gearWeaponDelay, gearHealth, gearPower, gearStrength, gearAgility, gearStamina, gearIntelligence, gearWisdom, gearCharisma, gearResistPierce, gearResistSlash, gearResistCrush, gearResistHeat, gearResistCold, gearResistDivine, gearResistMagic };
}

/**
 * Map enemy creature type to a default physical damage type for auto-attacks.
 * Humanoids and dragons use slash; beasts use pierce (claws/fangs);
 * undead and constructs use crush (bones/metal); elementals deal magic damage.
 */
function getEnemyAutoAttackDamageType(enemy: Pick<Enemy, "type">): string {
  switch (enemy.type) {
    case "beast":     return "pierce";
    case "undead":    return "crush";
    case "construct": return "crush";
    case "elemental": return "magic";
    default:          return "slash"; // humanoid, dragon
  }
}

/** Check if an enemy ability should trigger this tick (non-proc abilities only) */
function shouldEnemyAbilityFirePassive(
  ability: EnemyAbility,
  tick: number,
  enemyHp: number,
  enemyMaxHp: number,
  cooldowns: Record<string, number>,
): boolean {
  if (ability.triggerType === "on_hit_proc") return false; // handled separately
  const cd = cooldowns[ability.id] ?? 0;
  if (cd > 0) return false;

  const hpPct = (enemyHp / enemyMaxHp) * 100;

  switch (ability.triggerType) {
    case "every_n_ticks":
      return tick > 0 && tick % ability.triggerValue === 0;
    case "percent_hp":
      return hpPct <= ability.triggerValue;
    case "once_at_hp":
      return hpPct <= ability.triggerValue;
    default:
      return false;
  }
}

/** Check if an on_hit_proc ability should trigger after enemy lands a hit */
function shouldOnHitProcFire(
  ability: EnemyAbility,
  cooldowns: Record<string, number>,
): boolean {
  if (ability.triggerType !== "on_hit_proc") return false;
  const cd = cooldowns[ability.id] ?? 0;
  if (cd > 0) return false;
  return Math.random() * 100 < ability.triggerValue;
}

router.get("/combat/state", async (req, res) => {
  try {
    const characterId = req.characterId;
    res.json(formatCombatState(await getOrCreateCombatState(characterId)));
  } catch (err) {
    req.log.error({ err }, "Error getting combat state");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/combat/start", async (req, res) => {
  try {
    const { enemyId } = req.body;

    // Check if there's an active dungeon run — if so, use pre-scaled enemy stats
    // instead of base game data so difficulty multipliers actually affect combat.
    const character = await getOrCreateCharacter(req.characterId);
    let enemy: Enemy | null = null;

    const [activeDungeonRun] = await db.select().from(dungeonRunsTable).where(
      and(eq(dungeonRunsTable.characterId, character.id), eq(dungeonRunsTable.status, "active"))
    ).limit(1);

    if (activeDungeonRun) {
      const scaledList = (activeDungeonRun.scaledEnemies as Array<{ id: string; enemy: Record<string, unknown> }>) ?? [];
      const isDungeonEnemy = scaledList.some(e => e.id === enemyId);

      if (isDungeonEnemy) {
        // Block re-engagement of already-killed dungeon enemies (anti-farm guard)
        const remaining = (activeDungeonRun.currentFloorEnemies as string[]) ?? [];
        if (remaining.length > 0 && !remaining.includes(enemyId)) {
          return res.status(400).json({ error: "That enemy has already been defeated in this dungeon floor." });
        }
        const match = scaledList.find(e => e.id === enemyId);
        if (match) {
          enemy = match.enemy as unknown as Enemy;
        }
      }
      // Zone enemies (not in scaledEnemies) fall through to base game data below
    }

    // Check if there's an active raid run — load scaled raid boss from raid_runs
    if (!activeDungeonRun) {
      const [activeRaidRun] = await db.select().from(raidRunsTable).where(
        and(eq(raidRunsTable.characterId, character.id), eq(raidRunsTable.status, "active"))
      ).limit(1);

      if (activeRaidRun) {
        const scaledBoss = activeRaidRun.scaledBoss as Record<string, unknown> | null;
        if (scaledBoss && scaledBoss.id === enemyId) {
          enemy = scaledBoss as unknown as Enemy;
        }
      }
    }

    // Fallback to base game data for non-dungeon enemies
    if (!enemy) enemy = getEnemyById(enemyId) ?? null;
    if (!enemy) return res.status(404).json({ error: "Enemy not found" });

    // Cancel meditation and advance lastRegenAt so in-combat time is never credited
    await db.update(charactersTable).set({ isMeditating: false, lastRegenAt: new Date() }).where(eq(charactersTable.id, character.id));

    const characterId = character.id;
    const state = await getOrCreateCombatState(characterId);
    await db.delete(combatLogTable).where(eq(combatLogTable.characterId, characterId));

    const [updated] = await db.update(combatStateTable).set({
      active: true, enemyId: enemy.id,
      enemyData: { ...enemy, hp: enemy.maxHp, maxHp: enemy.maxHp } as Record<string, unknown>,
      enemyCurrentHp: enemy.maxHp, playerCurrentHp: character.health,
      playerCurrentPower: character.power, tick: 0, lastTickMs: Date.now(),
      playerStatusEffects: [], enemyStatusEffects: [], enemyAbilityCooldowns: {},
      totalPlayerDamage: 0, combatStartMs: Date.now(),
      updatedAt: new Date(),
    }).where(eq(combatStateTable.id, state.id)).returning();

    await db.insert(combatLogTable).values({ characterId, tick: 0, message: `⚔️ You engage ${enemy.name}!`, type: "info" });
    if (enemy.isBoss) {
      await db.insert(combatLogTable).values({ characterId, tick: 0, message: `⚠️ BOSS ENCOUNTER! ${enemy.name} is a formidable foe — watch for special abilities!`, type: "info" });

      // Load encounter history for this player + boss
      const [existingEncounter] = await db.select().from(bossEncountersTable)
        .where(and(eq(bossEncountersTable.playerId, character.id), eq(bossEncountersTable.bossId, enemy.id)))
        .limit(1);

      const encounterCtx: BossEncounterContext = existingEncounter
        ? { playerKills: existingEncounter.playerKills, bossKills: existingEncounter.bossKills, grudgeLevel: existingEncounter.grudgeLevel, lastKillingAbility: existingEncounter.lastKillingAbility, personality: enemy.personality }
        : { playerKills: 0, bossKills: 0, grudgeLevel: 0, personality: enemy.personality };

      // Grudge enrage: if player has killed boss >= grudgeThreshold times, inject enrage buff
      const grudgeThreshold = enemy.grudgeThreshold ?? 3;
      const enraged = (existingEncounter?.playerKills ?? 0) >= grudgeThreshold;
      if (enraged) {
        const enrageMsg = `🔥 GRUDGE ESCALATION! ${enemy.name} is ENRAGED by your repeated victories — bonus damage and speed for the first ${GRUDGE_ENRAGE_DURATION_TICKS * 2}s of combat!`;
        await db.insert(combatLogTable).values({ characterId, tick: 0, message: enrageMsg, type: "info" });
      }

      // Adaptive ability weighting: store priority ability in enemyData for first-tick use
      let priorityAbilityId: string | null = existingEncounter?.lastKillingAbility ?? null;
      // Validate that the ability still exists on the enemy
      if (priorityAbilityId && !enemy.abilities.find(a => a.id === priorityAbilityId)) {
        priorityAbilityId = null;
      }

      // Update combat state with enrage status and priority ability
      const enrageEffect: StatusEffect | null = enraged ? {
        id: "grudge_enrage", name: "Enraged (Grudge)", icon: "🔥", type: "frenzy",
        remainingTicks: GRUDGE_ENRAGE_DURATION_TICKS, value: 35, source: "enemy",
      } : null;

      await db.update(combatStateTable).set({
        enemyData: { ...enemy, hp: enemy.maxHp, maxHp: enemy.maxHp, _priorityAbilityId: priorityAbilityId } as Record<string, unknown>,
        enemyStatusEffects: enrageEffect ? [enrageEffect] : [],
        updatedAt: new Date(),
      }).where(eq(combatStateTable.id, updated.id));

      // Clear the narration cache so this fight gets fresh history-aware dialogue
      // (bossNarrationCache is keyed per player so this is a no-op for other players)

      // Generate boss intro narration with encounter history (fire-and-forget)
      generateBossNarration(enemy.id, "intro", {
        name: character.name, race: character.race, class: character.class,
        level: character.level, zone: character.zone,
      }, encounterCtx, character.id).then(async (narration) => {
        if (narration) {
          await db.insert(combatLogTable).values({ characterId, tick: 0, message: `💬 "${narration}"`, type: "info" }).catch(() => {});
        }
      }).catch(() => {});
    }

    const chain = getChainForArchetype(character.archetype ?? "Fighter");
    const [heroicState] = await db.select().from(heroicStateTable).where(eq(heroicStateTable.characterId, characterId)).limit(1);
    if (heroicState) {
      await db.update(heroicStateTable).set({
        active: true, progress: 0, stepNumber: 0, triggerType: chain.steps[0].triggerType,
        bonusType: chain.bonusType, bonusValue: chain.bonusValue,
      }).where(eq(heroicStateTable.id, heroicState.id));
    } else {
      await db.insert(heroicStateTable).values({
        characterId, active: true, progress: 0, chain: 0, stepNumber: 0,
        triggerType: chain.steps[0].triggerType, bonusType: chain.bonusType, bonusValue: chain.bonusValue,
      });
    }

    return res.json(formatCombatState(updated));
  } catch (err) {
    req.log.error({ err }, "Error starting combat");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/combat/stop", async (req, res) => {
  try {
    const characterId = req.characterId;
    const state = await getOrCreateCombatState(characterId);
    const character = await getOrCreateCharacter(req.characterId);
    const now = new Date();
    const [updated] = await db.update(combatStateTable).set({
      active: false, enemyData: null, enemyId: null, enemyCurrentHp: 0,
      playerCurrentHp: character.health, playerCurrentPower: character.power,
      playerStatusEffects: [], enemyStatusEffects: [], enemyAbilityCooldowns: {},
      totalPlayerDamage: 0, combatStartMs: null,
      updatedAt: now,
    }).where(eq(combatStateTable.id, state.id)).returning();

    // Reset lastRegenAt so in-combat time is never counted toward out-of-combat regen
    await db.update(charactersTable).set({ lastRegenAt: now }).where(eq(charactersTable.id, character.id));

    await db.insert(combatLogTable).values({ characterId, tick: state.tick, message: "You disengage from combat.", type: "info" });
    res.json(formatCombatState(updated));
  } catch (err) {
    req.log.error({ err }, "Error stopping combat");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/combat/tick", async (req, res) => {
  try {
    const characterId = req.characterId;
    const state = await getOrCreateCombatState(characterId);

    if (!state.active || !state.enemyData) {
      return res.json({
        playerDamageDealt: 0, enemyDamageDealt: 0, playerDied: false, enemyDied: false,
        loot: [], xpGained: 0, goldGained: 0, combatLog: [],
        combatState: formatCombatState(state), playerHpAfter: state.playerCurrentHp,
        enemyHpAfter: state.enemyCurrentHp, isCrit: false, isEnemyCrit: false,
        heroicTriggered: false, autoLoopStarted: false,
        aaProcs: [], powerRegen: 0, powerAfter: state.playerCurrentPower,
        playerStatusEffects: [], enemyStatusEffects: [], abilityUsedId: undefined,
      });
    }

    const enemy = state.enemyData as unknown as Enemy;
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, unknown>) || {};
    const baseStats = character.baseStats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number; };

    // ── Load AA bonuses ──────────────────────────────────────────────────────
    const investedRows = await db.select().from(aaPointsTable).where(and(eq(aaPointsTable.characterId, characterId), gt(aaPointsTable.rank, 0)));
    const nodeDefsMap = new Map(ALL_AA_NODES.map(n => [n.id, n]));
    const investedNodes = investedRows
      .map(r => {
        const def = nodeDefsMap.get(r.nodeId);
        if (!def) return null;
        return { effect: def.effect, currentRank: r.rank, effectValue: def.effectValue, effectPerRank: def.effectPerRank };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);
    const aaBonuses = applyAABonuses(investedNodes);

    // Active AA bonus labels for the front-end to display
    const activeAALabels: string[] = [];
    if (aaBonuses.critChanceBonus > 0)    activeAALabels.push(`+${aaBonuses.critChanceBonus}% Crit`);
    if (aaBonuses.avoidanceBonus > 0)     activeAALabels.push(`+${aaBonuses.avoidanceBonus}% Avoidance`);
    if (aaBonuses.mitigationBonus > 0)    activeAALabels.push(`+${aaBonuses.mitigationBonus} Mitigation`);
    if (aaBonuses.doubleAttackChance > 0) activeAALabels.push(`${aaBonuses.doubleAttackChance}% Double Attack`);
    if (aaBonuses.meleeDamageBonus > 0)   activeAALabels.push(`+${aaBonuses.meleeDamageBonus}% Melee Dmg`);
    if (aaBonuses.spellDamageBonus > 0)   activeAALabels.push(`+${aaBonuses.spellDamageBonus}% Spell Dmg`);
    if (aaBonuses.dmgReduction > 0)       activeAALabels.push(`-${aaBonuses.dmgReduction}% Dmg Taken`);

    // ── Gear + stats ─────────────────────────────────────────────────────────
    const gearData = computeGearStats(gear, baseStats, character.level);

    // Fetch combat-relevant skill levels to wire into stat computation
    const allSkillRows = await db.select({ skillId: skillsTable.skillId, level: skillsTable.level }).from(skillsTable).where(eq(skillsTable.characterId, characterId));
    const skillLevels: SkillLevels = {};
    for (const sr of allSkillRows) {
      if (sr.skillId === "combat")  skillLevels.combat  = sr.level;
      if (sr.skillId === "archery") skillLevels.archery = sr.level;
      if (sr.skillId === "defense") skillLevels.defense = sr.level;
      if (sr.skillId === "magic")   skillLevels.magic   = sr.level;
    }

    const playerStats = computeStats({ level: character.level, ...baseStats, ...gearData, gearCritBonus: 0, archetype: character.archetype ?? "Fighter" }, aaBonuses, skillLevels);

    const effStamina      = baseStats.stamina      + gearData.gearStamina;
    const maxHp = Math.max(1, Math.floor((effStamina * 10 + 50 + (character.level - 1) * 15 + gearData.gearHealth) * (1 + aaBonuses.maxHpPercent / 100)));
    const maxPower = playerStats.totalPower;

    const newTick = state.tick + 1;
    const combatMessages: string[] = [];
    let enemyHp = state.enemyCurrentHp;
    let playerHp = state.playerCurrentHp;
    let playerPower = state.playerCurrentPower;
    let playerDamageDealt = 0, enemyDamageDealt = 0;
    let playerSoloDamage = 0; // solo-player damage only (excludes party/ghost bonuses)
    let playerDied = false, enemyDied = false, isCrit = false, isEnemyCrit = false;
    const lootItems: ReturnType<typeof getItemById>[] = [];
    let xpGained = 0, goldGained = 0;
    const aaProcs: string[] = [];
    const floatEvents: FloatEvent[] = [];
    let lastEnemyAbilityUsedId: string | null = null; // tracks the last special ability the boss used (for encounter recording)

    // ── Load active party (dungeon or raid run) ───────────────────────────────
    let activeParty: PartyMember[] = [];
    let activeRunId: number | null = null;
    let activeRunType: "dungeon" | "raid" | null = null;

    const [activeRunDungeon] = await db.select({ id: dungeonRunsTable.id, party: dungeonRunsTable.party })
      .from(dungeonRunsTable)
      .where(and(eq(dungeonRunsTable.characterId, character.id), eq(dungeonRunsTable.status, "active")))
      .limit(1);

    if (activeRunDungeon) {
      activeParty = (activeRunDungeon.party as PartyMember[]) ?? [];
      activeRunId = activeRunDungeon.id;
      activeRunType = "dungeon";
    } else {
      const [activeRunRaid] = await db.select({ id: raidRunsTable.id, party: raidRunsTable.party })
        .from(raidRunsTable)
        .where(and(eq(raidRunsTable.characterId, character.id), eq(raidRunsTable.status, "active")))
        .limit(1);
      if (activeRunRaid) {
        activeParty = (activeRunRaid.party as PartyMember[]) ?? [];
        activeRunId = activeRunRaid.id;
        activeRunType = "raid";
      }
    }

    const ghostIds = activeParty.map(m => m.ghostId);
    const ghostInfoList = ghostIds.length > 0 ? await fetchGhostInfo(ghostIds) : [];
    const partyContrib = activeParty.length > 0
      ? calculateContributions(activeParty, ghostInfoList, enemy.level)
      : { damageReduction: 0, healingAmount: 0, bonusDamage: 0, ghostsActive: 0 };

    // ── Status effects: load from state ──────────────────────────────────────
    let playerStatusEffects: StatusEffect[] = Array.isArray(state.playerStatusEffects) ? (state.playerStatusEffects as StatusEffect[]) : [];
    let enemyStatusEffects: StatusEffect[] = Array.isArray(state.enemyStatusEffects) ? (state.enemyStatusEffects as StatusEffect[]) : [];
    let enemyAbilityCooldowns: Record<string, number> = (state.enemyAbilityCooldowns as Record<string, number>) ?? {};
    let playerAbilityCooldowns: Record<string, number> = (state.playerAbilityCooldowns as Record<string, number>) ?? {};

    // Decrement player ability cooldowns at start of tick
    for (const key of Object.keys(playerAbilityCooldowns)) {
      if (playerAbilityCooldowns[key] > 0) playerAbilityCooldowns[key]--;
    }

    // ── Power regen ───────────────────────────────────────────────────────────
    const powerRegen = Math.max(1, Math.floor((baseStats.wisdom + gearData.gearWisdom) * 0.2 + 0.5));
    playerPower = Math.min(maxPower, playerPower + powerRegen);
    if (powerRegen > 0) {
      // Only log power regen once every 5 ticks to avoid clutter
      if (newTick % 5 === 0) {
        const pMsg = `💧 Power regenerated: +${powerRegen} (${Math.floor(playerPower)}/${maxPower})`;
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: pMsg, type: "info" });
      }
    }

    // ── Apply DoT / effect actions for this tick (without decrementing yet) ───
    // NOTE: We apply effects FIRST and decrement AFTER all actions so that
    // 1-tick stuns/fears reliably gate the player's action this tick.
    for (const effect of playerStatusEffects) {
      if (effect.type === "bleed" || effect.type === "dot") {
        const dotDmg = effect.value;
        const dotHpBefore = playerHp;
        playerHp = Math.max(0, playerHp - dotDmg);
        // Track as lethal source if this DoT tick kills the player (and it's from a boss ability)
        if (enemy.isBoss && effect.source === "enemy" && dotHpBefore > 0 && playerHp <= 0) {
          lastEnemyAbilityUsedId = effect.id;
        }
        floatEvents.push({ value: dotDmg, type: "dot" });
        const ticksLeft = Math.max(0, effect.remainingTicks - 1);
        const dotMsg = `🩸 ${effect.name}: ${dotDmg} ${effect.type === "bleed" ? "bleed" : "magic"} damage! (${ticksLeft} ticks left)`;
        combatMessages.push(dotMsg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: dotMsg, type: "enemyHit", value: dotDmg });
      }
    }

    // Decrement enemy ability cooldowns (these are turn-based, decrement at start of turn)
    for (const key of Object.keys(enemyAbilityCooldowns)) {
      if (enemyAbilityCooldowns[key] > 0) enemyAbilityCooldowns[key]--;
    }

    // ── Check if player is stunned or feared ──────────────────────────────────
    const playerStunned = playerStatusEffects.some(e => e.type === "stun" || e.type === "fear");

    // ── Ability auto-cast ─────────────────────────────────────────────────────
    let abilityUsedId: string | undefined;
    const classDef = CLASSES.find(c => c.name === character.class || c.id === character.class.toLowerCase());
    let abilityBonusDamage = 0;

    // Cooldown reduction AA: scale per-ability cooldowns
    const cooldownReductionFactor = Math.max(0, 1 - aaBonuses.cooldownReduction / 100);

    if (!playerStunned && classDef) {
      const reducedPowerCost = (baseCost: number) => Math.floor(baseCost * (1 - aaBonuses.powerCostReduction / 100));
      // Filter to abilities that are: unlocked, affordable, and off cooldown
      const autocastAbilities = classDef.abilities.filter(
        a => a.autocast && character.level >= a.levelRequired
          && playerPower >= reducedPowerCost(a.powerCost)
          && (playerAbilityCooldowns[a.id] ?? 0) === 0
      );
      if (autocastAbilities.length > 0) {
        // Round-robin through eligible abilities using tick counter
        const ability = autocastAbilities[newTick % autocastAbilities.length];
        const powerCost = reducedPowerCost(ability.powerCost);
        abilityUsedId = ability.id;
        playerPower = Math.max(0, playerPower - powerCost);

        // Spell damage AA bonus
        const spellBonus = 1 + aaBonuses.spellDamageBonus / 100;
        const spellCrit = Math.random() * 100 < playerStats.spellCritChance;
        const spellCritMult = spellCrit ? (1 + playerStats.spellCritBonus / 100) : 1;

        if (ability.damage) {
          abilityBonusDamage = Math.floor((ability.damage + (ability.damageScale || 1) * character.level * 1.5) * spellBonus * spellCritMult);
          // Apply elemental resistance if ability has damage type
          const dmgType = ability.damageType || "magic";
          const resist = Math.min(50, enemy.resistances?.[dmgType as keyof typeof enemy.resistances] ?? 0);
          const resistedAmt = Math.floor(abilityBonusDamage * resist / 100);
          if (resistedAmt > 0 && resist > 0) abilityBonusDamage = Math.max(1, abilityBonusDamage - resistedAmt);

          const critText = spellCrit ? " ✨ SPELL CRIT!" : "";
          const resistText = resist > 0 ? ` (${resist}% resisted)` : resist < 0 ? " (VULNERABLE!)" : "";
          const abilityMsg = `✨ ${ability.name}: ${abilityBonusDamage} ${dmgType} damage!${critText}${resistText}`;
          combatMessages.push(abilityMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityMsg, type: spellCrit ? "playerCrit" : "ability", value: abilityBonusDamage });
          enemyHp = Math.max(0, enemyHp - abilityBonusDamage);
          playerSoloDamage += abilityBonusDamage;
          floatEvents.push({ value: abilityBonusDamage, type: spellCrit ? "crit" : "hit" });
          if (resistedAmt > 0) floatEvents.push({ value: resistedAmt, type: "resist" });
          if (spellCrit) aaProcs.push("spell_crit");
        }

        if (ability.healAmount && playerHp < maxHp) {
          const baseHeal = Math.floor(maxHp * ability.healAmount);
          const healBonus = 1 + aaBonuses.healAmountBonus / 100;
          const healAmt = Math.floor(baseHeal * healBonus);
          playerHp = Math.min(maxHp, playerHp + healAmt);
          const healMsg = `✨ ${ability.name}: Healed ${healAmt} HP!`;
          combatMessages.push(healMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: healMsg, type: "heal", value: healAmt });

          // Divine wrath AA: when heal fires, deal divine damage
          if (aaBonuses.divineDamageBonus > 0) {
            const divineDmg = Math.floor(healAmt * 0.2 * (1 + aaBonuses.divineDamageBonus / 100));
            enemyHp = Math.max(0, enemyHp - divineDmg);
            playerSoloDamage += divineDmg;
            const dwMsg = `⚡ Divine Wrath: ${divineDmg} divine damage!`;
            combatMessages.push(dwMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: dwMsg, type: "ability", value: divineDmg });
          }
        }

        // Set per-ability cooldown (in ticks ≈ seconds) with AA reduction applied
        const abilityCooldownTicks = Math.max(1, Math.ceil(ability.cooldown * cooldownReductionFactor));
        playerAbilityCooldowns[ability.id] = abilityCooldownTicks;

        if (aaBonuses.cooldownReduction > 0) {
          aaProcs.push("cooldown_reduction");
        }

        // Award magic skill XP when a spell-type ability fires
        if (ability.type === "spell") {
          const magicXp = 20 + Math.floor(character.level * 0.5);
          applySkillXp("magic", magicXp, character.id).catch(() => {});
          const evocationXp = 15 + Math.floor(character.level * 0.4);
          applySkillXp("evocation", evocationXp, character.id).catch(() => {});
        }
      }
    }

    // ── Player auto-attack (if not stunned and still alive) ──────────────────
    let playerAttacked = false;
    if (!playerStunned && enemyHp > 0 && playerHp > 0) {
      // Compute enemy's effective avoidance (may be boosted by avoidance_buff status)
      const enemyAvoidanceBuff = enemyStatusEffects.filter(e => e.type === "buff").reduce((a, e) => a + e.value, 0);
      const effectiveEnemyAvoidance = Math.min(80, enemy.avoidance + enemyAvoidanceBuff);

      // Compute enemy's effective mitigation (may have frenzy which doesn't affect mitigation, but absorb shield does)
      const effectiveEnemyMitigation = enemy.mitigation;

      // Determine auto-attack damage type (slash is default for melee)
      const autoAttackDmgType = "slash";

      isCrit = Math.random() * 100 < playerStats.critChance;
      const playerAttack = calculatePlayerDamage(
        playerStats, effectiveEnemyMitigation, enemy.defenseRating, effectiveEnemyAvoidance, isCrit,
        autoAttackDmgType, enemy.resistances, aaBonuses.meleeDamageBonus
      );
      playerAttacked = true;

      if (playerAttack.avoided) {
        floatEvents.push({ value: 0, type: "miss" });
        const msg = `${enemy.name} evades your attack!`;
        combatMessages.push(msg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: msg, type: "info" });
        playerAttacked = false;
      } else {
        let dmg = playerAttack.damage;
        // Check enemy absorb shield
        const absorbEffect = enemyStatusEffects.find(e => e.type === "shield");
        if (absorbEffect && absorbEffect.value > 0) {
          const absorbed = Math.min(absorbEffect.value, dmg);
          absorbEffect.value -= absorbed;
          dmg = Math.max(0, dmg - absorbed);
          if (absorbed > 0) {
            const absMsg = `🛡️ ${enemy.name}'s shield absorbs ${absorbed} damage!`;
            combatMessages.push(absMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: absMsg, type: "info" });
          }
          if (absorbEffect.value <= 0) {
            enemyStatusEffects = enemyStatusEffects.filter(e => e !== absorbEffect);
            const shieldMsg = `🛡️ ${enemy.name}'s shield is broken!`;
            combatMessages.push(shieldMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: shieldMsg, type: "info" });
          }
        }

        playerDamageDealt = dmg;
        playerSoloDamage += dmg;
        enemyHp = Math.max(0, enemyHp - playerDamageDealt);
        floatEvents.push({ value: playerDamageDealt, type: isCrit ? "crit" : "hit" });
        if (playerAttack.resisted && playerAttack.resistAmount > 0) {
          floatEvents.push({ value: playerAttack.resistAmount, type: "resist" });
        }
        const critText = isCrit ? " ⚡ CRITICAL HIT!" : "";
        const resistText = playerAttack.resisted ? ` (${playerAttack.resistAmount} resisted)` : "";
        const dmgMsg = `You hit ${enemy.name} for ${playerDamageDealt} damage.${critText}${resistText}`;
        combatMessages.push(dmgMsg);
        await db.insert(combatLogTable).values({
          tick: newTick, message: dmgMsg,
          type: isCrit ? "playerCrit" : "playerHit", value: playerDamageDealt,
        });
        if (isCrit) aaProcs.push("crit");

        // Double-attack AA proc
        if (aaBonuses.doubleAttackChance > 0 && Math.random() * 100 < aaBonuses.doubleAttackChance && enemyHp > 0) {
          const isCrit2 = Math.random() * 100 < playerStats.critChance;
          const pa2 = calculatePlayerDamage(playerStats, effectiveEnemyMitigation, enemy.defenseRating, effectiveEnemyAvoidance, isCrit2, autoAttackDmgType, enemy.resistances, aaBonuses.meleeDamageBonus);
          if (!pa2.avoided) {
            let dmg2 = pa2.damage;
            const absorb2 = enemyStatusEffects.find(e => e.type === "shield");
            if (absorb2 && absorb2.value > 0) {
              const a2 = Math.min(absorb2.value, dmg2);
              absorb2.value -= a2;
              dmg2 = Math.max(0, dmg2 - a2);
            }
            enemyHp = Math.max(0, enemyHp - dmg2);
            playerDamageDealt += dmg2;
            playerSoloDamage += dmg2;
            floatEvents.push({ value: dmg2, type: isCrit2 ? "crit" : "hit" });
            const da2Msg = `⚡ DOUBLE ATTACK: ${dmg2} damage!${isCrit2 ? " CRIT!" : ""}`;
            combatMessages.push(da2Msg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: da2Msg, type: "playerCrit", value: dmg2 });
            aaProcs.push("double_attack");
            applySkillXp("dual_wield", 15, character.id).catch(() => {});
          }
        }

        // Extra attack AA proc
        if (aaBonuses.extraAttackChance > 0 && Math.random() * 100 < aaBonuses.extraAttackChance && enemyHp > 0) {
          const isCrit3 = Math.random() * 100 < playerStats.critChance;
          const pa3 = calculatePlayerDamage(playerStats, effectiveEnemyMitigation, enemy.defenseRating, effectiveEnemyAvoidance, isCrit3, autoAttackDmgType, enemy.resistances, aaBonuses.meleeDamageBonus);
          if (!pa3.avoided) {
            let dmg3 = pa3.damage;
            const absorb3 = enemyStatusEffects.find(e => e.type === "shield");
            if (absorb3 && absorb3.value > 0) {
              const a3 = Math.min(absorb3.value, dmg3);
              absorb3.value -= a3;
              dmg3 = Math.max(0, dmg3 - a3);
            }
            enemyHp = Math.max(0, enemyHp - dmg3);
            playerDamageDealt += dmg3;
            playerSoloDamage += dmg3;
            floatEvents.push({ value: dmg3, type: isCrit3 ? "crit" : "hit" });
            const ea3Msg = `⚡ EXTRA ATTACK: ${dmg3} damage!`;
            combatMessages.push(ea3Msg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: ea3Msg, type: "ability", value: dmg3 });
            aaProcs.push("extra_attack");
          }
        }
      }
    } else if (playerStunned) {
      const stunEffect = playerStatusEffects.find(e => e.type === "stun" || e.type === "fear");
      const stunMsg = stunEffect?.type === "fear"
        ? `😱 You are gripped by Fear and cannot attack!`
        : `💥 You are stunned and cannot attack!`;
      combatMessages.push(stunMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: stunMsg, type: "info" });
    }

    // ── Lifesteal AA proc ─────────────────────────────────────────────────────
    if (aaBonuses.lifestealPct > 0 && playerDamageDealt > 0 && playerHp > 0 && playerHp < maxHp) {
      const lifestealAmt = Math.floor(playerDamageDealt * aaBonuses.lifestealPct / 100);
      if (lifestealAmt > 0) {
        playerHp = Math.min(maxHp, playerHp + lifestealAmt);
        floatEvents.push({ value: lifestealAmt, type: "heal" });
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `🩸 Life Drain: +${lifestealAmt} HP`, type: "heal", value: lifestealAmt });
      }
    }

    // ── Ghost party bonus damage (Scout/Mage ghosts deal bonus damage) ────────
    if (partyContrib.bonusDamage > 0 && enemyHp > 0) {
      enemyHp = Math.max(0, enemyHp - partyContrib.bonusDamage);
      playerDamageDealt += partyContrib.bonusDamage;
      floatEvents.push({ value: partyContrib.bonusDamage, type: "hit" });
      const partyDmgMsg = `⚔️ Party deals ${partyContrib.bonusDamage} bonus damage!`;
      combatMessages.push(partyDmgMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: partyDmgMsg, type: "ability", value: partyContrib.bonusDamage });
    }

    // ── Check if enemy died ───────────────────────────────────────────────────
    let playerWonClosingLine = "";
    if (enemyHp <= 0) {
      enemyDied = true;
      const deathMsg = `💀 You defeated ${enemy.name}!`;
      combatMessages.push(deathMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: deathMsg, type: "enemyDied" });

      // Update ghost damage contribution stats on kill, then persist party to run
      if (activeParty.length > 0 && partyContrib.bonusDamage > 0) {
        const dmgPerDpsGhost = Math.round(partyContrib.bonusDamage / Math.max(1, ghostInfoList.filter(g => ["scout", "mage"].includes(g.archetype.toLowerCase())).length));
        const dpsContribs = ghostInfoList
          .filter(g => ["scout", "mage"].includes(g.archetype.toLowerCase()))
          .filter(g => activeParty.some(m => m.ghostId === g.id && m.status !== "downed"))
          .map(g => ({ ghostId: g.id, damageDone: dmgPerDpsGhost }));
        if (dpsContribs.length > 0) activeParty = updateGhostStats(activeParty, dpsContribs);
      }

      // Persist updated party state to active run
      if (activeRunId !== null && activeParty.length > 0) {
        if (activeRunType === "dungeon") {
          await db.update(dungeonRunsTable).set({ party: activeParty }).where(eq(dungeonRunsTable.id, activeRunId)).catch(() => {});
        } else if (activeRunType === "raid") {
          // Mark boss defeated if this was a raid boss kill
          const isRaidBoss = (enemy as unknown as { isRaidBoss?: boolean }).isRaidBoss === true;
          await db.update(raidRunsTable)
            .set({ party: activeParty, ...(isRaidBoss ? { bossDefeated: true } : {}) })
            .where(eq(raidRunsTable.id, activeRunId))
            .catch(() => {});
        }
      }

      // Auto-progress dungeon run kills (fire-and-forget)
      progressDungeonKill(enemy.id, characterId).catch(() => {});

      // Record bestiary kill (fire-and-forget)
      recordBestiaryKill(character.id, enemy.id).catch(() => {});

      // Auto-progress quest kill objectives (fire-and-forget with log insertion)
      progressKillObjectives(enemy.name).then(async (progressResults) => {
        for (const r of progressResults) {
          if (r.completed) {
            await db.insert(combatLogTable).values({
              tick: newTick,
              message: `📜 Quest Complete: "${r.questTitle}"! Rewards claimed.`,
              type: "info",
            }).catch(() => {});
          }
        }
      }).catch(() => {});

      // Boss death: update encounter record + narration + closing line
      if (enemy.isBoss) {
        const [existingEnc] = await db.select().from(bossEncountersTable)
          .where(and(eq(bossEncountersTable.playerId, character.id), eq(bossEncountersTable.bossId, enemy.id)))
          .limit(1);

        let newPlayerKills = (existingEnc?.playerKills ?? 0) + 1;
        let newGrudgeLevel = Math.floor(newPlayerKills / (enemy.grudgeThreshold ?? 3));

        if (existingEnc) {
          await db.update(bossEncountersTable).set({
            playerKills: newPlayerKills,
            grudgeLevel: newGrudgeLevel,
            lastEncounteredAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(bossEncountersTable.id, existingEnc.id));
        } else {
          await db.insert(bossEncountersTable).values({
            playerId: character.id,
            bossId: enemy.id,
            playerKills: 1,
            bossKills: 0,
            grudgeLevel: 0,
            lastEncounteredAt: new Date(),
          });
        }

        const encounterCtxForDeath: BossEncounterContext = {
          playerKills: newPlayerKills,
          bossKills: existingEnc?.bossKills ?? 0,
          grudgeLevel: newGrudgeLevel,
          lastKillingAbility: existingEnc?.lastKillingAbility,
          personality: enemy.personality,
        };

        // Invalidate narration cache so next fight gets fresh history-aware dialogue
        invalidateBossNarrationCache(character.id, enemy.id);

        // Death narration + closing line — run concurrently, both awaited for synchronous response delivery
        const [deathNarration, closingLine] = await Promise.all([
          generateBossNarration(enemy.id, "death", {
            name: character.name, race: character.race, class: character.class,
            level: character.level, zone: character.zone,
          }, encounterCtxForDeath, character.id).catch(() => ""),
          generateBossClosingLine(enemy.id, "playerWon", {
            name: character.name, race: character.race, class: character.class, level: character.level,
          }, encounterCtxForDeath, character.id).catch(() => ""),
        ]);
        if (deathNarration) {
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `💬 ${deathNarration}`, type: "info" }).catch(() => {});
        }
        if (closingLine) {
          playerWonClosingLine = closingLine;
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `☠️ [Last words] ${closingLine}`, type: "info" }).catch(() => {});
        }
      }

      // Gold with AA gold bonus
      const baseGold = Math.floor(enemy.goldMin + Math.random() * (enemy.goldMax - enemy.goldMin));
      goldGained = Math.floor(baseGold * (1 + aaBonuses.goldBonus / 100));
      xpGained = calculateXpGain(enemy.xpReward, character.level, enemy.level,
        aaBonuses.xpBonus + (enemy.isBoss ? aaBonuses.bossXpBonus : 0));

      if (aaBonuses.goldBonus > 0) {
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `💰 Gold Bonus (+${aaBonuses.goldBonus}%): ${goldGained}g!`, type: "info" });
      }

      // Build a set of scroll itemIds whose one-of-a-kind recipe has already been crafted.
      // These scrolls should no longer drop from any enemy.
      // We join oneOfAKindCraftedTable recipeIds → scroll items via CRAFTING_RECIPES.
      const craftedOnceRows = await db.select({ recipeId: oneOfAKindCraftedTable.recipeId }).from(oneOfAKindCraftedTable).catch(() => []);
      const craftedOnceRecipeIds = new Set(craftedOnceRows.map(r => r.recipeId));
      const oneOfAKindScrollMap = getOneOfAKindScrollMap();
      const exhaustedScrollItemIds = new Set(
        [...craftedOnceRecipeIds].flatMap(rid => oneOfAKindScrollMap.get(rid) ?? [])
      );

      for (const lootEntry of enemy.lootTable) {
        if (exhaustedScrollItemIds.has(lootEntry.itemId)) continue;
        if (Math.random() < lootEntry.dropChance) {
          const item = getItemById(lootEntry.itemId);
          if (item) {
            lootItems.push(item);
            const lootMsg = `🎁 Loot: ${item.name} [${item.rarity}]`;
            combatMessages.push(lootMsg);
            // Assign quality to material drops based on enemy level / zone
            const isMaterial = (item as unknown as { type: string }).type === "material" || (item as unknown as { type: string }).type === "crafting_material";
            const itemDataWithQuality = isMaterial
              ? { ...(item as unknown as Record<string, unknown>), quality: rollZoneQuality(enemy.zone ?? character.zone) }
              : (item as unknown as Record<string, unknown>);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: lootMsg, type: "loot", itemData: itemDataWithQuality });
            // Upsert static loot item into inventory
            const [existingStaticLoot] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, item.id)));
            if (existingStaticLoot) {
              // For materials, update quality to reflect most recent drop (keeps stack representative)
              const updateFields: Record<string, unknown> = { quantity: existingStaticLoot.quantity + 1 };
              if (isMaterial) updateFields.itemData = itemDataWithQuality;
              await db.update(inventoryTable).set(updateFields).where(eq(inventoryTable.id, existingStaticLoot.id));
            } else {
              await db.insert(inventoryTable).values({ characterId, itemId: item.id, itemData: itemDataWithQuality, quantity: 1 });
            }
          }
        }
      }

      // ── Procedural loot drops ─────────────────────────────────────────────
      if (enemy.isBoss) {
        // 25% chance: generate an AI-named unique from this boss's stable drop pool
        if (Math.random() < 0.25) {
          // Await with a 10s timeout so it is included in the combat tick response
          const namedResult = await Promise.race([
            generateNamedItem(enemy.id, character.zone, character.level, {
              name: character.name, race: character.race, class: character.class,
            }),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 10000)),
          ]);
          if (namedResult) {
            const { item: namedItem, lore } = namedResult;
            const namedMsg = `🌟 Named Drop: ${namedItem.name} [${namedItem.rarity}]${lore ? ` — "${lore}"` : ""}`;
            combatMessages.push(namedMsg);
            lootItems.push(namedItem);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: namedMsg, type: "loot", itemData: namedItem as unknown as Record<string, unknown> });
            const [existingNamed] = await db.select().from(inventoryTable)
              .where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, namedItem.id)));
            if (existingNamed) {
              await db.update(inventoryTable).set({ quantity: existingNamed.quantity + 1 })
                .where(eq(inventoryTable.id, existingNamed.id));
            } else {
              await db.insert(inventoryTable).values({
                characterId, itemId: namedItem.id, itemData: serializeForDb(namedItem), quantity: 1,
              });
            }
          }
        }

        // Boss always gets standard procedural drops (guaranteed rare+)
        // Use enemy.level for scaling so drop power matches the enemy, not the player
        const bossProceduralDrops = rollLootDrop(character.zone, enemy.level, true, enemy.type);
        for (const procItem of bossProceduralDrops) {
          // ProceduralItem satisfies the item shape expected by lootItems
          lootItems.push(procItem);
          const procMsg = `⚔️ Loot: ${procItem.name} [${procItem.rarity}]`;
          combatMessages.push(procMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: procMsg, type: "loot", itemData: procItem as unknown as Record<string, unknown> });
          const [existingProc] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, procItem.id)));
          if (existingProc) {
            await db.update(inventoryTable).set({ quantity: existingProc.quantity + 1 }).where(eq(inventoryTable.id, existingProc.id));
          } else {
            await db.insert(inventoryTable).values({ characterId, itemId: procItem.id, itemData: serializeForDb(procItem), quantity: 1 });
          }
        }
      } else {
        // Normal enemy: roll procedural loot (20% base + zone bonus chance)
        // Use enemy.level for scaling so drop power matches the enemy, not the player
        const proceduralDrops = rollLootDrop(character.zone, enemy.level, false, enemy.type);
        for (const procItem of proceduralDrops) {
          lootItems.push(procItem);
          const procMsg = `🎁 Loot: ${procItem.name} [${procItem.rarity}]`;
          combatMessages.push(procMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: procMsg, type: "loot", itemData: procItem as unknown as Record<string, unknown> });
          const [existingProc] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, characterId), eq(inventoryTable.itemId, procItem.id)));
          if (existingProc) {
            await db.update(inventoryTable).set({ quantity: existingProc.quantity + 1 }).where(eq(inventoryTable.id, existingProc.id));
          } else {
            await db.insert(inventoryTable).values({ characterId, itemId: procItem.id, itemData: serializeForDb(procItem), quantity: 1 });
          }
        }
      }

      const collectionPieces = ["gnoll_fang", "gnoll_medallion", "storm_crystals", "coin_copper_old"];
      if (Math.random() < 0.05 && collectionPieces.length > 0) {
        const piece = collectionPieces[Math.floor(Math.random() * collectionPieces.length)];
        const collectMsg = `📦 Collection piece found: ${piece.replace(/_/g, " ")}!`;
        combatMessages.push(collectMsg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: collectMsg, type: "loot" });
      }

      // ── XP ratio split: divert a % of XP to AA points instead of level XP ──
      const aaXpRatio = Math.max(0, Math.min(100, character.aaXpRatio ?? 0));
      const aaXpDiverted = Math.floor(xpGained * aaXpRatio / 100);
      const levelXpGained = xpGained - aaXpDiverted;
      // 1 AA point per cost-adjusted XP (aaXpCostReduction reduces the cost per point)
      const aaXpCostPerPt = Math.max(1, Math.round(100 * (1 - aaBonuses.aaXpCostReduction / 100)));
      const aaPtsFromRatio = Math.floor(aaXpDiverted / aaXpCostPerPt);

      const xpMsg = aaXpRatio > 0
        ? `✨ Gained ${levelXpGained} XP, ${goldGained}g (+${aaPtsFromRatio > 0 ? aaPtsFromRatio + " AA" : aaXpDiverted + " AA XP"} from ${aaXpRatio}% ratio).`
        : `✨ Gained ${xpGained} XP and ${goldGained}g.`;
      combatMessages.push(xpMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: xpMsg, type: "info" });

      let newXp = character.xp + levelXpGained;
      let newLevel = character.level;
      let newXpToNext = character.xpToNextLevel;
      let aaPtsGained = aaPtsFromRatio;

      while (newXp >= newXpToNext) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = xpForLevel(newLevel);
        if (newLevel >= 10) aaPtsGained++;
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `🎉 LEVEL UP! You are now level ${newLevel}!`, type: "info" });
      }

      const newGold = character.gold + goldGained;
      const effSta = baseStats.stamina + gearData.gearStamina;
      const effWis = baseStats.wisdom  + gearData.gearWisdom;
      const effInt = baseStats.intelligence + gearData.gearIntelligence;
      const newMaxHealth = Math.floor(
        (effSta * 10 + 50 + (newLevel - 1) * 15 + gearData.gearHealth)
        * (1 + aaBonuses.maxHpPercent / 100)
      );
      const newMaxPower = Math.floor(
        ((effWis + effInt) * 5 + effSta * 2 + newLevel * 10 + gearData.gearPower)
        * (1 + aaBonuses.maxPowerPercent / 100)
      );

      const currentZoneKills = (character.zoneKills as Record<string, number> | null) ?? {};
      const updatedZoneKills = {
        ...currentZoneKills,
        [character.zone]: (currentZoneKills[character.zone] ?? 0) + 1,
      };

      await db.update(charactersTable).set({
        xp: newXp, level: newLevel, xpToNextLevel: newXpToNext,
        gold: newGold, killCount: character.killCount + 1,
        bossKills: (character.bossKills ?? 0) + (enemy.isBoss ? 1 : 0),
        undeadKills: (character.undeadKills ?? 0) + (enemy.type === "undead" ? 1 : 0),
        dragonKills: (character.dragonKills ?? 0) + (enemy.type === "dragon" ? 1 : 0),
        zoneKills: updatedZoneKills,
        maxHealth: newMaxHealth, maxPower: newMaxPower,
        health: Math.min(playerHp, newMaxHealth),
        power: Math.min(playerPower, newMaxPower),
        aaPoints: (character.aaPoints ?? 0) + aaPtsGained,
        totalGoldEarned: (character.totalGoldEarned ?? 0) + goldGained,
        totalPlayTime: (character.totalPlayTime ?? 0) + 1,
        updatedAt: new Date(),
      }).where(eq(charactersTable.id, character.id));

      // Check achievements after every kill (fire-and-forget)
      checkAndUnlockAchievements(characterId).catch(() => {});

      // Award combat or archery skill XP on kill (fire-and-forget)
      {
        const rangedClasses = ["ranger", "assassin"];
        const killSkillId = rangedClasses.includes((character.class ?? "").toLowerCase()) ? "archery" : "combat";
        const killSkillXp = 40 + enemy.level * 3;
        applySkillXp(killSkillId, killSkillXp, character.id).catch(() => {});
        if (enemy.type === "beast") {
          const beastXp = 25 + enemy.level * 2;
          applySkillXp("beastmastery", beastXp, character.id).catch(() => {});
        }
      }

      const factionImpact: Record<string, number> = {
        "Commonlands": 5, "Antonica": 5, "Thundering Steppes": 8,
        "Nektulos Forest": 8, "Everfrost Peaks": 10, "Lavastorm Mountains": 12,
      };
      const factionGain = factionImpact[enemy.zone] ?? 5;
      const alignFactionId = character.alignment === "Qeynos" ? "qeynos" : "freeport";
      const [factionEntry] = await db.select().from(factionsTable).where(
        and(eq(factionsTable.characterId, characterId), eq(factionsTable.factionId, alignFactionId))
      );
      if (factionEntry) {
        const newStanding = Math.min(factionEntry.standing + factionGain, 40000);
        await db.update(factionsTable).set({ standing: newStanding })
          .where(eq(factionsTable.id, factionEntry.id));
        progressFactionObjectives(alignFactionId, newStanding).catch(() => {});
      }

      // Skip server-side auto-loop inside dungeon runs — the dungeon frontend controls
      // which enemy to fight next; re-engaging the same enemy would break floor progression.
      if (character.autoLoop && activeRunType !== "dungeon") {
        const updatedChar = await getOrCreateCharacter(req.characterId);
        const [updatedState] = await db.update(combatStateTable).set({
          active: true,
          enemyData: { ...enemy, hp: enemy.maxHp, maxHp: enemy.maxHp } as Record<string, unknown>,
          enemyCurrentHp: enemy.maxHp,
          playerCurrentHp: updatedChar.health,
          playerCurrentPower: updatedChar.power,
          tick: 0, lastTickMs: Date.now(),
          playerStatusEffects: [], enemyStatusEffects: [], enemyAbilityCooldowns: {}, playerAbilityCooldowns: {},
          totalPlayerDamage: 0, combatStartMs: Date.now(),
          updatedAt: new Date(),
        }).where(eq(combatStateTable.id, state.id)).returning();
        await db.insert(combatLogTable).values({ characterId, tick: 0, message: `🔄 Auto-loop: Re-engaging ${enemy.name}...`, type: "info" });
        return res.json({
          playerDamageDealt, enemyDamageDealt: 0, playerDied: false, enemyDied: true,
          loot: lootItems.filter(Boolean), xpGained, goldGained, combatLog: combatMessages,
          bossClosingLine: playerWonClosingLine || undefined,
          bossClosingOutcome: playerWonClosingLine ? "playerWon" : undefined,
          combatState: formatCombatState(updatedState, { activeAABonuses: activeAALabels }),
          playerHpAfter: playerHp, enemyHpAfter: 0,
          isCrit, isEnemyCrit: false, heroicTriggered: false, autoLoopStarted: true,
          aaProcs, powerRegen, powerAfter: Math.floor(playerPower),
          playerStatusEffects, enemyStatusEffects, abilityUsedId, floatEvents,
          playerStatsSnapshot: { attackRating: playerStats.attackRating, defenseRating: playerStats.defenseRating, mitigation: playerStats.mitigation, avoidance: playerStats.avoidance, critChance: playerStats.critChance, powerRegen },
        });
      }

      const combatEndTime = new Date();
      const [updatedState] = await db.update(combatStateTable).set({
        active: false, enemyData: null, enemyId: null, enemyCurrentHp: 0,
        playerCurrentHp: playerHp, playerCurrentPower: playerPower,
        playerStatusEffects: [], enemyStatusEffects: [], enemyAbilityCooldowns: {}, playerAbilityCooldowns: {},
        totalPlayerDamage: 0, combatStartMs: null,
        tick: newTick, updatedAt: combatEndTime,
      }).where(eq(combatStateTable.id, state.id)).returning();

      // Reset lastRegenAt so in-combat time is never counted toward out-of-combat regen
      await db.update(charactersTable).set({ lastRegenAt: combatEndTime }).where(eq(charactersTable.id, character.id));

      return res.json({
        playerDamageDealt, enemyDamageDealt: 0, playerDied: false, enemyDied: true,
        loot: lootItems.filter(Boolean), xpGained, goldGained, combatLog: combatMessages,
        bossClosingLine: playerWonClosingLine || undefined,
        bossClosingOutcome: playerWonClosingLine ? "playerWon" : undefined,
        combatState: formatCombatState(updatedState, { activeAABonuses: activeAALabels }),
        playerHpAfter: playerHp, enemyHpAfter: 0,
        isCrit, isEnemyCrit: false, heroicTriggered: false, autoLoopStarted: false,
        aaProcs, powerRegen, powerAfter: Math.floor(playerPower),
        playerStatusEffects, enemyStatusEffects, abilityUsedId, floatEvents,
        playerStatsSnapshot: { attackRating: playerStats.attackRating, defenseRating: playerStats.defenseRating, mitigation: playerStats.mitigation, avoidance: playerStats.avoidance, critChance: playerStats.critChance, powerRegen },
      });
    }

    // ── Enemy special abilities ───────────────────────────────────────────────
    const frenzyBuff = enemyStatusEffects.find(e => e.type === "frenzy");
    const frenzyDmgBonus = frenzyBuff ? frenzyBuff.value / 100 : 0;

    // Adaptive ability: on tick 1, force the priority ability (last-killing-ability) to fire
    // regardless of its normal trigger type/cooldown — this is the boss "remembering" what worked.
    const priorityAbilityId = (state.enemyData as Record<string, unknown>)?._priorityAbilityId as string | undefined;
    let priorityAbilityFiredThisTick = false;
    if (newTick === 1 && priorityAbilityId && enemy.isBoss) {
      const priorityAbility = (enemy.abilities ?? []).find(a => a.id === priorityAbilityId);
      if (priorityAbility && priorityAbility.triggerType !== "on_hit_proc") {
        // Pre-announce so the player sees the intent before the ability resolves
        const pMsg = `⚠️ ${enemy.name} opens with ${priorityAbility.name} — the ability that last bested you!`;
        combatMessages.push(pMsg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: pMsg, type: "info" });
        // Force-execute by zeroing cooldown (the loop below will pick it up)
        enemyAbilityCooldowns[priorityAbility.id] = 0;
        priorityAbilityFiredThisTick = true;
      }
    }

    for (const ability of (enemy.abilities ?? [])) {
      // On tick 1, skip normal trigger check for the forced priority ability — always execute it
      const isPriorityForced = priorityAbilityFiredThisTick && ability.id === priorityAbilityId;
      if (!isPriorityForced && !shouldEnemyAbilityFirePassive(ability, newTick, enemyHp, enemy.maxHp, enemyAbilityCooldowns)) continue;

      // Set cooldown for this ability
      enemyAbilityCooldowns[ability.id] = ability.cooldownTicks;
      // For once_at_hp, use huge cooldown so it never fires again
      if (ability.triggerType === "once_at_hp") {
        enemyAbilityCooldowns[ability.id] = 9999;
      }
      let abilityLogMsg = `💢 ${enemy.name} uses ${ability.name}!`;

      switch (ability.effectType) {
        case "damage_burst": {
          const baseDmg = Math.floor(ability.effectValue * (1 + frenzyDmgBonus));
          const dmgType = ability.damageType ?? "slash";
          let dmg = baseDmg;
          // Apply player mitigation if not unavoidable
          if (!ability.unavoidable) {
            const mitigMod = 1 - Math.min(0.75, (playerStats.mitigation + aaBonuses.dmgReduction) / 100);
            const avoidRoll = Math.random() * 100;
            if (avoidRoll < playerStats.avoidance) {
              abilityLogMsg = `💨 You evade ${enemy.name}'s ${ability.name}!`;
              combatMessages.push(abilityLogMsg);
              await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
              break;
            }
            dmg = Math.max(1, Math.floor(baseDmg * mitigMod));
          } else {
            // Unavoidable but mitigation still applies partially (50%)
            const mitigMod = 1 - Math.min(0.5, (playerStats.mitigation + aaBonuses.dmgReduction) / 200);
            dmg = Math.max(1, Math.floor(baseDmg * mitigMod));
          }
          // Apply elemental/physical resistance (capped at 50%)
          const abilityResistPct = Math.min(50, playerStats.resistances[dmgType] ?? 0);
          const abilityResistAmt = Math.floor(dmg * abilityResistPct / 100);
          if (abilityResistAmt > 0) {
            dmg = Math.max(1, dmg - abilityResistAmt);
            floatEvents.push({ value: abilityResistAmt, type: "resist" });
          }
          const hpBefore = playerHp;
          playerHp = Math.max(0, playerHp - dmg);
          // Track this ability as the lethal source if it caused a killing blow
          if (enemy.isBoss && hpBefore > 0 && playerHp <= 0) lastEnemyAbilityUsedId = ability.id;
          enemyDamageDealt += dmg;
          floatEvents.push({ value: dmg, type: "enemy" });
          const abilityResistText = abilityResistAmt > 0 ? ` (${abilityResistAmt} resisted)` : "";
          abilityLogMsg = `💥 ${enemy.name} uses ${ability.name}${ability.unavoidable ? " (unavoidable)" : ""}! Deals ${dmg} ${dmgType} damage!${abilityResistText}`;
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "enemyCrit", value: dmg });
          break;
        }
        case "bleed_dot": {
          const alreadyBleeding = playerStatusEffects.some(e => e.id === ability.id);
          if (!alreadyBleeding) {
            playerStatusEffects.push({
              id: ability.id, name: ability.name, icon: "🩸", type: "bleed",
              remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
            });
            abilityLogMsg = `🩸 ${enemy.name} inflicts ${ability.name}! You will bleed for ${ability.effectValue} dmg/tick for ${ability.durationTicks} ticks!`;
          } else {
            abilityLogMsg = `🩸 ${ability.name} refreshed!`;
          }
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "enemyHit", value: ability.effectValue });
          break;
        }
        case "life_drain": {
          const mitigMod = 1 - Math.min(0.5, (playerStats.mitigation + aaBonuses.dmgReduction) / 200);
          const drainAmt = Math.max(1, Math.floor(ability.effectValue * mitigMod));
          const drainHpBefore = playerHp;
          playerHp = Math.max(0, playerHp - drainAmt);
          if (enemy.isBoss && drainHpBefore > 0 && playerHp <= 0) lastEnemyAbilityUsedId = ability.id;
          enemyHp = Math.min(enemy.maxHp, enemyHp + drainAmt);
          enemyDamageDealt += drainAmt;
          abilityLogMsg = `💜 ${enemy.name} uses ${ability.name}! Drains ${drainAmt} HP from you!`;
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "enemyHit", value: drainAmt });
          break;
        }
        case "stun": {
          const alreadyStunned = playerStatusEffects.some(e => e.type === "stun");
          if (!alreadyStunned) {
            playerStatusEffects.push({
              id: ability.id, name: ability.name, icon: "💫", type: "stun",
              remainingTicks: ability.durationTicks, value: 0, source: "enemy",
            });
            abilityLogMsg = `💫 ${enemy.name} uses ${ability.name}! You are stunned for ${ability.durationTicks} tick(s)!`;
          } else {
            break;
          }
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          break;
        }
        case "fear": {
          const alreadyFeared = playerStatusEffects.some(e => e.type === "fear");
          if (!alreadyFeared) {
            playerStatusEffects.push({
              id: ability.id, name: ability.name, icon: "😱", type: "fear",
              remainingTicks: ability.durationTicks, value: 0, source: "enemy",
            });
            abilityLogMsg = `😱 ${enemy.name} uses ${ability.name}! You are gripped by Fear!`;
          } else {
            break;
          }
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          break;
        }
        case "slow": {
          const alreadySlowed = playerStatusEffects.some(e => e.type === "slow");
          if (!alreadySlowed) {
            playerStatusEffects.push({
              id: ability.id, name: ability.name, icon: "🌿", type: "slow",
              remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
            });
            abilityLogMsg = `🌿 ${enemy.name} uses ${ability.name}! Your avoidance is reduced by ${ability.effectValue}% for ${ability.durationTicks} ticks!`;
          } else {
            break;
          }
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          break;
        }
        case "absorb_shield": {
          const alreadyShielded = enemyStatusEffects.some(e => e.type === "shield");
          if (!alreadyShielded) {
            enemyStatusEffects.push({
              id: ability.id, name: ability.name, icon: "🛡️", type: "shield",
              remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
            });
            abilityLogMsg = `🛡️ ${enemy.name} uses ${ability.name}! An absorb shield (${ability.effectValue} HP) is raised!`;
            combatMessages.push(abilityLogMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          }
          break;
        }
        case "self_heal": {
          const healAmt = Math.floor(ability.effectValue);
          const prevHp = enemyHp;
          enemyHp = Math.min(enemy.maxHp, enemyHp + healAmt);
          const actualHeal = enemyHp - prevHp;
          abilityLogMsg = `💚 ${enemy.name} uses ${ability.name}! Restores ${actualHeal} HP!`;
          combatMessages.push(abilityLogMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "heal", value: actualHeal });
          break;
        }
        case "frenzy_buff": {
          const alreadyFrenzy = enemyStatusEffects.some(e => e.type === "frenzy");
          if (!alreadyFrenzy) {
            enemyStatusEffects.push({
              id: ability.id, name: ability.name, icon: "😤", type: "frenzy",
              remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
            });
            abilityLogMsg = `😤 ${enemy.name} uses ${ability.name}! Damage increased by ${ability.effectValue}%!`;
            combatMessages.push(abilityLogMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          }
          break;
        }
        case "avoidance_buff": {
          const alreadyBuff = enemyStatusEffects.some(e => e.type === "buff");
          if (!alreadyBuff) {
            enemyStatusEffects.push({
              id: ability.id, name: ability.name, icon: "💨", type: "buff",
              remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
            });
            abilityLogMsg = `💨 ${enemy.name} uses ${ability.name}! Avoidance increased by ${ability.effectValue}%!`;
            combatMessages.push(abilityLogMsg);
            await db.insert(combatLogTable).values({ characterId, tick: newTick, message: abilityLogMsg, type: "info" });
          }
          break;
        }
      }
    }

    // ── Enemy auto-attack ─────────────────────────────────────────────────────
    if (playerHp > 0) {
      // Apply frenzy buff to enemy damage
      const frenzyMultiplier = 1 + frenzyDmgBonus;
      const effectiveEnemyDmgMin = Math.floor(enemy.damageMin * frenzyMultiplier);
      const effectiveEnemyDmgMax = Math.floor(enemy.damageMax * frenzyMultiplier);

      // Apply slow to player avoidance
      const slowEffect = playerStatusEffects.find(e => e.type === "slow");
      const effectivePlayerAvoidance = Math.max(0, playerStats.avoidance - (slowEffect?.value ?? 0));

      // Fighter ghosts reduce incoming damage by up to 30%
      const effectiveDmgReduction = aaBonuses.dmgReduction + Math.round(partyContrib.damageReduction * 100);

      const enemyAttack = calculateEnemyDamage(
        effectiveEnemyDmgMin, effectiveEnemyDmgMax, enemy.attackRating,
        playerStats.defenseRating, playerStats.mitigation, effectivePlayerAvoidance,
        effectiveDmgReduction, getEnemyAutoAttackDamageType(enemy), playerStats.resistances
      );
      isEnemyCrit = enemyAttack.isCrit;

      let enemyActuallyHit = false;
      if (enemyAttack.avoided) {
        const msg = `You evade ${enemy.name}'s attack!`;
        combatMessages.push(msg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: msg, type: "info" });
        const parryXp = 8 + Math.floor(enemy.level * 0.5);
        applySkillXp("parry", parryXp, character.id).catch(() => {});
      } else {
        enemyActuallyHit = true;
        enemyDamageDealt += enemyAttack.damage;
        playerHp = Math.max(0, playerHp - enemyAttack.damage);
        floatEvents.push({ value: enemyAttack.damage, type: isEnemyCrit ? "enemyCrit" : "enemy" });
        if (enemyAttack.resisted && enemyAttack.resistAmount > 0) {
          floatEvents.push({ value: enemyAttack.resistAmount, type: "resist" });
        }
        const critText = isEnemyCrit ? " 💥 CRITICAL!" : "";
        const frenzyText = frenzyDmgBonus > 0 ? " [FRENZIED]" : "";
        const partyTankText = partyContrib.damageReduction > 0 ? ` [Party: -${Math.round(partyContrib.damageReduction * 100)}% dmg]` : "";
        const resistText = enemyAttack.resisted ? ` (${enemyAttack.resistAmount} resisted)` : "";
        const msg = `${enemy.name} hits you for ${enemyAttack.damage} damage.${critText}${frenzyText}${partyTankText}${resistText}`;
        combatMessages.push(msg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: msg, type: isEnemyCrit ? "enemyCrit" : "enemyHit", value: enemyAttack.damage });

        // Award defense skill XP when taking damage (fire-and-forget)
        if (enemyAttack.damage > 0) {
          const defXp = Math.min(50, 5 + Math.floor(enemyAttack.damage / 20));
          applySkillXp("defense", defXp, character.id).catch(() => {});
        }

        // Ghost party absorbs a share of incoming damage and may become downed
        if (activeParty.length > 0 && enemyActuallyHit) {
          const { updatedParty } = applyPartyDamage(activeParty, ghostInfoList, enemyAttack.damage);
          const downed = updatedParty.filter((m, i) => m.status === "downed" && activeParty[i].status !== "downed");
          for (const d of downed) {
            const ghost = ghostInfoList.find(g => g.id === d.ghostId);
            if (ghost) {
              const downMsg = `💀 ${ghost.name} has been downed!`;
              combatMessages.push(downMsg);
              await db.insert(combatLogTable).values({ characterId, tick: newTick, message: downMsg, type: "info" });
            }
          }
          activeParty = updatedParty;
        }
      }

      // ── on_hit_proc abilities: fire only after enemy lands a hit ────────────
      if (enemyActuallyHit && playerHp > 0) {
        for (const ability of (enemy.abilities ?? [])) {
          if (!shouldOnHitProcFire(ability, enemyAbilityCooldowns)) continue;
          enemyAbilityCooldowns[ability.id] = ability.cooldownTicks;

          // on_hit_proc effects: typically DoTs or debuffs applied on a hit
          let procMsg = `💢 ${enemy.name} procs ${ability.name}!`;
          if (ability.effectType === "bleed_dot") {
            const alreadyBleeding = playerStatusEffects.some(e => e.id === ability.id);
            if (!alreadyBleeding) {
              playerStatusEffects.push({
                id: ability.id, name: ability.name, icon: "🩸", type: "bleed",
                remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
              });
              procMsg = `🩸 ${enemy.name} procs ${ability.name}! You will bleed for ${ability.effectValue} dmg/tick!`;
            }
          } else if (ability.effectType === "slow") {
            const alreadySlowed = playerStatusEffects.some(e => e.type === "slow");
            if (!alreadySlowed) {
              playerStatusEffects.push({
                id: ability.id, name: ability.name, icon: "🌿", type: "slow",
                remainingTicks: ability.durationTicks, value: ability.effectValue, source: "enemy",
              });
              procMsg = `🌿 ${enemy.name} procs ${ability.name}! Your avoidance is reduced by ${ability.effectValue}%!`;
            }
          } else if (ability.effectType === "stun") {
            const alreadyStunned = playerStatusEffects.some(e => e.type === "stun");
            if (!alreadyStunned) {
              playerStatusEffects.push({
                id: ability.id, name: ability.name, icon: "💫", type: "stun",
                remainingTicks: ability.durationTicks, value: 0, source: "enemy",
              });
              procMsg = `💫 ${enemy.name} procs ${ability.name}! You are stunned!`;
            }
          } else if (ability.effectType === "damage_burst") {
            let burstDmg = Math.max(1, Math.floor(ability.effectValue * (1 - Math.min(0.75, (playerStats.mitigation + aaBonuses.dmgReduction) / 100))));
            // Apply player resistance for this damage type (capped at 50%), mirroring the scheduled damage_burst path
            const burstDmgType = ability.damageType ?? "slash";
            const burstResistPct = Math.min(50, playerStats.resistances[burstDmgType] ?? 0);
            const burstResistAmt = Math.floor(burstDmg * burstResistPct / 100);
            if (burstResistAmt > 0) {
              burstDmg = Math.max(1, burstDmg - burstResistAmt);
              floatEvents.push({ value: burstResistAmt, type: "resist" });
            }
            const procHpBefore = playerHp;
            playerHp = Math.max(0, playerHp - burstDmg);
            // Track as lethal source if this on-hit proc kills the player
            if (enemy.isBoss && procHpBefore > 0 && playerHp <= 0) lastEnemyAbilityUsedId = ability.id;
            enemyDamageDealt += burstDmg;
            floatEvents.push({ value: burstDmg, type: "enemy" });
            const burstResistText = burstResistAmt > 0 ? ` (${burstResistAmt} resisted)` : "";
            procMsg = `💥 ${enemy.name} procs ${ability.name}! ${burstDmg} bonus damage!${burstResistText}`;
          }
          combatMessages.push(procMsg);
          await db.insert(combatLogTable).values({ characterId, tick: newTick, message: procMsg, type: "enemyHit" });
        }
      }
    }

    // ── Grudge enrage speed boost: extra auto-attack while grudge-enraged ────────
    // Only fires for the grudge_enrage effect (NOT generic frenzy abilities)
    const grudgeEnrageActive = enemyStatusEffects.some(e => e.id === "grudge_enrage");
    if (grudgeEnrageActive && playerHp > 0) {
      const enrageExtraAttack = calculateEnemyDamage(
        Math.floor(enemy.damageMin * (1 + frenzyDmgBonus)),
        Math.floor(enemy.damageMax * (1 + frenzyDmgBonus)),
        enemy.attackRating, playerStats.defenseRating, playerStats.mitigation,
        Math.max(0, playerStats.avoidance - 10), // reduced avoidance for the speed attack
        aaBonuses.dmgReduction, getEnemyAutoAttackDamageType(enemy), playerStats.resistances,
      );
      if (!enrageExtraAttack.avoided) {
        enemyDamageDealt += enrageExtraAttack.damage;
        playerHp = Math.max(0, playerHp - enrageExtraAttack.damage);
        floatEvents.push({ value: enrageExtraAttack.damage, type: "enemy" });
        if (enrageExtraAttack.resisted && enrageExtraAttack.resistAmount > 0) {
          floatEvents.push({ value: enrageExtraAttack.resistAmount, type: "resist" });
        }
        const enrageResistText = enrageExtraAttack.resisted ? ` (${enrageExtraAttack.resistAmount} resisted)` : "";
        const speedMsg = `🔥 ${enemy.name}'s enraged fury strikes again for ${enrageExtraAttack.damage} damage! [GRUDGE SPEED]${enrageResistText}`;
        combatMessages.push(speedMsg);
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: speedMsg, type: "enemyHit", value: enrageExtraAttack.damage });
      }
    }

    // ── Ghost party Priest healing ────────────────────────────────────────────
    if (partyContrib.healingAmount > 0 && playerHp > 0 && playerHp < maxHp) {
      const healActual = Math.min(partyContrib.healingAmount, maxHp - playerHp);
      playerHp = Math.min(maxHp, playerHp + healActual);
      floatEvents.push({ value: healActual, type: "heal" });
      const priestHealMsg = `✨ Party heals you for ${healActual} HP!`;
      combatMessages.push(priestHealMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: priestHealMsg, type: "heal", value: healActual });

      // Track healing done per ghost healer
      if (activeParty.length > 0) {
        const healerContribs = ghostInfoList
          .filter(g => g.archetype.toLowerCase() === "priest")
          .filter(g => activeParty.some(m => m.ghostId === g.id && m.status !== "downed"))
          .map(g => ({ ghostId: g.id, healingDone: Math.round(healActual / Math.max(1, ghostInfoList.filter(x => x.archetype.toLowerCase() === "priest").length)) }));
        if (healerContribs.length > 0) activeParty = updateGhostStats(activeParty, healerContribs);
      }
    }

    // ── Auto-heal ─────────────────────────────────────────────────────────────
    if (character.autoHeal && playerHp < maxHp * 0.4 && playerPower >= 20) {
      const baseHeal = Math.floor(maxHp * 0.15);
      const healBonus = 1 + aaBonuses.healAmountBonus / 100;
      const healAmt = Math.floor(baseHeal * healBonus);
      playerHp = Math.min(maxHp, playerHp + healAmt);
      playerPower = Math.max(0, playerPower - 20);
      floatEvents.push({ value: healAmt, type: "heal" });
      const healMsg = `💊 Auto-heal: +${healAmt} HP (20 power)`;
      combatMessages.push(healMsg);
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: healMsg, type: "heal", value: healAmt });
    }

    // ── HP Regen AA proc ──────────────────────────────────────────────────────
    if (aaBonuses.hpRegen > 0 && playerHp > 0 && playerHp < maxHp) {
      const regenAmt = Math.min(aaBonuses.hpRegen, maxHp - playerHp);
      if (regenAmt > 0) {
        playerHp = Math.min(maxHp, playerHp + regenAmt);
        floatEvents.push({ value: regenAmt, type: "heal" });
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: `💚 HP Regen: +${regenAmt} HP`, type: "heal", value: regenAmt });
      }
    }

    // ── Auto-potions ──────────────────────────────────────────────────────────
    if (character.autoPotions && playerHp < maxHp * 0.4) {
      const potionRows = await db.select().from(inventoryTable).where(eq(inventoryTable.characterId, characterId));
      const potionItem = potionRows
        .map(r => {
          const d = r.itemData as Record<string, unknown>;
          const staticItem = getItemById(r.itemId);
          const type = staticItem?.type ?? (d.type as string);
          const stats = (staticItem?.stats ?? d.stats) as Record<string, number> | undefined;
          return type === "consumable" && stats?.health ? { ...r, healthGain: stats.health, powerGain: stats.power ?? 0 } : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.healthGain - a.healthGain)[0];

      if (potionItem) {
        const potHeal = potionItem.healthGain;
        const potPwr  = potionItem.powerGain;
        playerHp  = Math.min(maxHp, playerHp + potHeal);
        if (potPwr) playerPower = Math.min(maxPower, playerPower + potPwr);
        if (potionItem.quantity <= 1) {
          await db.delete(inventoryTable).where(eq(inventoryTable.id, potionItem.id));
        } else {
          await db.update(inventoryTable)
            .set({ quantity: potionItem.quantity - 1 })
            .where(eq(inventoryTable.id, potionItem.id));
        }
        const potName = (potionItem.itemData as Record<string,unknown>).name as string || potionItem.itemId;
        const potMsg = `🧪 Auto-potion (${potName}): +${potHeal} HP${potPwr ? ` +${potPwr} Power` : ""}`;
        combatMessages.push(potMsg);
        floatEvents.push({ value: potHeal, type: "heal" });
        await db.insert(combatLogTable).values({ characterId, tick: newTick, message: potMsg, type: "heal", value: potHeal });
      }
    }

    // ── Player death check ────────────────────────────────────────────────────
    let bossWonClosingLine = "";
    if (playerHp <= 0) {
      playerDied = true;
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: "💀 You have been defeated!", type: "playerDied" });

      // Record boss encounter: boss killed the player
      if (enemy.isBoss) {
        const [existingEnc] = await db.select().from(bossEncountersTable)
          .where(and(eq(bossEncountersTable.playerId, character.id), eq(bossEncountersTable.bossId, enemy.id)))
          .limit(1);

        if (existingEnc) {
          await db.update(bossEncountersTable).set({
            bossKills: existingEnc.bossKills + 1,
            lastKillingAbility: lastEnemyAbilityUsedId ?? existingEnc.lastKillingAbility,
            lastEncounteredAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(bossEncountersTable.id, existingEnc.id));
        } else {
          await db.insert(bossEncountersTable).values({
            playerId: character.id,
            bossId: enemy.id,
            playerKills: 0,
            bossKills: 1,
            grudgeLevel: 0,
            lastKillingAbility: lastEnemyAbilityUsedId,
            lastEncounteredAt: new Date(),
          });
        }

        // Invalidate narration cache so next fight gets fresh dialogue reflecting updated history
        invalidateBossNarrationCache(character.id, enemy.id);

        // Generate boss "bossWon" closing line synchronously so it's in the tick response
        const encCtxBossWon: BossEncounterContext = {
          playerKills: existingEnc?.playerKills ?? 0,
          bossKills: (existingEnc?.bossKills ?? 0) + 1,
          grudgeLevel: existingEnc?.grudgeLevel ?? 0,
          lastKillingAbility: lastEnemyAbilityUsedId,
          personality: enemy.personality,
        };
        bossWonClosingLine = await generateBossClosingLine(enemy.id, "bossWon", {
          name: character.name, race: character.race, class: character.class, level: character.level,
        }, encCtxBossWon, character.id).catch(() => "");
      }

      const xpPenalty = Math.floor(character.xp * 0.05);
      const respawnHp = maxHp * 0.5;
      const deathTime = new Date();

      await db.update(charactersTable).set({
        health: respawnHp, xp: Math.max(0, character.xp - xpPenalty),
        deathCount: character.deathCount + 1,
        totalPlayTime: (character.totalPlayTime ?? 0) + 1,
        // Reset lastRegenAt so in-combat time is never counted toward out-of-combat regen
        lastRegenAt: deathTime,
        updatedAt: deathTime,
      }).where(eq(charactersTable.id, character.id));

      const [updatedState] = await db.update(combatStateTable).set({
        active: false, enemyData: null, enemyCurrentHp: 0,
        playerCurrentHp: respawnHp, playerCurrentPower: playerPower,
        playerStatusEffects: [], enemyStatusEffects: [], enemyAbilityCooldowns: {}, playerAbilityCooldowns: {},
        totalPlayerDamage: 0, combatStartMs: null,
        tick: newTick, updatedAt: deathTime,
      }).where(eq(combatStateTable.id, state.id)).returning();

      return res.json({
        playerDamageDealt, enemyDamageDealt, playerDied: true, enemyDied: false,
        loot: [], xpGained: 0, goldGained: 0, combatLog: combatMessages,
        bossClosingLine: bossWonClosingLine || undefined,
        bossClosingOutcome: bossWonClosingLine ? "bossWon" : undefined,
        combatState: formatCombatState(updatedState, { activeAABonuses: activeAALabels }),
        playerHpAfter: respawnHp, enemyHpAfter: enemyHp,
        isCrit, isEnemyCrit, heroicTriggered: false, autoLoopStarted: false,
        aaProcs, powerRegen, powerAfter: Math.floor(playerPower),
        playerStatusEffects: [], enemyStatusEffects: [], abilityUsedId, floatEvents,
        playerStatsSnapshot: { attackRating: playerStats.attackRating, defenseRating: playerStats.defenseRating, mitigation: playerStats.mitigation, avoidance: playerStats.avoidance, critChance: playerStats.critChance, powerRegen },
      });
    }

    // ── Decrement and expire status effects (end of tick, after all actions) ──
    const expiredPlayerEffects: string[] = [];
    for (const effect of playerStatusEffects) {
      effect.remainingTicks--;
      if (effect.remainingTicks <= 0) expiredPlayerEffects.push(effect.id);
    }
    playerStatusEffects = playerStatusEffects.filter(e => e.remainingTicks > 0);
    for (const expired of expiredPlayerEffects) {
      const expMsg = `✅ ${expired} fades.`;
      await db.insert(combatLogTable).values({ characterId, tick: newTick, message: expMsg, type: "info" });
    }
    for (const effect of enemyStatusEffects) {
      effect.remainingTicks--;
    }
    enemyStatusEffects = enemyStatusEffects.filter(e => e.remainingTicks > 0);

    // ── Persist updated party state to run (if party was active) ──────────────
    if (activeRunId !== null && activeParty.length > 0 && !enemyDied) {
      if (activeRunType === "dungeon") {
        await db.update(dungeonRunsTable).set({ party: activeParty }).where(eq(dungeonRunsTable.id, activeRunId)).catch(() => {});
      } else if (activeRunType === "raid") {
        await db.update(raidRunsTable).set({ party: activeParty }).where(eq(raidRunsTable.id, activeRunId)).catch(() => {});
      }
    }

    // ── Save updated state ────────────────────────────────────────────────────
    const [[updatedState]] = await Promise.all([
      db.update(combatStateTable).set({
        enemyCurrentHp: enemyHp, playerCurrentHp: playerHp, playerCurrentPower: playerPower,
        playerStatusEffects,
        enemyStatusEffects,
        enemyAbilityCooldowns,
        playerAbilityCooldowns,
        totalPlayerDamage: (state.totalPlayerDamage ?? 0) + playerSoloDamage,
        tick: newTick, lastTickMs: Date.now(), updatedAt: new Date(),
      }).where(eq(combatStateTable.id, state.id)).returning(),
      db.update(charactersTable).set({
        totalPlayTime: (character.totalPlayTime ?? 0) + 1,
        updatedAt: new Date(),
      }).where(eq(charactersTable.id, character.id)),
    ]);

    res.json({
      playerDamageDealt, enemyDamageDealt, playerDied: false, enemyDied: false,
      loot: [], xpGained: 0, goldGained: 0, combatLog: combatMessages,
      combatState: formatCombatState(updatedState, { activeAABonuses: activeAALabels }),
      playerHpAfter: playerHp, enemyHpAfter: enemyHp,
      isCrit, isEnemyCrit, heroicTriggered: false, autoLoopStarted: false,
      aaProcs, powerRegen, powerAfter: Math.floor(playerPower),
      playerStatusEffects, enemyStatusEffects, abilityUsedId, floatEvents,
      playerStatsSnapshot: { attackRating: playerStats.attackRating, defenseRating: playerStats.defenseRating, mitigation: playerStats.mitigation, avoidance: playerStats.avoidance, critChance: playerStats.critChance, powerRegen },
    });
    return;
  } catch (err) {
    req.log.error({ err }, "Error ticking combat");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/combat/log", async (req, res) => {
  try {
    const logs = await db.select().from(combatLogTable).orderBy(desc(combatLogTable.createdAt)).limit(50);
    res.json(logs.reverse().map(l => ({
      id: String(l.id), tick: l.tick, message: l.message, type: l.type,
      value: l.value || undefined, timestamp: l.createdAt.toISOString(),
      itemData: l.itemData || undefined,
    })));
  } catch (err) {
    req.log.error({ err }, "Error getting combat log");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Return all enemies enriched with abilities and resistances for the front-end */
router.get("/combat/enemies", async (req, res) => {
  try {
    res.json(ENEMIES);
  } catch (err) {
    req.log.error({ err }, "Error getting enemies");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
