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
  gearSpellCritChance?: number;
  gearWeaponDamageMin: number;
  gearWeaponDamageMax: number;
  gearWeaponDelay: number;
  gearHealth: number;
  gearPower: number;
  gearStrength?: number;
  gearAgility?: number;
  gearStamina?: number;
  gearIntelligence?: number;
  gearWisdom?: number;
  gearCharisma?: number;
  /** Gear-contributed player resistances (percentage points, capped at 50 in computeStats) */
  gearResistPierce?: number;
  gearResistSlash?: number;
  gearResistCrush?: number;
  gearResistHeat?: number;
  gearResistCold?: number;
  gearResistDivine?: number;
  gearResistMagic?: number;
  archetype?: string;
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
  /** Player elemental/physical resistances (0–50 %) keyed by damage type */
  resistances: Record<string, number>;
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
  wardAbsorb: number;
  gatheringSpeed: number;
  craftYield: number;
  /** Reduces material ingredient cost by this % when crafting */
  craftCostReduction: number;
  /** % of melee damage dealt converted to HP (lifesteal) */
  lifestealPct: number;
  /** Flat HP restored per combat tick */
  hpRegen: number;
  /** % bonus to tradeskill (crafting) XP earned */
  tradeskillXpBonus: number;
  /** % bonus XP from boss kills (stacks on top of xpBonus) */
  bossXpBonus: number;
  /** Reduces AA XP cost per point by this % (max 15%) */
  aaXpCostReduction: number;
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
    wardAbsorb: 0, gatheringSpeed: 0, craftYield: 0,
    craftCostReduction: 0, lifestealPct: 0, hpRegen: 0,
    tradeskillXpBonus: 0, bossXpBonus: 0, aaXpCostReduction: 0,
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
      case "ward_absorb":         b.wardAbsorb           += total; break;
      case "gathering_speed":      b.gatheringSpeed       += total; break;
      case "craft_yield":          b.craftYield           += total; break;
      // Compound: boosts both gathering speed and craft yield with one node
      case "gathering_and_craft":  b.gatheringSpeed       += total; b.craftYield += total; break;
      case "craft_cost_reduction": b.craftCostReduction   += total; break;
      case "lifesteal_pct":        b.lifestealPct         += total; break;
      case "hp_regen":             b.hpRegen              += total; break;
      case "tradeskill_xp_bonus":  b.tradeskillXpBonus    += total; break;
      case "boss_xp_bonus":        b.bossXpBonus          += total; break;
      case "aa_xp_cost_reduction": b.aaXpCostReduction    += total; break;
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
  const { level } = stats;
  const bonus = aa ?? makeZeroAABonuses();

  // Effective primary stats = base + gear contributions
  const strength     = stats.strength     + (stats.gearStrength     ?? 0);
  const agility      = stats.agility      + (stats.gearAgility      ?? 0);
  const stamina      = stats.stamina      + (stats.gearStamina      ?? 0);
  const intelligence = stats.intelligence + (stats.gearIntelligence ?? 0);
  const wisdom       = stats.wisdom       + (stats.gearWisdom       ?? 0);

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

  // Archetype-based primary stat damage scaling
  const archetype = (stats.archetype ?? "").toLowerCase();
  let archetypeDmgBonus = 0;
  if (archetype === "fighter") {
    archetypeDmgBonus = Math.floor(strength * 0.3);
  } else if (archetype === "scout") {
    archetypeDmgBonus = Math.floor(agility * 0.3);
  } else if (archetype === "mage") {
    archetypeDmgBonus = Math.floor(intelligence * 0.2);
  } else if (archetype === "priest") {
    archetypeDmgBonus = Math.floor(wisdom * 0.2);
  }

  const weaponDamageMin = (stats.gearWeaponDamageMin || (strength * 0.8 + level * 2)) + archetypeDmgBonus;
  const weaponDamageMax = (stats.gearWeaponDamageMax || (strength * 1.5 + level * 4)) + archetypeDmgBonus;

  // DPS calculation (includes AA crit bonus)
  const avgDmg = (weaponDamageMin + weaponDamageMax) / 2;
  const critMultiplier = 1 + (critChance / 100) * (critBonus / 100);
  const dps = Math.round((avgDmg * critMultiplier) / effectiveDelay * 10) / 10;

  // Power pool: wisdom + intelligence based + AA max power %
  const basePower = Math.floor((wisdom + intelligence) * 5 + stamina * 2 + level * 10 + stats.gearPower);
  const totalPower = Math.floor(basePower * (1 + bonus.maxPowerPercent / 100));

  // Spell crit: intelligence + AA bonus
  const spellCritChance = Math.min(50, Math.floor(intelligence * 0.2 + level * 0.15) + stats.gearCritChance + (stats.gearSpellCritChance ?? 0) + bonus.spellCritChanceBonus);
  const spellCritBonus = 30 + Math.floor(wisdom * 0.4) + (stats.gearCritBonus || 0) + bonus.critBonusBonus;

  // Combat mitigation
  const combatMitigation = Math.min(75, Math.floor(mitigation * 0.6 + avoidance * 0.3));

  // Player resistances: raw gear values capped at 50 % per damage type
  const resistances: Record<string, number> = {
    pierce: Math.min(50, stats.gearResistPierce ?? 0),
    slash:  Math.min(50, stats.gearResistSlash  ?? 0),
    crush:  Math.min(50, stats.gearResistCrush  ?? 0),
    heat:   Math.min(50, stats.gearResistHeat   ?? 0),
    cold:   Math.min(50, stats.gearResistCold   ?? 0),
    divine: Math.min(50, stats.gearResistDivine ?? 0),
    magic:  Math.min(50, stats.gearResistMagic  ?? 0),
  };

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
    resistances,
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
 * EQ2 enemy damage formula.
 * Applies player avoidance, mitigation, AA damage-reduction bonus, and now also
 * the player's elemental/physical resistance for the given damageType.
 */
export function calculateEnemyDamage(
  enemyDamageMin: number,
  enemyDamageMax: number,
  enemyAttackRating: number,
  playerDefenseRating: number,
  playerMitigation: number,
  playerAvoidance: number,
  dmgReductionBonus: number = 0,
  damageType: string = "slash",
  playerResistances: Partial<Record<string, number>> = {}
): { damage: number; avoided: boolean; isCrit: boolean; resisted: boolean; resistAmount: number } {
  // Player avoidance roll
  const avoidRoll = Math.random() * 100;
  if (avoidRoll < playerAvoidance) {
    return { damage: 0, avoided: true, isCrit: false, resisted: false, resistAmount: 0 };
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

  // Elemental/physical resistance (capped at 50 %)
  const resistPct = Math.min(50, playerResistances[damageType] ?? 0);
  const resisted = resistPct > 0;
  const resistAmount = Math.floor(damage * resistPct / 100);
  damage -= resistAmount;

  return { damage: Math.max(1, Math.round(damage)), avoided: false, isCrit, resisted, resistAmount };
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
 * Gear Score: formula matching the authentic WoW GearScoreCalc.lua script.
 *
 * itemGS = floor((itemLevel / rarityDivisor) * slotModifier * enchantModifier * GLOBAL_SCALE)
 *
 * Rarity is a DIVISOR — lower value = rarer = higher GS contribution.
 * Matches rarityModifiers from GearScoreCalc.lua.
 */
export const RARITY_GS_DIVISOR: Record<string, number> = {
  poor:      3.5,
  common:    3.0,
  uncommon:  2.5,
  rare:      1.76,
  epic:      1.6,    // not used in game but keep for completeness
  legendary: 1.4,
  fabled:    1.3,    // one tier above legendary
  mythical:  1.2,    // highest tier
};

// Deprecated aliases — kept for backward compatibility
/** @deprecated Use RARITY_GS_DIVISOR instead */
export const RARITY_GS_MULTIPLIER: Record<string, number> = {
  common: 1, uncommon: 2, rare: 4, legendary: 8, fabled: 12, mythical: 16,
};

/**
 * Per-slot modifiers from GearScoreCalc.lua itemTypeInfo.
 * Maps our slot names to the corresponding Lua INVTYPE values.
 */
export const SLOT_GS_MODIFIER: Record<string, number> = {
  primary:   1.0,    // INVTYPE_WEAPONMAINHAND
  secondary: 1.0,    // INVTYPE_WEAPONOFFHAND / INVTYPE_SHIELD
  ranged:    0.3164, // INVTYPE_RANGED / INVTYPE_RANGEDRIGHT
  head:      1.0,    // INVTYPE_HEAD
  shoulder:  0.75,   // INVTYPE_SHOULDER
  chest:     1.0,    // INVTYPE_CHEST / INVTYPE_ROBE
  waist:     0.75,   // INVTYPE_WAIST
  legs:      1.0,    // INVTYPE_LEGS
  feet:      0.75,   // INVTYPE_FEET
  wrist:     0.5625, // INVTYPE_WRIST
  hands:     0.75,   // INVTYPE_HAND
  back:      0.5625, // INVTYPE_CLOAK
  neck:      0.5625, // INVTYPE_NECK
  ringLeft:  0.5625, // INVTYPE_FINGER
  ringRight: 0.5625, // INVTYPE_FINGER
  charm:     0.5625, // INVTYPE_TRINKET
  earLeft:   0.5625, // no WoW equiv — treat as accessory
  earRight:  0.5625, // no WoW equiv — treat as accessory
};

// Deprecated alias — kept for backward compatibility
/** @deprecated Use SLOT_GS_MODIFIER instead */
export const SLOT_GS_WEIGHT: Record<string, number> = SLOT_GS_MODIFIER;

const GS_GLOBAL_SCALE = 1.7;
const GS_ENCHANT_MODIFIER = 1.05; // treat all equippable gear as enchanted

/** Returns the GS contribution of a single item using the WoW GearScoreCalc.lua formula. */
export function computeItemGSServer(level: number, rarity: string, slot: string): number {
  const divisor = RARITY_GS_DIVISOR[rarity] ?? RARITY_GS_DIVISOR.common;
  const slotMod = SLOT_GS_MODIFIER[slot] ?? 1.0;
  return Math.floor((level / divisor) * slotMod * GS_ENCHANT_MODIFIER * GS_GLOBAL_SCALE);
}

export function computeGearScore(gear: Record<string, string>): number;
export function computeGearScore(equippedItems: Array<{ level: number; rarity: string; slot?: string }>): number;
export function computeGearScore(
  input: Record<string, string> | Array<{ level: number; rarity: string; slot?: string }>,
): number {
  if (Array.isArray(input)) {
    return input.reduce((sum, item) => {
      return sum + computeItemGSServer(item.level, item.rarity, item.slot ?? "");
    }, 0);
  }
  // gear: Record<slot, itemId | itemObject> — look up each item using the slot key for weighting.
  // DB column characters.gear is JSONB and may contain either a plain item ID string or a full
  // resolved item object. Handle both cases.
  // Import is deferred to avoid circular dep risk; gameData does not import eq2Formulas
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getItemById } = require("./gameData.js") as typeof import("./gameData.js");
  return Object.entries(input).reduce((sum, [slot, itemId]) => {
    if (!itemId) return sum;
    if (typeof itemId === "string") {
      const item = getItemById(itemId);
      if (!item) return sum;
      return sum + computeItemGSServer(item.level, item.rarity, slot);
    }
    // itemId is an already-resolved item object stored as JSONB
    const obj = itemId as Record<string, unknown>;
    const level  = typeof obj.level  === "number" ? obj.level  : 0;
    const rarity = typeof obj.rarity === "string" ? obj.rarity : "common";
    return sum + computeItemGSServer(level, rarity, slot);
  }, 0);
}

/**
 * Minimum Gear Score required to enter a dungeon at a given difficulty.
 * Calibrated for the WoW GearScoreCalc.lua formula (rarity as divisor, GLOBAL_SCALE=1.7).
 * With the new formula, a level-20 rare weapon scores ~20 GS; a full set of
 * level-20 rare gear across all 18 slots totals roughly 180–220 GS.
 * Tier benchmarks:
 *  - expert    30: a few uncommon pieces
 *  - legendary 100: mostly rare gear around level 15–20
 *  - mythical  250: legendary/fabled gear at higher levels
 */
export const DUNGEON_GS_GATE: Record<string, number> = {
  normal:    0,
  expert:    30,
  legendary: 100,
  mythical:  250,
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

// ─── Gear Set Bonus Computation ───────────────────────────────────────────────

/** Flat stat boosts accumulated from all active gear set bonuses */
export interface SetStatBoosts {
  attackRating: number;
  defenseRating: number;
  mitigation: number;
  avoidance: number;
  critChance: number;
  haste: number;
  maxHpPercent: number;
  maxPowerPercent: number;
  spellDamage: number;
  spellCritChance: number;
}

export interface SetBonusSummary {
  setId: string;
  setName: string;
  dungeonId: string;
  difficulty: string;
  archetype: string;
  piecesEquipped: number;
  piecesTotal: number;
  /** All bonus tiers, both active (met) and locked (not yet met) */
  bonuses: Array<{ piecesRequired: number; description: string; active: boolean; isProc: boolean; procName?: string }>;
}

export function makeZeroSetBoosts(): SetStatBoosts {
  return {
    attackRating: 0, defenseRating: 0, mitigation: 0, avoidance: 0,
    critChance: 0, haste: 0, maxHpPercent: 0, maxPowerPercent: 0,
    spellDamage: 0, spellCritChance: 0,
  };
}

/**
 * Scan equipped gear for set piece tags, count equipped pieces per set,
 * then apply bonuses for any tier threshold that is met.
 * equippedGear: the character.gear JSONB object (slot → item or itemId string).
 */
export function computeSetBonuses(
  equippedGear: Record<string, unknown>,
  gearSets: import("./dungeonData.js").GearSetDefinition[],
): { summaries: SetBonusSummary[]; statBoosts: SetStatBoosts } {
  const statBoosts = makeZeroSetBoosts();
  const summaries: SetBonusSummary[] = [];

  // Build a map of setId → { count, setName }
  const equippedBySet = new Map<string, { count: number; setName: string }>();
  for (const slotVal of Object.values(equippedGear)) {
    if (!slotVal || typeof slotVal !== "object") continue;
    const item = slotVal as Record<string, unknown>;
    const setId = item["setId"] as string | undefined;
    if (!setId) continue;
    const setName = (item["setName"] as string | undefined) ?? setId;
    const prev = equippedBySet.get(setId) ?? { count: 0, setName };
    equippedBySet.set(setId, { count: prev.count + 1, setName: prev.setName });
  }

  for (const setDef of gearSets) {
    const entry = equippedBySet.get(setDef.id);
    if (!entry || entry.count === 0) continue;

    const piecesEquipped = entry.count;
    const bonuses: SetBonusSummary["bonuses"] = [];

    for (const bonus of setDef.bonuses) {
      const active = piecesEquipped >= bonus.piecesRequired;
      const isProc = !!bonus.effect;
      bonuses.push({
        piecesRequired: bonus.piecesRequired,
        description: bonus.description,
        active,
        isProc,
        procName: bonus.effect?.name,
      });
      if (active && !isProc && bonus.stat && bonus.value !== undefined) {
        const key = bonus.stat as keyof SetStatBoosts;
        if (key in statBoosts) {
          (statBoosts as unknown as Record<string, number>)[key] += bonus.value;
        }
      }
    }

    summaries.push({
      setId: setDef.id,
      setName: entry.setName,
      dungeonId: setDef.dungeonId,
      difficulty: setDef.difficulty,
      archetype: setDef.archetype,
      piecesEquipped,
      piecesTotal: setDef.pieces.length,
      bonuses,
    });
  }

  return { summaries, statBoosts };
}
