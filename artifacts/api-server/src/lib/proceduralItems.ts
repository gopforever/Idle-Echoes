/**
 * Procedural Item Generation — Task #11
 * Generates stat-scaled gear drops and named unique items based on zone/level/rarity.
 * Uses an EQ2-style prefix + base + suffix naming system.
 */

import type { Item, ItemStats } from "./gameData.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProceduralRarity = "common" | "uncommon" | "rare" | "legendary" | "fabled";

// ─── Rarity weights ───────────────────────────────────────────────────────────

const RARITY_WEIGHTS: Array<{ rarity: ProceduralRarity; weight: number }> = [
  { rarity: "common",    weight: 60 },
  { rarity: "uncommon",  weight: 25 },
  { rarity: "rare",      weight: 10 },
  { rarity: "legendary", weight: 4  },
  { rarity: "fabled",    weight: 1  },
];

const RARITY_STAT_MULT: Record<ProceduralRarity, number> = {
  common:    1.0,
  uncommon:  1.4,
  rare:      2.0,
  legendary: 3.2,
  fabled:    5.0,
};

const RARITY_SELL_MULT: Record<ProceduralRarity, number> = {
  common:    1,
  uncommon:  3,
  rare:      10,
  legendary: 40,
  fabled:    150,
};

// ─── EQ2-style Prefix / Base / Suffix pools ───────────────────────────────────

const PREFIXES_BY_RARITY: Record<ProceduralRarity, string[]> = {
  common:    ["Worn", "Battered", "Cracked", "Plain", "Simple", "Old"],
  uncommon:  ["Rough", "Crude", "Sturdy", "Solid", "Reinforced", "Forged"],
  rare:      ["Runed", "Inscribed", "Tempest", "Warded", "Hallowed", "Shadow"],
  legendary: ["Legendary", "Ancient", "Gleaming", "Gilded", "Sundered", "Iron-Willed"],
  fabled:    ["Fabled", "Mythic", "Eternal", "Transcendent", "Worldbreaker", "Undying"],
};

const SUFFIXES_BY_RARITY: Record<ProceduralRarity, string[]> = {
  common:    ["", "", ""],
  uncommon:  ["of the Wilds", "of the Adventurer", "of Resilience", ""],
  rare:      ["of Power", "of the Storm", "of the Ages", "of the Void"],
  legendary: ["of the Conqueror", "of Norrath", "of the Ancients", "of Might"],
  fabled:    ["of the Forsaken", "of the Tribunal", "of Destiny", "of the Gods"],
};

// ─── Zone loot config (11 zones) ─────────────────────────────────────────────

interface ZoneLootConfig {
  levelRange: [number, number];
  armorTypes: string[];
  weaponTypes: string[];
  enemyThemes: string[];
  bonusDropChance: number;
}

export const ZONE_LOOT_CONFIG: Record<string, ZoneLootConfig> = {
  "Commonlands": {
    levelRange: [1, 10],
    armorTypes: ["Leather", "Cloth", "Hide"],
    weaponTypes: ["Short Sword", "Dagger", "Staff"],
    enemyThemes: ["Gnoll", "Skeleton", "Zombie"],
    bonusDropChance: 0,
  },
  "Antonica": {
    levelRange: [5, 15],
    armorTypes: ["Leather", "Ringmail", "Bronze"],
    weaponTypes: ["Longsword", "Mace", "Bow"],
    enemyThemes: ["Orc", "Skeleton", "Rat"],
    bonusDropChance: 0,
  },
  "Thundering Steppes": {
    levelRange: [15, 25],
    armorTypes: ["Iron", "Chainmail", "Studded"],
    weaponTypes: ["Greatsword", "War Hammer", "Crossbow"],
    enemyThemes: ["Gnoll", "Giant", "Stormcaller"],
    bonusDropChance: 0.02,
  },
  "Nektulos Forest": {
    levelRange: [20, 30],
    armorTypes: ["Shadow", "Darkened", "Void"],
    weaponTypes: ["Shadow Blade", "Wand", "Short Bow"],
    enemyThemes: ["Undead", "Vampire", "Revenant"],
    bonusDropChance: 0.03,
  },
  "Enchanted Lands": {
    levelRange: [25, 35],
    armorTypes: ["Fae-Woven", "Enchanted", "Sylvan"],
    weaponTypes: ["Fae Bow", "Wand of Power", "Sylvan Staff"],
    enemyThemes: ["Darkfae", "Treant", "Brownies"],
    bonusDropChance: 0.03,
  },
  "Zek, the Orcish Wastes": {
    levelRange: [28, 38],
    armorTypes: ["Rallosian", "Warchief", "Battled"],
    weaponTypes: ["War Axe", "Battle Mace", "Siege Bow"],
    enemyThemes: ["Orc", "Rallosian", "Warlord"],
    bonusDropChance: 0.04,
  },
  "Everfrost Peaks": {
    levelRange: [30, 40],
    armorTypes: ["Frosteel", "Ice-Tempered", "Glacial"],
    weaponTypes: ["Frost Axe", "Ice Staff", "Frozen Blade"],
    enemyThemes: ["Frost Giant", "Ice Construct", "Yeti"],
    bonusDropChance: 0.04,
  },
  "Lavastorm Mountains": {
    levelRange: [35, 50],
    armorTypes: ["Magmatic", "Dragonscale", "Infernal"],
    weaponTypes: ["Flamebrand", "Lava Staff", "Volcanic Hammer"],
    enemyThemes: ["Drake", "Fire Elemental", "Nagafen"],
    bonusDropChance: 0.05,
  },
  "Lesser Faydark": {
    levelRange: [30, 42],
    armorTypes: ["Feyiron", "Faydwer", "Pixie-Woven"],
    weaponTypes: ["Faydark Blade", "Root Wand", "Faerie Bow"],
    enemyThemes: ["Faerie Dragon", "Brownie", "Treant"],
    bonusDropChance: 0.04,
  },
  "Feerrott": {
    levelRange: [30, 42],
    armorTypes: ["Troll-Hide", "Lizardscale", "Ancient Stone"],
    weaponTypes: ["Tribal Club", "Venom Staff", "Swamp Blade"],
    enemyThemes: ["Lizardman", "Troll", "Temple Construct"],
    bonusDropChance: 0.04,
  },
  "Blackburrow": {
    levelRange: [10, 25],
    armorTypes: ["Gnoll-Skin", "Burrow", "Rough-Iron"],
    weaponTypes: ["Gnoll Cleaver", "Bone Staff", "Burrow Crossbow"],
    enemyThemes: ["Gnoll", "Gnoll Shaman", "Warlord"],
    bonusDropChance: 0.02,
  },
};

const DEFAULT_ZONE_CONFIG: ZoneLootConfig = {
  levelRange: [1, 10],
  armorTypes: ["Leather", "Iron", "Cloth"],
  weaponTypes: ["Sword", "Staff", "Dagger"],
  enemyThemes: ["Creature", "Warrior", "Mage"],
  bonusDropChance: 0,
};

// ─── Slot definitions ─────────────────────────────────────────────────────────

const WEAPON_SLOTS = ["primary", "secondary"] as const;
const ARMOR_SLOTS = ["head", "chest", "shoulder", "back", "wrist", "hands", "waist", "legs", "feet"] as const;
const ACCESSORY_SLOTS = ["neck", "ear", "ring"] as const;

type SlotType = typeof WEAPON_SLOTS[number] | typeof ARMOR_SLOTS[number] | typeof ACCESSORY_SLOTS[number];

const ALL_SLOTS: SlotType[] = [...WEAPON_SLOTS, ...ARMOR_SLOTS, ...ACCESSORY_SLOTS];

const SLOT_NOUN: Record<SlotType, string> = {
  primary:  "Blade",   secondary: "Buckler",
  head:     "Helm",    chest: "Breastplate", shoulder: "Pauldrons",
  back:     "Cloak",   wrist: "Bracers",     hands: "Gauntlets",
  waist:    "Belt",    legs: "Greaves",      feet: "Boots",
  neck:     "Pendant", ear: "Earring",       ring: "Ring",
};

// Stat profiles by slot (ordered by importance)
const SLOT_STAT_PROFILE: Record<SlotType, Array<keyof ItemStats>> = {
  primary:   ["attackRating", "strength"],
  secondary: ["defenseRating", "mitigation", "stamina"],
  head:      ["stamina", "intelligence", "wisdom", "mitigation"],
  chest:     ["stamina", "mitigation", "defenseRating", "health"],
  shoulder:  ["strength", "agility", "mitigation"],
  back:      ["agility", "avoidance", "defenseRating"],
  wrist:     ["intelligence", "wisdom", "attackRating"],
  hands:     ["agility", "attackRating", "haste"],
  waist:     ["stamina", "strength", "defenseRating"],
  legs:      ["stamina", "agility", "mitigation"],
  feet:      ["agility", "avoidance", "haste"],
  neck:      ["wisdom", "charisma", "intelligence"],
  ear:       ["intelligence", "critChance", "attackRating"],
  ring:      ["strength", "stamina", "attackRating"],
};

// Suffix bonus modifiers — applied on top of base stats
const SUFFIX_STAT_BONUS: Record<string, Partial<ItemStats>> = {
  "of the Wilds":    { agility: 2, avoidance: 1 },
  "of the Adventurer": { strength: 1, stamina: 1 },
  "of Resilience":   { stamina: 3, mitigation: 2 },
  "of Power":        { attackRating: 4, strength: 2 },
  "of the Storm":    { haste: 3, critChance: 2 },
  "of the Ages":     { wisdom: 3, intelligence: 3 },
  "of the Void":     { intelligence: 4, attackRating: 2 },
  "of the Conqueror": { strength: 5, attackRating: 5 },
  "of Norrath":      { stamina: 6, mitigation: 4 },
  "of the Ancients": { wisdom: 5, intelligence: 5 },
  "of Might":        { strength: 7, weaponDamageMin: 3, weaponDamageMax: 5 },
  "of the Forsaken": { attackRating: 8, critChance: 4, haste: 4 },
  "of the Tribunal": { wisdom: 8, intelligence: 8, mitigation: 5 },
  "of Destiny":      { stamina: 10, strength: 8, agility: 8 },
  "of the Gods":     { strength: 10, stamina: 10, intelligence: 10 },
};

// ─── Seeded pseudo-random (for session-stable merchant stock) ─────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickSeeded<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(forceRarity?: ProceduralRarity): ProceduralRarity {
  if (forceRarity) return forceRarity;
  const total = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const entry of RARITY_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return "common";
}

function rollRaritySeeded(rng: () => number, forceRarity?: ProceduralRarity): ProceduralRarity {
  if (forceRarity) return forceRarity;
  const total = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const entry of RARITY_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return "common";
}

// ─── Core stat scaler ─────────────────────────────────────────────────────────

function scaleStats(slot: SlotType, level: number, rarity: ProceduralRarity, suffix: string): ItemStats {
  const mult = RARITY_STAT_MULT[rarity];
  const base = Math.max(1, Math.floor(level * 0.8));

  const stats: ItemStats = {};

  if (slot === "primary") {
    const dmgMin = Math.floor((base + level * 1.5) * mult);
    const dmgMax = Math.floor((base + level * 3.0) * mult);
    stats.weaponDamageMin = dmgMin;
    stats.weaponDamageMax = dmgMax;
    // Correctly compute weaponDelay: faster weapons for fabled (1.6s), normal otherwise (2.0s)
    stats.weaponDelay = rarity === "fabled" ? 1.6 : 2.0;
    stats.attackRating = Math.floor(base * mult * 0.6);
    if (Math.random() < 0.4) stats.strength = Math.floor(base * mult * 0.3);
  } else {
    // Pick 2–4 stats from profile based on rarity
    const numStats = rarity === "common" ? 2 : rarity === "uncommon" ? 2 : rarity === "rare" ? 3 : 4;
    const profile = SLOT_STAT_PROFILE[slot];
    const chosen = [...profile].sort(() => Math.random() - 0.5).slice(0, numStats);

    for (const statKey of chosen) {
      if (statKey === "weaponDamageMin" || statKey === "weaponDamageMax" || statKey === "weaponDelay") continue;
      const val = Math.floor(base * mult * (0.5 + Math.random() * 0.5));
      (stats as Record<string, number>)[statKey] = Math.max(1, val);
    }

    if (slot === "secondary") {
      stats.mitigation = Math.max(1, Math.floor(base * mult * 0.7));
    }
    if (slot === "head" || slot === "chest" || slot === "legs") {
      stats.mitigation = Math.max(1, (stats.mitigation ?? 0) + Math.floor(base * mult * 0.5));
    }
  }

  // Apply suffix bonus stats
  const suffixBonus = SUFFIX_STAT_BONUS[suffix];
  if (suffixBonus) {
    for (const [k, v] of Object.entries(suffixBonus)) {
      if (v === undefined) continue;
      const existing = (stats as Record<string, number>)[k] ?? 0;
      (stats as Record<string, number>)[k] = existing + Math.floor(v * mult * 0.5);
    }
  }

  return stats;
}

// ─── Public: ProceduralItem interface ────────────────────────────────────────

export interface ProceduralItem extends Item {
  procedural: true;
  zone: string;
  suffix: string;
  quality?: number;
}

// ─── Internal item builder ────────────────────────────────────────────────────

function buildItem(
  zone: string,
  level: number,
  rarity: ProceduralRarity,
  rng: (() => number) | null,
): ProceduralItem {
  const cfg = ZONE_LOOT_CONFIG[zone] ?? DEFAULT_ZONE_CONFIG;
  const pick = rng ? <T>(arr: T[]) => pickSeeded(arr, rng) : pickRandom;

  // Slot selection
  const slot = pick(ALL_SLOTS);
  // Expand generic ear/ring to paperdoll left/right variants using seeded RNG
  const sideRng = rng ?? (() => Math.random());
  const itemSlot: string = slot === "ear"
    ? (sideRng() < 0.5 ? "earLeft" : "earRight")
    : slot === "ring"
    ? (sideRng() < 0.5 ? "ringLeft" : "ringRight")
    : slot;
  const isWeapon = (WEAPON_SLOTS as readonly string[]).includes(slot);
  const isAccessory = (ACCESSORY_SLOTS as readonly string[]).includes(slot);
  const itemType: Item["type"] = isWeapon ? "weapon" : isAccessory ? "accessory" : "armor";

  // Prefix + base noun
  const prefix = pick(PREFIXES_BY_RARITY[rarity]);
  const baseNoun = SLOT_NOUN[slot as SlotType];

  // For weapons and armor, inject zone material
  let materialNoun: string;
  if (isWeapon) {
    materialNoun = pick(cfg.weaponTypes);
  } else if (!isAccessory) {
    materialNoun = `${pick(cfg.armorTypes)} ${baseNoun}`;
  } else {
    materialNoun = baseNoun;
  }

  // Suffix
  const suffixPool = SUFFIXES_BY_RARITY[rarity];
  const suffix = pick(suffixPool);

  const name = suffix
    ? `${prefix} ${materialNoun} ${suffix}`.trim()
    : `${prefix} ${materialNoun}`.trim();

  // Stats (seeded stat scaler uses Math.random but that's ok since rng only drives picks)
  const stats = scaleStats(slot as SlotType, level, rarity, suffix);

  const sellPrice = Math.max(1, Math.floor(level * 2 * RARITY_SELL_MULT[rarity]));
  const buyPrice = sellPrice * 3;
  const itemLevel = Math.max(cfg.levelRange[0], Math.min(cfg.levelRange[1], level));

  const descriptions: Record<ProceduralRarity, string[]> = {
    common:    [`A basic piece of equipment found in ${zone}.`, `Standard adventurer's gear.`],
    uncommon:  [`Solid quality gear forged for the wilds of ${zone}.`, `Enhanced equipment suited for seasoned explorers.`],
    rare:      [`Exceptional equipment bearing runes of power.`, `A rare find, imbued with the essence of ${zone}.`],
    legendary: [`A legendary artifact whispered about by merchants of Norrath.`, `Few adventurers have laid hands on equipment of this caliber.`],
    fabled:    [`A fabled relic of near-mythical power, sought by heroes across Norrath.`, `The greatest warriors would weep to see this item in your hands.`],
  };
  const description = pick(descriptions[rarity]);
  const spriteId = `proc_${slot}_${zone.toLowerCase().replace(/[^a-z]/g, "_").replace(/_+/g, "_")}`;

  // Use zone + slot + rarity + first chars of name as a stable-ish ID (seeded) or timestamp (random)
  const idSuffix = rng
    ? `${zone.toLowerCase().replace(/\W/g, "_")}_${slot}_${rarity}_${Math.floor(rng() * 1_000_000)}`
    : `${zone.toLowerCase().replace(/\W/g, "_")}_${slot}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
  const id = `proc_${idSuffix}`;

  return {
    id,
    name,
    description,
    type: itemType,
    slot: itemSlot,
    rarity,
    level: itemLevel,
    stats,
    sellPrice,
    buyPrice,
    spriteId,
    procedural: true,
    zone,
    suffix,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Roll a random procedural item for a given zone and character level.
 * Optionally force a specific rarity (e.g. for boss drops).
 */
export function rollItem(zone: string, level: number, forceRarity?: ProceduralRarity): ProceduralItem {
  const rarity = rollRarity(forceRarity);
  return buildItem(zone, level, rarity, null);
}

/**
 * Roll loot drops from a killed enemy.
 * Boss: always drops (100%), 1-3 items with elevated rarity.
 * Normal: 20% + zone bonus drop chance for one item.
 */
export function rollLootDrop(
  zone: string,
  level: number,
  isBoss: boolean,
  _enemyType: string,
): ProceduralItem[] {
  const cfg = ZONE_LOOT_CONFIG[zone] ?? DEFAULT_ZONE_CONFIG;
  const results: ProceduralItem[] = [];

  if (isBoss) {
    // Boss always drops at least one rare+ item
    const mainRarity = pickRandom(["rare", "rare", "legendary", "fabled"] as ProceduralRarity[]);
    results.push(rollItem(zone, level, mainRarity));
    // 60% chance for a second uncommon+ drop
    if (Math.random() < 0.6) {
      results.push(rollItem(zone, level, pickRandom(["uncommon", "uncommon", "rare"] as ProceduralRarity[])));
    }
  } else {
    const dropChance = 0.20 + cfg.bonusDropChance;
    if (Math.random() < dropChance) {
      results.push(rollItem(zone, level));
    }
  }

  return results;
}

// ─── Session-scoped merchant stock ───────────────────────────────────────────
// Stock is generated once per unique (characterId, zone, level) combination and
// cached in memory for the lifetime of the server process. It refreshes automatically
// whenever the character changes zone or level (cache key changes).
// This is "session-stable" in that the same session sees the same stock, while a
// zone change (which is the natural session boundary in this game) generates fresh wares.

interface MerchantStockEntry {
  zone: string;
  level: number;
  stock: ProceduralItem[];
  soldIndices: Set<number>;
}

const merchantStockCache = new Map<string, MerchantStockEntry>();

function makeSeed(zone: string, level: number): number {
  // Derive a deterministic seed from zone + level so the same character in the same
  // zone+level always gets the same stock within one server session.
  const str = `${zone}|${level}`;
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return seed;
}

/**
 * Get or generate session-scoped Traveling Merchant stock.
 * Cached per (characterId, zone, level) — clears when zone or level changes.
 * All item stats and prices are generated server-side; callers receive the full list.
 */
export function getMerchantStock(characterId: string, zone: string, level: number): ProceduralItem[] {
  const cacheKey = `${characterId}::${zone}::${level}`;
  const cached = merchantStockCache.get(cacheKey);
  if (cached && cached.zone === zone && cached.level === level) {
    return cached.stock;
  }

  // Generate new stock seeded by zone + level for reproducibility within this session
  const rng = seededRandom(makeSeed(zone, level));
  const count = 3 + Math.floor(rng() * 3); // 3–5 items
  const stock: ProceduralItem[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRaritySeeded(rng, undefined);
    // Merchant only sells uncommon+ (skip commons)
    const effectiveRarity: ProceduralRarity = rarity === "common" ? "uncommon" : rarity;
    stock.push(buildItem(zone, level, effectiveRarity, rng));
  }

  merchantStockCache.set(cacheKey, { zone, level, stock, soldIndices: new Set() });
  return stock;
}

/**
 * Mark a merchant stock slot as sold-out for this session.
 * Returns false if the slot was already sold or does not exist.
 */
export function markMerchantItemSold(characterId: string, zone: string, level: number, index: number): boolean {
  const cacheKey = `${characterId}::${zone}::${level}`;
  const entry = merchantStockCache.get(cacheKey);
  if (!entry || index < 0 || index >= entry.stock.length) return false;
  if (entry.soldIndices.has(index)) return false; // already sold
  entry.soldIndices.add(index);
  return true;
}

/**
 * Check whether a merchant stock slot is sold out.
 */
export function isMerchantItemSoldOut(characterId: string, zone: string, level: number, index: number): boolean {
  const cacheKey = `${characterId}::${zone}::${level}`;
  const entry = merchantStockCache.get(cacheKey);
  if (!entry) return false;
  return entry.soldIndices.has(index);
}

// Keep the old export for backward-compat with any tests; it now delegates to getMerchantStock
// using a synthetic key so behaviour is consistent.
export function generateTravelingMerchantStock(zone: string, level: number): ProceduralItem[] {
  return getMerchantStock("__global__", zone, level);
}

/**
 * Return the server-authoritative buy price for a procedural item given its sell price.
 * This is used server-side to avoid trusting client-supplied prices.
 */
export function computeAuthoritativeBuyPrice(sellPrice: number): number {
  return Math.max(1, sellPrice * 3);
}

/**
 * Serialize a ProceduralItem to a plain Record<string, unknown> suitable for
 * insertion into the inventoryTable.itemData jsonb column.
 * This avoids `as unknown as` cast patterns at call sites.
 */
export function serializeForDb(item: ProceduralItem): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    slot: item.slot,
    rarity: item.rarity,
    level: item.level,
    stats: item.stats,
    sellPrice: item.sellPrice,
    buyPrice: item.buyPrice,
    spriteId: item.spriteId,
    procedural: item.procedural,
    zone: item.zone,
    suffix: item.suffix,
  };
}
