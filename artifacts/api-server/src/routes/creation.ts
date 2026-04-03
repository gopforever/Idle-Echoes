import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, charactersTable, combatStateTable, combatLogTable, achievementsTable, factionsTable, aaPointsTable, collectionsTable, mountsTable, heroicStateTable, abilityCooldownsTable } from "@workspace/db/schema";
import { RACES, CLASSES, FACTIONS } from "../lib/eq2Data.js";
import { xpForLevel } from "../lib/gameData.js";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/creation/options", async (req, res) => {
  try {
    return res.json({
      races: RACES.map(r => ({
        id: r.id, name: r.name, description: r.description, lore: r.lore,
        bonuses: r.bonuses, racialAbility: r.racialAbility,
        racialAbilityDesc: r.racialAbilityDesc, startingZone: r.startingZone,
        spriteId: r.spriteId, allowedAlignments: r.allowedAlignments,
      })),
      classes: CLASSES.map(c => ({
        id: c.id, name: c.name, archetype: c.archetype, subclassOf: c.subclassOf,
        description: c.description, lore: c.lore, primaryStat: c.primaryStat,
        armorType: c.armorType, role: c.role,
        abilities: c.abilities.map(a => a.id),
        spriteId: c.spriteId, allowedAlignments: c.allowedAlignments,
      })),
      alignments: ["Qeynos", "Freeport", "Neutral"],
    });
  } catch (err) {
    req.log.error({ err }, "Error getting creation options");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/creation/create", async (req, res) => {
  try {
    // Require authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: "You must be logged in to create a character" });
    }

    const { name, raceId, classId, alignment } = req.body;
    if (!name || !raceId || !classId || !alignment) {
      return res.status(400).json({ error: "name, raceId, classId, and alignment are required" });
    }

    const raceDef = RACES.find(r => r.id === raceId);
    const classDef = CLASSES.find(c => c.id === classId);
    if (!raceDef) return res.status(400).json({ error: "Unknown race" });
    if (!classDef) return res.status(400).json({ error: "Unknown class" });

    // Enforce 3-character cap
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(charactersTable)
      .where(eq(charactersTable.userId, req.session.userId));
    if (Number(count) >= 3) {
      return res.status(400).json({ error: "You already have 3 characters. Delete one to create another." });
    }

    const baseStats = {
      strength: 15 + (raceDef.bonuses.strength || 0) + (classDef.statBonuses.strength || 0),
      agility:  12 + (raceDef.bonuses.agility  || 0) + (classDef.statBonuses.agility  || 0),
      stamina:  14 + (raceDef.bonuses.stamina  || 0) + (classDef.statBonuses.stamina  || 0),
      intelligence: 10 + (raceDef.bonuses.intelligence || 0) + (classDef.statBonuses.intelligence || 0),
      wisdom: 10 + (raceDef.bonuses.wisdom || 0) + (classDef.statBonuses.wisdom || 0),
      charisma: 8 + (raceDef.bonuses.charisma || 0) + (classDef.statBonuses.charisma || 0),
    };

    const maxHealth = Math.max(baseStats.stamina * 12 + 60, 80);
    const maxPower = Math.max((baseStats.wisdom + baseStats.intelligence) * 6 + 30, 50);

    // Create new character linked to this user — do NOT wipe other characters
    const [character] = await db.insert(charactersTable).values({
      userId: req.session.userId,
      name: name.trim().slice(0, 32),
      race: raceId,
      class: classDef.name,
      archetype: classDef.archetype,
      alignment,
      level: 1, xp: 0, xpToNextLevel: xpForLevel(1),
      aaPoints: 0, aaPointsSpent: 0,
      gold: 300 + (alignment === "Freeport" ? 100 : 0),
      health: maxHealth, maxHealth, power: maxPower, maxPower,
      baseStats, gear: {}, zone: alignment === "Freeport" ? "Commonlands" : "Antonica",
      autoLoop: true, autoHeal: true,
      totalPlayTime: 0, killCount: 0, deathCount: 0,
    }).returning();

    // Seed faction standings for this character
    for (const faction of FACTIONS) {
      let standing = 0;
      if (faction.id === alignment.toLowerCase()) standing = 2000;
      if (faction.id === "qeynos" && alignment === "Qeynos") standing = 3000;
      if (faction.id === "freeport" && alignment === "Freeport") standing = 3000;

      await db.insert(factionsTable).values({ characterId: character.id, factionId: faction.id, standing }).onConflictDoNothing();
    }

    // Set this as the active character in the session
    req.session.activeCharacterId = character.id;

    const result = {
      id: String(character.id), name: character.name, race: character.race,
      class: character.class, archetype: character.archetype, alignment: character.alignment,
      level: character.level, xp: character.xp, xpToNextLevel: character.xpToNextLevel,
      aaPoints: character.aaPoints, aaPointsSpent: character.aaPointsSpent,
      gold: character.gold, health: character.health, maxHealth: character.maxHealth,
      power: character.power, maxPower: character.maxPower, baseStats: character.baseStats,
      gear: {}, zone: character.zone, activeMount: null,
      autoLoop: character.autoLoop, autoHeal: character.autoHeal,
      totalPlayTime: 0, killCount: 0, deathCount: 0,
      createdAt: character.createdAt.toISOString(), updatedAt: character.updatedAt.toISOString(),
    };
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error creating character");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
