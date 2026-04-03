import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { abilityCooldownsTable, combatStateTable, combatLogTable } from "@workspace/db/schema";
import { CLASSES } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const CLASS_FALLBACKS: Record<string, string> = {
  warrior: "guardian", fighter: "guardian", soldier: "guardian",
  mage: "wizard", sorcerer: "wizard", caster: "wizard",
  cleric: "templar", healer: "templar", priest: "templar",
  rogue: "swashbuckler", thief: "assassin", bard: "troubador",
  ranger: "ranger", druid: "warden", shaman: "mystic",
  paladin: "paladin", shadowknight: "shadowknight",
};

export async function getClassAbilities(className: string) {
  const key = className.toLowerCase().replace(/\s+/g, "_");
  const classDef = CLASSES.find(c => c.name.toLowerCase() === className.toLowerCase() || c.id === key);
  if (classDef) return classDef.abilities;
  const fallbackId = CLASS_FALLBACKS[key];
  if (fallbackId) {
    const fallback = CLASSES.find(c => c.id === fallbackId);
    if (fallback) return fallback.abilities;
  }
  return CLASSES[0]?.abilities ?? [];
}

router.get("/abilities", async (req, res) => {
  try {
    const characterId = req.characterId;
    const character = await getOrCreateCharacter(req.characterId);
    const abilities = await getClassAbilities(character.class);

    const cooldowns = await db.select().from(abilityCooldownsTable).where(eq(abilityCooldownsTable.characterId, characterId));
    const cooldownMap = new Map(cooldowns.map(c => [c.abilityId, c]));
    const now = Date.now();

    const result = abilities.map(ability => {
      const cooldownEntry = cooldownMap.get(ability.id);
      let currentCooldown = 0;
      if (cooldownEntry) {
        const remaining = cooldownEntry.cooldownEndsAt.getTime() - now;
        currentCooldown = Math.max(0, Math.round(remaining / 1000));
      }
      return { ...ability, currentCooldown };
    });

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting abilities");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/abilities/:abilityId/activate", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { abilityId } = req.params;
    const character = await getOrCreateCharacter(req.characterId);
    const abilities = await getClassAbilities(character.class);
    const ability = abilities.find(a => a.id === abilityId);

    if (!ability) {
      return res.status(404).json({ success: false, message: "Ability not found" });
    }

    const [cooldownEntry] = await db.select().from(abilityCooldownsTable).where(
      and(eq(abilityCooldownsTable.characterId, characterId), eq(abilityCooldownsTable.abilityId, abilityId))
    );

    if (cooldownEntry && cooldownEntry.cooldownEndsAt.getTime() > Date.now()) {
      const remaining = Math.ceil((cooldownEntry.cooldownEndsAt.getTime() - Date.now()) / 1000);
      return res.json({ success: false, message: `${ability.name} is on cooldown for ${remaining}s` });
    }

    const [combatState] = await db.select().from(combatStateTable)
      .where(eq(combatStateTable.characterId, characterId)).limit(1);
    if (!combatState?.active) {
      return res.json({ success: false, message: "Not in combat" });
    }

    if (character.power < ability.powerCost) {
      return res.json({ success: false, message: "Not enough power" });
    }

    const cooldownEnd = new Date(Date.now() + ability.cooldown * 1000);
    await db.delete(abilityCooldownsTable).where(
      and(eq(abilityCooldownsTable.characterId, characterId), eq(abilityCooldownsTable.abilityId, abilityId))
    );
    await db.insert(abilityCooldownsTable).values({ characterId, abilityId, cooldownEndsAt: cooldownEnd });

    let damageDealt = 0;
    let healAmount = 0;

    if (ability.damage) {
      damageDealt = ability.damage + (ability.damageScale || 1) * character.level * 2;
      if (combatState.enemyCurrentHp > 0) {
        const newEnemyHp = Math.max(0, combatState.enemyCurrentHp - damageDealt);
        await db.update(combatStateTable).set({ enemyCurrentHp: newEnemyHp }).where(eq(combatStateTable.id, combatState.id));
      }
    }

    if (ability.healAmount) {
      healAmount = Math.floor(character.maxHealth * ability.healAmount);
      const newHp = Math.min(character.maxHealth, character.health + healAmount);
      await db.update(combatStateTable).set({ playerCurrentHp: newHp }).where(eq(combatStateTable.id, combatState.id));
    }

    await db.insert(combatLogTable).values({
      characterId,
      tick: combatState.tick,
      message: `You use ${ability.name}!${damageDealt > 0 ? ` (${damageDealt} damage)` : ""}${healAmount > 0 ? ` (healed ${healAmount} HP)` : ""}`,
      type: "ability",
      value: damageDealt || healAmount || 0,
    });

    return res.json({
      success: true,
      message: `${ability.name} activated!`,
      damageDealt,
      healAmount,
      ability: { ...ability, currentCooldown: ability.cooldown },
    });
  } catch (err) {
    req.log.error({ err }, "Error activating ability");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
