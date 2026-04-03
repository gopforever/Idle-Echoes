/**
 * EverQuest 2 combat formulas implementation
 * Based on EQ2 combat math for damage, mitigation, avoidance, and crits
 */

export interface CharacterStats {
  level: number;
  strength: number;
  agility: number;
  stamina: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gearAttackRating: number;
  gearDefenseRating: number;
  gearMitigation: number;
  gearHaste: number;
  gearCritChance: number;
  gearCritBonus: number;
  gearWeaponDamageMin: number;
  gearWeaponDamageMax: number;
  gearWeaponDelay: number;
  gearHealth: number;
  gearPower: number;
}

export interface ComputedStats {
  attackRating: number;
  defenseRating: number;
  mitigation: number;
  avoidance: number;
  critChance: number;
  critBonus: number;
  haste: number;
  dps: number;
  totalPower: number;
  spellCritChance: number;
  spellCritBonus: number;
  weaponDamageMin: number;
  weaponDamageMax: number;
  combatMitigation: number;
}

/** AA bonus modifiers computed from invested Alternate Advancement nodes */
export interface AABonuses {
  critChanceBonus: number;
  avoidanceBonus: number;
  mitigationBonus: number;
  doubleAttackChance: number;
  extraAttackChance: number;
  critBonusBonus: number;
  spellDamageBonus: number;
  spellCritChanceBonus: number;
  maxHpPercent: number;
  maxPowerPercent: number;
  meleeDamageBonus: number;
  hasteBonus: number;
  backstabDamageBonus: number;
  cooldownReduction: number;
  powerCostReduction: number;
  dmgReduction: number;
  divineDamageBonus: number;
  healAmountBonus: number;
  spellPiercing: number;
  goldBonus: number;
  xpBonus: number;
}

export function makeZeroAABonuses(): AABonuses {
  return {
    critChanceBonus: 0, avoidanceBonus: 0, mitigationBonus: 0,
    doubleAttackChance: 0, extraAttackChance: 0, critBonusBonus: 0,
    spellDamageBonus: 0, spellCritChanceBonus: 0, maxHpPercent: 0,
    maxPowerPercent: 0, meleeDamageBonus: 0, hasteBonus: 0,
    backstabDamageBonus: 0, cooldownReduction: 0, powerCostReduction: 0,
    dmgReduction: 0, divineDamageBonus: 0, healAmountBonus: 0,
    spellPiercing: 0, goldBonus: 0, xpBonus: 0,
  };
}

/**
 * Compute cumulative AA bonuses from invested node ranks.
 * Each node provides effectValue per rank (some add effectPerRank per additional rank).
 */
export function applyAABonuses(nodes: Array<{
  effect: string; currentRank: number; effectValue: number; effectPerRank: number;
}>): AABonuses {
  const b = makeZeroAABonuses();
  for (const node of nodes) {
    if (node.currentRank <= 0) continue;
    // Rank 1 grants effectValue; each additional rank grants effectPerRank
    const total = node.effectValue + node.effectPerRank * (node.currentRank - 1);
    switch (node.effect) {
      case "crit_chance":         b.critChanceBonus      += total; break;
      case "avoidance":           b.avoidanceBonus       += total; break;
      case "mitigation":          b.mitigationBonus      += total; break;
      case "double_attack":       b.doubleAttackChance   += total; break;
      case "extra_attack_chance": b.extraAttackChance    += total; break;
      case "crit_bonus":          b.critBonusBonus       += total; break;
      case "spell_damage":        b.spellDamageBonus     += total; break;
      case "spell_crit_chance":   b.spellCritChanceBonus += total; break;
      case "max_hp":              b.maxHpPercent         += total; break;
      case "max_power":           b.maxPowerPercent      += total; break;
      case "melee_damage":        b.meleeDamageBonus     += total; break;
      case "haste":               b.hasteBonus           += total; break;
      case "backstab_damage":     b.backstabDamageBonus  += total; break;
      case "cooldown_reduction":  b.cooldownReduction    += total; break;
      case "power_cost_reduction":b.powerCostReduction   += total; break;
      case "dmg_reduction":       b.dmgReduction         += total; break;
      case "divine_damage":       b.divineDamageBonus    += total; break;
      case "heal_amount":         b.healAmountBonus      += total; break;
      case "spell_piercing":      b.spellPiercing        += total; break;
      case "gold_bonus":          b.goldBonus            += total; break;
      case "xp_bonus":            b.xpBonus              += total; break;
    }
  }
  return b;
}

/** Optional skill levels that feed into computeStats bonuses */
export interface SkillLevels {
  combat?: number;
  archery?: number;
  defense?: number;
  magic?: number;
}

export function computeStats(stats: CharacterStats, aa?: AABonuses, skills?: SkillLevels): ComputedStats {
  const { level, strength, agility, stamina, intelligence, wisdom } = stats;
  const bonus = aa ?? makeZeroAABonuses();

  // Skill-level bonuses (each skill level ≈ 0.5 attack / 0.4 defense bonus)
  const combatSkillLvl  = skills?.combat  ?? 1;
  const archerySkillLvl = skills?.archery ?? 1;
  const defenseSkillLvl = skills?.defense ?? 1;
  const offensiveSkillBonus = Math.floor((combatSkillLvl + archerySkillLvl - 2) * 0.5);
  const defensiveSkillBonus = Math.floor((defenseSkillLvl - 1) * 0.4);

  // Attack Rating: Strength-based with level scaling + AA melee damage + skill bonus
  const baseAttackRating = Math.floor(strength * 2.5 + level * 8) + offensiveSkillBonus;
  const attackRating = baseAttackRating + stats.gearAttackRating;

  // Defense Rating: Agility + Stamina based + skill bonus
  const baseDefenseRating = Math.floor(agility * 1.8 + stamina * 1.2 + level * 5) + defensiveSkillBonus;
  const defenseRating = baseDefenseRating + stats.gearDefenseRating;

  // Mitigation: stamina-based physical damage reduction (%) + AA flat bonus
  const baseMitigation = Math.floor(stamina * 0.8 + level * 3);
  const totalMitigation = baseMitigation + stats.gearMitigation + bonus.mitigationBonus;
  const mitigation = Math.min(80, totalMitigation);

  // Avoidance: agility-based + AA bonus
  const avoidance = Math.min(70, Math.floor(agility * 0.5 + level * 0.8) + 5 + bonus.avoidanceBonus);

  // Crit chance: agility + AA bonus
  const baseCritChance = Math.floor(agility * 0.15 + level * 0.2);
  const critChance = Math.min(50, baseCritChance + stats.gearCritChance + bonus.critChanceBonus);

  // Crit bonus: intelligence + AA bonus
  const critBonus = 30 + Math.floor(intelligence * 0.5) + (stats.gearCritBonus || 0) + bonus.critBonusBonus;

  // Haste: gear + AA haste bonus
  const haste = Math.min(100, stats.gearHaste + bonus.hasteBonus);

  // Weapon damage with haste modifier
  const baseWeaponDelay = stats.gearWeaponDelay || 2.0;
  const effectiveDelay = baseWeaponDelay * (1 - haste / 200);

  const weaponDamageMin = stats.gearWeaponDamageMin || (strength * 0.8 + level * 2);
  const weaponDamageMax = stats.gearWeaponDamageMax || (strength * 1.5 + level * 4);

  // DPS calculation (includes AA crit bonus)
  const avgDmg = (weaponDamageMin + weaponDamageMax) / 2;
  const critMultiplier = 1 + (critChance / 100) * (critBonus / 100);
  const dps = Math.round((avgDmg * critMultiplier) / effectiveDelay * 10) / 10;

  // Power pool: wisdom + intelligence based + AA max power %
  const basePower = Math.floor((wisdom + intelligence) * 5 + stamina * 2 + level * 10 + stats.gearPower);
  const totalPower = Math.floor(basePower * (1 + bonus.maxPowerPercent / 100));

  // Spell crit: intelligence + AA bonus
  const spellCritChance = Math.min(50, Math.floor(intelligence * 0.2 + level * 0.15) + stats.gearCritChance + bonus.spellCritChanceBonus);
  const spellCritBonus = 30 + Math.floor(wisdom * 0.4) + (stats.gearCritBonus || 0) + bonus.critBonusBonus;

  // Combat mitigation
  const combatMitigation = Math.min(75, Math.floor(mitigation * 0.6 + avoidance * 0.3));

  return {
    attackRating,
    defenseRating,
    mitigation,
    avoidance,
    critChance,
    critBonus,
    haste,
    dps,
    totalPower,
    spellCritChance,
    spellCritBonus,
    weaponDamageMin: Math.max(1, Math.floor(weaponDamageMin)),
    weaponDamageMax: Math.max(2, Math.floor(weaponDamageMax)),
    combatMitigation,
  };
}

/**
 * EQ2 damage formula with damage type and elemental resistance
 */
export function calculatePlayerDamage(
  playerStats: ComputedStats,
  enemyMitigation: number,
  enemyDefenseRating: number,
  enemyAvoidance: number,
  isCrit: boolean,
  damageType: string = "slash",
  enemyResistances: Partial<Record<string, number>> = {},
  meleeDamageBonus: number = 0
): { damage: number; avoided: boolean; resisted: boolean; resistAmount: number } {
  // Avoidance roll
  const avoidRoll = Math.random() * 100;
  if (avoidRoll < enemyAvoidance) {
    return { damage: 0, avoided: true, resisted: false, resistAmount: 0 };
  }

  // Base weapon damage (melee damage AA bonus as %)
  const rawDmg = (playerStats.weaponDamageMin +
    Math.random() * (playerStats.weaponDamageMax - playerStats.weaponDamageMin))
    * (1 + meleeDamageBonus / 100);

  // Attack rating vs defense rating modifier (EQ2 bell curve)
  const ratingDiff = playerStats.attackRating - enemyDefenseRating;
  const ratingMod = Math.max(0.5, Math.min(1.5, 1.0 + ratingDiff / 500));

  // Mitigation reduces incoming damage
  const mitigationMod = 1 - Math.min(0.75, enemyMitigation / 100);

  let damage = rawDmg * ratingMod * mitigationMod;

  // Critical hit
  if (isCrit) {
    damage *= (1 + playerStats.critBonus / 100);
  }

  // Elemental resistance on top (capped at 50%)
  const resistPct = Math.min(50, enemyResistances[damageType] ?? 0);
  const resisted = resistPct > 0;
  const resistAmount = Math.floor(damage * resistPct / 100);
  damage = damage - resistAmount;

  return { damage: Math.max(1, Math.round(damage)), avoided: false, resisted, resistAmount };
}

/**
 * EQ2 enemy damage formula
 */
export function calculateEnemyDamage(
  enemyDamageMin: number,
  enemyDamageMax: number,
  enemyAttackRating: number,
  playerDefenseRating: number,
  playerMitigation: number,
  playerAvoidance: number,
  dmgReductionBonus: number = 0
): { damage: number; avoided: boolean; isCrit: boolean } {
  // Player avoidance roll
  const avoidRoll = Math.random() * 100;
  if (avoidRoll < playerAvoidance) {
    return { damage: 0, avoided: true, isCrit: false };
  }

  // Enemy crit (~10% base)
  const isCrit = Math.random() < 0.10;

  const rawDmg = enemyDamageMin + Math.random() * (enemyDamageMax - enemyDamageMin);

  // Attack vs defense modifier
  const ratingDiff = enemyAttackRating - playerDefenseRating;
  const ratingMod = Math.max(0.5, Math.min(1.5, 1.0 + ratingDiff / 500));

  // Player mitigation + AA damage reduction
  const effectiveMit = Math.min(playerMitigation + dmgReductionBonus, 75);
  const mitigationMod = 1 - effectiveMit / 100;

  let damage = rawDmg * ratingMod * mitigationMod;

  if (isCrit) {
    damage *= 1.3;
  }

  return { damage: Math.max(1, Math.round(damage)), avoided: false, isCrit };
}

/**
 * EQ2 XP formula based on level difference + AA xp bonus
 */
export function calculateXpGain(baseXp: number, playerLevel: number, enemyLevel: number, xpBonus: number = 0): number {
  const levelDiff = enemyLevel - playerLevel;
  let xpMod = 1.0;

  if (levelDiff >= 5) xpMod = 1.5;
  else if (levelDiff >= 3) xpMod = 1.25;
  else if (levelDiff >= 1) xpMod = 1.1;
  else if (levelDiff === 0) xpMod = 1.0;
  else if (levelDiff === -1) xpMod = 0.9;
  else if (levelDiff <= -5) xpMod = 0.3;
  else if (levelDiff <= -3) xpMod = 0.6;

  return Math.round(baseXp * xpMod * (1 + xpBonus / 100));
}

export function xpForLevel(level: number): number {
  return Math.floor(83 * Math.pow(level, 1.5));
}

/**
 * Gear Score: WoW GearScore-style slot-weighted formula.
 * Rarity multipliers: common=1, uncommon=2, rare=4, legendary=8, fabled=12, mythical=16
 * Slot weights: weapons (2.5×) > chest/legs (1.25×) > armor (1.0×) > accessories (0.75×) > jewelry (0.5×)
 *
 * Primary signature: computeGearScore(gear: Record<slot,itemId>) where keys are slot names.
 * Legacy signature: computeGearScore(items: Array<{level,rarity,slot?}>) also supported.
 */
export const RARITY_GS_MULTIPLIER: Record<string, number> = {
  common: 1, uncommon: 2, rare: 4, legendary: 8, fabled: 12, mythical: 16,
};

/**
 * Per-slot weight for Gear Score computation.
 * Mirrors the WoW GearScoreLite approach: weapons carry the most weight,
 * jewelry the least. Average weight across all 18 slots ≈ 1.0 so total GS
 * remains on a comparable scale to the previous flat formula.
 */
export const SLOT_GS_WEIGHT: Record<string, number> = {
  primary:   2.5,
  secondary: 2.5,
  ranged:    2.5,
  chest:     1.25,
  legs:      1.25,
  head:      1.0,
  shoulder:  1.0,
  hands:     1.0,
  feet:      1.0,
  back:      0.75,
  waist:     0.75,
  wrist:     0.75,
  neck:      0.75,
  charm:     0.75,
  earLeft:   0.5,
  earRight:  0.5,
  ringLeft:  0.5,
  ringRight: 0.5,
};

export function computeGearScore(gear: Record<string, string>): number;
export function computeGearScore(equippedItems: Array<{ level: number; rarity: string; slot?: string }>): number;
export function computeGearScore(
  input: Record<string, string> | Array<{ level: number; rarity: string; slot?: string }>,
): number {
  if (Array.isArray(input)) {
    return input.reduce((sum, item) => {
      const mult = RARITY_GS_MULTIPLIER[item.rarity] ?? 1;
      const slotWeight = SLOT_GS_WEIGHT[item.slot ?? ""] ?? 1.0;
      return sum + Math.round(item.level * slotWeight * mult);
    }, 0);
  }
  // gear: Record<slot, itemId> — look up each item using the slot key for weighting
  // Import is deferred to avoid circular dep risk; gameData does not import eq2Formulas
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getItemById } = require("./gameData.js") as typeof import("./gameData.js");
  return Object.entries(input).reduce((sum, [slot, itemId]) => {
    if (!itemId || typeof itemId !== "string") return sum;
    const item = getItemById(itemId);
    if (!item) return sum;
    const mult = RARITY_GS_MULTIPLIER[item.rarity] ?? 1;
    const slotWeight = SLOT_GS_WEIGHT[slot] ?? 1.0;
    return sum + Math.round(item.level * slotWeight * mult);
  }, 0);
}

/**
 * Minimum Gear Score required to enter a dungeon at a given difficulty.
 * Calibrated for the slot-weighted formula where all weapons are 2.5×.
 * With weapons at 2.5×, the GS scale is significantly amplified vs the old flat formula.
 * Tier benchmarks (typical player at that threshold):
 *  - expert   ~100: starter uncommon weapon (lv8 = 40 GS) + a couple uncommon armor pieces
 *  - legendary ~500: rare weapon (lv20 = 200 GS) + uncommon/rare in most other slots
 *  - mythical ~1500: legendary/fabled weapons (lv35+ = 875+ GS) + rare armor
 */
export const DUNGEON_GS_GATE: Record<string, number> = {
  normal:    0,
  expert:    100,
  legendary: 500,
  mythical:  1500,
};

/**
 * Difficulty multipliers applied to enemy HP and damage inside a dungeon.
 */
export const DUNGEON_DIFFICULTY_MULTIPLIER: Record<string, number> = {
  normal: 1.0,
  expert: 1.5,
  legendary: 2.0,
  mythical: 3.0,
};
