import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  charactersTable, combatStateTable, inventoryTable,
  skillsTable, achievementsTable, factionsTable, aaPointsTable,
  collectionsTable, mountsTable, heroicStateTable, abilityCooldownsTable,
  adornmentsTable, combatLogTable, bankItemsTable, gatheringSessionsTable,
} from "@workspace/db/schema";
import { computeStats, computeGearScore, applyAABonuses, makeZeroAABonuses, DUNGEON_GS_GATE } from "../lib/eq2Formulas.js";
import { getItemById, xpForLevel } from "../lib/gameData.js";
import { RACES, CLASSES, AA_TABS, ADORNMENTS } from "../lib/eq2Data.js";
import { eq, inArray, sql, and, isNull, gt } from "drizzle-orm";
import { applySkillXp } from "../lib/skillXp.js";
import { getOrCreateSkills } from "./skills.js";

const router: IRouter = Router();

const ALL_AA_NODES = AA_TABS.flatMap(tab => tab.nodes);

export async function getOrCreateCharacter(characterId: number) {
  const [character] = await db.select().from(charactersTable).where(eq(charactersTable.id, characterId)).limit(1);
  if (!character) throw new Error(`Character ${characterId} not found`);
  return character;
}

export function formatCharacter(char: typeof charactersTable.$inferSelect) {
  const gear = (char.gear as Record<string, unknown>) || {};
  const formattedGear: Record<string, unknown> = {};
  for (const [slot, itemId] of Object.entries(gear)) {
    if (typeof itemId === "string") {
      const item = getItemById(itemId);
      if (item) formattedGear[slot] = item;
    } else if (itemId && typeof itemId === "object") {
      formattedGear[slot] = itemId;
    }
  }
  return {
    id: String(char.id),
    name: char.name,
    race: char.race ?? "human",
    class: char.class,
    archetype: char.archetype ?? "Fighter",
    alignment: char.alignment ?? "Neutral",
    level: char.level,
    xp: char.xp,
    xpToNextLevel: char.xpToNextLevel,
    aaPoints: char.aaPoints ?? 0,
    aaPointsSpent: char.aaPointsSpent ?? 0,
    gold: char.gold,
    health: char.health,
    maxHealth: char.maxHealth,
    power: char.power,
    maxPower: char.maxPower,
    baseStats: char.baseStats,
    gear: formattedGear,
    zone: char.zone,
    activeMount: char.activeMount ?? null,
    autoLoop: char.autoLoop ?? true,
    autoHeal: char.autoHeal ?? true,
    autoPotions: char.autoPotions ?? false,
    isMeditating: char.isMeditating ?? false,
    totalPlayTime: char.totalPlayTime,
    killCount: char.killCount,
    deathCount: char.deathCount,
    createdAt: char.createdAt.toISOString(),
    updatedAt: char.updatedAt.toISOString(),
  };
}

router.get("/character", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    res.json(formatCharacter(character));
  } catch (err) {
    req.log.error({ err }, "Error getting character");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/character", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const [updated] = await db.update(charactersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id))
      .returning();
    res.json(formatCharacter(updated));
  } catch (err) {
    req.log.error({ err }, "Error updating character");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/character/settings", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const { autoLoop, autoHeal, autoPotions, isMeditating } = req.body;

    // Server-side guard: cannot start meditation while in active combat
    let resolvedMeditating = isMeditating !== undefined ? isMeditating : character.isMeditating;
    if (resolvedMeditating) {
      const [combatState] = await db.select({ active: combatStateTable.active }).from(combatStateTable).where(eq(combatStateTable.characterId, req.characterId)).limit(1);
      if (combatState?.active) resolvedMeditating = false;
    }

    const [updated] = await db.update(charactersTable)
      .set({
        autoLoop: autoLoop !== undefined ? autoLoop : character.autoLoop,
        autoHeal: autoHeal !== undefined ? autoHeal : character.autoHeal,
        autoPotions: autoPotions !== undefined ? autoPotions : character.autoPotions,
        isMeditating: resolvedMeditating,
        updatedAt: new Date(),
      })
      .where(eq(charactersTable.id, character.id))
      .returning();
    res.json({
      autoLoop: updated.autoLoop,
      autoHeal: updated.autoHeal,
      autoPotions: updated.autoPotions ?? false,
      isMeditating: updated.isMeditating,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating combat settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/character/stats", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const gear = (character.gear as Record<string, unknown>) || {};
    const baseStats = character.baseStats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number; };

    let gearAttackRating = 0, gearDefenseRating = 0, gearMitigation = 0;
    let gearHaste = 0, gearCritChance = 0, gearCritBonus = 0, gearSpellCritChance = 0;
    let gearWeaponDamageMin = 0, gearWeaponDamageMax = 0, gearWeaponDelay = 2.0;
    let gearHealth = 0, gearPower = 0;
    let hasWeapon = false;
    let gearStrength = 0, gearAgility = 0, gearStamina = 0;
    let gearIntelligence = 0, gearWisdom = 0, gearCharisma = 0;
    let gearResistPierce = 0, gearResistSlash = 0, gearResistCrush = 0;
    let gearResistHeat = 0, gearResistCold = 0, gearResistDivine = 0, gearResistMagic = 0;
    for (const slotValue of Object.values(gear)) {
      let s: Record<string, number> | null = null;
      if (typeof slotValue === "string") {
        const item = getItemById(slotValue);
        if (item) { s = item.stats as Record<string, number>; }
      } else if (slotValue && typeof slotValue === "object") {
        const obj = slotValue as Record<string, unknown>;
        if (obj.stats && typeof obj.stats === "object") s = obj.stats as Record<string, number>;
      }
      if (!s) continue;

      gearAttackRating  += s.attackRating || 0;
      gearDefenseRating += s.defenseRating || 0;
      gearMitigation    += s.mitigation || 0;
      gearHaste         += s.haste || 0;
      gearCritChance    += s.critChance || 0;
      gearCritBonus     += s.critBonus || 0;
      gearSpellCritChance += s.spellCritChance || 0;
      gearHealth        += s.health || 0;
      gearPower         += s.power || 0;
      gearStrength      += s.strength     || 0;
      gearAgility       += s.agility      || 0;
      gearStamina       += s.stamina      || 0;
      gearIntelligence  += s.intelligence || 0;
      gearWisdom        += s.wisdom       || 0;
      gearCharisma      += s.charisma     || 0;
      gearResistPierce  += s.resistPierce || 0;
      gearResistSlash   += s.resistSlash  || 0;
      gearResistCrush   += s.resistCrush  || 0;
      gearResistHeat    += s.resistHeat   || 0;
      gearResistCold    += s.resistCold   || 0;
      gearResistDivine  += s.resistDivine || 0;
      gearResistMagic   += s.resistMagic  || 0;
      if (s.weaponDamageMin) {
        gearWeaponDamageMin = s.weaponDamageMin;
        gearWeaponDamageMax = s.weaponDamageMax || s.weaponDamageMin * 2;
        gearWeaponDelay = s.weaponDelay || 2.0;
        hasWeapon = true;
      }
    }

    if (!hasWeapon) {
      gearWeaponDamageMin = baseStats.strength * 0.5 + character.level;
      gearWeaponDamageMax = baseStats.strength * 1.0 + character.level * 2;
    }

    // ── Adornment bonuses ─────────────────────────────────────────────────────
    const adornRows = await db.select().from(adornmentsTable).where(eq(adornmentsTable.characterId, req.characterId));
    for (const row of adornRows) {
      const def = ADORNMENTS.find(a => a.id === row.adornmentId);
      if (!def) continue;
      for (const { stat, value } of def.stats) {
        switch (stat) {
          case "attackRating":  gearAttackRating  += value; break;
          case "defenseRating": gearDefenseRating += value; break;
          case "mitigation":    gearMitigation    += value; break;
          case "haste":         gearHaste         += value; break;
          case "critChance":    gearCritChance    += value; break;
          case "health":        gearHealth        += value; break;
          case "power":         gearPower         += value; break;
          case "strength":      gearStrength      += value; break;
          case "agility":       gearAgility       += value; break;
          case "stamina":       gearStamina       += value; break;
          case "intelligence":  gearIntelligence  += value; break;
          case "wisdom":        gearWisdom        += value; break;
          case "charisma":      gearCharisma      += value; break;
          case "resistPierce":  gearResistPierce  += value; break;
          case "resistSlash":   gearResistSlash   += value; break;
          case "resistCrush":   gearResistCrush   += value; break;
          case "resistHeat":    gearResistHeat    += value; break;
          case "resistCold":    gearResistCold    += value; break;
          case "resistDivine":  gearResistDivine  += value; break;
          case "resistMagic":   gearResistMagic   += value; break;
        }
      }
    }

    // Load AA bonuses so haste (and other AA-boosted stats) are reflected correctly
    const nodeDefsMap = new Map(ALL_AA_NODES.map(n => [n.id, n]));
    const investedRows = await db.select().from(aaPointsTable).where(and(eq(aaPointsTable.characterId, req.characterId), gt(aaPointsTable.rank, 0)));
    const investedNodes = investedRows
      .map(r => {
        const def = nodeDefsMap.get(r.nodeId);
        if (!def) return null;
        return { effect: def.effect, currentRank: r.rank, effectValue: def.effectValue, effectPerRank: def.effectPerRank };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);
    const aaBonuses = investedNodes.length > 0 ? applyAABonuses(investedNodes) : makeZeroAABonuses();

    const computed = computeStats({
      level: character.level, ...baseStats,
      gearAttackRating, gearDefenseRating, gearMitigation,
      gearHaste, gearCritChance, gearCritBonus, gearSpellCritChance,
      gearWeaponDamageMin, gearWeaponDamageMax, gearWeaponDelay,
      gearHealth, gearPower,
      gearStrength, gearAgility, gearStamina, gearIntelligence, gearWisdom, gearCharisma,
      gearResistPierce, gearResistSlash, gearResistCrush,
      gearResistHeat, gearResistCold, gearResistDivine, gearResistMagic,
      archetype: (character.archetype ?? "Fighter"),
    }, aaBonuses);

    const effStamina = baseStats.stamina + gearStamina;
    const maxHealth = Math.max(1, Math.floor(
      (effStamina * 10 + 50 + (character.level - 1) * 15 + gearHealth)
      * (1 + aaBonuses.maxHpPercent / 100)
    ));

    const gearScore = computeGearScore(gear as Record<string, string>);

    res.json({
      ...computed,
      maxHealth,
      maxPower: computed.totalPower,
      spellCritChance: computed.critChance,
      spellCritBonus: computed.critBonus,
      mountSpeedBonus: 0,
      combatMitigation: computed.mitigation,
      gearScore,
      dungeonAccess: {
        normal:    gearScore >= DUNGEON_GS_GATE.normal,
        expert:    gearScore >= DUNGEON_GS_GATE.expert,
        legendary: gearScore >= DUNGEON_GS_GATE.legendary,
        mythical:  gearScore >= DUNGEON_GS_GATE.mythical,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error computing character stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/character/profile", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const formatted = formatCharacter(character);

    const raceId = (character.race ?? "human").toLowerCase();
    const className = character.class ?? "Guardian";
    const raceDef = RACES.find(r => r.id === raceId) ?? RACES[0];
    const classDef = CLASSES.find(c => c.name.toLowerCase() === className.toLowerCase() || c.id === className.toLowerCase()) ?? CLASSES[0];

    const bs = character.baseStats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };

    // Sum primary-attribute bonuses contributed by each equipped item
    const gearObj = (character.gear as Record<string, unknown>) ?? {};
    const gearPrimaryBonuses: Record<string, number> = {};
    const PRIMARY_ATTRS = ["strength","agility","stamina","intelligence","wisdom","charisma"] as const;
    for (const slotValue of Object.values(gearObj)) {
      let s: Record<string, number> | null = null;
      if (typeof slotValue === "string") {
        const item = getItemById(slotValue);
        if (item?.stats) s = item.stats as Record<string, number>;
      } else if (slotValue && typeof slotValue === "object") {
        const obj = slotValue as Record<string, unknown>;
        if (obj.stats && typeof obj.stats === "object") s = obj.stats as Record<string, number>;
      }
      if (!s) continue;
      for (const attr of PRIMARY_ATTRS) {
        gearPrimaryBonuses[attr] = (gearPrimaryBonuses[attr] ?? 0) + (s[attr] ?? 0);
      }
    }

    const statBreakdown: Record<string, { base: number; race: number; class: number; gear: number; total: number }> = {};
    for (const stat of PRIMARY_ATTRS) {
      const raceBonus  = raceDef.bonuses[stat] ?? 0;
      const classBonus = classDef.statBonuses[stat] ?? 0;
      const gearBonus  = gearPrimaryBonuses[stat] ?? 0;
      const dbBase     = bs[stat] ?? 0;  // stored at creation: raw base + race + class baked in
      const rawBase    = dbBase - raceBonus - classBonus;
      const total      = dbBase + gearBonus;
      statBreakdown[stat] = { base: rawBase, race: raceBonus, class: classBonus, gear: gearBonus, total };
    }

    const [heroicRow] = await db.select().from(heroicStateTable).where(eq(heroicStateTable.characterId, req.characterId)).limit(1);
    const heroicCompletions = heroicRow?.chain ?? 0;

    const totalGoldEarned = Number(character.totalGoldEarned ?? 0);

    res.json({
      ...formatted,
      totalGoldEarned,
      raceDef: {
        id: raceDef.id,
        name: raceDef.name,
        description: raceDef.description,
        lore: raceDef.lore,
        bonuses: raceDef.bonuses,
        racialAbility: raceDef.racialAbility,
        racialAbilityDesc: raceDef.racialAbilityDesc,
        startingZone: raceDef.startingZone,
        allowedAlignments: raceDef.allowedAlignments,
      },
      classDef: {
        id: classDef.id,
        name: classDef.name,
        archetype: classDef.archetype,
        subclassOf: classDef.subclassOf,
        description: classDef.description,
        lore: classDef.lore,
        primaryStat: classDef.primaryStat,
        armorType: classDef.armorType,
        role: classDef.role,
        statBonuses: classDef.statBonuses,
        abilities: classDef.abilities,
      },
      statBreakdown,
      heroicCompletions,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting character profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /character/regen — passive & meditation HP/Power recovery ───────────
// Called by the client on a ~3s interval when not in active combat.
// Calculates elapsed time since last call and restores HP/Power accordingly.
// If isMeditating, applies a skill-level multiplier and awards Meditation XP.
router.post("/character/regen", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    await getOrCreateSkills(character.id);

    const [medSkill] = await db.select({ level: skillsTable.level }).from(skillsTable).where(and(eq(skillsTable.characterId, character.id), eq(skillsTable.skillId, "meditation")));
    const meditationLevel = medSkill?.level ?? 1;

    const bs = character.baseStats as { stamina: number; wisdom: number; intelligence: number };

    // Sum gear primary stat bonuses for more accurate regen
    const gearObj = (character.gear as Record<string, unknown>) ?? {};
    let gearWisdomRegen = 0, gearIntelligenceRegen = 0, gearStaminaRegen = 0;
    for (const slotValue of Object.values(gearObj)) {
      let s: Record<string, number> | null = null;
      if (typeof slotValue === "string") {
        const item = getItemById(slotValue);
        if (item?.stats) s = item.stats as Record<string, number>;
      } else if (slotValue && typeof slotValue === "object") {
        const obj = slotValue as Record<string, unknown>;
        if (obj.stats && typeof obj.stats === "object") s = obj.stats as Record<string, number>;
      }
      if (!s) continue;
      gearWisdomRegen      += s.wisdom      || 0;
      gearIntelligenceRegen += s.intelligence || 0;
      gearStaminaRegen     += s.stamina      || 0;
    }
    const effWisdom      = (bs.wisdom      ?? 10) + gearWisdomRegen;
    const effIntelligence = (bs.intelligence ?? 10) + gearIntelligenceRegen;
    const effStaminaRegen = (bs.stamina     ?? 14) + gearStaminaRegen;

    const baseHpPerSec  = 0.5 + effWisdom * 0.03 + effStaminaRegen * 0.02;
    const basePwrPerSec = 0.3 + effIntelligence * 0.03 + effWisdom * 0.02;
    const medMultiplier = character.isMeditating ? (1 + meditationLevel * 0.05) : 1;
    const regenPerTick = {
      hp:  parseFloat((baseHpPerSec  * medMultiplier * 3).toFixed(1)),
      pwr: parseFloat((basePwrPerSec * medMultiplier * 3).toFixed(1)),
    };

    // No regen during combat; advance timestamp so combat time is not credited later
    const [combatState] = await db.select({ active: combatStateTable.active }).from(combatStateTable).where(eq(combatStateTable.characterId, req.characterId)).limit(1);
    if (combatState?.active) {
      await db.update(charactersTable).set({ lastRegenAt: new Date() }).where(eq(charactersTable.id, character.id));
      res.json({
        health: character.health, maxHealth: character.maxHealth,
        power: character.power, maxPower: character.maxPower,
        hpGain: 0, pwrGain: 0,
        isMeditating: character.isMeditating, meditationLevel,
        regenPerTick: { hp: 0, pwr: 0 },
      });
      return;
    }

    const now = new Date();

    // Bootstrap: initialize lastRegenAt on first call
    if (!character.lastRegenAt) {
      await db.update(charactersTable).set({ lastRegenAt: now }).where(eq(charactersTable.id, character.id));
      res.json({
        health: character.health, maxHealth: character.maxHealth,
        power: character.power, maxPower: character.maxPower,
        hpGain: 0, pwrGain: 0,
        isMeditating: character.isMeditating, meditationLevel, regenPerTick,
      });
      return;
    }

    // Clamp elapsed to [0, 30s]; skip if < 1s (rapid/concurrent call)
    const elapsedSecs = Math.max(0, Math.min(30, (now.getTime() - character.lastRegenAt.getTime()) / 1000));
    if (elapsedSecs < 1) {
      res.json({
        health: character.health, maxHealth: character.maxHealth,
        power: character.power, maxPower: character.maxPower,
        hpGain: 0, pwrGain: 0,
        isMeditating: character.isMeditating, meditationLevel, regenPerTick,
      });
      return;
    }

    const hpGain  = baseHpPerSec  * medMultiplier * elapsedSecs;
    const pwrGain = basePwrPerSec * medMultiplier * elapsedSecs;
    const newHp  = Math.min(character.maxHealth, character.health + hpGain);
    const newPwr = Math.min(character.maxPower,  character.power  + pwrGain);

    // Compare-and-set on lastRegenAt prevents concurrent double-crediting
    const readTimestamp = character.lastRegenAt;
    const updated = await db.update(charactersTable).set({
      health: newHp, power: newPwr, lastRegenAt: now, updatedAt: now,
    }).where(and(
      eq(charactersTable.id, character.id),
      readTimestamp ? eq(charactersTable.lastRegenAt, readTimestamp) : isNull(charactersTable.lastRegenAt),
    )).returning({ id: charactersTable.id });

    if (updated.length === 0) {
      res.json({
        health: character.health, maxHealth: character.maxHealth,
        power: character.power, maxPower: character.maxPower,
        hpGain: 0, pwrGain: 0,
        isMeditating: character.isMeditating, meditationLevel, regenPerTick,
      });
      return;
    }

    if (character.isMeditating && elapsedSecs > 0) {
      const xpPerSec = (10 + meditationLevel * 0.5) / 30;
      const medXp = Math.round(xpPerSec * elapsedSecs);
      if (medXp > 0) await applySkillXp("meditation", medXp, character.id);
    }

    res.json({
      health: newHp, maxHealth: character.maxHealth,
      power: newPwr, maxPower: character.maxPower,
      hpGain: parseFloat(hpGain.toFixed(2)),
      pwrGain: parseFloat(pwrGain.toFixed(2)),
      isMeditating: character.isMeditating,
      meditationLevel, regenPerTick,
    });
  } catch (err) {
    req.log.error({ err }, "Error applying regen");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/character", async (req, res) => {
  try {
    const charId = req.characterId;
    // Wipe only the current character's data in dependency order
    await db.delete(abilityCooldownsTable).where(eq(abilityCooldownsTable.characterId, charId));
    await db.delete(heroicStateTable).where(eq(heroicStateTable.characterId, charId));
    await db.delete(combatLogTable).where(eq(combatLogTable.characterId, charId));
    await db.delete(combatStateTable).where(eq(combatStateTable.characterId, charId));
    await db.delete(adornmentsTable).where(eq(adornmentsTable.characterId, charId));
    await db.delete(inventoryTable).where(eq(inventoryTable.characterId, charId));
    await db.delete(bankItemsTable).where(eq(bankItemsTable.characterId, charId));
    await db.delete(aaPointsTable).where(eq(aaPointsTable.characterId, charId));
    await db.delete(collectionsTable).where(eq(collectionsTable.characterId, charId));
    await db.delete(mountsTable).where(eq(mountsTable.characterId, charId));
    await db.delete(achievementsTable).where(eq(achievementsTable.characterId, charId));
    await db.delete(factionsTable).where(eq(factionsTable.characterId, charId));
    await db.delete(gatheringSessionsTable).where(eq(gatheringSessionsTable.characterId, charId));
    await db.delete(skillsTable).where(eq(skillsTable.characterId, charId));
    await db.delete(charactersTable).where(eq(charactersTable.id, charId));
    return res.json({ success: true, message: "Character deleted. Ready for a new hero." });
  } catch (err) {
    req.log.error({ err }, "Error resetting character");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /character/rivals — list tracked rival ghost players with comparison ──

router.get("/character/rivals", async (req, res) => {
  try {
    const char = await getOrCreateCharacter(req.characterId);
    const rivalIds = (char.rivals as number[] | null) ?? [];

    if (rivalIds.length === 0) {
      res.json([]); return;
    }

    const { worldPlayersTable } = await import("@workspace/db/schema");
    const rivals = await db.select().from(worldPlayersTable)
      .where(inArray(worldPlayersTable.id, rivalIds));

    const playerLevel = char.level ?? 1;
    const playerKills = char.killCount ?? 0;
    const playerGold = Math.round(Number(char.gold) ?? 0);

    const enriched = rivals.map(rival => ({
      ...rival,
      playerLevel,
      playerKills,
      playerGold,
      levelDelta: playerLevel - rival.level,
      killDelta: playerKills - rival.killCount,
      goldDelta: playerGold - Math.round(Number(rival.gold) ?? 0),
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error fetching rivals");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /character/rivals — add or remove a rival ──────────────────────────
// Body: { ghostId: number, action: "add" | "remove" }

router.post("/character/rivals", async (req, res) => {
  try {
    const { ghostId, action } = req.body as { ghostId: number; action: "add" | "remove" };
    if (!ghostId || !action) {
      res.status(400).json({ error: "ghostId and action required" }); return;
    }
    const gId = parseInt(String(ghostId), 10);
    if (isNaN(gId) || gId < 1) {
      res.status(400).json({ error: "ghostId must be a positive integer" }); return;
    }
    if (action !== "add" && action !== "remove") {
      res.status(400).json({ error: "action must be 'add' or 'remove'" }); return;
    }

    // Validate ghost exists in world_players (only required on add)
    if (action === "add") {
      const { worldPlayersTable } = await import("@workspace/db/schema");
      const [ghost] = await db.select({ id: worldPlayersTable.id }).from(worldPlayersTable)
        .where(eq(worldPlayersTable.id, gId)).limit(1);
      if (!ghost) {
        res.status(404).json({ error: "Ghost player not found" }); return;
      }
    }

    const char = await getOrCreateCharacter(req.characterId);
    let rivals: number[] = (char.rivals as number[] | null) ?? [];

    if (action === "add") {
      if (!rivals.includes(gId)) {
        if (rivals.length >= 3) {
          res.status(400).json({ error: "Maximum 3 rivals allowed. Remove one first." }); return;
        }
        rivals = [...rivals, gId];
      }
    } else {
      rivals = rivals.filter(id => id !== gId);
    }

    await db.update(charactersTable)
      .set({ rivals: sql`${JSON.stringify(rivals)}::jsonb` })
      .where(eq(charactersTable.id, char.id));

    res.json({ success: true, rivals });
  } catch (err) {
    req.log.error({ err }, "Error updating rivals");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
