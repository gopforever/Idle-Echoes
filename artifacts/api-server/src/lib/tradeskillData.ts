// Material item definition for the tradeskill vendor
export interface TradeskillMaterial {
  id: string;
  name: string;
  description: string;
  spriteId: string;
  vendorCost: number;    // gold per unit
  usedBy: string[];      // tradeskill classes
}

// Recipe seed data shape (matches recipesTable)
export interface RecipeSeed {
  name: string;
  tradeskillClass: "weaponsmith" | "armorer" | "tailor" | "jeweler" | "alchemist";
  tier: "apprentice";
  minSkill: number;
  minLevel: number;
  craftTimeSeconds: number;
  ingredients: Array<{ itemId: string; quantity: number }>;
  output: {
    name: string;
    description: string;
    type: "weapon" | "armor" | "accessory" | "consumable";
    slot: string;
    rarity: "common" | "uncommon" | "rare" | "legendary";
    stats: Record<string, number>;
    sellPrice: number;
    armorType?: "plate" | "chain" | "leather" | "cloth";
    quantity: number;
    xpGained: number;
    spriteId?: string;
    stackable?: boolean;
    effect?: { type: string; value: number };
  };
  acquisitionType: "vendor";
  vendorCost: number;
}

export const TRADESKILL_CLASSES = ["weaponsmith", "armorer", "tailor", "jeweler", "alchemist"] as const;
export type TradeskillClass = typeof TRADESKILL_CLASSES[number];

// ─── Vendor Materials ─────────────────────────────────────────────────────────
// Items purchasable from the tradeskill material vendor.
// Note: iron_ore, iron_bar, steel_bar, mithril_ore already exist in gameData
// and can be found via gathering/drops. Vendor provides the NEW materials.

export const TRADESKILL_MATERIALS: TradeskillMaterial[] = [
  // ── Smithing ──────────────────────────────────────────────────────────────
  { id: "ts_metal_flux",        name: "Metal Flux",        description: "A chemical flux used to refine metals during smithing.",                          spriteId: "material_flux",    vendorCost: 2,  usedBy: ["weaponsmith", "armorer"] },
  { id: "ts_adamantine_ore",    name: "Adamantine Ore",    description: "An extremely dense ore found only in the deepest mines.",                         spriteId: "material_ore",     vendorCost: 80, usedBy: ["weaponsmith", "armorer"] },
  // ── Tailoring ──────────────────────────────────────────────────────────────
  { id: "ts_strong_thread",     name: "Strong Thread",     description: "Durable thread used to stitch together all manner of cloth and leather.",         spriteId: "material_thread",  vendorCost: 3,  usedBy: ["tailor"] },
  { id: "ts_linen_bolt",        name: "Linen Bolt",        description: "A bolt of plain linen cloth, the most basic tailoring material.",                 spriteId: "material_cloth",   vendorCost: 5,  usedBy: ["tailor"] },
  { id: "ts_silk_cloth",        name: "Silk Cloth",        description: "Fine silk cloth, smooth and light, favored by mid-tier tailors.",                spriteId: "material_cloth",   vendorCost: 18, usedBy: ["tailor"] },
  { id: "ts_spidersilk_cloth",  name: "Spidersilk Cloth",  description: "Cloth woven from giant spider silk — strong as steel yet light as air.",          spriteId: "material_cloth",   vendorCost: 45, usedBy: ["tailor"] },
  { id: "ts_moonweave",         name: "Moonweave Cloth",   description: "Magical cloth that shimmers with lunar energy. Used in the finest garments.",     spriteId: "material_cloth",   vendorCost: 90, usedBy: ["tailor"] },
  { id: "ts_rough_hide",        name: "Rough Hide",        description: "Thick, unprocessed animal hide. Serviceable for basic leather armor.",            spriteId: "material_hide",    vendorCost: 6,  usedBy: ["tailor"] },
  { id: "ts_supple_leather",    name: "Supple Leather",    description: "Well-tanned leather that is both flexible and durable.",                         spriteId: "material_hide",    vendorCost: 25, usedBy: ["tailor"] },
  // ── Jeweling ──────────────────────────────────────────────────────────────
  { id: "ts_jewelers_oil",      name: "Jeweler's Oil",     description: "A precision cutting oil used to shape gems and metals in jewelry work.",          spriteId: "material_reagent", vendorCost: 4,  usedBy: ["jeweler"] },
  { id: "ts_rough_ruby",        name: "Rough Ruby",        description: "An uncut ruby with a deep red glow. Valuable to jewelers.",                      spriteId: "material_gem",     vendorCost: 15, usedBy: ["jeweler"] },
  { id: "ts_flawless_sapphire", name: "Flawless Sapphire", description: "A perfectly clear sapphire. Commands a high price from jewelers.",               spriteId: "material_gem",     vendorCost: 40, usedBy: ["jeweler"] },
  { id: "ts_void_crystal",      name: "Void Crystal",      description: "A dark crystal suffused with void energy. Prized for high-tier accessories.",    spriteId: "material_gem",     vendorCost: 75, usedBy: ["jeweler"] },
  // ── Alchemy ──────────────────────────────────────────────────────────────
  { id: "ts_empty_vial",        name: "Empty Vial",        description: "A clean glass vial used as the base for all alchemical potions.",                spriteId: "material_vial",    vendorCost: 2,  usedBy: ["alchemist"] },
  { id: "ts_mana_shard",        name: "Mana Shard",        description: "A crystallized fragment of raw magical energy used in potions.",                  spriteId: "material_reagent", vendorCost: 8,  usedBy: ["alchemist"] },
  { id: "ts_alchemists_coal",   name: "Alchemist's Coal",  description: "Specially treated coal that burns at a precise temperature for alchemy.",         spriteId: "material_reagent", vendorCost: 4,  usedBy: ["alchemist"] },
];

// ─── Apprentice Recipes ───────────────────────────────────────────────────────
// ~10 per class, vendor-purchasable, covers levels 10-45

export const APPRENTICE_RECIPES: RecipeSeed[] = [
  // ════ WEAPONSMITH ════════════════════════════════════════════════════════════
  {
    name: "Iron Shortsword", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 1, minLevel: 10, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 10,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Forged Iron Shortsword", type: "weapon", slot: "primary", rarity: "common",
      description: "A simple iron shortsword hammered out by an apprentice smith.",
      stats: { weaponDamageMin: 8, weaponDamageMax: 14, weaponDelay: 2.0, attackRating: 12 },
      sellPrice: 18, quantity: 1, xpGained: 40, spriteId: "weapon_sword",
    },
  },
  {
    name: "Iron Battle Axe", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 5, minLevel: 12, craftTimeSeconds: 90, acquisitionType: "vendor", vendorCost: 15,
    ingredients: [{ itemId: "iron_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Forged Iron Battle Axe", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A heavy iron axe, slow but powerful.",
      stats: { weaponDamageMin: 12, weaponDamageMax: 22, weaponDelay: 2.4, attackRating: 10, strength: 4 },
      sellPrice: 30, quantity: 1, xpGained: 60, spriteId: "weapon_axe",
    },
  },
  {
    name: "Steel Longsword", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 12, minLevel: 20, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 35,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Tempered Steel Longsword", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A well-balanced steel blade that holds a keen edge.",
      stats: { weaponDamageMin: 18, weaponDamageMax: 28, weaponDelay: 2.0, attackRating: 24, strength: 6 },
      sellPrice: 65, quantity: 1, xpGained: 100, spriteId: "weapon_sword",
    },
  },
  {
    name: "Steel War Hammer", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 18, minLevel: 22, craftTimeSeconds: 150, acquisitionType: "vendor", vendorCost: 45,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel War Hammer", type: "weapon", slot: "primary", rarity: "rare",
      description: "A crushing two-handed hammer favored by fighters.",
      stats: { weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 2.6, attackRating: 20, strength: 10, stamina: 5 },
      sellPrice: 90, quantity: 1, xpGained: 140, spriteId: "weapon_hammer",
    },
  },
  {
    name: "Mithril Blade", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 25, minLevel: 30, craftTimeSeconds: 240, acquisitionType: "vendor", vendorCost: 80,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Blade", type: "weapon", slot: "primary", rarity: "rare",
      description: "A shimmering mithril sword that never loses its edge.",
      stats: { weaponDamageMin: 32, weaponDamageMax: 48, weaponDelay: 1.8, attackRating: 42, agility: 8, critChance: 3 },
      sellPrice: 160, quantity: 1, xpGained: 200, spriteId: "weapon_sword",
    },
  },
  {
    name: "Mithril Warstaff", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 30, minLevel: 35, craftTimeSeconds: 300, acquisitionType: "vendor", vendorCost: 100,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }, { itemId: "ts_linen_bolt", quantity: 1 }],
    output: {
      name: "Mithril-Tipped Warstaff", type: "weapon", slot: "primary", rarity: "rare",
      description: "A balanced combat staff reinforced with mithril.",
      stats: { weaponDamageMin: 28, weaponDamageMax: 44, weaponDelay: 2.0, attackRating: 35, intelligence: 10, wisdom: 8 },
      sellPrice: 180, quantity: 1, xpGained: 220, spriteId: "weapon_staff",
    },
  },
  {
    name: "Adamantine Sword", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 36, minLevel: 40, craftTimeSeconds: 480, acquisitionType: "vendor", vendorCost: 160,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Sword", type: "weapon", slot: "primary", rarity: "legendary",
      description: "An indestructible sword forged from the hardest known metal.",
      stats: { weaponDamageMin: 52, weaponDamageMax: 74, weaponDelay: 1.8, attackRating: 68, strength: 14, critChance: 5 },
      sellPrice: 400, quantity: 1, xpGained: 380, spriteId: "weapon_sword",
    },
  },
  {
    name: "Adamantine Greataxe", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 600, acquisitionType: "vendor", vendorCost: 200,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Greataxe", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A massive two-handed axe that cleaves through armor like cloth.",
      stats: { weaponDamageMin: 65, weaponDamageMax: 95, weaponDelay: 2.6, attackRating: 60, strength: 20, stamina: 10 },
      sellPrice: 500, quantity: 1, xpGained: 420, spriteId: "weapon_axe",
    },
  },
  // ── Wands (Mage/Caster) ──────────────────────────────────────────────────────
  {
    name: "Iron Novice Wand", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 2, minLevel: 10, craftTimeSeconds: 45, acquisitionType: "vendor", vendorCost: 10,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_linen_bolt", quantity: 1 }],
    output: {
      name: "Iron Novice Wand", type: "weapon", slot: "primary", rarity: "common",
      description: "A simple wand tipped with iron, favoured by beginning spellcasters.",
      stats: { weaponDamageMin: 6, weaponDamageMax: 12, weaponDelay: 1.6, attackRating: 8, intelligence: 4, wisdom: 2 },
      sellPrice: 18, quantity: 1, xpGained: 35, spriteId: "weapon_wand",
    },
  },
  {
    name: "Steel Arcanist Wand", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 14, minLevel: 22, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 40,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_silk_cloth", quantity: 1 }],
    output: {
      name: "Steel Arcanist Wand", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A forged steel wand etched with focusing runes for mid-tier casters.",
      stats: { weaponDamageMin: 14, weaponDamageMax: 24, weaponDelay: 1.5, attackRating: 18, intelligence: 10, wisdom: 5, spellCritChance: 2 },
      sellPrice: 80, quantity: 1, xpGained: 110, spriteId: "weapon_wand",
    },
  },
  {
    name: "Mithril Runewand", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 300, acquisitionType: "vendor", vendorCost: 110,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Runewand", type: "weapon", slot: "primary", rarity: "rare",
      description: "A wand tipped with mithril that hums with channelled spell energy.",
      stats: { weaponDamageMin: 28, weaponDamageMax: 46, weaponDelay: 1.4, attackRating: 38, intelligence: 22, wisdom: 14, spellCritChance: 5, spellDamageBonus: 10 },
      sellPrice: 480, quantity: 1, xpGained: 240, spriteId: "weapon_wand",
    },
  },
  {
    name: "Adamantine Sorcerer's Wand", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 540, acquisitionType: "vendor", vendorCost: 190,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Adamantine Sorcerer's Wand", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A wand forged from adamantine that crackles with barely-contained arcane power.",
      stats: { weaponDamageMin: 52, weaponDamageMax: 82, weaponDelay: 1.4, attackRating: 70, intelligence: 38, wisdom: 24, spellCritChance: 9, spellDamageBonus: 22 },
      sellPrice: 1600, quantity: 1, xpGained: 400, spriteId: "weapon_wand",
    },
  },
  // ── Scepters (Priest/Healer) ──────────────────────────────────────────────────
  {
    name: "Iron Confessor's Scepter", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 2, minLevel: 10, craftTimeSeconds: 50, acquisitionType: "vendor", vendorCost: 10,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_linen_bolt", quantity: 1 }],
    output: {
      name: "Iron Confessor's Scepter", type: "weapon", slot: "primary", rarity: "common",
      description: "A blunt iron scepter used by novice priests to focus healing prayers.",
      stats: { weaponDamageMin: 5, weaponDamageMax: 10, weaponDelay: 1.8, attackRating: 6, wisdom: 5, power: 20 },
      sellPrice: 18, quantity: 1, xpGained: 35, spriteId: "weapon_scepter",
    },
  },
  {
    name: "Steel Cleric Scepter", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 15, minLevel: 22, craftTimeSeconds: 130, acquisitionType: "vendor", vendorCost: 42,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_linen_bolt", quantity: 1 }],
    output: {
      name: "Steel Cleric Scepter", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A blessed steel scepter wielded by mid-tier clerics of Qeynos.",
      stats: { weaponDamageMin: 12, weaponDamageMax: 20, weaponDelay: 1.8, attackRating: 16, wisdom: 12, power: 45, spellCritChance: 2 },
      sellPrice: 82, quantity: 1, xpGained: 115, spriteId: "weapon_scepter",
    },
  },
  {
    name: "Mithril Channeler's Scepter", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 300, acquisitionType: "vendor", vendorCost: 112,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Channeler's Scepter", type: "weapon", slot: "primary", rarity: "rare",
      description: "A mithril scepter that resonates with divine healing energy.",
      stats: { weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 1.8, attackRating: 30, wisdom: 26, power: 90, spellCritChance: 4, healBonus: 8 },
      sellPrice: 500, quantity: 1, xpGained: 245, spriteId: "weapon_scepter",
    },
  },
  {
    name: "Adamantine High Priest's Scepter", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 540, acquisitionType: "vendor", vendorCost: 192,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Adamantine High Priest's Scepter", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A scepter of adamantine blessed by the highest orders of the Templar church.",
      stats: { weaponDamageMin: 42, weaponDamageMax: 70, weaponDelay: 1.8, attackRating: 56, wisdom: 44, power: 160, spellCritChance: 7, healBonus: 18 },
      sellPrice: 1700, quantity: 1, xpGained: 402, spriteId: "weapon_scepter",
    },
  },
  // ── Maces (Fighter/Paladin) ───────────────────────────────────────────────────
  {
    name: "Iron Flanged Mace", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 4, minLevel: 12, craftTimeSeconds: 80, acquisitionType: "vendor", vendorCost: 14,
    ingredients: [{ itemId: "iron_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Flanged Mace", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A heavy flanged mace that crushes through even solid plate.",
      stats: { weaponDamageMin: 10, weaponDamageMax: 18, weaponDelay: 2.2, attackRating: 18, strength: 6, stamina: 4 },
      sellPrice: 30, quantity: 1, xpGained: 55, spriteId: "weapon_mace",
    },
  },
  {
    name: "Steel War Mace", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 16, minLevel: 24, craftTimeSeconds: 160, acquisitionType: "vendor", vendorCost: 50,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel War Mace", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "A balanced war mace of tempered steel favoured by crusaders.",
      stats: { weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 2.2, attackRating: 45, strength: 12, stamina: 8 },
      sellPrice: 120, quantity: 1, xpGained: 130, spriteId: "weapon_mace",
    },
  },
  {
    name: "Mithril Siege Mace", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 27, minLevel: 32, craftTimeSeconds: 270, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Siege Mace", type: "weapon", slot: "primary", rarity: "rare",
      description: "A devastating mithril mace used to breach fortifications.",
      stats: { weaponDamageMin: 40, weaponDamageMax: 65, weaponDelay: 2.3, attackRating: 80, strength: 20, stamina: 14, mitigation: 5 },
      sellPrice: 520, quantity: 1, xpGained: 220, spriteId: "weapon_mace",
    },
  },
  {
    name: "Adamantine Judicator's Mace", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 560, acquisitionType: "vendor", vendorCost: 195,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Judicator's Mace", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A holy mace of adamantine inlaid with divine scripture.",
      stats: { weaponDamageMin: 70, weaponDamageMax: 108, weaponDelay: 2.2, attackRating: 140, strength: 32, stamina: 22, mitigation: 10 },
      sellPrice: 1800, quantity: 1, xpGained: 410, spriteId: "weapon_mace",
    },
  },
  // ── Fist Weapons (Monk/Bruiser) ───────────────────────────────────────────────
  {
    name: "Iron Knuckle Wraps", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 3, minLevel: 10, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 10,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_rough_hide", quantity: 1 }],
    output: {
      name: "Iron Knuckle Wraps", type: "weapon", slot: "primary", rarity: "uncommon",
      description: "Iron-plated wraps that protect the fists and amplify striking force.",
      stats: { weaponDamageMin: 8, weaponDamageMax: 15, weaponDelay: 1.6, attackRating: 14, strength: 5, agility: 6 },
      sellPrice: 25, quantity: 1, xpGained: 50, spriteId: "weapon_fist",
    },
  },
  {
    name: "Mithril Monk's Wraps", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 27, minLevel: 32, craftTimeSeconds: 260, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "mithril_ore", quantity: 1 }, { itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Monk's Wraps", type: "weapon", slot: "primary", rarity: "rare",
      description: "Woven spidersilk reinforced with mithril rings — for the disciplined monk.",
      stats: { weaponDamageMin: 30, weaponDamageMax: 50, weaponDelay: 1.5, attackRating: 65, strength: 18, agility: 20, critChance: 5, haste: 4 },
      sellPrice: 490, quantity: 1, xpGained: 215, spriteId: "weapon_fist",
    },
  },
  {
    name: "Adamantine Iron Fists", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 540, acquisitionType: "vendor", vendorCost: 190,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Adamantine Iron Fists", type: "weapon", slot: "primary", rarity: "legendary",
      description: "Gauntlets shaped into pointed fists from solid adamantine — brutal and precise.",
      stats: { weaponDamageMin: 60, weaponDamageMax: 95, weaponDelay: 1.5, attackRating: 120, strength: 30, agility: 26, critChance: 8, haste: 6 },
      sellPrice: 1750, quantity: 1, xpGained: 398, spriteId: "weapon_fist",
    },
  },
  // ── Crossbows (Scout/Rogue) ───────────────────────────────────────────────────
  {
    name: "Steel Crossbow", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 13, minLevel: 20, craftTimeSeconds: 130, acquisitionType: "vendor", vendorCost: 38,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Crossbow", type: "weapon", slot: "ranged", rarity: "uncommon",
      description: "A reliable steel crossbow capable of punching through light armor.",
      stats: { weaponDamageMin: 18, weaponDamageMax: 32, weaponDelay: 2.8, attackRating: 28, agility: 8 },
      sellPrice: 80, quantity: 1, xpGained: 105, spriteId: "weapon_crossbow",
    },
  },
  {
    name: "Mithril Repeating Crossbow", tradeskillClass: "weaponsmith", tier: "apprentice",
    minSkill: 29, minLevel: 36, craftTimeSeconds: 330, acquisitionType: "vendor", vendorCost: 120,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Repeating Crossbow", type: "weapon", slot: "ranged", rarity: "rare",
      description: "A precision mithril crossbow with a rapid-fire repeating mechanism.",
      stats: { weaponDamageMin: 42, weaponDamageMax: 68, weaponDelay: 2.6, attackRating: 75, agility: 20, critChance: 6 },
      sellPrice: 600, quantity: 1, xpGained: 250, spriteId: "weapon_crossbow",
    },
  },

  // ════ ARMORER ════════════════════════════════════════════════════════════════
  {
    name: "Iron Cap", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 1, minLevel: 10, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 10,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Forged Iron Cap", type: "armor", slot: "head", rarity: "common", armorType: "plate",
      description: "A simple iron helmet offering basic protection.",
      stats: { defenseRating: 14, stamina: 5 },
      sellPrice: 16, quantity: 1, xpGained: 40, spriteId: "helm_plate",
    },
  },
  {
    name: "Iron Chestplate", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 5, minLevel: 10, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 20,
    ingredients: [{ itemId: "iron_ore", quantity: 4 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Forged Iron Chestplate", type: "armor", slot: "chest", rarity: "common", armorType: "plate",
      description: "A solid iron breastplate for a beginning armorer.",
      stats: { defenseRating: 22, stamina: 8, health: 12 },
      sellPrice: 30, quantity: 1, xpGained: 60, spriteId: "chest_plate",
    },
  },
  {
    name: "Iron Greaves", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 8, minLevel: 12, craftTimeSeconds: 90, acquisitionType: "vendor", vendorCost: 15,
    ingredients: [{ itemId: "iron_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Forged Iron Greaves", type: "armor", slot: "legs", rarity: "common", armorType: "plate",
      description: "Iron leg plates that protect from knee to hip.",
      stats: { defenseRating: 18, stamina: 6 },
      sellPrice: 22, quantity: 1, xpGained: 50, spriteId: "legs_plate",
    },
  },
  {
    name: "Steel Helm", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 12, minLevel: 20, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 35,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Helm", type: "armor", slot: "head", rarity: "uncommon", armorType: "plate",
      description: "A well-crafted steel helmet with cheek guards.",
      stats: { defenseRating: 28, stamina: 12, health: 18 },
      sellPrice: 60, quantity: 1, xpGained: 100, spriteId: "helm_plate",
    },
  },
  {
    name: "Steel Breastplate", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 18, minLevel: 22, craftTimeSeconds: 180, acquisitionType: "vendor", vendorCost: 55,
    ingredients: [{ itemId: "steel_bar", quantity: 4 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Breastplate", type: "armor", slot: "chest", rarity: "rare", armorType: "plate",
      description: "Expertly crafted steel plate that offers serious protection.",
      stats: { defenseRating: 42, stamina: 20, health: 30, strength: 6 },
      sellPrice: 110, quantity: 1, xpGained: 150, spriteId: "chest_plate",
    },
  },
  {
    name: "Mithril Coif", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 25, minLevel: 30, craftTimeSeconds: 240, acquisitionType: "vendor", vendorCost: 80,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Coif", type: "armor", slot: "head", rarity: "rare", armorType: "plate",
      description: "A lightweight mithril helmet providing excellent protection.",
      stats: { defenseRating: 48, stamina: 22, health: 32 },
      sellPrice: 190, quantity: 1, xpGained: 200, spriteId: "helm_plate",
    },
  },
  {
    name: "Mithril Plate", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 30, minLevel: 34, craftTimeSeconds: 360, acquisitionType: "vendor", vendorCost: 120,
    ingredients: [{ itemId: "mithril_ore", quantity: 4 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Plate", type: "armor", slot: "chest", rarity: "rare", armorType: "plate",
      description: "Gleaming mithril plate armor, lighter than steel but far stronger.",
      stats: { defenseRating: 72, stamina: 38, health: 52, strength: 10 },
      sellPrice: 280, quantity: 1, xpGained: 280, spriteId: "chest_plate",
    },
  },
  {
    name: "Adamantine Helm", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 36, minLevel: 40, craftTimeSeconds: 480, acquisitionType: "vendor", vendorCost: 160,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Helm", type: "armor", slot: "head", rarity: "legendary", armorType: "plate",
      description: "The pinnacle of plate craftsmanship — nearly indestructible.",
      stats: { defenseRating: 86, stamina: 50, health: 70, strength: 14 },
      sellPrice: 450, quantity: 1, xpGained: 380, spriteId: "helm_plate",
    },
  },
  {
    name: "Adamantine Breastplate", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 40, minLevel: 44, craftTimeSeconds: 600, acquisitionType: "vendor", vendorCost: 220,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 5 }, { itemId: "ts_metal_flux", quantity: 3 }],
    output: {
      name: "Adamantine Breastplate", type: "armor", slot: "chest", rarity: "legendary", armorType: "plate",
      description: "The mightiest crafted breastplate in all of Norrath.",
      stats: { defenseRating: 130, stamina: 80, health: 110, strength: 22 },
      sellPrice: 650, quantity: 1, xpGained: 450, spriteId: "chest_plate",
    },
  },
  // ── Shields ──────────────────────────────────────────────────────────────────
  {
    name: "Iron Bulwark Shield", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 3, minLevel: 10, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "iron_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Bulwark Shield", type: "armor", slot: "secondary", rarity: "common", armorType: "plate",
      description: "A sturdy iron shield fashioned in the bulwark style, preferred by city guards.",
      stats: { defenseRating: 20, stamina: 8, mitigation: 15 },
      sellPrice: 22, quantity: 1, xpGained: 45, spriteId: "shield_iron",
    },
  },
  {
    name: "Steel Round Shield", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 15, minLevel: 22, craftTimeSeconds: 150, acquisitionType: "vendor", vendorCost: 45,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Round Shield", type: "armor", slot: "secondary", rarity: "uncommon", armorType: "plate",
      description: "A round steel shield banded with reinforcing strips.",
      stats: { defenseRating: 40, stamina: 15, mitigation: 28, health: 25 },
      sellPrice: 95, quantity: 1, xpGained: 130, spriteId: "shield_iron",
    },
  },
  {
    name: "Mithril Kite Shield", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 26, minLevel: 30, craftTimeSeconds: 270, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "mithril_ore", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Mithril Kite Shield", type: "armor", slot: "secondary", rarity: "rare", armorType: "plate",
      description: "A kite-shaped mithril shield that catches blows at optimal angles.",
      stats: { defenseRating: 72, stamina: 26, mitigation: 48, health: 50, avoidance: 3 },
      sellPrice: 240, quantity: 1, xpGained: 210, spriteId: "shield_mithril",
    },
  },
  {
    name: "Adamantine Tower Shield", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 580, acquisitionType: "vendor", vendorCost: 210,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 4 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Tower Shield", type: "armor", slot: "secondary", rarity: "legendary", armorType: "plate",
      description: "An enormous shield of adamantine that can turn aside siege weapons.",
      stats: { defenseRating: 160, stamina: 42, mitigation: 120, health: 160, strength: 10 },
      sellPrice: 2200, quantity: 1, xpGained: 410, spriteId: "shield_legendary",
    },
  },
  // ── Gauntlets (hands) ─────────────────────────────────────────────────────────
  {
    name: "Iron Gauntlets", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 6, minLevel: 12, craftTimeSeconds: 70, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Gauntlets", type: "armor", slot: "hands", rarity: "common", armorType: "plate",
      description: "Heavy iron gauntlets that protect the hands without sacrificing grip.",
      stats: { defenseRating: 10, stamina: 4, haste: 1 },
      sellPrice: 16, quantity: 1, xpGained: 42, spriteId: "hands_plate",
    },
  },
  {
    name: "Steel Gauntlets", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 16, minLevel: 22, craftTimeSeconds: 140, acquisitionType: "vendor", vendorCost: 42,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Gauntlets", type: "armor", slot: "hands", rarity: "uncommon", armorType: "plate",
      description: "Well-crafted steel gauntlets with articulated finger plates.",
      stats: { defenseRating: 22, stamina: 10, haste: 3, critChance: 1 },
      sellPrice: 78, quantity: 1, xpGained: 110, spriteId: "hands_plate",
    },
  },
  {
    name: "Mithril Gauntlets", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 26, minLevel: 32, craftTimeSeconds: 250, acquisitionType: "vendor", vendorCost: 88,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Gauntlets", type: "armor", slot: "hands", rarity: "rare", armorType: "plate",
      description: "Gleaming mithril gauntlets offering exceptional protection and dexterity.",
      stats: { defenseRating: 42, stamina: 20, haste: 5, critChance: 2, attackRating: 18 },
      sellPrice: 540, quantity: 1, xpGained: 210, spriteId: "hands_plate",
    },
  },
  {
    name: "Adamantine Gauntlets", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 490, acquisitionType: "vendor", vendorCost: 185,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Gauntlets", type: "armor", slot: "hands", rarity: "legendary", armorType: "plate",
      description: "The pinnacle of hand armour — these gauntlets can crush stone.",
      stats: { defenseRating: 68, stamina: 36, haste: 8, critChance: 4, attackRating: 32 },
      sellPrice: 1500, quantity: 1, xpGained: 385, spriteId: "hands_plate",
    },
  },
  // ── Sabatons (feet) ───────────────────────────────────────────────────────────
  {
    name: "Iron Sabatons", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 7, minLevel: 12, craftTimeSeconds: 70, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Sabatons", type: "armor", slot: "feet", rarity: "common", armorType: "plate",
      description: "Heavy iron foot armor that protects from ankle to toe.",
      stats: { defenseRating: 8, stamina: 3, agility: 2 },
      sellPrice: 14, quantity: 1, xpGained: 40, spriteId: "feet_plate",
    },
  },
  {
    name: "Steel Sabatons", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 17, minLevel: 24, craftTimeSeconds: 145, acquisitionType: "vendor", vendorCost: 44,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Sabatons", type: "armor", slot: "feet", rarity: "uncommon", armorType: "plate",
      description: "Articulated steel foot armor that balances protection with mobility.",
      stats: { defenseRating: 20, stamina: 8, agility: 6, avoidance: 2 },
      sellPrice: 76, quantity: 1, xpGained: 112, spriteId: "feet_plate",
    },
  },
  {
    name: "Mithril Sabatons", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 27, minLevel: 32, craftTimeSeconds: 255, acquisitionType: "vendor", vendorCost: 88,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Sabatons", type: "armor", slot: "feet", rarity: "rare", armorType: "plate",
      description: "Lightweight mithril foot armor that lets the wearer move swiftly.",
      stats: { defenseRating: 36, stamina: 16, agility: 14, avoidance: 4, haste: 3 },
      sellPrice: 530, quantity: 1, xpGained: 212, spriteId: "feet_plate",
    },
  },
  {
    name: "Adamantine Sabatons", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 490, acquisitionType: "vendor", vendorCost: 185,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Adamantine Sabatons", type: "armor", slot: "feet", rarity: "legendary", armorType: "plate",
      description: "Boots of adamantine that feel as light as leather despite their strength.",
      stats: { defenseRating: 56, stamina: 28, agility: 22, avoidance: 6, haste: 5 },
      sellPrice: 1480, quantity: 1, xpGained: 383, spriteId: "feet_plate",
    },
  },
  // ── Vambraces (wrists) ────────────────────────────────────────────────────────
  {
    name: "Iron Vambraces", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 8, minLevel: 14, craftTimeSeconds: 65, acquisitionType: "vendor", vendorCost: 13,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Vambraces", type: "armor", slot: "wrists", rarity: "common", armorType: "plate",
      description: "Simple iron bracers that guard the forearms in combat.",
      stats: { defenseRating: 8, strength: 3, stamina: 2 },
      sellPrice: 13, quantity: 1, xpGained: 38, spriteId: "wrists_plate",
    },
  },
  {
    name: "Steel Vambraces", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 18, minLevel: 26, craftTimeSeconds: 148, acquisitionType: "vendor", vendorCost: 46,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Vambraces", type: "armor", slot: "wrists", rarity: "uncommon", armorType: "plate",
      description: "Reinforced steel vambraces worn by seasoned fighters.",
      stats: { defenseRating: 18, strength: 8, attackRating: 10 },
      sellPrice: 72, quantity: 1, xpGained: 114, spriteId: "wrists_plate",
    },
  },
  {
    name: "Mithril Vambraces", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 260, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Vambraces", type: "armor", slot: "wrists", rarity: "rare", armorType: "plate",
      description: "Lightweight mithril bracers etched with strengthening runes.",
      stats: { defenseRating: 32, strength: 16, attackRating: 24, critChance: 2 },
      sellPrice: 520, quantity: 1, xpGained: 214, spriteId: "wrists_plate",
    },
  },
  {
    name: "Adamantine Vambraces", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 490, acquisitionType: "vendor", vendorCost: 184,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Adamantine Vambraces", type: "armor", slot: "wrists", rarity: "legendary", armorType: "plate",
      description: "Vambraces of adamantine that protect the wrists while channelling striking force.",
      stats: { defenseRating: 50, strength: 26, attackRating: 38, critChance: 4 },
      sellPrice: 1460, quantity: 1, xpGained: 382, spriteId: "wrists_plate",
    },
  },
  // ── Plate Belt (waist) ────────────────────────────────────────────────────────
  {
    name: "Iron Plate Belt", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 9, minLevel: 14, craftTimeSeconds: 65, acquisitionType: "vendor", vendorCost: 13,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Iron Plate Belt", type: "armor", slot: "waist", rarity: "common", armorType: "plate",
      description: "A wide iron belt that provides core protection.",
      stats: { defenseRating: 8, stamina: 5, strength: 2 },
      sellPrice: 14, quantity: 1, xpGained: 38, spriteId: "waist_plate",
    },
  },
  {
    name: "Steel Plate Belt", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 19, minLevel: 26, craftTimeSeconds: 148, acquisitionType: "vendor", vendorCost: 46,
    ingredients: [{ itemId: "steel_bar", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Steel Plate Belt", type: "armor", slot: "waist", rarity: "uncommon", armorType: "plate",
      description: "A reinforced steel belt that doubles as a brace against heavy blows.",
      stats: { defenseRating: 18, stamina: 12, health: 20, strength: 5 },
      sellPrice: 74, quantity: 1, xpGained: 114, spriteId: "waist_plate",
    },
  },
  {
    name: "Mithril Plate Belt", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 258, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Mithril Plate Belt", type: "armor", slot: "waist", rarity: "rare", armorType: "plate",
      description: "A gleaming mithril belt that braces the torso.",
      stats: { defenseRating: 30, stamina: 20, health: 35, strength: 10 },
      sellPrice: 520, quantity: 1, xpGained: 212, spriteId: "waist_plate",
    },
  },
  {
    name: "Adamantine Plate Belt", tradeskillClass: "armorer", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 490, acquisitionType: "vendor", vendorCost: 184,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 1 }],
    output: {
      name: "Adamantine Plate Belt", type: "armor", slot: "waist", rarity: "legendary", armorType: "plate",
      description: "An adamantine belt that doubles as a piece of torso plate — unbreakable.",
      stats: { defenseRating: 46, stamina: 32, health: 55, mitigation: 10 },
      sellPrice: 1460, quantity: 1, xpGained: 382, spriteId: "waist_plate",
    },
  },

  // ════ TAILOR ═════════════════════════════════════════════════════════════════
  {
    name: "Linen Tunic", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 1, minLevel: 10, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 8,
    ingredients: [{ itemId: "ts_linen_bolt", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Stitched Linen Tunic", type: "armor", slot: "chest", rarity: "common", armorType: "cloth",
      description: "A simple cloth tunic stitched together by a novice tailor.",
      stats: { intelligence: 6, wisdom: 4 },
      sellPrice: 12, quantity: 1, xpGained: 35, spriteId: "chest_cloth",
    },
  },
  {
    name: "Rough Leather Vest", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 5, minLevel: 12, craftTimeSeconds: 90, acquisitionType: "vendor", vendorCost: 18,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Leather Vest", type: "armor", slot: "chest", rarity: "common", armorType: "leather",
      description: "A serviceable leather vest for scouts and rogues.",
      stats: { agility: 8, attackRating: 6 },
      sellPrice: 20, quantity: 1, xpGained: 45, spriteId: "chest_leather",
    },
  },
  {
    name: "Silk Robe", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 12, minLevel: 20, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 40,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Robe", type: "armor", slot: "chest", rarity: "uncommon", armorType: "cloth",
      description: "A flowing silk robe that channels magical energy.",
      stats: { intelligence: 18, wisdom: 12, spellCritChance: 3 },
      sellPrice: 75, quantity: 1, xpGained: 100, spriteId: "chest_cloth",
    },
  },
  {
    name: "Supple Leather Jerkin", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 18, minLevel: 25, craftTimeSeconds: 150, acquisitionType: "vendor", vendorCost: 55,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Jerkin", type: "armor", slot: "chest", rarity: "rare", armorType: "leather",
      description: "Flexible yet tough leather that moves with the wearer.",
      stats: { agility: 22, attackRating: 16, critChance: 4 },
      sellPrice: 110, quantity: 1, xpGained: 140, spriteId: "chest_leather",
    },
  },
  {
    name: "Silk Hood", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 14, minLevel: 20, craftTimeSeconds: 100, acquisitionType: "vendor", vendorCost: 35,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Hood", type: "armor", slot: "head", rarity: "uncommon", armorType: "cloth",
      description: "A hood woven from fine silk that amplifies mental acuity.",
      stats: { intelligence: 14, wisdom: 10 },
      sellPrice: 55, quantity: 1, xpGained: 90, spriteId: "helm_cloth",
    },
  },
  {
    name: "Spidersilk Vestments", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 26, minLevel: 32, craftTimeSeconds: 270, acquisitionType: "vendor", vendorCost: 100,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Spidersilk Vestments", type: "armor", slot: "chest", rarity: "rare", armorType: "cloth",
      description: "Incredibly strong yet featherlight vestments woven from spider silk.",
      stats: { intelligence: 32, wisdom: 22, spellCritChance: 6, spellDamageBonus: 12 },
      sellPrice: 200, quantity: 1, xpGained: 220, spriteId: "chest_cloth",
    },
  },
  {
    name: "Spidersilk Scout Armor", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 300, acquisitionType: "vendor", vendorCost: 110,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 2 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Scout Armor", type: "armor", slot: "chest", rarity: "rare", armorType: "leather",
      description: "Lightweight scout armor reinforced with spidersilk weave.",
      stats: { agility: 36, attackRating: 28, critChance: 6, haste: 4 },
      sellPrice: 220, quantity: 1, xpGained: 240, spriteId: "chest_leather",
    },
  },
  {
    name: "Moonweave Robe", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 36, minLevel: 40, craftTimeSeconds: 480, acquisitionType: "vendor", vendorCost: 180,
    ingredients: [{ itemId: "ts_moonweave", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Moonweave Robe", type: "armor", slot: "chest", rarity: "legendary", armorType: "cloth",
      description: "A robe stitched from moonweave, shimmering with lunar energy.",
      stats: { intelligence: 60, wisdom: 42, spellCritChance: 10, spellDamageBonus: 24 },
      sellPrice: 480, quantity: 1, xpGained: 400, spriteId: "chest_cloth",
    },
  },
  {
    name: "Moonweave Leggings", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 420, acquisitionType: "vendor", vendorCost: 160,
    ingredients: [{ itemId: "ts_moonweave", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Leggings", type: "armor", slot: "legs", rarity: "legendary", armorType: "cloth",
      description: "Flowing leggings of moonweave that ripple with arcane power.",
      stats: { intelligence: 50, wisdom: 36, spellCritChance: 8 },
      sellPrice: 380, quantity: 1, xpGained: 360, spriteId: "legs_cloth",
    },
  },
  // ── Leather/Cloth Gloves (hands) ──────────────────────────────────────────────
  {
    name: "Rough Leather Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 6, minLevel: 12, craftTimeSeconds: 70, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Leather Gloves", type: "armor", slot: "hands", rarity: "common", armorType: "leather",
      description: "Thick leather gloves that protect the hands in combat.",
      stats: { agility: 5, haste: 2, defenseRating: 6 },
      sellPrice: 14, quantity: 1, xpGained: 38, spriteId: "hands_leather",
    },
  },
  {
    name: "Supple Leather Scout Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 19, minLevel: 25, craftTimeSeconds: 140, acquisitionType: "vendor", vendorCost: 42,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Scout Gloves", type: "armor", slot: "hands", rarity: "uncommon", armorType: "leather",
      description: "Fitted leather gloves for scouts and rogues that leave the fingertips free.",
      stats: { agility: 10, critChance: 2, haste: 3, attackRating: 8 },
      sellPrice: 72, quantity: 1, xpGained: 110, spriteId: "hands_leather",
    },
  },
  {
    name: "Spidersilk Ranger Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 29, minLevel: 35, craftTimeSeconds: 290, acquisitionType: "vendor", vendorCost: 105,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Ranger Gloves", type: "armor", slot: "hands", rarity: "rare", armorType: "leather",
      description: "Ranger gloves reinforced with spidersilk weave for superior grip and protection.",
      stats: { agility: 18, critChance: 4, haste: 5, attackRating: 16 },
      sellPrice: 520, quantity: 1, xpGained: 215, spriteId: "hands_leather",
    },
  },
  {
    name: "Moonweave Tracker Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 450, acquisitionType: "vendor", vendorCost: 168,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Tracker Gloves", type: "armor", slot: "hands", rarity: "legendary", armorType: "leather",
      description: "Legendary gloves woven from moonweave that move with supernatural speed.",
      stats: { agility: 30, critChance: 8, haste: 8, attackRating: 28 },
      sellPrice: 1520, quantity: 1, xpGained: 375, spriteId: "hands_leather",
    },
  },
  {
    name: "Linen Cloth Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 4, minLevel: 10, craftTimeSeconds: 55, acquisitionType: "vendor", vendorCost: 9,
    ingredients: [{ itemId: "ts_linen_bolt", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Linen Cloth Gloves", type: "armor", slot: "hands", rarity: "common", armorType: "cloth",
      description: "Simple cloth gloves worn by apprentice mages to protect spell-burned fingers.",
      stats: { intelligence: 5, wisdom: 3 },
      sellPrice: 10, quantity: 1, xpGained: 32, spriteId: "hands_cloth",
    },
  },
  {
    name: "Silk Spell Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 15, minLevel: 22, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 38,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Spell Gloves", type: "armor", slot: "hands", rarity: "uncommon", armorType: "cloth",
      description: "Thin silk gloves that focus magical energies through the palms.",
      stats: { intelligence: 10, wisdom: 6, spellCritChance: 2 },
      sellPrice: 68, quantity: 1, xpGained: 105, spriteId: "hands_cloth",
    },
  },
  {
    name: "Spidersilk Mage Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 28, minLevel: 34, craftTimeSeconds: 285, acquisitionType: "vendor", vendorCost: 103,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Mage Gloves", type: "armor", slot: "hands", rarity: "rare", armorType: "cloth",
      description: "Delicate spidersilk gloves that amplify spell focus and critical chance.",
      stats: { intelligence: 20, wisdom: 14, spellCritChance: 5, spellDamageBonus: 8 },
      sellPrice: 510, quantity: 1, xpGained: 212, spriteId: "hands_cloth",
    },
  },
  {
    name: "Moonweave Arcane Gloves", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 448, acquisitionType: "vendor", vendorCost: 166,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Arcane Gloves", type: "armor", slot: "hands", rarity: "legendary", armorType: "cloth",
      description: "Moonweave gloves that crackle with trapped arcane energy.",
      stats: { intelligence: 32, wisdom: 22, spellCritChance: 9, spellDamageBonus: 18 },
      sellPrice: 1500, quantity: 1, xpGained: 372, spriteId: "hands_cloth",
    },
  },
  // ── Leather/Cloth Boots (feet) ────────────────────────────────────────────────
  {
    name: "Rough Leather Boots", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 7, minLevel: 12, craftTimeSeconds: 70, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Leather Boots", type: "armor", slot: "feet", rarity: "common", armorType: "leather",
      description: "Sturdy leather boots that can take a beating on the road.",
      stats: { agility: 5, avoidance: 1, defenseRating: 6 },
      sellPrice: 14, quantity: 1, xpGained: 38, spriteId: "feet_leather",
    },
  },
  {
    name: "Supple Leather Ranger Boots", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 20, minLevel: 26, craftTimeSeconds: 148, acquisitionType: "vendor", vendorCost: 44,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Ranger Boots", type: "armor", slot: "feet", rarity: "uncommon", armorType: "leather",
      description: "Supple boots crafted for rangers who spend days in the field.",
      stats: { agility: 10, avoidance: 3, haste: 3 },
      sellPrice: 74, quantity: 1, xpGained: 112, spriteId: "feet_leather",
    },
  },
  {
    name: "Spidersilk Scout Boots", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 29, minLevel: 36, craftTimeSeconds: 292, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Scout Boots", type: "armor", slot: "feet", rarity: "rare", armorType: "leather",
      description: "Near-silent boots woven with spidersilk that enhance a scout's mobility.",
      stats: { agility: 18, avoidance: 5, haste: 5, critChance: 3 },
      sellPrice: 525, quantity: 1, xpGained: 218, spriteId: "feet_leather",
    },
  },
  {
    name: "Moonweave Shadowstep Boots", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 452, acquisitionType: "vendor", vendorCost: 169,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Shadowstep Boots", type: "armor", slot: "feet", rarity: "legendary", armorType: "leather",
      description: "Boots enchanted with moonweave that allow the wearer to move like a whisper.",
      stats: { agility: 30, avoidance: 7, haste: 8, critChance: 4 },
      sellPrice: 1530, quantity: 1, xpGained: 378, spriteId: "feet_leather",
    },
  },
  {
    name: "Linen Cloth Sandals", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 5, minLevel: 10, craftTimeSeconds: 55, acquisitionType: "vendor", vendorCost: 9,
    ingredients: [{ itemId: "ts_linen_bolt", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Linen Cloth Sandals", type: "armor", slot: "feet", rarity: "common", armorType: "cloth",
      description: "Simple linen sandals enchanted to protect the caster's feet.",
      stats: { intelligence: 4, power: 15, avoidance: 1 },
      sellPrice: 10, quantity: 1, xpGained: 32, spriteId: "feet_cloth",
    },
  },
  {
    name: "Silk Mage Slippers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 16, minLevel: 22, craftTimeSeconds: 122, acquisitionType: "vendor", vendorCost: 38,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Mage Slippers", type: "armor", slot: "feet", rarity: "uncommon", armorType: "cloth",
      description: "Enchanted slippers that keep the caster light on their feet.",
      stats: { intelligence: 8, wisdom: 5, avoidance: 2, power: 28 },
      sellPrice: 70, quantity: 1, xpGained: 107, spriteId: "feet_cloth",
    },
  },
  {
    name: "Spidersilk Arcane Slippers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 29, minLevel: 36, craftTimeSeconds: 292, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Spidersilk Arcane Slippers", type: "armor", slot: "feet", rarity: "rare", armorType: "cloth",
      description: "Delicate slippers of spidersilk that allow silent movement and quick spellcasting.",
      stats: { intelligence: 18, wisdom: 12, spellCritChance: 4, avoidance: 3, power: 55 },
      sellPrice: 518, quantity: 1, xpGained: 215, spriteId: "feet_cloth",
    },
  },
  {
    name: "Moonweave Ethereal Slippers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 450, acquisitionType: "vendor", vendorCost: 166,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Moonweave Ethereal Slippers", type: "armor", slot: "feet", rarity: "legendary", armorType: "cloth",
      description: "Slippers that glow softly with moonweave — the wearer feels as if floating.",
      stats: { intelligence: 28, wisdom: 18, spellCritChance: 7, avoidance: 4, power: 90 },
      sellPrice: 1490, quantity: 1, xpGained: 370, spriteId: "feet_cloth",
    },
  },
  // ── Leather/Cloth Bracers (wrists) ────────────────────────────────────────────
  {
    name: "Rough Leather Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 8, minLevel: 14, craftTimeSeconds: 68, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Leather Bracers", type: "armor", slot: "wrists", rarity: "common", armorType: "leather",
      description: "Serviceable leather bracers that protect the wrists from blade strikes.",
      stats: { agility: 4, attackRating: 6, defenseRating: 5 },
      sellPrice: 12, quantity: 1, xpGained: 36, spriteId: "wrists_leather",
    },
  },
  {
    name: "Supple Leather Scout Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 21, minLevel: 28, craftTimeSeconds: 152, acquisitionType: "vendor", vendorCost: 48,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Scout Bracers", type: "armor", slot: "wrists", rarity: "uncommon", armorType: "leather",
      description: "Flexible leather bracers worn by experienced scouts.",
      stats: { agility: 8, attackRating: 12, critChance: 2 },
      sellPrice: 72, quantity: 1, xpGained: 112, spriteId: "wrists_leather",
    },
  },
  {
    name: "Spidersilk Scout Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 30, minLevel: 36, craftTimeSeconds: 295, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Scout Bracers", type: "armor", slot: "wrists", rarity: "rare", armorType: "leather",
      description: "Bracers reinforced with spidersilk weave for the quick and the deadly.",
      stats: { agility: 16, attackRating: 22, critChance: 4, haste: 3 },
      sellPrice: 524, quantity: 1, xpGained: 218, spriteId: "wrists_leather",
    },
  },
  {
    name: "Moonweave Marksman Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 452, acquisitionType: "vendor", vendorCost: 168,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Marksman Bracers", type: "armor", slot: "wrists", rarity: "legendary", armorType: "leather",
      description: "Wrists wrapped in moonweave that guide every shot and blow with precision.",
      stats: { agility: 26, attackRating: 36, critChance: 7, haste: 5 },
      sellPrice: 1510, quantity: 1, xpGained: 374, spriteId: "wrists_leather",
    },
  },
  {
    name: "Linen Cloth Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 5, minLevel: 10, craftTimeSeconds: 55, acquisitionType: "vendor", vendorCost: 9,
    ingredients: [{ itemId: "ts_linen_bolt", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Linen Cloth Bracers", type: "armor", slot: "wrists", rarity: "common", armorType: "cloth",
      description: "Linen bracers stitched with basic focusing runes for apprentice casters.",
      stats: { intelligence: 4, wisdom: 3 },
      sellPrice: 10, quantity: 1, xpGained: 30, spriteId: "wrists_cloth",
    },
  },
  {
    name: "Silk Arcanist Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 17, minLevel: 22, craftTimeSeconds: 124, acquisitionType: "vendor", vendorCost: 40,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Arcanist Bracers", type: "armor", slot: "wrists", rarity: "uncommon", armorType: "cloth",
      description: "Silk bracers embroidered with runes that amplify spellcasting.",
      stats: { intelligence: 10, wisdom: 7, spellCritChance: 2 },
      sellPrice: 68, quantity: 1, xpGained: 106, spriteId: "wrists_cloth",
    },
  },
  {
    name: "Spidersilk Sorcerer Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 30, minLevel: 36, craftTimeSeconds: 295, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Spidersilk Sorcerer Bracers", type: "armor", slot: "wrists", rarity: "rare", armorType: "cloth",
      description: "Arcane bracers of spidersilk that channel excess magical energy safely.",
      stats: { intelligence: 18, wisdom: 12, spellCritChance: 4, spellDamageBonus: 7 },
      sellPrice: 514, quantity: 1, xpGained: 216, spriteId: "wrists_cloth",
    },
  },
  {
    name: "Moonweave Mage Bracers", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 448, acquisitionType: "vendor", vendorCost: 166,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Moonweave Mage Bracers", type: "armor", slot: "wrists", rarity: "legendary", armorType: "cloth",
      description: "Moonweave bracers that shimmer with stored arcane energy.",
      stats: { intelligence: 28, wisdom: 18, spellCritChance: 7, spellDamageBonus: 16 },
      sellPrice: 1490, quantity: 1, xpGained: 370, spriteId: "wrists_cloth",
    },
  },
  // ── Belts/Sashes (waist) ──────────────────────────────────────────────────────
  {
    name: "Rough Leather Belt", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 9, minLevel: 14, craftTimeSeconds: 68, acquisitionType: "vendor", vendorCost: 12,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Leather Belt", type: "armor", slot: "waist", rarity: "common", armorType: "leather",
      description: "A practical leather belt worn by scouts and wanderers.",
      stats: { agility: 4, stamina: 3 },
      sellPrice: 12, quantity: 1, xpGained: 36, spriteId: "waist_leather",
    },
  },
  {
    name: "Supple Leather Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 22, minLevel: 28, craftTimeSeconds: 154, acquisitionType: "vendor", vendorCost: 48,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Sash", type: "armor", slot: "waist", rarity: "uncommon", armorType: "leather",
      description: "A well-fitted leather sash that provides mobility and protection.",
      stats: { agility: 8, stamina: 6, haste: 2, attackRating: 8 },
      sellPrice: 74, quantity: 1, xpGained: 112, spriteId: "waist_leather",
    },
  },
  {
    name: "Spidersilk Ranger Belt", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 30, minLevel: 36, craftTimeSeconds: 294, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_rough_hide", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Spidersilk Ranger Belt", type: "armor", slot: "waist", rarity: "rare", armorType: "leather",
      description: "A ranger's belt reinforced with spidersilk that holds gear and resists cuts.",
      stats: { agility: 14, stamina: 10, attackRating: 14, haste: 3 },
      sellPrice: 516, quantity: 1, xpGained: 216, spriteId: "waist_leather",
    },
  },
  {
    name: "Moonweave Scout Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 450, acquisitionType: "vendor", vendorCost: 167,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_supple_leather", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Moonweave Scout Sash", type: "armor", slot: "waist", rarity: "legendary", armorType: "leather",
      description: "A sash of moonweave that shimmers with accumulated kinetic energy.",
      stats: { agility: 24, stamina: 18, attackRating: 24, haste: 6 },
      sellPrice: 1500, quantity: 1, xpGained: 373, spriteId: "waist_leather",
    },
  },
  {
    name: "Linen Cloth Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 6, minLevel: 10, craftTimeSeconds: 55, acquisitionType: "vendor", vendorCost: 9,
    ingredients: [{ itemId: "ts_linen_bolt", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Linen Cloth Sash", type: "armor", slot: "waist", rarity: "common", armorType: "cloth",
      description: "A basic linen sash worn by novice casters.",
      stats: { intelligence: 4, wisdom: 3, power: 12 },
      sellPrice: 10, quantity: 1, xpGained: 30, spriteId: "waist_cloth",
    },
  },
  {
    name: "Silk Arcanist Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 18, minLevel: 24, craftTimeSeconds: 124, acquisitionType: "vendor", vendorCost: 40,
    ingredients: [{ itemId: "ts_silk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Silk Arcanist Sash", type: "armor", slot: "waist", rarity: "uncommon", armorType: "cloth",
      description: "A silk sash that helps contain magical overflow.",
      stats: { intelligence: 8, wisdom: 6, power: 28 },
      sellPrice: 68, quantity: 1, xpGained: 106, spriteId: "waist_cloth",
    },
  },
  {
    name: "Spidersilk Channeler Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 30, minLevel: 36, craftTimeSeconds: 294, acquisitionType: "vendor", vendorCost: 108,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Spidersilk Channeler Sash", type: "armor", slot: "waist", rarity: "rare", armorType: "cloth",
      description: "A spidersilk sash that acts as a magical reservoir for casters.",
      stats: { intelligence: 16, wisdom: 10, spellDamageBonus: 8, power: 48 },
      sellPrice: 512, quantity: 1, xpGained: 214, spriteId: "waist_cloth",
    },
  },
  {
    name: "Moonweave Archmage Sash", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 37, minLevel: 42, craftTimeSeconds: 450, acquisitionType: "vendor", vendorCost: 166,
    ingredients: [{ itemId: "ts_moonweave", quantity: 1 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Moonweave Archmage Sash", type: "armor", slot: "waist", rarity: "legendary", armorType: "cloth",
      description: "A sash of moonweave worn by archmages — it stores and releases magical energy on demand.",
      stats: { intelligence: 26, wisdom: 16, spellDamageBonus: 20, spellCritChance: 5, power: 85 },
      sellPrice: 1480, quantity: 1, xpGained: 370, spriteId: "waist_cloth",
    },
  },
  // ── Cloaks/Capes (back) ───────────────────────────────────────────────────────
  {
    name: "Rough Hide Cloak", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 10, minLevel: 14, craftTimeSeconds: 72, acquisitionType: "vendor", vendorCost: 13,
    ingredients: [{ itemId: "ts_rough_hide", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Rough Hide Cloak", type: "armor", slot: "back", rarity: "common", armorType: "leather",
      description: "A thick cloak of rough animal hide, good for cold nights in the field.",
      stats: { stamina: 5, defenseRating: 6, agility: 2 },
      sellPrice: 14, quantity: 1, xpGained: 38, spriteId: "back_leather",
    },
  },
  {
    name: "Supple Leather Cloak", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 22, minLevel: 28, craftTimeSeconds: 155, acquisitionType: "vendor", vendorCost: 50,
    ingredients: [{ itemId: "ts_supple_leather", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 1 }],
    output: {
      name: "Supple Leather Cloak", type: "armor", slot: "back", rarity: "uncommon", armorType: "leather",
      description: "A well-tanned leather cloak that offers freedom of movement.",
      stats: { agility: 8, stamina: 8, avoidance: 3, defenseRating: 14 },
      sellPrice: 78, quantity: 1, xpGained: 115, spriteId: "back_leather",
    },
  },
  {
    name: "Spidersilk Cloak", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 31, minLevel: 36, craftTimeSeconds: 298, acquisitionType: "vendor", vendorCost: 110,
    ingredients: [{ itemId: "ts_spidersilk_cloth", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Spidersilk Cloak", type: "armor", slot: "back", rarity: "rare", armorType: "cloth",
      description: "A shimmering cloak of spidersilk that is nearly weightless yet strong as mail.",
      stats: { agility: 16, stamina: 14, avoidance: 5, critChance: 3, intelligence: 10 },
      sellPrice: 525, quantity: 1, xpGained: 220, spriteId: "back_silk",
    },
  },
  {
    name: "Moonweave Arcane Cloak", tradeskillClass: "tailor", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 455, acquisitionType: "vendor", vendorCost: 170,
    ingredients: [{ itemId: "ts_moonweave", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Moonweave Arcane Cloak", type: "armor", slot: "back", rarity: "legendary", armorType: "cloth",
      description: "A cloak woven from moonweave that crackles with stored arcane energy.",
      stats: { intelligence: 28, wisdom: 20, spellCritChance: 6, stamina: 18, avoidance: 4 },
      sellPrice: 1550, quantity: 1, xpGained: 378, spriteId: "back_arcane",
    },
  },

  // ════ JEWELER ════════════════════════════════════════════════════════════════
  {
    name: "Iron Ring", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 1, minLevel: 10, craftTimeSeconds: 45, acquisitionType: "vendor", vendorCost: 8,
    ingredients: [{ itemId: "iron_ore", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Polished Iron Ring", type: "accessory", slot: "ring", rarity: "common",
      description: "A simple iron ring, worn smooth by the jeweler's polishing cloth.",
      stats: { strength: 4, stamina: 3 },
      sellPrice: 12, quantity: 1, xpGained: 30, spriteId: "ring",
    },
  },
  {
    name: "Ruby Stud Earring", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 5, minLevel: 12, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 22,
    ingredients: [{ itemId: "iron_ore", quantity: 1 }, { itemId: "ts_rough_ruby", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Ruby Stud Earring", type: "accessory", slot: "ear", rarity: "uncommon",
      description: "A gleaming iron earring set with a rough ruby.",
      stats: { attackRating: 8, critChance: 2 },
      sellPrice: 35, quantity: 1, xpGained: 55, spriteId: "earring",
    },
  },
  {
    name: "Steel Band", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 10, minLevel: 18, craftTimeSeconds: 75, acquisitionType: "vendor", vendorCost: 30,
    ingredients: [{ itemId: "steel_bar", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Polished Steel Band", type: "accessory", slot: "ring", rarity: "uncommon",
      description: "A smooth steel ring that imparts martial focus.",
      stats: { attackRating: 12, strength: 6 },
      sellPrice: 55, quantity: 1, xpGained: 80, spriteId: "ring",
    },
  },
  {
    name: "Sapphire Pendant", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 15, minLevel: 22, craftTimeSeconds: 100, acquisitionType: "vendor", vendorCost: 60,
    ingredients: [{ itemId: "steel_bar", quantity: 1 }, { itemId: "ts_flawless_sapphire", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Sapphire Pendant", type: "accessory", slot: "neck", rarity: "rare",
      description: "A brilliant sapphire set in polished steel, it amplifies the wearer's focus.",
      stats: { intelligence: 14, wisdom: 10, spellCritChance: 3 },
      sellPrice: 120, quantity: 1, xpGained: 130, spriteId: "necklace",
    },
  },
  {
    name: "Mithril Loop", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 22, minLevel: 28, craftTimeSeconds: 150, acquisitionType: "vendor", vendorCost: 80,
    ingredients: [{ itemId: "mithril_ore", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Mithril Loop", type: "accessory", slot: "ring", rarity: "rare",
      description: "A seamless ring of pure mithril — lightweight yet incredibly strong.",
      stats: { agility: 12, attackRating: 18, avoidance: 3 },
      sellPrice: 180, quantity: 1, xpGained: 180, spriteId: "ring",
    },
  },
  {
    name: "Void Crystal Ring", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 30, minLevel: 35, craftTimeSeconds: 240, acquisitionType: "vendor", vendorCost: 130,
    ingredients: [{ itemId: "mithril_ore", quantity: 1 }, { itemId: "ts_void_crystal", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Void Crystal Ring", type: "accessory", slot: "ring", rarity: "rare",
      description: "A ring set with a dark crystal that pulses with shadow energy.",
      stats: { intelligence: 20, spellDamageBonus: 14, spellCritChance: 5 },
      sellPrice: 260, quantity: 1, xpGained: 250, spriteId: "ring",
    },
  },
  {
    name: "Adamantine Choker", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 35, minLevel: 40, craftTimeSeconds: 360, acquisitionType: "vendor", vendorCost: 180,
    ingredients: [{ itemId: "ts_adamantine_ore", quantity: 1 }, { itemId: "ts_rough_ruby", quantity: 2 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Adamantine Choker", type: "accessory", slot: "neck", rarity: "legendary",
      description: "A sturdy choker of adamantine accented with rubies — a sign of great wealth and power.",
      stats: { strength: 18, attackRating: 30, critChance: 6, stamina: 12 },
      sellPrice: 450, quantity: 1, xpGained: 380, spriteId: "necklace",
    },
  },
  {
    name: "Moonstone Amulet", tradeskillClass: "jeweler", tier: "apprentice",
    minSkill: 38, minLevel: 42, craftTimeSeconds: 420, acquisitionType: "vendor", vendorCost: 200,
    ingredients: [{ itemId: "mithril_ore", quantity: 1 }, { itemId: "ts_flawless_sapphire", quantity: 1 }, { itemId: "ts_void_crystal", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Moonstone Amulet", type: "accessory", slot: "neck", rarity: "legendary",
      description: "A masterwork amulet combining sapphire clarity with void crystal power.",
      stats: { intelligence: 38, wisdom: 28, spellCritChance: 9, spellDamageBonus: 22 },
      sellPrice: 520, quantity: 1, xpGained: 420, spriteId: "necklace",
    },
  },

  // ════ ALCHEMIST ══════════════════════════════════════════════════════════════
  {
    name: "Minor Health Potion", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 1, minLevel: 10, craftTimeSeconds: 30, acquisitionType: "vendor", vendorCost: 5,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 1 }, { itemId: "ts_mana_shard", quantity: 1 }],
    output: {
      name: "Minor Health Potion", type: "consumable", slot: "none", rarity: "common",
      description: "A basic red potion that restores a small amount of health.",
      stats: {}, sellPrice: 8, quantity: 2, xpGained: 25, spriteId: "potion_red",
      stackable: true, effect: { type: "heal", value: 150 },
    },
  },
  {
    name: "Minor Power Potion", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 3, minLevel: 10, craftTimeSeconds: 30, acquisitionType: "vendor", vendorCost: 5,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 1 }, { itemId: "ts_mana_shard", quantity: 1 }],
    output: {
      name: "Minor Power Potion", type: "consumable", slot: "none", rarity: "common",
      description: "A small blue potion that restores magical power.",
      stats: {}, sellPrice: 8, quantity: 2, xpGained: 25, spriteId: "potion_blue",
      stackable: true, effect: { type: "restore_power", value: 100 },
    },
  },
  {
    name: "Elixir of Strength", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 8, minLevel: 15, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 20,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 2 }, { itemId: "ts_mana_shard", quantity: 1 }],
    output: {
      name: "Elixir of Strength", type: "consumable", slot: "none", rarity: "uncommon",
      description: "A fizzing green potion that temporarily boosts physical strength.",
      stats: {}, sellPrice: 35, quantity: 1, xpGained: 60, spriteId: "potion_green",
      stackable: true, effect: { type: "buff_strength", value: 20 },
    },
  },
  {
    name: "Health Potion", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 14, minLevel: 20, craftTimeSeconds: 60, acquisitionType: "vendor", vendorCost: 22,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 2 }, { itemId: "ts_alchemists_coal", quantity: 2 }, { itemId: "ts_mana_shard", quantity: 1 }],
    output: {
      name: "Health Potion", type: "consumable", slot: "none", rarity: "uncommon",
      description: "A reliable health potion that restores a significant amount of health.",
      stats: {}, sellPrice: 40, quantity: 2, xpGained: 90, spriteId: "potion_red",
      stackable: true, effect: { type: "heal", value: 350 },
    },
  },
  {
    name: "Elixir of Agility", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 16, minLevel: 22, craftTimeSeconds: 75, acquisitionType: "vendor", vendorCost: 28,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 2 }, { itemId: "ts_mana_shard", quantity: 2 }],
    output: {
      name: "Elixir of Agility", type: "consumable", slot: "none", rarity: "uncommon",
      description: "A shimmering potion that sharpens reflexes and quickens feet.",
      stats: {}, sellPrice: 45, quantity: 1, xpGained: 100, spriteId: "potion_green",
      stackable: true, effect: { type: "buff_agility", value: 20 },
    },
  },
  {
    name: "Elixir of the Warrior", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 22, minLevel: 28, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 55,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 3 }, { itemId: "ts_mana_shard", quantity: 2 }],
    output: {
      name: "Elixir of the Warrior", type: "consumable", slot: "none", rarity: "rare",
      description: "A potent elixir that enhances the drinker's fighting capability for a short time.",
      stats: {}, sellPrice: 90, quantity: 1, xpGained: 160, spriteId: "potion_orange",
      stackable: true, effect: { type: "buff_attack", value: 30 },
    },
  },
  {
    name: "Strong Health Potion", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 28, minLevel: 32, craftTimeSeconds: 120, acquisitionType: "vendor", vendorCost: 65,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 2 }, { itemId: "ts_alchemists_coal", quantity: 3 }, { itemId: "ts_mana_shard", quantity: 2 }],
    output: {
      name: "Strong Health Potion", type: "consumable", slot: "none", rarity: "rare",
      description: "A concentrated health potion that rapidly restores health.",
      stats: {}, sellPrice: 100, quantity: 2, xpGained: 180, spriteId: "potion_red",
      stackable: true, effect: { type: "heal", value: 700 },
    },
  },
  {
    name: "Elixir of Intelligence", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 34, minLevel: 38, craftTimeSeconds: 150, acquisitionType: "vendor", vendorCost: 90,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_alchemists_coal", quantity: 3 }, { itemId: "ts_mana_shard", quantity: 3 }],
    output: {
      name: "Elixir of Intelligence", type: "consumable", slot: "none", rarity: "rare",
      description: "A sparkling golden potion that greatly enhances magical intellect.",
      stats: {}, sellPrice: 140, quantity: 1, xpGained: 240, spriteId: "potion_gold",
      stackable: true, effect: { type: "buff_intelligence", value: 30 },
    },
  },
  {
    name: "Flask of Undying Resolve", tradeskillClass: "alchemist", tier: "apprentice",
    minSkill: 40, minLevel: 44, craftTimeSeconds: 300, acquisitionType: "vendor", vendorCost: 180,
    ingredients: [{ itemId: "ts_empty_vial", quantity: 2 }, { itemId: "ts_alchemists_coal", quantity: 4 }, { itemId: "ts_mana_shard", quantity: 3 }],
    output: {
      name: "Flask of Undying Resolve", type: "consumable", slot: "none", rarity: "legendary",
      description: "A master alchemist's masterwork — a flask that dramatically extends the drinker's endurance.",
      stats: {}, sellPrice: 350, quantity: 1, xpGained: 420, spriteId: "potion_purple",
      stackable: true, effect: { type: "heal", value: 1500 },
    },
  },
];

// ─── Seed helper ─────────────────────────────────────────────────────────────

export const ALL_APPRENTICE_RECIPE_NAMES = new Set(APPRENTICE_RECIPES.map(r => r.name));

// ─── Master Recipe Seed ───────────────────────────────────────────────────────
// Master-tier recipes drop from raid boss kills (10–20% chance).
// They require Phase 2 boss crafting materials as primary ingredients.

export interface MasterRecipeSeed {
  name: string;
  tradeskillClass: "weaponsmith" | "armorer" | "tailor" | "jeweler" | "alchemist";
  tier: "master";
  minSkill: number;
  minLevel: number;
  craftTimeSeconds: number;
  ingredients: Array<{ itemId: string; quantity: number }>;
  output: {
    name: string;
    description: string;
    type: "weapon" | "armor" | "accessory" | "consumable";
    slot: string;
    rarity: "legendary";
    stats: Record<string, number>;
    sellPrice: number;
    armorType?: "plate" | "chain" | "leather" | "cloth";
    quantity: number;
    xpGained: number;
    spriteId?: string;
    stackable?: boolean;
    effect?: { type: string; value: number };
  };
  acquisitionType: "raid";
  /** Which raid boss drops this recipe (thematic pairing). */
  raidBossId: string;
}

export const MASTER_RECIPES: MasterRecipeSeed[] = [
  // ── Harla Dar (prismatic dragon) drops ──────────────────────────────────────
  {
    name: "Prismatic Dragon Fang Blade",
    tradeskillClass: "weaponsmith", tier: "master",
    minSkill: 75, minLevel: 55, craftTimeSeconds: 1800, acquisitionType: "raid", raidBossId: "harla_dar",
    ingredients: [
      { itemId: "prismatic_dragon_scale", quantity: 3 },
      { itemId: "ts_adamantine_ore", quantity: 4 },
      { itemId: "ts_metal_flux", quantity: 2 },
    ],
    output: {
      name: "Prismatic Dragon Fang Blade", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A greatsword forged from the fangs and scales of Harla Dar — it shifts between elemental damage types as it strikes.",
      stats: { weaponDamageMin: 220, weaponDamageMax: 380, weaponDelay: 2.8, attackRating: 180, strength: 45, critChance: 12 },
      sellPrice: 8000, quantity: 1, xpGained: 2500, spriteId: "weapon_sword",
    },
  },
  {
    name: "Chromatic Dragon Scale Hauberk",
    tradeskillClass: "armorer", tier: "master",
    minSkill: 75, minLevel: 55, craftTimeSeconds: 2400, acquisitionType: "raid", raidBossId: "harla_dar",
    ingredients: [
      { itemId: "prismatic_dragon_scale", quantity: 5 },
      { itemId: "ts_adamantine_ore", quantity: 3 },
      { itemId: "ts_metal_flux", quantity: 2 },
    ],
    output: {
      name: "Chromatic Dragon Scale Hauberk", type: "armor", slot: "chest", rarity: "legendary",
      description: "A masterwork breastplate fashioned from prismatic dragon scales that cycle through elemental resistances.",
      stats: { defenseRating: 420, stamina: 60, strength: 40, mitigation: 35, avoidance: 18 },
      sellPrice: 9500, quantity: 1, xpGained: 3000, spriteId: "chest_plate", armorType: "plate",
    },
  },
  // ── Trakanon (plague dragon) drops ──────────────────────────────────────────
  {
    name: "Plague Dragon Spine Greatbow",
    tradeskillClass: "weaponsmith", tier: "master",
    minSkill: 70, minLevel: 60, craftTimeSeconds: 1800, acquisitionType: "raid", raidBossId: "trakanon",
    ingredients: [
      { itemId: "plague_dragon_spine", quantity: 3 },
      { itemId: "ts_adamantine_ore", quantity: 2 },
      { itemId: "ts_metal_flux", quantity: 2 },
    ],
    output: {
      name: "Plague Dragon Spine Greatbow", type: "weapon", slot: "ranged", rarity: "legendary",
      description: "A bow strung with tendons from Trakanon — each arrow carries a virulent plague.",
      stats: { weaponDamageMin: 190, weaponDamageMax: 340, weaponDelay: 3.2, attackRating: 160, agility: 50, critChance: 10 },
      sellPrice: 7500, quantity: 1, xpGained: 2200, spriteId: "weapon_bow",
    },
  },
  {
    name: "Venom-Laced Plague Mantle",
    tradeskillClass: "tailor", tier: "master",
    minSkill: 70, minLevel: 60, craftTimeSeconds: 2100, acquisitionType: "raid", raidBossId: "trakanon",
    ingredients: [
      { itemId: "plague_dragon_spine", quantity: 2 },
      { itemId: "ts_spidersilk_cloth", quantity: 4 },
      { itemId: "ts_strong_thread", quantity: 3 },
    ],
    output: {
      name: "Venom-Laced Plague Mantle", type: "armor", slot: "shoulders", rarity: "legendary",
      description: "A hooded mantle woven from plague dragon sinew and spidersilk — toxic to the touch.",
      stats: { defenseRating: 220, intelligence: 60, wisdom: 45, spellDamageBonus: 40, spellCritChance: 14 },
      sellPrice: 7000, quantity: 1, xpGained: 2000, spriteId: "shoulders_cloth", armorType: "cloth",
    },
  },
  // ── Mayong Mistmoore (vampire lord) drops ────────────────────────────────────
  {
    name: "Vampire Lord's Fang Dagger",
    tradeskillClass: "weaponsmith", tier: "master",
    minSkill: 80, minLevel: 65, craftTimeSeconds: 1500, acquisitionType: "raid", raidBossId: "mayong_mistmoore",
    ingredients: [
      { itemId: "vampire_lord_fang", quantity: 2 },
      { itemId: "ts_adamantine_ore", quantity: 2 },
      { itemId: "ts_metal_flux", quantity: 1 },
    ],
    output: {
      name: "Vampire Lord's Fang Dagger", type: "weapon", slot: "secondary", rarity: "legendary",
      description: "A razor dagger carved from Mayong Mistmoore's own fang — it drains the life of those it pierces.",
      stats: { weaponDamageMin: 160, weaponDamageMax: 260, weaponDelay: 1.6, attackRating: 200, agility: 55, critChance: 18 },
      sellPrice: 10000, quantity: 1, xpGained: 3200, spriteId: "weapon_dagger",
    },
  },
  {
    name: "Mistmoore Blood Amulet",
    tradeskillClass: "jeweler", tier: "master",
    minSkill: 80, minLevel: 65, craftTimeSeconds: 1200, acquisitionType: "raid", raidBossId: "mayong_mistmoore",
    ingredients: [
      { itemId: "vampire_lord_fang", quantity: 1 },
      { itemId: "ts_void_crystal", quantity: 2 },
      { itemId: "ts_jewelers_oil", quantity: 2 },
    ],
    output: {
      name: "Mistmoore Blood Amulet", type: "accessory", slot: "neck", rarity: "legendary",
      description: "An amulet set with Mayong's fang and void crystals — it pulses with dark life-stealing energy.",
      stats: { intelligence: 70, wisdom: 55, spellDamageBonus: 55, spellCritChance: 18, stamina: 40 },
      sellPrice: 11000, quantity: 1, xpGained: 3500, spriteId: "necklace",
    },
  },
  {
    name: "Elixir of Eternal Night",
    tradeskillClass: "alchemist", tier: "master",
    minSkill: 80, minLevel: 65, craftTimeSeconds: 900, acquisitionType: "raid", raidBossId: "mayong_mistmoore",
    ingredients: [
      { itemId: "vampire_lord_fang", quantity: 1 },
      { itemId: "ts_empty_vial", quantity: 2 },
      { itemId: "ts_mana_shard", quantity: 4 },
      { itemId: "ts_alchemists_coal", quantity: 3 },
    ],
    output: {
      name: "Elixir of Eternal Night", type: "consumable", slot: "none", rarity: "legendary",
      description: "A draught distilled from Mayong's essence — the drinker heals catastrophically and fights with vampiric fury for a short time.",
      stats: {}, sellPrice: 5000, quantity: 1, xpGained: 2800, spriteId: "potion_purple",
      stackable: true, effect: { type: "heal", value: 5000 },
    },
  },
  // ── Additional Harla Dar (prismatic dragon) drops ────────────────────────────
  {
    name: "Prismatic Dragon Eye Wand",
    tradeskillClass: "weaponsmith", tier: "master",
    minSkill: 75, minLevel: 55, craftTimeSeconds: 1500, acquisitionType: "raid", raidBossId: "harla_dar",
    ingredients: [
      { itemId: "prismatic_dragon_scale", quantity: 2 },
      { itemId: "ts_adamantine_ore", quantity: 2 },
      { itemId: "ts_moonweave", quantity: 1 },
      { itemId: "ts_metal_flux", quantity: 2 },
    ],
    output: {
      name: "Prismatic Dragon Eye Wand", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A wand tipped with one of Harla Dar's own eyes — it shifts prismatic spell energies into devastating strikes.",
      stats: { weaponDamageMin: 180, weaponDamageMax: 300, weaponDelay: 1.4, attackRating: 160, intelligence: 75, wisdom: 40, spellCritChance: 20, spellDamageBonus: 55 },
      sellPrice: 9000, quantity: 1, xpGained: 2800, spriteId: "weapon_wand",
    },
  },
  // ── Additional Mayong Mistmoore (vampire lord) drops ─────────────────────────
  {
    name: "Scepter of Undying Faith",
    tradeskillClass: "weaponsmith", tier: "master",
    minSkill: 80, minLevel: 65, craftTimeSeconds: 1500, acquisitionType: "raid", raidBossId: "mayong_mistmoore",
    ingredients: [
      { itemId: "vampire_lord_fang", quantity: 2 },
      { itemId: "ts_adamantine_ore", quantity: 2 },
      { itemId: "ts_spidersilk_cloth", quantity: 1 },
      { itemId: "ts_metal_flux", quantity: 1 },
    ],
    output: {
      name: "Scepter of Undying Faith", type: "weapon", slot: "primary", rarity: "legendary",
      description: "A scepter wrought from Mayong's fangs — it channels the darkest healing arts, drawing life from enemies to restore allies.",
      stats: { weaponDamageMin: 150, weaponDamageMax: 240, weaponDelay: 1.8, attackRating: 170, wisdom: 80, power: 350, spellCritChance: 18, healBonus: 45 },
      sellPrice: 10500, quantity: 1, xpGained: 3300, spriteId: "weapon_scepter",
    },
  },
  {
    name: "Paladin's Holy Bulwark",
    tradeskillClass: "armorer", tier: "master",
    minSkill: 78, minLevel: 62, craftTimeSeconds: 1800, acquisitionType: "raid", raidBossId: "mayong_mistmoore",
    ingredients: [
      { itemId: "vampire_lord_fang", quantity: 1 },
      { itemId: "ts_adamantine_ore", quantity: 4 },
      { itemId: "ts_metal_flux", quantity: 2 },
    ],
    output: {
      name: "Paladin's Holy Bulwark", type: "armor", slot: "secondary", rarity: "legendary", armorType: "plate",
      description: "A shield consecrated with Mayong's own fang as a trophy — it radiates divine protection that repels the undead.",
      stats: { defenseRating: 240, stamina: 65, mitigation: 180, health: 220, wisdom: 30, power: 120 },
      sellPrice: 10000, quantity: 1, xpGained: 3000, spriteId: "shield_holy",
    },
  },
];

export const ALL_MASTER_RECIPE_NAMES = new Set(MASTER_RECIPES.map(r => r.name));

export interface JourneymanRecipeSeed {
  name: string;
  tradeskillClass: "weaponsmith" | "armorer" | "tailor" | "jeweler" | "alchemist";
  tier: "journeyman";
  minSkill: number;
  minLevel: number;
  craftTimeSeconds: number;
  ingredients: Array<{ itemId: string; quantity: number }>;
  output: {
    name: string; description: string;
    type: "weapon" | "armor" | "accessory" | "consumable";
    slot: string; rarity: "uncommon" | "rare" | "legendary";
    stats: Record<string, number>; sellPrice: number;
    armorType?: "plate" | "chain" | "leather" | "cloth";
    quantity: number; xpGained: number; spriteId?: string;
    stackable?: boolean; effect?: { type: string; value: number };
  };
  acquisitionType: "drop";
}

export const JOURNEYMAN_TS_RECIPES: JourneymanRecipeSeed[] = [
  // Weaponsmith
  {
    name: "Shadowroot Warclub", tradeskillClass: "weaponsmith", tier: "journeyman",
    minSkill: 45, minLevel: 45, craftTimeSeconds: 600, acquisitionType: "drop",
    ingredients: [{ itemId: "shadowroot_timber", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Shadowroot Warclub", type: "weapon", slot: "primary", rarity: "rare",
      description: "A heavy club of shadowroot wood banded with metal — it carries a dark energy.",
      stats: { weaponDamageMin: 78, weaponDamageMax: 120, weaponDelay: 2.4, attackRating: 85, strength: 22 },
      sellPrice: 600, quantity: 1, xpGained: 550, spriteId: "weapon_hammer",
    },
  },
  {
    name: "Embersteel Sword", tradeskillClass: "weaponsmith", tier: "journeyman",
    minSkill: 50, minLevel: 48, craftTimeSeconds: 720, acquisitionType: "drop",
    ingredients: [{ itemId: "emberstone_fragment", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }, { itemId: "ts_adamantine_ore", quantity: 1 }],
    output: {
      name: "Embersteel Blade", type: "weapon", slot: "primary", rarity: "rare",
      description: "A sword forged with emberstone — its edge glows faintly with heat.",
      stats: { weaponDamageMin: 95, weaponDamageMax: 145, weaponDelay: 1.9, attackRating: 110, agility: 18, critChance: 6 },
      sellPrice: 800, quantity: 1, xpGained: 700, spriteId: "weapon_sword",
    },
  },
  // Armorer
  {
    name: "Emberstone Pauldrons", tradeskillClass: "armorer", tier: "journeyman",
    minSkill: 45, minLevel: 45, craftTimeSeconds: 600, acquisitionType: "drop",
    ingredients: [{ itemId: "emberstone_fragment", quantity: 2 }, { itemId: "ts_metal_flux", quantity: 2 }],
    output: {
      name: "Emberstone Pauldrons", type: "armor", slot: "shoulders", rarity: "rare", armorType: "plate",
      description: "Shoulder armor infused with emberstone heat resistance.",
      stats: { defenseRating: 95, stamina: 42, health: 60, strength: 16 },
      sellPrice: 650, quantity: 1, xpGained: 580, spriteId: "shoulders_plate",
    },
  },
  {
    name: "Corrupted Beast Hauberk", tradeskillClass: "armorer", tier: "journeyman",
    minSkill: 52, minLevel: 50, craftTimeSeconds: 750, acquisitionType: "drop",
    ingredients: [{ itemId: "corrupted_hide", quantity: 3 }, { itemId: "ts_metal_flux", quantity: 2 }, { itemId: "ts_adamantine_ore", quantity: 1 }],
    output: {
      name: "Corrupted Beast Hauberk", type: "armor", slot: "chest", rarity: "legendary", armorType: "chain",
      description: "A chain hauberk reinforced with corrupted beast hide — both fierce and eerie.",
      stats: { defenseRating: 145, stamina: 65, health: 90, strength: 24, mitigation: 12 },
      sellPrice: 1100, quantity: 1, xpGained: 900, spriteId: "chest_chain",
    },
  },
  // Tailor
  {
    name: "Thornvine Trapper's Vest", tradeskillClass: "tailor", tier: "journeyman",
    minSkill: 45, minLevel: 45, craftTimeSeconds: 540, acquisitionType: "drop",
    ingredients: [{ itemId: "thornvine", quantity: 3 }, { itemId: "ts_rough_hide", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Thornvine Trapper's Vest", type: "armor", slot: "chest", rarity: "rare", armorType: "leather",
      description: "A scout's vest reinforced with thornvine binding for resilience in the field.",
      stats: { agility: 48, attackRating: 38, critChance: 8, haste: 6 },
      sellPrice: 600, quantity: 1, xpGained: 560, spriteId: "chest_leather",
    },
  },
  {
    name: "Manaweave Sorcerer's Robe", tradeskillClass: "tailor", tier: "journeyman",
    minSkill: 52, minLevel: 50, craftTimeSeconds: 720, acquisitionType: "drop",
    ingredients: [{ itemId: "manaweave_fiber", quantity: 3 }, { itemId: "ts_silk_cloth", quantity: 2 }, { itemId: "ts_strong_thread", quantity: 2 }],
    output: {
      name: "Manaweave Sorcerer's Robe", type: "armor", slot: "chest", rarity: "legendary", armorType: "cloth",
      description: "A robe woven from manaweave fiber — it hums with absorbed arcane energy.",
      stats: { intelligence: 82, wisdom: 58, spellCritChance: 12, spellDamageBonus: 32 },
      sellPrice: 1000, quantity: 1, xpGained: 850, spriteId: "chest_cloth",
    },
  },
  // Jeweler
  {
    name: "Glimmerdust Ring", tradeskillClass: "jeweler", tier: "journeyman",
    minSkill: 45, minLevel: 45, craftTimeSeconds: 480, acquisitionType: "drop",
    ingredients: [{ itemId: "glimmerdust", quantity: 3 }, { itemId: "mithril_ore", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 1 }],
    output: {
      name: "Glimmerdust Ring", type: "accessory", slot: "ring", rarity: "rare",
      description: "A ring dusted with glimmerdust that focuses magical energies precisely.",
      stats: { intelligence: 28, spellCritChance: 7, wisdom: 20 },
      sellPrice: 550, quantity: 1, xpGained: 520, spriteId: "ring",
    },
  },
  {
    name: "Astral Pendant", tradeskillClass: "jeweler", tier: "journeyman",
    minSkill: 55, minLevel: 52, craftTimeSeconds: 720, acquisitionType: "drop",
    ingredients: [{ itemId: "astral_ore", quantity: 2 }, { itemId: "ts_flawless_sapphire", quantity: 1 }, { itemId: "ts_jewelers_oil", quantity: 2 }],
    output: {
      name: "Astral Pendant", type: "accessory", slot: "neck", rarity: "legendary",
      description: "A pendant forged from astral ore — it resonates with celestial power.",
      stats: { intelligence: 52, wisdom: 40, spellDamageBonus: 36, spellCritChance: 12 },
      sellPrice: 1200, quantity: 1, xpGained: 1000, spriteId: "necklace",
    },
  },
  // Alchemist
  {
    name: "Deepmoss Restorative", tradeskillClass: "alchemist", tier: "journeyman",
    minSkill: 45, minLevel: 45, craftTimeSeconds: 300, acquisitionType: "drop",
    ingredients: [{ itemId: "deepmoss", quantity: 3 }, { itemId: "ts_empty_vial", quantity: 2 }, { itemId: "ts_mana_shard", quantity: 2 }],
    output: {
      name: "Deepmoss Restorative", type: "consumable", slot: "none", rarity: "rare",
      description: "A powerful restorative brew made from deep cave moss.",
      stats: {}, sellPrice: 180, quantity: 2, xpGained: 400, spriteId: "potion_green",
      stackable: true, effect: { type: "heal", value: 1200 },
    },
  },
  {
    name: "Frostbloom Clarity Draught", tradeskillClass: "alchemist", tier: "journeyman",
    minSkill: 48, minLevel: 47, craftTimeSeconds: 360, acquisitionType: "drop",
    ingredients: [{ itemId: "frostbloom_petal", quantity: 3 }, { itemId: "ts_empty_vial", quantity: 1 }, { itemId: "ts_mana_shard", quantity: 3 }],
    output: {
      name: "Frostbloom Clarity Draught", type: "consumable", slot: "none", rarity: "rare",
      description: "A chilled draught that sharpens mental clarity and boosts intelligence.",
      stats: {}, sellPrice: 200, quantity: 1, xpGained: 450, spriteId: "potion_blue",
      stackable: true, effect: { type: "buff_intelligence", value: 45 },
    },
  },
  {
    name: "Venom Elixir of Shadows", tradeskillClass: "alchemist", tier: "journeyman",
    minSkill: 52, minLevel: 50, craftTimeSeconds: 480, acquisitionType: "drop",
    ingredients: [{ itemId: "venom_sac", quantity: 2 }, { itemId: "ts_empty_vial", quantity: 2 }, { itemId: "ts_alchemists_coal", quantity: 3 }, { itemId: "ts_mana_shard", quantity: 2 }],
    output: {
      name: "Venom Elixir of Shadows", type: "consumable", slot: "none", rarity: "legendary",
      description: "A deadly elixir brewed from creature venom — poisons enemies on contact.",
      stats: {}, sellPrice: 400, quantity: 1, xpGained: 700, spriteId: "potion_purple",
      stackable: true, effect: { type: "buff_attack", value: 55 },
    },
  },
];

export const ALL_JOURNEYMAN_TS_RECIPE_NAMES = new Set(JOURNEYMAN_TS_RECIPES.map(r => r.name));

// ─── OoaK Name Generator ─────────────────────────────────────────────────────
// Procedurally generates legendary One-of-a-Kind recipe names.
// Fully server-side — no external APIs required.

const OOAK_ADJECTIVES = [
  "Ashen", "Bloodforged", "Celestial", "Deathmarch", "Emberstoked", "Frosted",
  "Ghostwalker's", "Hallowed", "Ironbound", "Jagged", "Krait-Touched", "Lifedrinker",
  "Moonwracked", "Nameless", "Obsidian", "Plagueborn", "Quenched", "Ruinbringer",
  "Shadowpierced", "Thornwoven", "Umbral", "Voidtouched", "Wraithbone", "Xenolithic",
  "Ymirborn", "Zealot's",
];

const OOAK_MATERIALS = [
  "Adamantine", "Bloodsteel", "Celestite", "Duskweave", "Ebonite", "Frostite",
  "Ghostsilver", "Hallite", "Ironhide", "Jadesteel", "Kryptonite", "Lifewood",
  "Moonstone", "Nightshade", "Obsidian", "Plaguesteel", "Quicksilver", "Runite",
  "Shadowcloth", "Thornhide", "Umbrite", "Voidglass", "Wraithsteel", "Xenite",
  "Ymirstone", "Zenite",
];

const OOAK_ITEM_TYPES: Record<string, string[]> = {
  weaponsmith: ["Greatsword", "Waraxe", "Warhammer", "Glaive", "Spear", "Maul", "Falchion", "Broadsword"],
  armorer:     ["Breastplate", "Hauberk", "Helm", "Pauldrons", "Vambraces", "Greaves", "Shield"],
  tailor:      ["Robe", "Mantle", "Vestment", "Cowl", "Girdle", "Cloak", "Shroud"],
  jeweler:     ["Amulet", "Ring", "Choker", "Signet", "Talisman", "Pendant", "Circlet"],
  alchemist:   ["Elixir", "Philter", "Tincture", "Draught", "Brew", "Concoction", "Flask"],
};

const OOAK_SUFFIXES = [
  "of the Fallen", "of Eternal Ruin", "of the Forsaken", "of Undying Rage",
  "of the Void", "of the Ancient Pact", "of Shadowflame", "of the Crimson Dawn",
  "of the Last Stand", "of the Wailing Dark", "of Lost Souls", "of the Sundered Age",
  "of Bloodmoon", "of the Nightmare Keep", "of the Dying Star", "of Endless Night",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate an evocative, unique OoaK recipe name.
 * If ghostName is provided, the name is prefixed with the ghost's name (e.g. "Thornwick's ...").
 */
export function generateOoakName(
  tradeskillClass: "weaponsmith" | "armorer" | "tailor" | "jeweler" | "alchemist",
  ghostName?: string,
): string {
  const itemTypes = OOAK_ITEM_TYPES[tradeskillClass] ?? ["Relic"];
  const baseName = `${pick(OOAK_ADJECTIVES)} ${pick(OOAK_MATERIALS)} ${pick(itemTypes)} ${pick(OOAK_SUFFIXES)}`;
  if (ghostName) {
    return `${ghostName}'s ${baseName}`;
  }
  return baseName;
}
