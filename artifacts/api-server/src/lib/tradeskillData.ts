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
      stats: { intelligence: 32, wisdom: 22, spellCritChance: 6, spellDamage: 12 },
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
      stats: { intelligence: 60, wisdom: 42, spellCritChance: 10, spellDamage: 24 },
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
      stats: { intelligence: 20, spellDamage: 14, spellCritChance: 5 },
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
      stats: { intelligence: 38, wisdom: 28, spellCritChance: 9, spellDamage: 22 },
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
