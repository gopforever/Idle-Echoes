export interface ItemStats {
  strength?: number;
  agility?: number;
  stamina?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  health?: number;
  power?: number;
  attackRating?: number;
  defenseRating?: number;
  mitigation?: number;
  avoidance?: number;
  haste?: number;
  critChance?: number;
  weaponDamageMin?: number;
  weaponDamageMax?: number;
  weaponDelay?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest" | "recipe_scroll";
  slot: string;
  rarity: "common" | "uncommon" | "rare" | "legendary" | "fabled" | "mythical";
  level: number;
  stats: ItemStats;
  sellPrice: number;
  buyPrice?: number;
  spriteId: string;
  quantity?: number;
  stackable?: boolean;
  quality?: number;
  recipeId?: string;
  recipeTier?: RecipeTier;
  /** Retained for data compatibility — no longer enforced; all items are tradeable. */
  noSell?: boolean;
  /** Gear set this item belongs to (e.g. "blackburrow_mythical") */
  setId?: string;
  /** The slot this set piece occupies within its set (e.g. "chest") */
  setPieceSlot?: string;
  /** AI-generated display name for the set family */
  setName?: string;
  /** Armor material type — drives stat profiles and UI color coding */
  armorType?: "plate" | "chain" | "leather" | "cloth";
}

/**
 * No-Drop restriction removed — all items are tradeable and sellable.
 */
export function isNoSell(_item: Partial<Item> | Record<string, unknown>): boolean {
  return false;
}

export interface LootEntry {
  itemId: string;
  dropChance: number;
  minQuantity: number;
  maxQuantity: number;
}

/** A special ability used by an enemy during combat */
export interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** every_n_ticks: fires on tick intervals; percent_hp: fires at HP threshold; on_hit_proc: random chance on attack; once_at_hp: fires once when HP crosses threshold */
  triggerType: "every_n_ticks" | "percent_hp" | "on_hit_proc" | "once_at_hp";
  /** n for every_n_ticks, HP% for percent_hp, proc% for on_hit_proc */
  triggerValue: number;
  /** bleed_dot: DoT on player; life_drain: steals HP; stun: skips player attack; slow: reduces player avoidance; fear: player misses next 2 attacks; absorb_shield: enemy absorbs damage; damage_burst: extra damage hit; self_heal: enemy heals HP; frenzy_buff: enemy gains damage bonus; avoidance_buff: enemy gains avoidance */
  effectType: "bleed_dot" | "life_drain" | "stun" | "slow" | "fear" | "absorb_shield" | "damage_burst" | "self_heal" | "frenzy_buff" | "avoidance_buff";
  effectValue: number;
  durationTicks: number;
  cooldownTicks: number;
  unavoidable?: boolean;
  damageType?: string;
}

/** Elemental and physical resistances for an enemy; positive = resistant %, negative = vulnerable % */
export interface EnemyResistances {
  [key: string]: number | undefined;
  pierce?: number;
  slash?: number;
  crush?: number;
  heat?: number;
  cold?: number;
  divine?: number;
  magic?: number;
}

export type BossPersonality = "arrogant" | "cold" | "ancient" | "feral" | "cunning";

export interface Enemy {
  id: string;
  name: string;
  description: string;
  level: number;
  zone: string;
  hp: number;
  maxHp: number;
  attackRating: number;
  defenseRating: number;
  mitigation: number;
  avoidance: number;
  attackSpeed: number;
  damageMin: number;
  damageMax: number;
  xpReward: number;
  goldMin: number;
  goldMax: number;
  lootTable: LootEntry[];
  spriteId: string;
  type: "humanoid" | "beast" | "undead" | "elemental" | "construct" | "dragon";
  isBoss: boolean;
  abilities: EnemyAbility[];
  resistances: EnemyResistances;
  personality?: BossPersonality;
  grudgeThreshold?: number;
}

export type RecipeTier = "journeyman" | "expert" | "mythic";
export type ExperimentFocus = "attack" | "defense" | "utility";

export interface CraftingRecipe {
  id: string;
  name: string;
  resultItemId: string;
  resultQuantity: number;
  ingredients: { itemId: string; quantity: number }[];
  requiredSkillLevel: number;
  requiredSkillId: string;
  craftingTime: number;
  xpReward: number;
  tier: RecipeTier;
  oneOfAKind?: boolean;
  description?: string;
}

export interface CraftedItemMetadata {
  craftedBy: string;
  resourceQuality: number;
  experimentFocus: ExperimentFocus;
  isCritical: boolean;
  recipeId: string;
  recipeTier: RecipeTier;
  isOneOfAKind?: boolean;
}

export const ITEMS: Item[] = [
  // WEAPONS - Primary
  {
    id: "rusty_short_sword",
    name: "Rusty Short Sword",
    description: "A battered sword that has seen better days",
    type: "weapon", slot: "primary", rarity: "common", level: 1,
    stats: { strength: 2, attackRating: 10, weaponDamageMin: 5, weaponDamageMax: 12, weaponDelay: 2.0 },
    sellPrice: 5, spriteId: "sword_common",
  },
  {
    id: "iron_longsword",
    name: "Iron Longsword",
    description: "A well-balanced longsword forged from solid iron",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 5,
    stats: { strength: 5, agility: 2, attackRating: 25, weaponDamageMin: 12, weaponDamageMax: 22, weaponDelay: 1.8 },
    sellPrice: 40, spriteId: "sword_iron",
  },
  {
    id: "steel_broadsword",
    name: "Steel Broadsword",
    description: "A heavy blade capable of cleaving through armor",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 10,
    stats: { strength: 9, stamina: 3, attackRating: 50, weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 1.7 },
    sellPrice: 120, spriteId: "sword_steel",
  },
  {
    id: "mithril_blade",
    name: "Mithril Blade",
    description: "A gleaming blade of mythril that never dulls",
    type: "weapon", slot: "primary", rarity: "rare", level: 20,
    stats: { strength: 18, agility: 8, attackRating: 110, critChance: 3, weaponDamageMin: 45, weaponDamageMax: 72, weaponDelay: 1.6 },
    sellPrice: 450, spriteId: "sword_mithril",
  },
  {
    id: "darkblade",
    name: "Darkblade of Serilis",
    description: "A cursed blade that drains the life of its enemies",
    type: "weapon", slot: "primary", rarity: "legendary", level: 35,
    stats: { strength: 32, agility: 15, intelligence: 10, attackRating: 230, critChance: 7, weaponDamageMin: 90, weaponDamageMax: 140, weaponDelay: 1.5 },
    sellPrice: 1800, spriteId: "sword_dark",
  },
  {
    id: "fabled_greatsword",
    name: "Greatsword of the Shattered Weave",
    description: "A fabled two-handed sword radiating ancient power",
    type: "weapon", slot: "primary", rarity: "fabled", level: 50,
    stats: { strength: 55, stamina: 20, attackRating: 420, critChance: 12, weaponDamageMin: 160, weaponDamageMax: 240, weaponDelay: 2.5 },
    sellPrice: 8000, spriteId: "sword_fabled", noSell: true,
  },
  // CASTER WEAPONS - Wands (INT-focused)
  {
    id: "iron_wand",
    name: "Iron Wand",
    description: "A simple iron wand channeling raw arcane energy",
    type: "weapon", slot: "primary", rarity: "common", level: 5,
    stats: { intelligence: 4, wisdom: 2, attackRating: 8, weaponDamageMin: 6, weaponDamageMax: 12, weaponDelay: 1.6 },
    sellPrice: 18, spriteId: "weapon_wand",
  },
  {
    id: "steel_wand",
    name: "Arcanist's Steel Wand",
    description: "A finely-forged steel wand etched with focusing runes",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 15,
    stats: { intelligence: 10, wisdom: 5, critChance: 2, attackRating: 18, weaponDamageMin: 14, weaponDamageMax: 24, weaponDelay: 1.5 },
    sellPrice: 90, spriteId: "weapon_wand",
  },
  {
    id: "mithril_wand",
    name: "Mithril Runewand",
    description: "A wand tipped with mithril that amplifies spell potency",
    type: "weapon", slot: "primary", rarity: "rare", level: 28,
    stats: { intelligence: 22, wisdom: 14, critChance: 5, attackRating: 38, weaponDamageMin: 28, weaponDamageMax: 46, weaponDelay: 1.4 },
    sellPrice: 480, spriteId: "weapon_wand",
  },
  {
    id: "adamantine_wand",
    name: "Adamantine Sorcerer's Wand",
    description: "A wand forged from adamantine ore that crackles with contained power",
    type: "weapon", slot: "primary", rarity: "legendary", level: 42,
    stats: { intelligence: 38, wisdom: 24, critChance: 9, attackRating: 70, weaponDamageMin: 52, weaponDamageMax: 82, weaponDelay: 1.4 },
    sellPrice: 1600, spriteId: "weapon_wand",
  },
  // CASTER WEAPONS - Scepters (WIS-focused, healer primary)
  {
    id: "iron_scepter",
    name: "Iron Confessor's Scepter",
    description: "A blunt iron scepter used by novice priests to channel divine power",
    type: "weapon", slot: "primary", rarity: "common", level: 5,
    stats: { wisdom: 5, power: 20, attackRating: 6, weaponDamageMin: 5, weaponDamageMax: 10, weaponDelay: 1.8 },
    sellPrice: 18, spriteId: "weapon_scepter",
  },
  {
    id: "steel_scepter",
    name: "Steel Cleric Scepter",
    description: "A sturdy steel scepter blessed by a Temple priest",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 16,
    stats: { wisdom: 12, power: 45, critChance: 2, attackRating: 16, weaponDamageMin: 12, weaponDamageMax: 20, weaponDelay: 1.8 },
    sellPrice: 95, spriteId: "weapon_scepter",
  },
  {
    id: "mithril_scepter",
    name: "Mithril Channeler's Scepter",
    description: "A mithril scepter that resonates with divine healing energy",
    type: "weapon", slot: "primary", rarity: "rare", level: 28,
    stats: { wisdom: 26, power: 90, critChance: 4, attackRating: 30, weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 1.8 },
    sellPrice: 500, spriteId: "weapon_scepter",
  },
  {
    id: "adamantine_scepter",
    name: "Adamantine High Priest's Scepter",
    description: "A scepter of adamantine blessed by the highest orders of the church",
    type: "weapon", slot: "primary", rarity: "legendary", level: 42,
    stats: { wisdom: 44, power: 160, critChance: 7, attackRating: 56, weaponDamageMin: 42, weaponDamageMax: 70, weaponDelay: 1.8 },
    sellPrice: 1700, spriteId: "weapon_scepter",
  },
  // MELEE WEAPONS - Maces (STR/STA, Paladin/Guardian)
  {
    id: "iron_mace",
    name: "Iron Flanged Mace",
    description: "A heavy flanged mace that crushes through even solid plate",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 6,
    stats: { strength: 6, stamina: 4, attackRating: 18, weaponDamageMin: 10, weaponDamageMax: 18, weaponDelay: 2.2 },
    sellPrice: 35, spriteId: "weapon_mace",
  },
  {
    id: "steel_mace",
    name: "Steel War Mace",
    description: "A balanced war mace of tempered steel favoured by crusaders",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 18,
    stats: { strength: 12, stamina: 8, attackRating: 45, weaponDamageMin: 22, weaponDamageMax: 38, weaponDelay: 2.2 },
    sellPrice: 140, spriteId: "weapon_mace",
  },
  {
    id: "mithril_mace",
    name: "Mithril Siege Mace",
    description: "A devastating mithril mace used to breach fortifications",
    type: "weapon", slot: "primary", rarity: "rare", level: 30,
    stats: { strength: 20, stamina: 14, attackRating: 80, mitigation: 5, weaponDamageMin: 40, weaponDamageMax: 65, weaponDelay: 2.3 },
    sellPrice: 520, spriteId: "weapon_mace",
  },
  {
    id: "adamantine_mace",
    name: "Adamantine Judicator's Mace",
    description: "A holy mace of adamantine inlaid with divine scripture",
    type: "weapon", slot: "primary", rarity: "legendary", level: 42,
    stats: { strength: 32, stamina: 22, attackRating: 140, mitigation: 10, weaponDamageMin: 70, weaponDamageMax: 108, weaponDelay: 2.2 },
    sellPrice: 1800, spriteId: "weapon_mace",
  },
  // MELEE WEAPONS - Fist Weapons (Monk/Bruiser)
  {
    id: "iron_fist_wraps",
    name: "Iron Knuckle Wraps",
    description: "Iron-plated wraps that protect the fists and amplify striking force",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 6,
    stats: { strength: 5, agility: 6, attackRating: 14, weaponDamageMin: 8, weaponDamageMax: 15, weaponDelay: 1.6 },
    sellPrice: 30, spriteId: "weapon_fist",
  },
  {
    id: "spidersilk_monk_wraps",
    name: "Spidersilk Monk's Wraps",
    description: "Woven from spidersilk and reinforced with mithril rings for monks",
    type: "weapon", slot: "primary", rarity: "rare", level: 28,
    stats: { strength: 18, agility: 20, attackRating: 65, critChance: 5, haste: 4, weaponDamageMin: 30, weaponDamageMax: 50, weaponDelay: 1.5 },
    sellPrice: 480, spriteId: "weapon_fist",
  },
  {
    id: "adamantine_fists",
    name: "Adamantine Iron Fists",
    description: "Gauntlets shaped into pointed fists from solid adamantine — brutal and precise",
    type: "weapon", slot: "primary", rarity: "legendary", level: 42,
    stats: { strength: 30, agility: 26, attackRating: 120, critChance: 8, haste: 6, weaponDamageMin: 60, weaponDamageMax: 95, weaponDelay: 1.5 },
    sellPrice: 1750, spriteId: "weapon_fist",
  },
  // RANGED WEAPONS - Crossbows (Assassin/Brigand)
  {
    id: "steel_crossbow",
    name: "Steel Crossbow",
    description: "A reliable steel crossbow capable of punching through light armor",
    type: "weapon", slot: "ranged", rarity: "uncommon", level: 14,
    stats: { agility: 8, attackRating: 28, weaponDamageMin: 18, weaponDamageMax: 32, weaponDelay: 2.8 },
    sellPrice: 100, spriteId: "weapon_crossbow",
  },
  {
    id: "mithril_crossbow",
    name: "Mithril Repeating Crossbow",
    description: "A precision mithril crossbow with a rapid-fire repeating mechanism",
    type: "weapon", slot: "ranged", rarity: "rare", level: 30,
    stats: { agility: 20, attackRating: 75, critChance: 6, weaponDamageMin: 42, weaponDamageMax: 68, weaponDelay: 2.6 },
    sellPrice: 600, spriteId: "weapon_crossbow",
  },
  // SHIELDS - Secondary
  {
    id: "wooden_buckler",
    name: "Wooden Buckler",
    description: "A simple wooden shield reinforced with iron bands",
    type: "armor", slot: "secondary", rarity: "common", level: 1,
    stats: { stamina: 3, defenseRating: 10, mitigation: 8 },
    sellPrice: 8, spriteId: "shield_wood",
  },
  {
    id: "iron_kite_shield",
    name: "Iron Kite Shield",
    description: "A kite-shaped shield of solid iron construction",
    type: "armor", slot: "secondary", rarity: "uncommon", level: 8,
    stats: { stamina: 10, defenseRating: 35, mitigation: 25 },
    sellPrice: 80, spriteId: "shield_iron",
  },
  {
    id: "mithril_shield",
    name: "Mithril Tower Shield",
    description: "A massive tower shield forged from mythril",
    type: "armor", slot: "secondary", rarity: "rare", level: 22,
    stats: { stamina: 22, defenseRating: 85, mitigation: 65, health: 80 },
    sellPrice: 600, spriteId: "shield_mithril",
  },
  {
    id: "adamantine_tower_shield",
    name: "Adamantine Tower Shield",
    description: "An enormous shield of adamantine that can turn aside siege weapons",
    type: "armor", slot: "secondary", rarity: "legendary", level: 40,
    stats: { stamina: 42, defenseRating: 160, mitigation: 120, health: 160, strength: 10 },
    sellPrice: 2200, spriteId: "shield_legendary",
  },
  {
    id: "paladins_holy_bulwark",
    name: "Paladin's Holy Bulwark",
    description: "A shield blessed by the Qeynos Guard — radiates divine protection",
    type: "armor", slot: "secondary", rarity: "legendary", level: 45,
    stats: { stamina: 38, defenseRating: 140, mitigation: 105, health: 140, wisdom: 18, power: 80 },
    sellPrice: 2500, spriteId: "shield_holy",
  },
  // HANDS ARMOR
  {
    id: "iron_gauntlets",
    name: "Iron Gauntlets",
    description: "Heavy iron gauntlets that protect the hands without sacrificing grip",
    type: "armor", slot: "hands", rarity: "common", level: 6, armorType: "plate",
    stats: { defenseRating: 10, stamina: 4, haste: 1 },
    sellPrice: 18, spriteId: "hands_plate",
  },
  {
    id: "steel_gauntlets",
    name: "Steel Gauntlets",
    description: "Well-crafted steel gauntlets with articulated finger plates",
    type: "armor", slot: "hands", rarity: "uncommon", level: 18, armorType: "plate",
    stats: { defenseRating: 22, stamina: 10, haste: 3, critChance: 1 },
    sellPrice: 85, spriteId: "hands_plate",
  },
  {
    id: "mithril_gauntlets",
    name: "Mithril Gauntlets",
    description: "Gleaming mithril gauntlets offering exceptional protection and dexterity",
    type: "armor", slot: "hands", rarity: "rare", level: 30, armorType: "plate",
    stats: { defenseRating: 42, stamina: 20, haste: 5, critChance: 2, attackRating: 18 },
    sellPrice: 540, spriteId: "hands_plate",
  },
  {
    id: "leather_scout_gloves",
    name: "Leather Scout Gloves",
    description: "Fitted leather gloves for scouts and rogues that leave the fingertips free",
    type: "armor", slot: "hands", rarity: "uncommon", level: 14, armorType: "leather",
    stats: { agility: 8, attackRating: 10, haste: 3, critChance: 1 },
    sellPrice: 70, spriteId: "hands_leather",
  },
  {
    id: "silk_spell_gloves",
    name: "Silk Spell Gloves",
    description: "Thin silk gloves that focus magical energies through the palms",
    type: "armor", slot: "hands", rarity: "uncommon", level: 16, armorType: "cloth",
    stats: { intelligence: 10, wisdom: 6, critChance: 2 },
    sellPrice: 75, spriteId: "hands_cloth",
  },
  // FEET ARMOR
  {
    id: "iron_sabatons",
    name: "Iron Sabatons",
    description: "Heavy iron foot armor that protects from ankle to toe",
    type: "armor", slot: "feet", rarity: "common", level: 6, armorType: "plate",
    stats: { defenseRating: 8, stamina: 3, agility: 2 },
    sellPrice: 16, spriteId: "feet_plate",
  },
  {
    id: "steel_sabatons",
    name: "Steel Sabatons",
    description: "Articulated steel foot armor that balances protection with mobility",
    type: "armor", slot: "feet", rarity: "uncommon", level: 18, armorType: "plate",
    stats: { defenseRating: 20, stamina: 8, agility: 6, avoidance: 2 },
    sellPrice: 80, spriteId: "feet_plate",
  },
  {
    id: "leather_ranger_boots",
    name: "Leather Ranger Boots",
    description: "Supple boots crafted for rangers who spend days in the field",
    type: "armor", slot: "feet", rarity: "uncommon", level: 14, armorType: "leather",
    stats: { agility: 10, avoidance: 3, haste: 2 },
    sellPrice: 72, spriteId: "feet_leather",
  },
  {
    id: "silk_mage_slippers",
    name: "Silk Mage's Slippers",
    description: "Enchanted slippers that keep the caster light on their feet",
    type: "armor", slot: "feet", rarity: "uncommon", level: 16, armorType: "cloth",
    stats: { intelligence: 8, wisdom: 5, avoidance: 2, power: 25 },
    sellPrice: 78, spriteId: "feet_cloth",
  },
  // WRISTS ARMOR
  {
    id: "iron_vambraces",
    name: "Iron Vambraces",
    description: "Simple iron bracers that guard the forearms in combat",
    type: "armor", slot: "wrists", rarity: "common", level: 6, armorType: "plate",
    stats: { defenseRating: 8, strength: 3, stamina: 2 },
    sellPrice: 14, spriteId: "wrists_plate",
  },
  {
    id: "steel_vambraces",
    name: "Steel Vambraces",
    description: "Reinforced steel vambraces worn by seasoned fighters",
    type: "armor", slot: "wrists", rarity: "uncommon", level: 18, armorType: "plate",
    stats: { defenseRating: 18, strength: 8, attackRating: 10 },
    sellPrice: 76, spriteId: "wrists_plate",
  },
  {
    id: "silk_arcanist_bracers",
    name: "Silk Arcanist Bracers",
    description: "Silk bracers embroidered with runes that amplify spellcasting",
    type: "armor", slot: "wrists", rarity: "uncommon", level: 16, armorType: "cloth",
    stats: { intelligence: 10, wisdom: 7, critChance: 2 },
    sellPrice: 72, spriteId: "wrists_cloth",
  },
  // WAIST ARMOR
  {
    id: "iron_plate_belt",
    name: "Iron Plate Belt",
    description: "A wide iron belt that provides core protection",
    type: "armor", slot: "waist", rarity: "common", level: 8, armorType: "plate",
    stats: { defenseRating: 8, stamina: 5, strength: 2 },
    sellPrice: 16, spriteId: "waist_plate",
  },
  {
    id: "steel_plate_belt",
    name: "Steel Plate Belt",
    description: "A reinforced steel belt that doubles as a brace against heavy blows",
    type: "armor", slot: "waist", rarity: "uncommon", level: 20, armorType: "plate",
    stats: { defenseRating: 18, stamina: 12, health: 20, strength: 5 },
    sellPrice: 82, spriteId: "waist_plate",
  },
  {
    id: "leather_ranger_belt",
    name: "Leather Ranger Belt",
    description: "A practical ranger's belt with loops for tools and pouches",
    type: "armor", slot: "waist", rarity: "uncommon", level: 16, armorType: "leather",
    stats: { agility: 8, stamina: 5, attackRating: 8 },
    sellPrice: 68, spriteId: "waist_leather",
  },
  {
    id: "silk_arcanist_sash",
    name: "Silk Arcanist's Sash",
    description: "A sash woven from enchanted silk that helps contain magical overflow",
    type: "armor", slot: "waist", rarity: "uncommon", level: 18, armorType: "cloth",
    stats: { intelligence: 10, wisdom: 7, power: 28 },
    sellPrice: 74, spriteId: "waist_cloth",
  },
  // BACK ARMOR
  {
    id: "rough_hide_cloak",
    name: "Rough Hide Cloak",
    description: "A thick cloak of rough animal hide, good for cold nights in the field",
    type: "armor", slot: "back", rarity: "common", level: 5, armorType: "leather",
    stats: { stamina: 5, defenseRating: 6, agility: 2 },
    sellPrice: 14, spriteId: "back_leather",
  },
  {
    id: "supple_leather_cloak",
    name: "Supple Leather Cloak",
    description: "A well-tanned leather cloak that offers freedom of movement",
    type: "armor", slot: "back", rarity: "uncommon", level: 16, armorType: "leather",
    stats: { agility: 8, stamina: 8, avoidance: 3, defenseRating: 14 },
    sellPrice: 78, spriteId: "back_leather",
  },
  {
    id: "spidersilk_cloak",
    name: "Spidersilk Cloak",
    description: "A shimmering cloak of spidersilk that is nearly weightless yet strong as mail",
    type: "armor", slot: "back", rarity: "rare", level: 30, armorType: "cloth",
    stats: { agility: 16, stamina: 14, avoidance: 5, critChance: 3, intelligence: 10 },
    sellPrice: 520, spriteId: "back_silk",
  },
  {
    id: "moonweave_arcane_cloak",
    name: "Moonweave Arcane Cloak",
    description: "A cloak woven from moonweave that crackles with stored arcane energy",
    type: "armor", slot: "back", rarity: "legendary", level: 42, armorType: "cloth",
    stats: { intelligence: 28, wisdom: 20, critChance: 6, stamina: 18, avoidance: 4 },
    sellPrice: 1600, spriteId: "back_arcane",
  },
  // HEAD ARMOR
  {
    id: "leather_cap",
    name: "Worn Leather Cap",
    description: "A simple leather cap offering minimal protection",
    type: "armor", slot: "head", rarity: "common", level: 1,
    stats: { stamina: 4, defenseRating: 5, mitigation: 3 },
    sellPrice: 6, spriteId: "helm_leather",
  },
  {
    id: "chain_coif",
    name: "Chain Coif",
    description: "Interlocking rings of chain mail protect the head",
    type: "armor", slot: "head", rarity: "uncommon", level: 6,
    stats: { stamina: 10, defenseRating: 18, mitigation: 12 },
    sellPrice: 55, spriteId: "helm_chain",
  },
  {
    id: "iron_helmet",
    name: "Iron Helmet",
    description: "A sturdy iron helm with a nose guard",
    type: "armor", slot: "head", rarity: "uncommon", level: 12,
    stats: { stamina: 18, strength: 4, defenseRating: 38, mitigation: 28 },
    sellPrice: 140, spriteId: "helm_iron",
  },
  {
    id: "steel_great_helm",
    name: "Steel Great Helm",
    description: "Full enclosure helmet offering maximum protection",
    type: "armor", slot: "head", rarity: "rare", level: 22,
    stats: { stamina: 30, strength: 8, defenseRating: 78, mitigation: 58, health: 50 },
    sellPrice: 520, spriteId: "helm_steel",
  },
  {
    id: "helm_of_the_guardian",
    name: "Helm of the Guardian",
    description: "A legendary helm worn by the guardians of Qeynos",
    type: "armor", slot: "head", rarity: "legendary", level: 38,
    stats: { stamina: 55, strength: 18, defenseRating: 160, mitigation: 120, health: 120, critChance: 2 },
    sellPrice: 2200, spriteId: "helm_legendary",
  },
  // CHEST ARMOR
  {
    id: "tattered_tunic",
    name: "Tattered Tunic",
    description: "A worn cloth tunic barely holding together",
    type: "armor", slot: "chest", rarity: "common", level: 1,
    stats: { stamina: 5, defenseRating: 4, mitigation: 2 },
    sellPrice: 4, spriteId: "chest_cloth",
  },
  {
    id: "leather_vest",
    name: "Leather Vest",
    description: "Tanned leather armor good for adventurers",
    type: "armor", slot: "chest", rarity: "common", level: 3,
    stats: { agility: 3, stamina: 8, defenseRating: 12, mitigation: 8 },
    sellPrice: 20, spriteId: "chest_leather",
  },
  {
    id: "ringmail_chest",
    name: "Ringmail Chestplate",
    description: "Rings of metal linked together into solid protection",
    type: "armor", slot: "chest", rarity: "uncommon", level: 9,
    stats: { stamina: 18, strength: 6, defenseRating: 42, mitigation: 30 },
    sellPrice: 130, spriteId: "chest_chain",
  },
  {
    id: "iron_breastplate",
    name: "Iron Breastplate",
    description: "A solid iron breastplate etched with runes",
    type: "armor", slot: "chest", rarity: "uncommon", level: 15,
    stats: { stamina: 30, strength: 10, defenseRating: 72, mitigation: 52 },
    sellPrice: 280, spriteId: "chest_iron",
  },
  {
    id: "steel_platemail",
    name: "Steel Platemail",
    description: "Full plate armor made from hardened steel",
    type: "armor", slot: "chest", rarity: "rare", level: 25,
    stats: { stamina: 50, strength: 18, defenseRating: 145, mitigation: 110, health: 90 },
    sellPrice: 900, spriteId: "chest_steel",
  },
  {
    id: "breastplate_of_valor",
    name: "Breastplate of Valor",
    description: "A legendary breastplate that inspires those who wear it",
    type: "armor", slot: "chest", rarity: "legendary", level: 40,
    stats: { stamina: 80, strength: 28, wisdom: 12, defenseRating: 285, mitigation: 215, health: 200 },
    sellPrice: 3500, spriteId: "chest_legendary",
  },
  {
    id: "chestguard_of_the_fallen",
    name: "Chestguard of the Fallen",
    description: "Fabled armor reclaimed from a legendary fallen warrior",
    type: "armor", slot: "chest", rarity: "fabled", level: 55,
    stats: { stamina: 120, strength: 42, defenseRating: 480, mitigation: 360, health: 380, critChance: 3 },
    sellPrice: 12000, spriteId: "chest_fabled", noSell: true,
  },
  // LEGS
  {
    id: "cloth_leggings",
    name: "Cloth Leggings",
    description: "Simple cloth leggings providing little protection",
    type: "armor", slot: "legs", rarity: "common", level: 1,
    stats: { stamina: 4, defenseRating: 3, mitigation: 2 },
    sellPrice: 5, spriteId: "legs_cloth",
  },
  {
    id: "leather_leggings",
    name: "Leather Leggings",
    description: "Reinforced leather leggings for the agile warrior",
    type: "armor", slot: "legs", rarity: "common", level: 4,
    stats: { agility: 4, stamina: 7, defenseRating: 10, mitigation: 7 },
    sellPrice: 18, spriteId: "legs_leather",
  },
  {
    id: "iron_greaves",
    name: "Iron Greaves",
    description: "Heavy iron leg guards",
    type: "armor", slot: "legs", rarity: "uncommon", level: 14,
    stats: { stamina: 22, strength: 7, defenseRating: 55, mitigation: 42 },
    sellPrice: 180, spriteId: "legs_iron",
  },
  {
    id: "steel_legplates",
    name: "Steel Legplates",
    description: "Expertly crafted steel leg armor",
    type: "armor", slot: "legs", rarity: "rare", level: 24,
    stats: { stamina: 42, strength: 14, defenseRating: 112, mitigation: 85, health: 70 },
    sellPrice: 700, spriteId: "legs_steel",
  },
  // HANDS
  {
    id: "cloth_gloves",
    name: "Cloth Gloves",
    description: "Simple cloth gloves",
    type: "armor", slot: "hands", rarity: "common", level: 1,
    stats: { stamina: 2, agility: 1 },
    sellPrice: 3, spriteId: "hands_cloth",
  },
  {
    id: "leather_gloves",
    name: "Leather Gauntlets",
    description: "Sturdy leather gauntlets reinforced at the knuckles",
    type: "armor", slot: "hands", rarity: "common", level: 4,
    stats: { agility: 5, strength: 2, defenseRating: 8 },
    sellPrice: 15, spriteId: "hands_leather",
  },
  {
    id: "iron_gauntlets",
    name: "Iron Gauntlets",
    description: "Heavy iron gauntlets that protect the hands",
    type: "armor", slot: "hands", rarity: "uncommon", level: 12,
    stats: { strength: 6, stamina: 10, defenseRating: 32, mitigation: 22 },
    sellPrice: 110, spriteId: "hands_iron",
  },
  {
    id: "gauntlets_of_might",
    name: "Gauntlets of Might",
    description: "Fabled gauntlets that amplify the wearer's strength",
    type: "armor", slot: "hands", rarity: "fabled", level: 48,
    stats: { strength: 40, stamina: 25, attackRating: 60, critChance: 4, defenseRating: 95 },
    sellPrice: 9000, spriteId: "hands_fabled", noSell: true,
  },
  // FEET
  {
    id: "worn_boots",
    name: "Worn Leather Boots",
    description: "Old boots that have seen many miles",
    type: "armor", slot: "feet", rarity: "common", level: 1,
    stats: { agility: 2, stamina: 3 },
    sellPrice: 5, spriteId: "feet_leather",
  },
  {
    id: "iron_sabatons",
    name: "Iron Sabatons",
    description: "Solid iron foot protection",
    type: "armor", slot: "feet", rarity: "uncommon", level: 10,
    stats: { stamina: 12, defenseRating: 28, mitigation: 20 },
    sellPrice: 90, spriteId: "feet_iron",
  },
  {
    id: "boots_of_haste",
    name: "Boots of the Hasty",
    description: "Enchanted boots that grant preternatural speed",
    type: "armor", slot: "feet", rarity: "rare", level: 28,
    stats: { agility: 25, haste: 15, defenseRating: 65 },
    sellPrice: 800, spriteId: "feet_enchanted",
  },
  // NECK
  {
    id: "rough_amulet",
    name: "Rough Stone Amulet",
    description: "A crudely carved amulet of unknown origin",
    type: "accessory", slot: "neck", rarity: "common", level: 1,
    stats: { stamina: 5, wisdom: 2 },
    sellPrice: 8, spriteId: "neck_stone",
  },
  {
    id: "silver_pendant",
    name: "Silver Pendant of Focus",
    description: "A delicate silver pendant engraved with runes of focus",
    type: "accessory", slot: "neck", rarity: "uncommon", level: 8,
    stats: { wisdom: 8, intelligence: 6, power: 30 },
    sellPrice: 70, spriteId: "neck_silver",
  },
  {
    id: "necklace_of_the_deep",
    name: "Necklace of the Deep",
    description: "A legendary necklace pulled from the ocean depths",
    type: "accessory", slot: "neck", rarity: "legendary", level: 36,
    stats: { wisdom: 22, intelligence: 20, stamina: 18, power: 120, health: 80 },
    sellPrice: 2500, spriteId: "neck_legendary",
  },
  // RINGS
  {
    id: "copper_ring",
    name: "Copper Ring",
    description: "A simple copper ring",
    type: "accessory", slot: "ringLeft", rarity: "common", level: 1,
    stats: { stamina: 3 },
    sellPrice: 5, spriteId: "ring_copper",
  },
  {
    id: "ring_of_strength",
    name: "Ring of Strength",
    description: "A ring that bolsters the wearer's strength",
    type: "accessory", slot: "ringLeft", rarity: "uncommon", level: 10,
    stats: { strength: 12, attackRating: 15 },
    sellPrice: 120, spriteId: "ring_strength",
  },
  {
    id: "ring_of_power",
    name: "Ring of Arcane Power",
    description: "A ring crackling with magical energy",
    type: "accessory", slot: "ringRight", rarity: "rare", level: 18,
    stats: { intelligence: 18, wisdom: 12, power: 80, critChance: 2 },
    sellPrice: 500, spriteId: "ring_arcane",
  },
  {
    id: "ring_of_the_ancients",
    name: "Ring of the Ancients",
    description: "A fabled ring carved from pure mythril by the ancients",
    type: "accessory", slot: "ringRight", rarity: "fabled", level: 52,
    stats: { strength: 30, intelligence: 25, stamina: 20, attackRating: 80, critChance: 6 },
    sellPrice: 11000, spriteId: "ring_fabled", noSell: true,
  },
  // EARRINGS
  {
    id: "simple_earring",
    name: "Simple Stud Earring",
    description: "A small stud earring",
    type: "accessory", slot: "earLeft", rarity: "common", level: 1,
    stats: { charisma: 2 },
    sellPrice: 4, spriteId: "ear_simple",
  },
  {
    id: "earring_of_the_magi",
    name: "Earring of the Magi",
    description: "An earring imbued with the power of ancient mages",
    type: "accessory", slot: "earLeft", rarity: "rare", level: 20,
    stats: { intelligence: 20, wisdom: 15, power: 90, critChance: 2 },
    sellPrice: 550, spriteId: "ear_magi",
  },
  // BACK
  {
    id: "worn_cloak",
    name: "Worn Traveler's Cloak",
    description: "A well-traveled cloak, faded but serviceable",
    type: "armor", slot: "back", rarity: "common", level: 1,
    stats: { defenseRating: 4, stamina: 3 },
    sellPrice: 7, spriteId: "back_cloak",
  },
  {
    id: "cloak_of_shadows",
    name: "Cloak of Shadows",
    description: "A cloak woven from shadows themselves",
    type: "armor", slot: "back", rarity: "legendary", level: 38,
    stats: { agility: 28, defenseRating: 95, avoidance: 8, critChance: 4 },
    sellPrice: 2800, spriteId: "back_shadow",
  },
  // SHOULDER
  {
    id: "leather_shoulder_pads",
    name: "Leather Shoulder Pads",
    description: "Basic leather shoulder protection",
    type: "armor", slot: "shoulder", rarity: "common", level: 2,
    stats: { stamina: 5, defenseRating: 7, mitigation: 4 },
    sellPrice: 10, spriteId: "shoulder_leather",
  },
  {
    id: "steel_pauldrons",
    name: "Steel Pauldrons",
    description: "Heavy steel shoulder plates with a spiked design",
    type: "armor", slot: "shoulder", rarity: "rare", level: 26,
    stats: { strength: 14, stamina: 35, defenseRating: 98, mitigation: 72 },
    sellPrice: 750, spriteId: "shoulder_steel",
  },
  // WAIST
  {
    id: "rope_belt",
    name: "Rope Belt",
    description: "A simple rope belt",
    type: "armor", slot: "waist", rarity: "common", level: 1,
    stats: { stamina: 2 },
    sellPrice: 2, spriteId: "waist_rope",
  },
  {
    id: "iron_girdle",
    name: "Iron Girdle",
    description: "An iron belt that provides solid abdominal protection",
    type: "armor", slot: "waist", rarity: "uncommon", level: 11,
    stats: { stamina: 14, strength: 5, defenseRating: 30, mitigation: 22 },
    sellPrice: 100, spriteId: "waist_iron",
  },
  // WRIST
  {
    id: "leather_bracers",
    name: "Leather Bracers",
    description: "Protective leather wraps for the wrists",
    type: "armor", slot: "wrist", rarity: "common", level: 1,
    stats: { agility: 2, stamina: 3 },
    sellPrice: 6, spriteId: "wrist_leather",
  },
  {
    id: "arcane_bracers",
    name: "Arcane Bracers",
    description: "Bracers humming with magical energy",
    type: "armor", slot: "wrist", rarity: "rare", level: 22,
    stats: { intelligence: 15, wisdom: 12, power: 75, haste: 5 },
    sellPrice: 480, spriteId: "wrist_arcane",
  },
  // CHARM
  {
    id: "lucky_horseshoe",
    name: "Lucky Horseshoe",
    description: "A horseshoe said to bring good fortune",
    type: "accessory", slot: "charm", rarity: "common", level: 1,
    stats: { charisma: 3 },
    sellPrice: 8, spriteId: "charm_horseshoe",
  },
  {
    id: "charm_of_the_oracle",
    name: "Charm of the Oracle",
    description: "A mystical charm that grants glimpses of the future",
    type: "accessory", slot: "charm", rarity: "legendary", level: 42,
    stats: { wisdom: 30, intelligence: 25, critChance: 5, haste: 10, power: 150 },
    sellPrice: 4500, spriteId: "charm_oracle",
  },
  // RANGED
  {
    id: "short_bow",
    name: "Short Bow",
    description: "A compact bow suitable for close combat",
    type: "weapon", slot: "ranged", rarity: "common", level: 1,
    stats: { agility: 3, attackRating: 8, weaponDamageMin: 4, weaponDamageMax: 10 },
    sellPrice: 10, spriteId: "ranged_bow",
  },
  {
    id: "elven_longbow",
    name: "Elven Longbow",
    description: "A beautifully crafted longbow of elven design",
    type: "weapon", slot: "ranged", rarity: "rare", level: 20,
    stats: { agility: 20, attackRating: 75, critChance: 5, weaponDamageMin: 35, weaponDamageMax: 60 },
    sellPrice: 600, spriteId: "ranged_elven",
  },
  // MATERIALS
  {
    id: "iron_ore",
    name: "Iron Ore",
    description: "Raw iron ore extracted from the earth",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 3, spriteId: "mat_iron_ore", stackable: true,
  },
  {
    id: "coal",
    name: "Coal",
    description: "Black coal used for smelting metal",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 2, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "iron_bar",
    name: "Iron Bar",
    description: "A smelted bar of iron ready for crafting",
    type: "material", slot: "none", rarity: "common", level: 5,
    stats: {}, sellPrice: 8, spriteId: "mat_iron_bar", stackable: true,
  },
  {
    id: "steel_bar",
    name: "Steel Bar",
    description: "A bar of tempered steel, stronger than iron",
    type: "material", slot: "none", rarity: "uncommon", level: 15,
    stats: {}, sellPrice: 25, spriteId: "mat_steel_bar", stackable: true,
  },
  {
    id: "mithril_ore",
    name: "Mythril Ore",
    description: "A rare ore of mythril, prized by smiths",
    type: "material", slot: "none", rarity: "rare", level: 25,
    stats: {}, sellPrice: 45, spriteId: "mat_mithril_ore", stackable: true,
  },
  {
    id: "wolf_hide",
    name: "Wolf Hide",
    description: "A thick wolf pelt for crafting leather gear",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 5, spriteId: "mat_hide", stackable: true,
  },
  {
    id: "spider_silk",
    name: "Spider Silk",
    description: "Incredibly strong silk from giant spiders",
    type: "material", slot: "none", rarity: "uncommon", level: 10,
    stats: {}, sellPrice: 15, spriteId: "mat_silk", stackable: true,
  },
  {
    id: "fire_opal",
    name: "Fire Opal",
    description: "A gem that burns with an inner fire",
    type: "material", slot: "none", rarity: "rare", level: 20,
    stats: {}, sellPrice: 60, spriteId: "mat_gem", stackable: true,
  },
  // CONSUMABLES
  {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores 100 health when consumed",
    type: "consumable", slot: "none", rarity: "common", level: 1,
    stats: { health: 100 }, sellPrice: 20, buyPrice: 50, spriteId: "potion_health", stackable: true,
  },
  {
    id: "mana_potion",
    name: "Mana Potion",
    description: "Restores 75 power when consumed",
    type: "consumable", slot: "none", rarity: "common", level: 1,
    stats: { power: 75 }, sellPrice: 18, buyPrice: 45, spriteId: "potion_mana", stackable: true,
  },
  // ── BLACKBURROW DUNGEON ITEMS ─────────────────────────────────────────────
  {
    id: "bb_gnoll_tusk_dagger",
    name: "Gnoll Tusk Dagger",
    description: "A dagger carved from a gnoll's own tusk — cruelly sharp",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 10,
    stats: { agility: 6, attackRating: 30, critChance: 2, weaponDamageMin: 14, weaponDamageMax: 24, weaponDelay: 1.6 },
    sellPrice: 85, spriteId: "sword_iron",
  },
  {
    id: "bb_gnoll_bone_shield",
    name: "Gnoll Bone Shield",
    description: "A crude shield fashioned from gnoll bones and sinew",
    type: "armor", slot: "secondary", rarity: "uncommon", level: 11,
    stats: { stamina: 12, defenseRating: 38, mitigation: 28 },
    sellPrice: 90, spriteId: "shield_iron",
  },
  {
    id: "bb_gnoll_hide_armor",
    name: "Gnoll Hide Armor",
    description: "Thick gnoll hide stitched into surprisingly effective armor",
    type: "armor", slot: "chest", rarity: "common", level: 10,
    stats: { stamina: 16, defenseRating: 35, mitigation: 25 },
    sellPrice: 65, spriteId: "chest_leather",
  },
  {
    id: "bb_gnoll_tooth_necklace",
    name: "Gnoll Tooth Necklace",
    description: "A grisly trophy necklace strung from gnoll fangs",
    type: "accessory", slot: "neck", rarity: "common", level: 10,
    stats: { strength: 5, stamina: 6, attackRating: 12 },
    sellPrice: 40, spriteId: "neck_stone",
  },
  {
    id: "bb_gnoll_shamans_staff",
    name: "Gnoll Shaman's Staff",
    description: "A gnarled staff carved with dire prophecies in gnoll-script",
    type: "weapon", slot: "primary", rarity: "uncommon", level: 13,
    stats: { intelligence: 10, wisdom: 8, attackRating: 40, weaponDamageMin: 18, weaponDamageMax: 30, weaponDelay: 2.0, power: 45 },
    sellPrice: 160, spriteId: "sword_steel",
  },
  {
    id: "bb_overseer_collar",
    name: "Overseer's Iron Collar",
    description: "A jagged iron collar once worn by a floor overseer — now a trophy",
    type: "accessory", slot: "neck", rarity: "rare", level: 14,
    stats: { strength: 12, stamina: 14, attackRating: 28, defenseRating: 22 },
    sellPrice: 320, spriteId: "neck_silver",
  },
  {
    id: "bb_blackburrow_brew",
    name: "Blackburrow Gnoll Brew",
    description: "A foul-smelling gnoll brew that temporarily bolsters vitality",
    type: "consumable", slot: "none", rarity: "common", level: 10,
    stats: { health: 120 }, sellPrice: 25, buyPrice: 60, spriteId: "potion_health", stackable: true,
  },
  {
    id: "bb_gnoll_captain_breastplate",
    name: "Gnoll Captain's Breastplate",
    description: "Heavy plated armor stripped from a Blackburrow floor captain",
    type: "armor", slot: "chest", rarity: "rare", level: 16,
    stats: { stamina: 38, strength: 14, defenseRating: 88, mitigation: 66, health: 60 },
    sellPrice: 480, spriteId: "chest_iron",
  },
  {
    id: "bb_commander_war_helm",
    name: "Blackburrow Commander's Helm",
    description: "A battle-scarred helm worn by Blackburrow's elite commanders",
    type: "armor", slot: "head", rarity: "rare", level: 18,
    stats: { stamina: 45, strength: 16, defenseRating: 105, mitigation: 78, health: 80 },
    sellPrice: 620, spriteId: "helm_steel",
  },
  {
    id: "bb_narlock_seal",
    name: "Narlock's Warlord Seal",
    description: "A legendary seal bearing the crest of Overlord Narlock himself",
    type: "accessory", slot: "charm", rarity: "legendary", level: 20,
    stats: { strength: 22, stamina: 18, attackRating: 55, critChance: 4, defenseRating: 45, health: 100 },
    sellPrice: 2800, spriteId: "charm_oracle",
  },
  {
    id: "bb_warmaster_blade",
    name: "Narlock's Warmaster Blade",
    description: "The legendary weapon of Overlord Narlock — radiates gnoll war-fury",
    type: "weapon", slot: "primary", rarity: "legendary", level: 20,
    stats: { strength: 28, agility: 12, attackRating: 145, critChance: 5, weaponDamageMin: 48, weaponDamageMax: 78, weaponDelay: 1.8 },
    sellPrice: 2400, spriteId: "sword_dark",
  },

  // ── ZONE MATERIALS (not duplicated in ITEMS.push block below) ────────────
  {
    id: "enchanted_pixie_dust",
    name: "Enchanted Pixie Dust",
    description: "Shimmering dust shed by the faerie folk of the Enchanted Lands",
    type: "material", slot: "none", rarity: "uncommon", level: 25,
    stats: {}, sellPrice: 45, stackable: true, spriteId: "material_dust",
  },
  {
    id: "enchanted_brownie_cap",
    name: "Brownie Cap",
    description: "A tiny, colourful cap knocked from an Enchanted Lands brownie",
    type: "material", slot: "none", rarity: "common", level: 22,
    stats: {}, sellPrice: 20, stackable: true, spriteId: "material_cloth",
  },
  {
    id: "zek_orc_skull",
    name: "Zek Orc Skull",
    description: "The skull of a Deathfist orc from Zek — a trophy and crafting material",
    type: "material", slot: "none", rarity: "common", level: 30,
    stats: {}, sellPrice: 15, stackable: true, spriteId: "material_bone",
  },
  {
    id: "zek_orcish_badge",
    name: "Orcish Warlord Badge",
    description: "The rank insignia torn from a Zek warlord's uniform",
    type: "material", slot: "none", rarity: "uncommon", level: 33,
    stats: {}, sellPrice: 35, stackable: true, spriteId: "material_cloth",
  },
  {
    id: "faydark_sprite_wing",
    name: "Faydark Sprite Wing",
    description: "A delicate wing from a dark faydark sprite, faintly glowing",
    type: "material", slot: "none", rarity: "uncommon", level: 25,
    stats: {}, sellPrice: 30, stackable: true, spriteId: "material_dust",
  },
  {
    id: "faydark_treant_bark",
    name: "Faydark Treant Bark",
    description: "Ancient bark from a corrupted Lesser Faydark treant",
    type: "material", slot: "none", rarity: "common", level: 23,
    stats: {}, sellPrice: 12, stackable: true, spriteId: "material_wood",
  },
  {
    id: "feerrott_lizard_scale",
    name: "Feerrott Lizard Scale",
    description: "A thick scale pried from a Feerrott lizardman — resistant to magic",
    type: "material", slot: "none", rarity: "common", level: 35,
    stats: {}, sellPrice: 22, stackable: true, spriteId: "material_hide",
  },
  {
    id: "feerrott_swamp_moss",
    name: "Feerrott Swamp Moss",
    description: "Bioluminescent moss harvested from the depths of the Feerrott swamp",
    type: "material", slot: "none", rarity: "common", level: 32,
    stats: {}, sellPrice: 10, stackable: true, spriteId: "material_herb",
  },
  {
    id: "everfrost_mammoth_ivory",
    name: "Everfrost Mammoth Ivory",
    description: "A massive tusk section carved from an Everfrost mammoth",
    type: "material", slot: "none", rarity: "uncommon", level: 35,
    stats: {}, sellPrice: 40, stackable: true, spriteId: "material_bone",
  },
  {
    id: "lavastorm_fire_opal",
    name: "Lavastorm Fire Opal",
    description: "A brilliant gem formed in the volcanic heat of Lavastorm",
    type: "material", slot: "none", rarity: "uncommon", level: 42,
    stats: {}, sellPrice: 80, stackable: true, spriteId: "material_gem",
  },
  {
    id: "lavastorm_magma_slag",
    name: "Lavastorm Magma Slag",
    description: "Cooled magma slag infused with magical fire — essential for fire-forging",
    type: "material", slot: "none", rarity: "common", level: 40,
    stats: {}, sellPrice: 18, stackable: true, spriteId: "material_ore",
  },
  {
    id: "nagafen_inferno_scale",
    name: "Nagafen's Inferno Scale",
    description: "An enormous scale shed by Lord Nagafen — radiates intense volcanic heat",
    type: "armor", slot: "chest", rarity: "legendary", level: 50,
    stats: { stamina: 40, strength: 25, defenseRating: 200, mitigation: 145 },
    sellPrice: 7200, spriteId: "armor_fire_chest",
  },

  // ── PHASE 2: MONSTER COMPONENT DROPS ─────────────────────────────────────
  // Mob-specific crafting components — drop from regular (non-boss) monsters.
  {
    id: "wolf_fang",
    name: "Wolf Fang",
    description: "A razor-sharp fang from a rabid wolf — valued by leatherworkers and alchemists",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 4, stackable: true, spriteId: "material_bone",
  },
  {
    id: "goblin_ear",
    name: "Goblin Ear",
    description: "A leathery goblin ear — disgusting but useful for certain crude concoctions",
    type: "material", slot: "none", rarity: "common", level: 2,
    stats: {}, sellPrice: 3, stackable: true, spriteId: "material_hide",
  },
  {
    id: "bleached_bone",
    name: "Bleached Bone",
    description: "Sun-bleached bone from a fallen undead soldier — a useful crafting component",
    type: "material", slot: "none", rarity: "common", level: 4,
    stats: {}, sellPrice: 5, stackable: true, spriteId: "material_bone",
  },
  {
    id: "gnoll_fur_tuft",
    name: "Gnoll Fur Tuft",
    description: "A coarse tuft of gnoll fur — rough but workable into crude padding",
    type: "material", slot: "none", rarity: "common", level: 7,
    stats: {}, sellPrice: 6, stackable: true, spriteId: "material_hide",
  },
  {
    id: "centaur_hoof_chip",
    name: "Centaur Hoof Chip",
    description: "A fragment chipped from a centaur hoof — surprisingly strong and dense",
    type: "material", slot: "none", rarity: "common", level: 11,
    stats: {}, sellPrice: 9, stackable: true, spriteId: "material_bone",
  },
  {
    id: "harpy_feather",
    name: "Harpy Feather",
    description: "A long iridescent feather from a harpy — light and sharp-edged",
    type: "material", slot: "none", rarity: "common", level: 16,
    stats: {}, sellPrice: 12, stackable: true, spriteId: "material_feather",
  },
  {
    id: "dark_elf_shadow_dust",
    name: "Shadow Dust",
    description: "Powdery residue scraped from dark elf assassin blades — imbued with shadow essence",
    type: "material", slot: "none", rarity: "uncommon", level: 21,
    stats: {}, sellPrice: 22, stackable: true, spriteId: "material_dust",
  },
  {
    id: "treant_heartwood_chip",
    name: "Treant Heartwood Chip",
    description: "A dense chip of ancient treant heartwood — saturated with life energy",
    type: "material", slot: "none", rarity: "uncommon", level: 25,
    stats: {}, sellPrice: 28, stackable: true, spriteId: "material_wood",
  },
  {
    id: "frost_giant_knuckle",
    name: "Frost Giant Knuckle",
    description: "A massive knucklebone from a frost giant — cold to the touch and nearly unbreakable",
    type: "material", slot: "none", rarity: "uncommon", level: 32,
    stats: {}, sellPrice: 35, stackable: true, spriteId: "material_bone",
  },
  {
    id: "fire_goblin_ash",
    name: "Fire Goblin Ash",
    description: "Volcanic ash clinging to a goblin firestarter's remains — still smouldering",
    type: "material", slot: "none", rarity: "uncommon", level: 42,
    stats: {}, sellPrice: 42, stackable: true, spriteId: "material_ore",
  },

  // ── PHASE 2: BOSS CRAFTING MATERIAL DROPS ────────────────────────────────
  // Rare materials dropped only by dungeon and raid bosses.
  {
    id: "warchief_war_medallion",
    name: "Warchief's War Medallion",
    description: "A battered medallion worn by Drek'Eth the Gnoll Warchief — radiates brutal authority",
    type: "material", slot: "none", rarity: "rare", level: 10,
    stats: {}, sellPrice: 150, stackable: true, spriteId: "material_seal",
  },
  {
    id: "narlock_overlord_seal",
    name: "Overlord's Fractured Seal",
    description: "A fragment of Narlock's iron overlord seal — pulsing with gnollish warlord power",
    type: "material", slot: "none", rarity: "rare", level: 20,
    stats: {}, sellPrice: 280, stackable: true, spriteId: "material_seal",
  },
  {
    id: "varsoon_lich_essence",
    name: "Varsoon's Lich Essence",
    description: "A vial of condensed necrotic energy from Varsoon the Undying — the lich's distilled essence",
    type: "material", slot: "none", rarity: "rare", level: 25,
    stats: {}, sellPrice: 320, stackable: true, spriteId: "material_reagent",
  },
  {
    id: "everling_dark_shard",
    name: "Everling's Dark Shard",
    description: "A shard of cursed obsidian bearing Lord Everling's necrotic brand",
    type: "material", slot: "none", rarity: "rare", level: 35,
    stats: {}, sellPrice: 450, stackable: true, spriteId: "material_gem",
  },
  {
    id: "vox_ice_scale",
    name: "Vox's Ice Scale",
    description: "A translucent scale shed by Lady Vox herself — cold enough to freeze the air around it",
    type: "material", slot: "none", rarity: "rare", level: 45,
    stats: {}, sellPrice: 600, stackable: true, spriteId: "material_scale",
  },
  {
    id: "nagafen_fire_scale",
    name: "Nagafen's Fire Scale",
    description: "A charred scale from Lord Nagafen — it burns to the touch and never truly cools",
    type: "material", slot: "none", rarity: "rare", level: 50,
    stats: {}, sellPrice: 750, stackable: true, spriteId: "material_scale",
  },
  {
    id: "prismatic_dragon_scale",
    name: "Prismatic Dragon Scale",
    description: "A shimmering scale from Harla Dar the Prismatic Dragon — shifts colour with elemental energy",
    type: "material", slot: "none", rarity: "legendary", level: 60,
    stats: {}, sellPrice: 2500, stackable: true, spriteId: "material_scale",
  },
  {
    id: "vampire_lord_fang",
    name: "Vampire Lord's Fang",
    description: "A massive fang from Mayong Mistmoore himself — drips with ancient vampiric venom",
    type: "material", slot: "none", rarity: "legendary", level: 65,
    stats: {}, sellPrice: 3000, stackable: true, spriteId: "material_bone",
  },
  {
    id: "plague_dragon_spine",
    name: "Plague Dragon's Spine",
    description: "A venomous spine ripped from Trakanon's back — corrodes anything it touches",
    type: "material", slot: "none", rarity: "legendary", level: 62,
    stats: {}, sellPrice: 2800, stackable: true, spriteId: "material_bone",
  },

  // ── PHASE 2: JOURNEYMAN RECIPE SCROLLS ───────────────────────────────────
  // Rare drops from regular (non-boss) monsters.
  {
    id: "scroll_journeyman_hide_bracers",
    name: "Journeyman Recipe: Crude Hide Bracers",
    description: "A battered scroll describing simple bracers crafted from raw beast hide. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "uncommon", level: 5,
    stats: {}, sellPrice: 80, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_journeyman_hide_bracers", recipeTier: "journeyman",
  },
  {
    id: "scroll_journeyman_crude_shortsword",
    name: "Journeyman Recipe: Crude Iron Shortsword",
    description: "A grimy scroll showing the basics of forging a crude iron shortsword. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "uncommon", level: 5,
    stats: {}, sellPrice: 80, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_journeyman_crude_shortsword", recipeTier: "journeyman",
  },
  {
    id: "scroll_journeyman_bone_dust_powder",
    name: "Journeyman Recipe: Bone Dust Powder",
    description: "A yellowed scroll revealing how to grind bleached bones into alchemical powder. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "uncommon", level: 5,
    stats: {}, sellPrice: 80, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_journeyman_bone_dust_powder", recipeTier: "journeyman",
  },
  {
    id: "scroll_journeyman_gnoll_tooth_ring",
    name: "Journeyman Recipe: Gnoll Tooth Ring",
    description: "A crude scroll scratched on gnoll hide, describing a ring made from gnoll fangs. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "uncommon", level: 8,
    stats: {}, sellPrice: 100, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_journeyman_gnoll_tooth_ring", recipeTier: "journeyman",
  },
  {
    id: "scroll_journeyman_feather_quill_amulet",
    name: "Journeyman Recipe: Feather Quill Amulet",
    description: "A scroll inscribed with harpy feather ink, detailing a light amulet of swiftness. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "uncommon", level: 18,
    stats: {}, sellPrice: 140, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_journeyman_feather_quill_amulet", recipeTier: "journeyman",
  },

  // ── PHASE 2: EXPERT (ADEPT) RECIPE SCROLLS — DUNGEON BOSS DROPS ──────────
  // High-chance drops from dungeon main bosses.
  {
    id: "scroll_expert_warchief_axe",
    name: "Expert Recipe: Warchief's Heavy Axe",
    description: "A scroll bearing gnoll war-script, detailing the forging of a brutal warchief's axe. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 12,
    stats: {}, sellPrice: 400, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_warchief_axe", recipeTier: "expert",
  },
  {
    id: "scroll_expert_overlord_plate",
    name: "Expert Recipe: Overlord's War Plate",
    description: "A gnollish war-scroll inscribed by Narlock's own armorer, detailing reinforced war plate. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 22,
    stats: {}, sellPrice: 550, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_overlord_war_plate", recipeTier: "expert",
  },
  {
    id: "scroll_expert_lich_focus",
    name: "Expert Recipe: Lich's Necrotic Focus",
    description: "A necromantic scroll crackling with dark energy, revealing how to craft a lich-touched focus. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 28,
    stats: {}, sellPrice: 600, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_lich_focus", recipeTier: "expert",
  },
  {
    id: "scroll_expert_shadow_mantle",
    name: "Expert Recipe: Shadow Mantle of Everling",
    description: "A cursed scroll bound in dark elf silk, detailing Everling's signature mantle. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 37,
    stats: {}, sellPrice: 700, stackable: false, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_shadow_mantle", recipeTier: "expert",
  },

  // ── MYTHIC CRAFTED ITEMS (one-of-a-kind results) ──────────────────────────
  {
    id: "craft_worldbreaker_blade",
    name: "Worldbreaker Blade",
    description: "A legendary weapon forged from Nagafen's own scales — unique in all of Norrath",
    type: "weapon", slot: "primary", rarity: "mythical", level: 55,
    stats: { strength: 80, agility: 40, attackRating: 600, critChance: 18, weaponDamageMin: 220, weaponDamageMax: 380, weaponDelay: 1.6 },
    sellPrice: 50000, spriteId: "sword_fabled", noSell: true,
  },
  {
    id: "craft_void_mantle",
    name: "Void-Touched Mantle",
    description: "A cloak woven from the very fabric of the void — unique in all of Norrath",
    type: "armor", slot: "back", rarity: "mythical", level: 52,
    stats: { agility: 60, defenseRating: 320, avoidance: 25, critChance: 12, intelligence: 40 },
    sellPrice: 45000, spriteId: "back_shadow", noSell: true,
  },
  {
    id: "craft_eternal_crown",
    name: "Eternal Crown of Norrath",
    description: "A crown worn by ancient kings — of immeasurable worth, unique in all of Norrath",
    type: "armor", slot: "head", rarity: "mythical", level: 58,
    stats: { stamina: 120, strength: 60, wisdom: 50, defenseRating: 450, mitigation: 320, health: 500, critChance: 8 },
    sellPrice: 60000, spriteId: "helm_legendary", noSell: true,
  },

  // ── EXPERT CRAFTED ITEMS ──────────────────────────────────────────────────
  {
    id: "craft_shadowsteel_blade",
    name: "Shadowsteel Blade",
    description: "A blade forged from shadowsteel — burns with cold dark flame",
    type: "weapon", slot: "primary", rarity: "legendary", level: 40,
    stats: { strength: 45, agility: 22, attackRating: 300, critChance: 10, weaponDamageMin: 110, weaponDamageMax: 175, weaponDelay: 1.7 },
    sellPrice: 15000, spriteId: "sword_dark",
  },
  {
    id: "craft_dragonscale_breastplate",
    name: "Dragonscale Breastplate",
    description: "A breastplate of true dragonscale — nearly impenetrable",
    type: "armor", slot: "chest", rarity: "legendary", level: 45,
    stats: { stamina: 100, strength: 35, defenseRating: 380, mitigation: 280, health: 300 },
    sellPrice: 18000, spriteId: "chest_fabled",
  },
  {
    id: "craft_arcane_codex_ring",
    name: "Arcane Codex Ring",
    description: "A ring inscribed with the complete codex of arcane magic",
    type: "accessory", slot: "ringRight", rarity: "legendary", level: 42,
    stats: { intelligence: 45, wisdom: 35, power: 300, critChance: 8, attackRating: 60 },
    sellPrice: 14000, spriteId: "ring_arcane",
  },

  // ── RECIPE SCROLLS — EXPERT ───────────────────────────────────────────────
  {
    id: "scroll_expert_shadowsteel",
    name: "Expert Recipe: Shadowsteel Blade",
    description: "A worn scroll detailing the forging of a Shadowsteel Blade. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 35,
    stats: {}, sellPrice: 500, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_shadowsteel_blade", recipeTier: "expert",
  },
  {
    id: "scroll_expert_dragonscale",
    name: "Expert Recipe: Dragonscale Breastplate",
    description: "A scaly scroll detailing the crafting of true Dragonscale Breastplate. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 40,
    stats: {}, sellPrice: 800, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_dragonscale_breastplate", recipeTier: "expert",
  },
  {
    id: "scroll_expert_arcane_ring",
    name: "Expert Recipe: Arcane Codex Ring",
    description: "A glowing scroll containing the secrets of the Arcane Codex Ring. Learning this recipe will consume the scroll.",
    type: "recipe_scroll", slot: "none", rarity: "rare", level: 38,
    stats: {}, sellPrice: 600, spriteId: "scroll_recipe",
    recipeId: "recipe_expert_arcane_ring", recipeTier: "expert",
  },

  // ── RECIPE SCROLLS — MYTHIC ───────────────────────────────────────────────
  {
    id: "scroll_mythic_worldbreaker",
    name: "Mythic Recipe: Worldbreaker Blade [ONE OF A KIND]",
    description: "An ancient tablet describing the forging of the Worldbreaker Blade. Once crafted, this recipe is lost forever.",
    type: "recipe_scroll", slot: "none", rarity: "legendary", level: 50,
    stats: {}, sellPrice: 5000, spriteId: "scroll_mythic",
    recipeId: "recipe_mythic_worldbreaker_blade", recipeTier: "mythic",
  },
  {
    id: "scroll_mythic_void_mantle",
    name: "Mythic Recipe: Void-Touched Mantle [ONE OF A KIND]",
    description: "A scroll woven from shadow that reveals the Void-Touched Mantle's construction. Once crafted, this recipe is lost forever.",
    type: "recipe_scroll", slot: "none", rarity: "legendary", level: 50,
    stats: {}, sellPrice: 5000, spriteId: "scroll_mythic",
    recipeId: "recipe_mythic_void_mantle", recipeTier: "mythic",
  },
  {
    id: "scroll_mythic_eternal_crown",
    name: "Mythic Recipe: Eternal Crown of Norrath [ONE OF A KIND]",
    description: "A golden tablet bearing the secret of the Eternal Crown. Once crafted, this recipe is lost forever.",
    type: "recipe_scroll", slot: "none", rarity: "legendary", level: 55,
    stats: {}, sellPrice: 8000, spriteId: "scroll_mythic",
    recipeId: "recipe_mythic_eternal_crown", recipeTier: "mythic",
  },

  // ── GATHERING MATERIALS — MINING ──────────────────────────────────────────
  {
    id: "copper_ore",
    name: "Copper Ore",
    description: "Common copper ore — the foundation of early metalwork",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 1, spriteId: "mat_iron_ore", stackable: true,
  },
  {
    id: "silver_ore",
    name: "Silver Ore",
    description: "Gleaming silver ore valued by jewelers and enchanters",
    type: "material", slot: "none", rarity: "uncommon", level: 20,
    stats: {}, sellPrice: 18, spriteId: "mat_mithril_ore", stackable: true,
  },
  {
    id: "gold_ore",
    name: "Gold Ore",
    description: "Rich gold ore prized for coin-minting and fine jewelry",
    type: "material", slot: "none", rarity: "uncommon", level: 35,
    stats: {}, sellPrice: 30, spriteId: "mat_mithril_ore", stackable: true,
  },
  {
    id: "adamantine_ore",
    name: "Adamantine Ore",
    description: "Near-indestructible ore found deep in Norrath's crust",
    type: "material", slot: "none", rarity: "rare", level: 70,
    stats: {}, sellPrice: 90, spriteId: "mat_mithril_ore", stackable: true,
  },
  {
    id: "ethereal_crystal",
    name: "Ethereal Crystal",
    description: "A crystal that hums with planar energy — immensely rare",
    type: "material", slot: "none", rarity: "rare", level: 80,
    stats: {}, sellPrice: 200, spriteId: "mat_gem", stackable: true,
  },

  // ── GATHERING MATERIALS — WOODCUTTING ─────────────────────────────────────
  {
    id: "birch_wood",
    name: "Birch Wood",
    description: "Light, pale birchwood — easy to work and commonly used",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 1, spriteId: "material_wood", stackable: true,
  },
  {
    id: "elm_wood",
    name: "Elm Wood",
    description: "Sturdy elm wood favored by bowyers and carpenters",
    type: "material", slot: "none", rarity: "common", level: 10,
    stats: {}, sellPrice: 6, spriteId: "material_wood", stackable: true,
  },
  {
    id: "oak_wood",
    name: "Oak Wood",
    description: "Dense, durable oak — the choice of master craftsmen",
    type: "material", slot: "none", rarity: "uncommon", level: 20,
    stats: {}, sellPrice: 16, spriteId: "material_wood", stackable: true,
  },
  {
    id: "teak_wood",
    name: "Teak Wood",
    description: "Fine-grained teak from Norrath's tropical forests",
    type: "material", slot: "none", rarity: "uncommon", level: 35,
    stats: {}, sellPrice: 28, spriteId: "material_wood", stackable: true,
  },
  {
    id: "ironwood",
    name: "Ironwood",
    description: "Wood as hard as iron — prized for weapon hafts and armor",
    type: "material", slot: "none", rarity: "rare", level: 50,
    stats: {}, sellPrice: 55, spriteId: "material_wood", stackable: true,
  },
  {
    id: "ancient_heartwood",
    name: "Ancient Heartwood",
    description: "The petrified core of a thousand-year treant — radiates life energy",
    type: "material", slot: "none", rarity: "rare", level: 70,
    stats: {}, sellPrice: 120, spriteId: "material_wood", stackable: true,
  },

  // ── GATHERING MATERIALS — FISHING ─────────────────────────────────────────
  {
    id: "small_fish",
    name: "Small Fish",
    description: "A common pond fish — good for sustenance, not much else",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 1, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "river_fish",
    name: "River Fish",
    description: "A lean, flavorful fish from Norrath's winding rivers",
    type: "material", slot: "none", rarity: "common", level: 10,
    stats: {}, sellPrice: 5, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "lake_trout",
    name: "Lake Trout",
    description: "A fat lake trout prized by chefs and alchemists alike",
    type: "material", slot: "none", rarity: "uncommon", level: 25,
    stats: {}, sellPrice: 14, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "ocean_fish",
    name: "Ocean Fish",
    description: "A large saltwater fish from the deep Norrathian seas",
    type: "material", slot: "none", rarity: "uncommon", level: 40,
    stats: {}, sellPrice: 24, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "exotic_fish",
    name: "Exotic Deep Fish",
    description: "A luminous creature from the crushing deep — its scales glow faintly",
    type: "material", slot: "none", rarity: "rare", level: 60,
    stats: {}, sellPrice: 65, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "planar_eel",
    name: "Planar Eel",
    description: "An eel that slipped through a planar rift — charged with raw elemental power",
    type: "material", slot: "none", rarity: "rare", level: 80,
    stats: {}, sellPrice: 180, spriteId: "mat_coal", stackable: true,
  },

  // ── GATHERING MATERIALS — HERBALISM ──────────────────────────────────────
  {
    id: "common_herb",
    name: "Common Herb",
    description: "A simple herb found in meadows across Norrath",
    type: "material", slot: "none", rarity: "common", level: 1,
    stats: {}, sellPrice: 1, spriteId: "material_herb", stackable: true,
  },
  {
    id: "forest_root",
    name: "Forest Root",
    description: "A thick root dug from old forest floors — useful in potions",
    type: "material", slot: "none", rarity: "common", level: 10,
    stats: {}, sellPrice: 5, spriteId: "material_herb", stackable: true,
  },
  {
    id: "fay_blossom",
    name: "Fay Blossom",
    description: "A rare flower that blooms only in faerie-touched groves",
    type: "material", slot: "none", rarity: "uncommon", level: 25,
    stats: {}, sellPrice: 20, spriteId: "material_herb", stackable: true,
  },
  {
    id: "desert_bloom",
    name: "Desert Bloom",
    description: "A succulent flower that stores water and healing compounds",
    type: "material", slot: "none", rarity: "uncommon", level: 50,
    stats: {}, sellPrice: 45, spriteId: "material_herb", stackable: true,
  },
  {
    id: "volcanic_herb",
    name: "Volcanic Herb",
    description: "A heat-resistant herb that grows near Lavastorm vents — used in fire potions",
    type: "material", slot: "none", rarity: "rare", level: 70,
    stats: {}, sellPrice: 110, spriteId: "material_herb", stackable: true,
  },

  // ── GATHERING MATERIALS — ADDITIONAL WOODCUTTING ──────────────────────────
  {
    id: "maple_wood",
    name: "Maple Wood",
    description: "Smooth-grained maple wood from young saplings — easy to carve",
    type: "material", slot: "none", rarity: "common", level: 5,
    stats: {}, sellPrice: 3, spriteId: "material_wood", stackable: true,
  },
  {
    id: "ethereal_timber",
    name: "Ethereal Timber",
    description: "Wood suffused with planar energy — it glows faintly blue and floats slightly",
    type: "material", slot: "none", rarity: "rare", level: 90,
    stats: {}, sellPrice: 200, spriteId: "material_wood", stackable: true,
  },

  // ── GATHERING MATERIALS — ADDITIONAL FISHING ──────────────────────────────
  {
    id: "brook_fish",
    name: "Brook Perch",
    description: "A small perch from shallow Norrathian brooks — easy to catch",
    type: "material", slot: "none", rarity: "common", level: 5,
    stats: {}, sellPrice: 3, spriteId: "mat_coal", stackable: true,
  },
  {
    id: "void_fish",
    name: "Void Carp",
    description: "A fish that swam through a planar vortex — its scales shift like starfield",
    type: "material", slot: "none", rarity: "rare", level: 90,
    stats: {}, sellPrice: 220, spriteId: "mat_coal", stackable: true,
  },

  // ── GATHERING MATERIALS — ADDITIONAL HERBALISM ────────────────────────────
  {
    id: "riverside_herb",
    name: "Riverside Reeds",
    description: "Tall reeds growing at water's edge — a common alchemical reagent",
    type: "material", slot: "none", rarity: "common", level: 5,
    stats: {}, sellPrice: 3, spriteId: "material_herb", stackable: true,
  },
  {
    id: "growth_spore",
    name: "Growth Spore",
    description: "A spore from the Plane of Growth — pulses with raw life energy",
    type: "material", slot: "none", rarity: "rare", level: 90,
    stats: {}, sellPrice: 210, spriteId: "material_herb", stackable: true,
  },

  // ── GATHERING MATERIALS — FORAGING ────────────────────────────────────────
  { id: "wild_mushroom", name: "Wild Mushroom", description: "A wild mushroom found in the forest", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 4, spriteId: "material_herb", stackable: true },
  { id: "forest_berry", name: "Forest Berry", description: "Small berries found growing in forest undergrowth", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 3, spriteId: "material_herb", stackable: true },
  { id: "wild_onion", name: "Wild Onion", description: "A pungent wild onion growing in forest clearings", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 2, spriteId: "material_herb", stackable: true },
  { id: "thornbush_fruit", name: "Thornbush Fruit", description: "Bitter fruit from a hardy thornbush", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 5, spriteId: "material_herb", stackable: true },
  { id: "deepwood_truffle", name: "Deepwood Truffle", description: "A rare truffle found deep in ancient forests", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 25, spriteId: "material_herb", stackable: true },

  // ── GATHERING MATERIALS — SKINNING ────────────────────────────────────────
  { id: "scraggly_hide", name: "Scraggly Hide", description: "A rough, worn hide of poor quality", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 3, spriteId: "material_leather", stackable: true },
  { id: "sturdy_hide", name: "Sturdy Hide", description: "A solid, durable hide suitable for crafting", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 8, spriteId: "material_leather", stackable: true },
  { id: "thick_pelt", name: "Thick Pelt", description: "A thick, warm pelt from a large beast", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 18, spriteId: "material_leather", stackable: true },
  { id: "pristine_pelt", name: "Pristine Pelt", description: "A flawless pelt of exceptional quality", type: "material", slot: "none", rarity: "rare", level: 1, stats: {}, sellPrice: 55, spriteId: "material_leather", stackable: true },

  // ── GATHERING MATERIALS — PROSPECTING ─────────────────────────────────────
  { id: "raw_gemstone", name: "Raw Gemstone", description: "An unpolished gemstone found while surveying", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 15, spriteId: "mat_iron_ore", stackable: true },
  { id: "uncut_diamond", name: "Uncut Diamond", description: "A rough diamond waiting to be cut and polished", type: "material", slot: "none", rarity: "rare", level: 1, stats: {}, sellPrice: 80, spriteId: "mat_iron_ore", stackable: true },
  { id: "survey_map_fragment", name: "Survey Map Fragment", description: "A torn piece of an old survey map", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 10, spriteId: "mat_iron_ore", stackable: true },

  // ── GATHERING MATERIALS — ARCHAEOLOGY ─────────────────────────────────────
  { id: "ancient_shard", name: "Ancient Shard", description: "A fragment of ancient pottery or stone", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 12, spriteId: "mat_iron_ore", stackable: true },
  { id: "relic_fragment", name: "Relic Fragment", description: "A broken piece of an ancient relic", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 20, spriteId: "mat_iron_ore", stackable: true },
  { id: "engraved_tablet", name: "Engraved Tablet", description: "A stone tablet covered in ancient engravings", type: "material", slot: "none", rarity: "rare", level: 1, stats: {}, sellPrice: 75, spriteId: "mat_iron_ore", stackable: true },

  // ── TRADESKILL HARVESTING MATERIALS ──────────────────────────────────────
  { id: "shadowroot_timber", name: "Shadowroot Timber", description: "Dark hardwood from shadowroot trees, prized by weaponsmiths and armorers.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 8, spriteId: "material_wood", stackable: true },
  { id: "emberstone_fragment", name: "Emberstone Fragment", description: "A shard of volcanic rock imbued with fire energy, used in high-tier smithing.", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 14, spriteId: "material_ore", stackable: true },
  { id: "frostbloom_petal", name: "Frostbloom Petal", description: "A petal from a rare ice-zone flower, used in advanced potions and cloth work.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 6, spriteId: "material_herb", stackable: true },
  { id: "manaweave_fiber", name: "Manaweave Fiber", description: "Magical plant fiber that resonates with arcane energy, essential for moon-quality cloth.", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 18, spriteId: "material_herb", stackable: true },
  { id: "venom_sac", name: "Venom Sac", description: "A sac from venomous creatures, distilled into powerful alchemical poisons.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 10, spriteId: "material_reagent", stackable: true },
  { id: "astral_ore", name: "Astral Ore", description: "A shimmering ore that floats faintly, imbued with celestial energy.", type: "material", slot: "none", rarity: "rare", level: 1, stats: {}, sellPrice: 35, spriteId: "material_ore", stackable: true },
  { id: "corrupted_hide", name: "Corrupted Hide", description: "Thick hide from a corrupted beast, strangely resilient and imbued with dark power.", type: "material", slot: "none", rarity: "uncommon", level: 1, stats: {}, sellPrice: 20, spriteId: "material_hide", stackable: true },
  { id: "glimmerdust", name: "Glimmerdust", description: "Sparkling magical dust that amplifies gem-cutting precision.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 12, spriteId: "material_reagent", stackable: true },
  { id: "deepmoss", name: "Deepmoss", description: "A thick moss that grows only in deep caves, used in restorative alchemy.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 5, spriteId: "material_herb", stackable: true },
  { id: "thornvine", name: "Thornvine", description: "A tough fibrous vine with sharp thorns, used as thread reinforcement or bowstrings.", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 7, spriteId: "material_wood", stackable: true },

  // ── CRAFTING MATERIALS — WOODWORKING ──────────────────────────────────────
  { id: "lumber", name: "Lumber", description: "Rough-cut lumber suitable for woodworking", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 4, spriteId: "material_wood", stackable: true },
  { id: "hardwood_plank", name: "Hardwood Plank", description: "A smoothed plank of hardwood ready for construction", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 8, spriteId: "material_wood", stackable: true },

  // ── COOKING CONSUMABLES ───────────────────────────────────────────────────
  { id: "roasted_mushroom", name: "Roasted Mushroom", description: "Mushrooms roasted over an open flame", type: "consumable", slot: "none", rarity: "common", level: 1, stats: { health: 40 }, sellPrice: 10, spriteId: "material_herb", stackable: true },
  { id: "berry_pie", name: "Berry Pie", description: "A hearty pie baked with wild forest berries", type: "consumable", slot: "none", rarity: "common", level: 1, stats: { health: 80 }, sellPrice: 22, spriteId: "material_herb", stackable: true },
  { id: "hearty_stew", name: "Hearty Stew", description: "A warming stew of foraged mushrooms and vegetables", type: "consumable", slot: "none", rarity: "common", level: 1, stats: { health: 150, power: 30 }, sellPrice: 45, spriteId: "material_herb", stackable: true },
  { id: "truffle_feast", name: "Truffle Feast", description: "A lavish feast centered on rare deepwood truffles", type: "consumable", slot: "none", rarity: "uncommon", level: 1, stats: { health: 300, power: 60 }, sellPrice: 90, spriteId: "material_herb", stackable: true },

  // ── ENCHANTING MATERIALS & CONSUMABLES ───────────────────────────────────
  { id: "enchanting_dust", name: "Enchanting Dust", description: "Fine dust imbued with arcane energy", type: "material", slot: "none", rarity: "common", level: 1, stats: {}, sellPrice: 12, spriteId: "mat_iron_ore", stackable: true },
  { id: "scroll_of_swiftness", name: "Scroll of Swiftness", description: "A scroll that grants a burst of speed", type: "consumable", slot: "none", rarity: "common", level: 1, stats: { haste: 15 }, sellPrice: 35, spriteId: "mat_iron_ore", stackable: true },
  { id: "scroll_of_fortitude", name: "Scroll of Fortitude", description: "A scroll that temporarily fortifies the body", type: "consumable", slot: "none", rarity: "uncommon", level: 1, stats: { health: 200 }, sellPrice: 50, spriteId: "mat_iron_ore", stackable: true },

  // ── WOODWORKING WEAPONS ───────────────────────────────────────────────────
  {
    id: "wooden_bow",
    name: "Wooden Bow",
    description: "A simple but effective bow crafted from sturdy wood",
    type: "weapon", slot: "mainhand", rarity: "common", level: 5,
    stats: { weaponDamageMin: 8, weaponDamageMax: 16, weaponDelay: 2.5, attackRating: 10 },
    sellPrice: 40, spriteId: "weapon_bow",
  },
  {
    id: "ash_staff",
    name: "Ash Staff",
    description: "A smooth staff carved from ash wood, favoured by spellcasters",
    type: "weapon", slot: "mainhand", rarity: "uncommon", level: 15,
    stats: { weaponDamageMin: 14, weaponDamageMax: 28, weaponDelay: 3.0, attackRating: 18, intelligence: 5 },
    sellPrice: 90, spriteId: "weapon_staff",
  },

  // ── LEATHERWORKING ARMOR ──────────────────────────────────────────────────
  {
    id: "leather_bracers",
    name: "Leather Bracers",
    description: "Simple leather bracers offering basic wrist protection",
    type: "armor", slot: "wrists", rarity: "common", level: 5,
    stats: { defenseRating: 8, mitigation: 4, agility: 2 },
    sellPrice: 30, spriteId: "wrists_leather",
  },
  {
    id: "supple_leather_gloves",
    name: "Supple Leather Gloves",
    description: "Soft, well-fitted gloves crafted from supple leather",
    type: "armor", slot: "hands", rarity: "common", level: 10,
    stats: { defenseRating: 10, mitigation: 5, agility: 3 },
    sellPrice: 40, spriteId: "hands_leather",
  },
  {
    id: "reinforced_leather_vest",
    name: "Reinforced Leather Vest",
    description: "A leather vest reinforced with additional hide panels for greater protection",
    type: "armor", slot: "chest", rarity: "uncommon", level: 20,
    stats: { defenseRating: 22, mitigation: 12, stamina: 5, agility: 5 },
    sellPrice: 85, spriteId: "chest_leather",
  },
];

/**
 * Returns a Map<recipeId, scrollItemId[]> for all one-of-a-kind recipes.
 * Used to exclude exhausted scroll drops from enemy loot tables.
 */
export function getOneOfAKindScrollMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of ITEMS) {
    if (item.type === "recipe_scroll" && item.recipeId) {
      const recipe = CRAFTING_RECIPES.find(r => r.id === item.recipeId);
      if (recipe?.oneOfAKind) {
        const existing = map.get(item.recipeId) ?? [];
        existing.push(item.id);
        map.set(item.recipeId, existing);
      }
    }
  }
  return map;
}

export const ENEMIES: Enemy[] = [
  // COMMONLANDS (Levels 1-10)
  {
    id: "rabid_wolf",
    name: "Rabid Wolf",
    description: "A foam-mouthed wolf driven mad with hunger",
    level: 1, zone: "Commonlands",
    hp: 45, maxHp: 45, attackRating: 12, defenseRating: 5, mitigation: 3, avoidance: 5,
    attackSpeed: 2.0, damageMin: 4, damageMax: 9, xpReward: 25, goldMin: 1, goldMax: 4,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.6, minQuantity: 1, maxQuantity: 2 },
      { itemId: "worn_boots", dropChance: 0.05, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wolf_fang", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_journeyman_hide_bracers", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "rend", name: "Rend", description: "Tears flesh, causing a bleeding wound", icon: "🩸", triggerType: "on_hit_proc", triggerValue: 25, effectType: "bleed_dot", effectValue: 4, durationTicks: 3, cooldownTicks: 6, damageType: "pierce" },
      { id: "rabid_bite", name: "Rabid Bite", description: "A frenzied bite that deals extra damage", icon: "🐺", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 8, durationTicks: 0, cooldownTicks: 8, damageType: "pierce" },
    ],
    resistances: { pierce: -10, slash: 0, crush: 5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "goblin_scout",
    name: "Goblin Scout",
    description: "A small but cunning goblin armed with a rusty dagger",
    level: 2, zone: "Commonlands",
    hp: 60, maxHp: 60, attackRating: 18, defenseRating: 8, mitigation: 5, avoidance: 10,
    attackSpeed: 1.8, damageMin: 5, damageMax: 12, xpReward: 35, goldMin: 2, goldMax: 8,
    lootTable: [
      { itemId: "rusty_short_sword", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_ore", dropChance: 0.3, minQuantity: 1, maxQuantity: 3 },
      { itemId: "goblin_ear", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_journeyman_crude_shortsword", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_goblin", type: "humanoid", isBoss: false,
    abilities: [
      { id: "shiv", name: "Shiv", description: "A lightning-fast stab for double damage", icon: "🗡️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 20, durationTicks: 0, cooldownTicks: 8, damageType: "pierce" },
      { id: "goblin_evasion", name: "Evasion", description: "The goblin nimbly avoids incoming attacks", icon: "💨", triggerType: "percent_hp", triggerValue: 50, effectType: "avoidance_buff", effectValue: 20, durationTicks: 3, cooldownTicks: 20 },
    ],
    resistances: { pierce: 5, slash: 0, crush: 0, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "fallen_soldier",
    name: "Fallen Soldier",
    description: "An undead soldier still guarding its post",
    level: 4, zone: "Commonlands",
    hp: 95, maxHp: 95, attackRating: 28, defenseRating: 18, mitigation: 12, avoidance: 5,
    attackSpeed: 2.2, damageMin: 8, damageMax: 16, xpReward: 60, goldMin: 3, goldMax: 12,
    lootTable: [
      { itemId: "leather_vest", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wooden_buckler", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "coal", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: "bleached_bone", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_journeyman_bone_dust_powder", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "life_drain", name: "Life Drain", description: "Saps the life force from the target", icon: "💀", triggerType: "every_n_ticks", triggerValue: 6, effectType: "life_drain", effectValue: 14, durationTicks: 0, cooldownTicks: 6, unavoidable: true, damageType: "divine" },
      { id: "unholy_resilience", name: "Unholy Resilience", description: "Raises a spectral shield at low health", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 30, effectType: "absorb_shield", effectValue: 60, durationTicks: 4, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: 10, crush: -5, heat: 0, cold: 20, divine: -15 },
  },
  {
    id: "gnoll_warrior",
    name: "Gnoll Warrior",
    description: "A fierce gnoll warrior armed with a crude axe",
    level: 7, zone: "Commonlands",
    hp: 145, maxHp: 145, attackRating: 45, defenseRating: 28, mitigation: 20, avoidance: 8,
    attackSpeed: 1.9, damageMin: 12, damageMax: 22, xpReward: 100, goldMin: 5, goldMax: 18,
    lootTable: [
      { itemId: "chain_coif", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_ore", dropChance: 0.5, minQuantity: 2, maxQuantity: 5 },
      { itemId: "gnoll_fur_tuft", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_journeyman_gnoll_tooth_ring", dropChance: 0.04, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "gnoll_frenzy", name: "Frenzy", description: "Enters a blood frenzy, increasing damage", icon: "😤", triggerType: "once_at_hp", triggerValue: 50, effectType: "frenzy_buff", effectValue: 35, durationTicks: 999, cooldownTicks: 99 },
      { id: "shield_bash", name: "Shield Bash", description: "Slams the player with a shield, stunning briefly", icon: "🔰", triggerType: "every_n_ticks", triggerValue: 12, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 12, unavoidable: false },
    ],
    resistances: { pierce: 0, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "commonlands_boss",
    name: "Drek'Eth the Gnoll Warchief",
    description: "The mighty warchief of the gnoll clans — a formidable foe",
    level: 10, zone: "Commonlands",
    hp: 450, maxHp: 450, attackRating: 95, defenseRating: 70, mitigation: 55, avoidance: 12,
    attackSpeed: 2.0, damageMin: 25, damageMax: 42, xpReward: 350, goldMin: 30, goldMax: 75,
    lootTable: [
      { itemId: "iron_longsword", dropChance: 0.35, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ringmail_chest", dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_strength", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "warchief_war_medallion", dropChance: 0.7, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_warchief_axe", dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "warchief_rally", name: "Warchief's Rally", description: "Calls upon his ancestors to restore health", icon: "📯", triggerType: "once_at_hp", triggerValue: 40, effectType: "self_heal", effectValue: 100, durationTicks: 0, cooldownTicks: 99 },
      { id: "savage_blow", name: "Savage Blow", description: "A devastating overhead strike", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 60, durationTicks: 0, cooldownTicks: 10, damageType: "crush" },
      { id: "war_cry", name: "War Cry", description: "A rallying shout that increases his own damage", icon: "📢", triggerType: "once_at_hp", triggerValue: 70, effectType: "frenzy_buff", effectValue: 25, durationTicks: 999, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 15, crush: 5, heat: 0, cold: 0, divine: -5 },
  },
  // ── BLACKBURROW DUNGEON — QEYNOS HILLS (Levels 10-20) ───────────────────────
  // Floor 1: The Digging Tunnels (levels 10-11)
  {
    id: "bb_gnoll_digger",
    name: "Blackburrow Digger",
    description: "A gnoll worker that carves Blackburrow's endless tunnels",
    level: 10, zone: "Qeynos Hills",
    hp: 190, maxHp: 190, attackRating: 68, defenseRating: 42, mitigation: 30, avoidance: 8,
    attackSpeed: 2.2, damageMin: 14, damageMax: 24, xpReward: 130, goldMin: 6, goldMax: 18,
    lootTable: [
      { itemId: "iron_ore", dropChance: 0.6, minQuantity: 1, maxQuantity: 3 },
      { itemId: "bb_gnoll_hide_armor", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "pickaxe_smash", name: "Pickaxe Smash", description: "Slams with a heavy pickaxe", icon: "⛏️", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 30, durationTicks: 0, cooldownTicks: 9, damageType: "crush" },
    ],
    resistances: { pierce: 0, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_pup",
    name: "Blackburrow Gnoll Pup",
    description: "A young but ferocious gnoll eager to prove itself in battle",
    level: 10, zone: "Qeynos Hills",
    hp: 175, maxHp: 175, attackRating: 72, defenseRating: 38, mitigation: 25, avoidance: 12,
    attackSpeed: 1.9, damageMin: 12, damageMax: 22, xpReward: 120, goldMin: 5, goldMax: 15,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: "bb_gnoll_tooth_necklace", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "feral_bite", name: "Feral Bite", description: "Snaps with razor-sharp fangs", icon: "🦷", triggerType: "on_hit_proc", triggerValue: 20, effectType: "bleed_dot", effectValue: 8, durationTicks: 3, cooldownTicks: 8, damageType: "pierce" },
    ],
    resistances: { pierce: -5, slash: 0, crush: 0, heat: 0, cold: 5, divine: 0 },
  },
  {
    id: "bb_gnoll_scrapper",
    name: "Blackburrow Scrapper",
    description: "A brawling gnoll who fights dirty with improvised weapons",
    level: 11, zone: "Qeynos Hills",
    hp: 205, maxHp: 205, attackRating: 78, defenseRating: 48, mitigation: 34, avoidance: 10,
    attackSpeed: 2.0, damageMin: 15, damageMax: 26, xpReward: 140, goldMin: 7, goldMax: 20,
    lootTable: [
      { itemId: "iron_ore", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
      { itemId: "bb_gnoll_tusk_dagger", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "dirt_throw", name: "Dirt Throw", description: "Throws dirt to blind the target, reducing avoidance", icon: "💨", triggerType: "every_n_ticks", triggerValue: 8, effectType: "slow", effectValue: 12, durationTicks: 2, cooldownTicks: 10 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -8, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_tunneler",
    name: "Blackburrow Tunneler",
    description: "A gnoll specialized in collapsing tunnels on enemies",
    level: 11, zone: "Qeynos Hills",
    hp: 215, maxHp: 215, attackRating: 75, defenseRating: 52, mitigation: 38, avoidance: 8,
    attackSpeed: 2.1, damageMin: 16, damageMax: 28, xpReward: 145, goldMin: 7, goldMax: 22,
    lootTable: [
      { itemId: "coal", dropChance: 0.5, minQuantity: 1, maxQuantity: 3 },
      { itemId: "bb_gnoll_bone_shield", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "cave_in", name: "Cave-In", description: "Triggers a mini collapse, crushing the target", icon: "🪨", triggerType: "every_n_ticks", triggerValue: 12, effectType: "damage_burst", effectValue: 35, durationTicks: 0, cooldownTicks: 12, damageType: "crush", unavoidable: true },
    ],
    resistances: { pierce: 5, slash: 0, crush: -10, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_sentry",
    name: "Blackburrow Sentry",
    description: "A gnoll posted to guard the first tunnel junction",
    level: 11, zone: "Qeynos Hills",
    hp: 225, maxHp: 225, attackRating: 82, defenseRating: 58, mitigation: 40, avoidance: 10,
    attackSpeed: 1.9, damageMin: 15, damageMax: 27, xpReward: 148, goldMin: 8, goldMax: 22,
    lootTable: [
      { itemId: "leather_gloves", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_ore", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "alarm_howl", name: "Alarm Howl", description: "A howl that buffs the gnoll's own damage briefly", icon: "📯", triggerType: "once_at_hp", triggerValue: 60, effectType: "frenzy_buff", effectValue: 20, durationTicks: 3, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_overseer",
    name: "Blackburrow Overseer Grarg",
    description: "The brutal floor overseer of the first level — whip in hand, fury in eyes",
    level: 12, zone: "Qeynos Hills",
    hp: 520, maxHp: 520, attackRating: 115, defenseRating: 82, mitigation: 60, avoidance: 12,
    attackSpeed: 1.8, damageMin: 22, damageMax: 36, xpReward: 320, goldMin: 20, goldMax: 55,
    lootTable: [
      { itemId: "bb_overseer_collar", dropChance: 0.35, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_gnoll_tusk_dagger", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.6, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "whiplash", name: "Whiplash", description: "A stinging strike that leaves a bleeding welt", icon: "💥", triggerType: "every_n_ticks", triggerValue: 6, effectType: "bleed_dot", effectValue: 18, durationTicks: 4, cooldownTicks: 6, damageType: "pierce" },
      { id: "overseer_roar", name: "Overseer's Roar", description: "A furious roar that doubles his attack power", icon: "📢", triggerType: "once_at_hp", triggerValue: 50, effectType: "frenzy_buff", effectValue: 40, durationTicks: 999, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 8, crush: -5, heat: 0, cold: 0, divine: -5 },
  },
  // Floor 2: The Warrior Barracks (levels 12-13)
  {
    id: "bb_gnoll_shaman",
    name: "Blackburrow Shaman",
    description: "A gnoll witch-doctor who channels crude elemental magic",
    level: 12, zone: "Qeynos Hills",
    hp: 235, maxHp: 235, attackRating: 88, defenseRating: 55, mitigation: 38, avoidance: 14,
    attackSpeed: 2.2, damageMin: 16, damageMax: 28, xpReward: 155, goldMin: 8, goldMax: 25,
    lootTable: [
      { itemId: "bb_gnoll_shamans_staff", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "hex_bolt", name: "Hex Bolt", description: "A bolt of gnoll magic that corrodes armor", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 38, durationTicks: 0, cooldownTicks: 7, damageType: "magic" },
      { id: "ward_of_earth", name: "Ward of Earth", description: "An earthen ward that absorbs damage", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 45, effectType: "absorb_shield", effectValue: 80, durationTicks: 3, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 5, cold: 5, divine: -10, magic: 10 },
  },
  {
    id: "bb_gnoll_warrior",
    name: "Blackburrow Warrior",
    description: "A gnoll warrior hardened by battles in the warrens",
    level: 13, zone: "Qeynos Hills",
    hp: 265, maxHp: 265, attackRating: 98, defenseRating: 68, mitigation: 48, avoidance: 10,
    attackSpeed: 1.8, damageMin: 18, damageMax: 32, xpReward: 170, goldMin: 9, goldMax: 28,
    lootTable: [
      { itemId: "iron_gauntlets", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_ore", dropChance: 0.45, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "battle_charge", name: "Battle Charge", description: "Charges with ferocity, stunning briefly", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 10, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 10 },
      { id: "gnoll_frenzy2", name: "Frenzy", description: "Enters a frenzy when wounded", icon: "😤", triggerType: "once_at_hp", triggerValue: 40, effectType: "frenzy_buff", effectValue: 30, durationTicks: 999, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_scout",
    name: "Blackburrow Scout",
    description: "A swift gnoll scout who attacks from shadows and retreats",
    level: 12, zone: "Qeynos Hills",
    hp: 220, maxHp: 220, attackRating: 92, defenseRating: 60, mitigation: 40, avoidance: 18,
    attackSpeed: 1.7, damageMin: 16, damageMax: 26, xpReward: 152, goldMin: 8, goldMax: 24,
    lootTable: [
      { itemId: "leather_gloves", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wolf_hide", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "shadow_strike", name: "Shadow Strike", description: "A crippling strike from the shadows", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 42, durationTicks: 0, cooldownTicks: 8, damageType: "pierce" },
    ],
    resistances: { pierce: 5, slash: 0, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_berserker",
    name: "Blackburrow Berserker",
    description: "A gnoll who fights in a blood frenzy, ignoring wounds",
    level: 13, zone: "Qeynos Hills",
    hp: 280, maxHp: 280, attackRating: 102, defenseRating: 65, mitigation: 44, avoidance: 8,
    attackSpeed: 1.6, damageMin: 20, damageMax: 34, xpReward: 175, goldMin: 10, goldMax: 30,
    lootTable: [
      { itemId: "ringmail_chest", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "blood_rage", name: "Blood Rage", description: "Flies into a mindless rage, greatly increasing damage", icon: "🔴", triggerType: "on_hit_proc", triggerValue: 15, effectType: "frenzy_buff", effectValue: 45, durationTicks: 2, cooldownTicks: 12 },
    ],
    resistances: { pierce: -5, slash: 0, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_battlemaster",
    name: "Battlemaster Krix",
    description: "The iron-fisted battlemaster who drills Blackburrow's warriors",
    level: 14, zone: "Qeynos Hills",
    hp: 620, maxHp: 620, attackRating: 138, defenseRating: 98, mitigation: 72, avoidance: 12,
    attackSpeed: 1.7, damageMin: 26, damageMax: 44, xpReward: 390, goldMin: 25, goldMax: 65,
    lootTable: [
      { itemId: "bb_gnoll_shamans_staff", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "chain_coif", dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.7, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "commander_strike", name: "Commander's Strike", description: "A disciplined powerful blow", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 55, durationTicks: 0, cooldownTicks: 8, damageType: "slash" },
      { id: "iron_will", name: "Iron Will", description: "Hardens resolve, absorbing the next attack", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 55, effectType: "absorb_shield", effectValue: 150, durationTicks: 3, cooldownTicks: 99 },
      { id: "rally_troops", name: "Rally Troops", description: "Rallies his own fighting spirit, healing himself", icon: "📯", triggerType: "percent_hp", triggerValue: 35, effectType: "self_heal", effectValue: 120, durationTicks: 0, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: 10, crush: -8, heat: 0, cold: 0, divine: -5 },
  },
  // Floor 3: The Shaman Sanctum (levels 14-15)
  {
    id: "bb_gnoll_cultist",
    name: "Blackburrow Cultist",
    description: "A gnoll pledged to dark spirits, weaving hexes on intruders",
    level: 14, zone: "Qeynos Hills",
    hp: 290, maxHp: 290, attackRating: 108, defenseRating: 72, mitigation: 50, avoidance: 14,
    attackSpeed: 2.1, damageMin: 20, damageMax: 34, xpReward: 185, goldMin: 11, goldMax: 32,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
      { itemId: "silver_pendant", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "warding_hex", name: "Warding Hex", description: "A painful hex that deals magic damage over time", icon: "💫", triggerType: "every_n_ticks", triggerValue: 6, effectType: "bleed_dot", effectValue: 22, durationTicks: 3, cooldownTicks: 8, damageType: "magic" },
      { id: "spirit_shield", name: "Spirit Shield", description: "Calls on spirits to protect the cultist briefly", icon: "👻", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 90, durationTicks: 3, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 5, cold: 5, divine: -15, magic: 15 },
  },
  {
    id: "bb_gnoll_elder",
    name: "Blackburrow Elder",
    description: "An ancient gnoll elder steeped in wartime lore",
    level: 15, zone: "Qeynos Hills",
    hp: 315, maxHp: 315, attackRating: 115, defenseRating: 80, mitigation: 58, avoidance: 12,
    attackSpeed: 2.2, damageMin: 22, damageMax: 36, xpReward: 200, goldMin: 12, goldMax: 35,
    lootTable: [
      { itemId: "bb_gnoll_tooth_necklace", dropChance: 0.18, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.4, minQuantity: 2, maxQuantity: 3 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "elder_curse", name: "Elder's Curse", description: "A draining curse that steals vitality", icon: "💀", triggerType: "every_n_ticks", triggerValue: 7, effectType: "life_drain", effectValue: 22, durationTicks: 0, cooldownTicks: 7, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 5, crush: 0, heat: 5, cold: 10, divine: -15 },
  },
  {
    id: "bb_gnoll_invoker",
    name: "Blackburrow Invoker",
    description: "A gnoll mystic who invokes the spirits of slain warriors",
    level: 14, zone: "Qeynos Hills",
    hp: 275, maxHp: 275, attackRating: 112, defenseRating: 70, mitigation: 48, avoidance: 16,
    attackSpeed: 2.0, damageMin: 18, damageMax: 32, xpReward: 182, goldMin: 10, goldMax: 30,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "spirit_bolt", name: "Spirit Bolt", description: "A bolt of spectral energy — hard to avoid", icon: "⚡", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 45, durationTicks: 0, cooldownTicks: 7, damageType: "divine" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 0, cold: 10, divine: -20, magic: 10 },
  },
  {
    id: "bb_gnoll_runecaster",
    name: "Blackburrow Runecaster",
    description: "A gnoll that paints dire runes on the tunnel walls to curse intruders",
    level: 15, zone: "Qeynos Hills",
    hp: 295, maxHp: 295, attackRating: 118, defenseRating: 75, mitigation: 52, avoidance: 13,
    attackSpeed: 2.1, damageMin: 20, damageMax: 34, xpReward: 192, goldMin: 11, goldMax: 33,
    lootTable: [
      { itemId: "arcane_bracers", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "rune_of_slowing", name: "Rune of Slowing", description: "Activates a slowing rune — target fights sluggishly", icon: "🔰", triggerType: "every_n_ticks", triggerValue: 9, effectType: "slow", effectValue: 18, durationTicks: 3, cooldownTicks: 12 },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 5, cold: 5, divine: -10, magic: 15 },
  },
  {
    id: "bb_gnoll_high_shaman",
    name: "High Shaman Vrix",
    description: "The fearsome high shaman of Blackburrow — master of gnoll spirit magic",
    level: 16, zone: "Qeynos Hills",
    hp: 740, maxHp: 740, attackRating: 158, defenseRating: 118, mitigation: 88, avoidance: 14,
    attackSpeed: 2.0, damageMin: 30, damageMax: 50, xpReward: 460, goldMin: 30, goldMax: 80,
    lootTable: [
      { itemId: "bb_gnoll_shamans_staff", dropChance: 0.4, minQuantity: 1, maxQuantity: 1 },
      { itemId: "earring_of_the_magi", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.7, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "cunning", grudgeThreshold: 3,
    abilities: [
      { id: "spirit_tempest", name: "Spirit Tempest", description: "Summons a tempest of spectral energy — unavoidable", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 80, durationTicks: 0, cooldownTicks: 7, damageType: "divine", unavoidable: true },
      { id: "ancestral_ward", name: "Ancestral Ward", description: "Calls on ancestors for a massive shield", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 200, durationTicks: 4, cooldownTicks: 99 },
      { id: "hex_pulse", name: "Hex Pulse", description: "Pulses dark energy, draining life continuously", icon: "💀", triggerType: "percent_hp", triggerValue: 30, effectType: "life_drain", effectValue: 35, durationTicks: 0, cooldownTicks: 5, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 5, cold: 10, divine: -25, magic: 20 },
  },
  // Floor 4: The Elite Guard Quarters (levels 16-17)
  {
    id: "bb_gnoll_blade",
    name: "Blackburrow Blade",
    description: "An elite gnoll swordsman with disciplined, precise strikes",
    level: 16, zone: "Qeynos Hills",
    hp: 330, maxHp: 330, attackRating: 130, defenseRating: 92, mitigation: 66, avoidance: 15,
    attackSpeed: 1.7, damageMin: 24, damageMax: 38, xpReward: 215, goldMin: 14, goldMax: 40,
    lootTable: [
      { itemId: "steel_broadsword", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.35, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "precise_slash", name: "Precise Slash", description: "A textbook slash that bypasses some armor", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 52, durationTicks: 0, cooldownTicks: 7, damageType: "slash" },
    ],
    resistances: { pierce: 5, slash: 10, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_warden",
    name: "Blackburrow Warden",
    description: "A heavily armored gnoll who guards the elite barracks",
    level: 16, zone: "Qeynos Hills",
    hp: 360, maxHp: 360, attackRating: 125, defenseRating: 105, mitigation: 78, avoidance: 10,
    attackSpeed: 2.0, damageMin: 22, damageMax: 38, xpReward: 220, goldMin: 14, goldMax: 42,
    lootTable: [
      { itemId: "bb_gnoll_captain_breastplate", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_girdle", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "shield_wall", name: "Shield Wall", description: "Raises a wall of shields, greatly reducing damage taken", icon: "🛡️", triggerType: "every_n_ticks", triggerValue: 10, effectType: "absorb_shield", effectValue: 100, durationTicks: 2, cooldownTicks: 14 },
    ],
    resistances: { pierce: 8, slash: 12, crush: -8, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_reaver",
    name: "Blackburrow Reaver",
    description: "A gnoll berserker who tears through armor with twin axes",
    level: 17, zone: "Qeynos Hills",
    hp: 345, maxHp: 345, attackRating: 138, defenseRating: 96, mitigation: 68, avoidance: 12,
    attackSpeed: 1.6, damageMin: 26, damageMax: 42, xpReward: 228, goldMin: 15, goldMax: 44,
    lootTable: [
      { itemId: "steel_broadsword", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wolf_hide", dropChance: 0.4, minQuantity: 2, maxQuantity: 3 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "twin_rend", name: "Twin Rend", description: "Two rapid slashes from dual axes", icon: "🪓", triggerType: "every_n_ticks", triggerValue: 6, effectType: "bleed_dot", effectValue: 25, durationTicks: 4, cooldownTicks: 8, damageType: "slash" },
    ],
    resistances: { pierce: -5, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_witch",
    name: "Blackburrow Witch",
    description: "A gnoll witch who uses fear magic and dark curses",
    level: 17, zone: "Qeynos Hills",
    hp: 318, maxHp: 318, attackRating: 132, defenseRating: 88, mitigation: 62, avoidance: 16,
    attackSpeed: 2.1, damageMin: 22, damageMax: 38, xpReward: 222, goldMin: 14, goldMax: 40,
    lootTable: [
      { itemId: "ring_of_power", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
      { itemId: "fire_opal", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "fear_hex", name: "Fear Hex", description: "Hexes the target with dread, causing them to flee", icon: "😱", triggerType: "every_n_ticks", triggerValue: 10, effectType: "fear", effectValue: 1, durationTicks: 1, cooldownTicks: 14, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 5, cold: 5, divine: -20, magic: 20 },
  },
  {
    id: "bb_gnoll_general",
    name: "General Kraggoth",
    description: "The iron general of Blackburrow — his battle-cry shakes the walls",
    level: 18, zone: "Qeynos Hills",
    hp: 900, maxHp: 900, attackRating: 188, defenseRating: 148, mitigation: 112, avoidance: 14,
    attackSpeed: 1.8, damageMin: 36, damageMax: 58, xpReward: 560, goldMin: 40, goldMax: 105,
    lootTable: [
      { itemId: "bb_gnoll_captain_breastplate", dropChance: 0.45, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_commander_war_helm", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.8, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "generals_order", name: "General's Order", description: "A commanding blow that deals massive damage", icon: "🗡️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 95, durationTicks: 0, cooldownTicks: 8, damageType: "slash" },
      { id: "war_banner", name: "War Banner", description: "Plants his war banner, unleashing a fury aura", icon: "🚩", triggerType: "once_at_hp", triggerValue: 65, effectType: "frenzy_buff", effectValue: 50, durationTicks: 999, cooldownTicks: 99 },
      { id: "iron_discipline", name: "Iron Discipline", description: "Steels himself against pain, healing wounds", icon: "💊", triggerType: "once_at_hp", triggerValue: 30, effectType: "self_heal", effectValue: 200, durationTicks: 0, cooldownTicks: 99 },
    ],
    resistances: { pierce: 8, slash: 14, crush: -6, heat: 0, cold: 0, divine: -5 },
  },
  // Floor 5: The Warlord's Throne Room (levels 18-20)
  {
    id: "bb_gnoll_champion",
    name: "Blackburrow Champion",
    description: "A gnoll champion who has survived a hundred battles",
    level: 18, zone: "Qeynos Hills",
    hp: 385, maxHp: 385, attackRating: 158, defenseRating: 118, mitigation: 85, avoidance: 14,
    attackSpeed: 1.8, damageMin: 28, damageMax: 46, xpReward: 248, goldMin: 18, goldMax: 52,
    lootTable: [
      { itemId: "bb_commander_war_helm", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "steel_broadsword", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "champions_blow", name: "Champion's Blow", description: "A powerful strike from a seasoned warrior", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 65, durationTicks: 0, cooldownTicks: 8, damageType: "slash" },
      { id: "battle_hardened", name: "Battle-Hardened", description: "Years of battle have granted resilience", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 130, durationTicks: 3, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: 10, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_inquisitor",
    name: "Blackburrow Inquisitor",
    description: "Narlock's personal inquisitor who roots out cowardice with fire",
    level: 19, zone: "Qeynos Hills",
    hp: 400, maxHp: 400, attackRating: 162, defenseRating: 122, mitigation: 88, avoidance: 15,
    attackSpeed: 1.9, damageMin: 30, damageMax: 48, xpReward: 262, goldMin: 18, goldMax: 55,
    lootTable: [
      { itemId: "ring_of_strength", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "fire_opal", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "inquisitors_writ", name: "Inquisitor's Writ", description: "Burns the target with a writ of judgment", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 30, durationTicks: 3, cooldownTicks: 9, damageType: "heat" },
    ],
    resistances: { pierce: 0, slash: 5, crush: 0, heat: 15, cold: -10, divine: -10 },
  },
  {
    id: "bb_gnoll_vanguard",
    name: "Blackburrow Vanguard",
    description: "The forward guard of Narlock's throne — the last line before the Overlord",
    level: 19, zone: "Qeynos Hills",
    hp: 420, maxHp: 420, attackRating: 168, defenseRating: 130, mitigation: 95, avoidance: 13,
    attackSpeed: 1.8, damageMin: 32, damageMax: 50, xpReward: 270, goldMin: 19, goldMax: 58,
    lootTable: [
      { itemId: "bb_gnoll_captain_breastplate", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.5, minQuantity: 3, maxQuantity: 5 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "vanguard_crush", name: "Vanguard Crush", description: "A crushing overhead blow from a great maul", icon: "🔨", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 72, durationTicks: 0, cooldownTicks: 9, damageType: "crush", unavoidable: true },
    ],
    resistances: { pierce: 8, slash: 12, crush: -10, heat: 0, cold: 0, divine: 0 },
  },
  // Additional unique normals to ensure 25 unique normal enemies across 5 floors
  {
    id: "bb_gnoll_ward_priest",
    name: "Blackburrow Ward Priest",
    description: "A gnoll priest who blesses gnoll warriors with protective wards",
    level: 12, zone: "Qeynos Hills",
    hp: 240, maxHp: 240, attackRating: 90, defenseRating: 60, mitigation: 42, avoidance: 13,
    attackSpeed: 2.0, damageMin: 16, damageMax: 28, xpReward: 158, goldMin: 8, goldMax: 24,
    lootTable: [
      { itemId: "silver_pendant", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_gnoll_tooth_necklace", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "protective_ward", name: "Protective Ward", description: "Erects a ward that absorbs incoming strikes", icon: "🛡️", triggerType: "every_n_ticks", triggerValue: 9, effectType: "absorb_shield", effectValue: 55, durationTicks: 2, cooldownTicks: 12 },
    ],
    resistances: { pierce: 5, slash: 0, crush: 0, heat: 5, cold: 5, divine: -15, magic: 10 },
  },
  {
    id: "bb_gnoll_hexblade",
    name: "Blackburrow Hexblade",
    description: "A gnoll who enchants weapons with dark hexes for double threat",
    level: 14, zone: "Qeynos Hills",
    hp: 285, maxHp: 285, attackRating: 115, defenseRating: 72, mitigation: 50, avoidance: 14,
    attackSpeed: 1.8, damageMin: 20, damageMax: 34, xpReward: 186, goldMin: 11, goldMax: 32,
    lootTable: [
      { itemId: "ring_of_strength", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "hex_strike", name: "Hex Strike", description: "A blade imbued with a hex that deals magic + physical damage", icon: "⚡", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 48, durationTicks: 0, cooldownTicks: 7, damageType: "magic" },
    ],
    resistances: { pierce: 0, slash: 5, crush: 0, heat: 0, cold: 5, divine: -10, magic: 10 },
  },
  {
    id: "bb_gnoll_zealot",
    name: "Blackburrow Zealot",
    description: "A religious zealot of gnoll-kind devoted to the ancient gnoll war-gods",
    level: 16, zone: "Qeynos Hills",
    hp: 340, maxHp: 340, attackRating: 132, defenseRating: 95, mitigation: 68, avoidance: 12,
    attackSpeed: 1.9, damageMin: 24, damageMax: 40, xpReward: 218, goldMin: 14, goldMax: 42,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.18, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_gnoll_tooth_necklace", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "divine_fury", name: "Divine Fury", description: "Calls on gnoll war-gods for a devastating holy strike", icon: "✨", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 58, durationTicks: 0, cooldownTicks: 9, damageType: "divine" },
    ],
    resistances: { pierce: 0, slash: 5, crush: 0, heat: 5, cold: 0, divine: -15, magic: 0 },
  },
  {
    id: "bb_gnoll_deathreaver",
    name: "Blackburrow Deathreaver",
    description: "A ruthless gnoll executioner who fights without mercy or restraint",
    level: 18, zone: "Qeynos Hills",
    hp: 390, maxHp: 390, attackRating: 160, defenseRating: 120, mitigation: 88, avoidance: 12,
    attackSpeed: 1.7, damageMin: 30, damageMax: 48, xpReward: 252, goldMin: 18, goldMax: 54,
    lootTable: [
      { itemId: "bb_gnoll_captain_breastplate", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wolf_hide", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "death_rend", name: "Death Rend", description: "A vicious tear that causes massive bleeding", icon: "🩸", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 35, durationTicks: 4, cooldownTicks: 9, damageType: "slash" },
    ],
    resistances: { pierce: -5, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_shadow_blade",
    name: "Blackburrow Shadow Blade",
    description: "A gnoll assassin cloaked in shadow magic — strikes without warning",
    level: 19, zone: "Qeynos Hills",
    hp: 365, maxHp: 365, attackRating: 170, defenseRating: 115, mitigation: 80, avoidance: 20,
    attackSpeed: 1.6, damageMin: 28, damageMax: 46, xpReward: 258, goldMin: 18, goldMax: 52,
    lootTable: [
      { itemId: "bb_gnoll_tusk_dagger", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "cloak_of_shadows", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "shadow_lunge", name: "Shadow Lunge", description: "Lunges from darkness for massive pierce damage", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 78, durationTicks: 0, cooldownTicks: 6, damageType: "pierce" },
      { id: "vanish", name: "Vanish", description: "Vanishes briefly, evading the next strike", icon: "💨", triggerType: "once_at_hp", triggerValue: 40, effectType: "avoidance_buff", effectValue: 30, durationTicks: 2, cooldownTicks: 99 },
    ],
    resistances: { pierce: 10, slash: 0, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "bb_gnoll_throne_guardian",
    name: "Throne Guardian Vargoth",
    description: "A towering gnoll guardian encased in black iron, last defense before Narlock",
    level: 19, zone: "Qeynos Hills",
    hp: 1050, maxHp: 1050, attackRating: 205, defenseRating: 162, mitigation: 124, avoidance: 10,
    attackSpeed: 2.0, damageMin: 38, damageMax: 60, xpReward: 660, goldMin: 48, goldMax: 125,
    lootTable: [
      { itemId: "bb_commander_war_helm", dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_breastplate", dropChance: 0.35, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.9, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "guardian_slam", name: "Guardian Slam", description: "A devastating hammer blow — impossible to dodge", icon: "🔨", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 100, durationTicks: 0, cooldownTicks: 8, damageType: "crush", unavoidable: true },
      { id: "iron_bulwark", name: "Iron Bulwark", description: "Raises an impenetrable bulwark, absorbing massive damage", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 280, durationTicks: 4, cooldownTicks: 99 },
      { id: "throne_oath", name: "Throne Oath", description: "Swears a death oath, healing and doubling damage output", icon: "⚔️", triggerType: "once_at_hp", triggerValue: 25, effectType: "self_heal", effectValue: 180, durationTicks: 0, cooldownTicks: 999 },
    ],
    resistances: { pierce: 12, slash: 16, crush: -10, heat: 0, cold: 0, divine: -5 },
  },
  {
    id: "bb_gnoll_warlord_prime",
    name: "Warlord Prime Skraag",
    description: "Narlock's chosen warlord — a terror with two massive axes",
    level: 19, zone: "Qeynos Hills",
    hp: 1080, maxHp: 1080, attackRating: 218, defenseRating: 168, mitigation: 128, avoidance: 16,
    attackSpeed: 1.7, damageMin: 42, damageMax: 66, xpReward: 680, goldMin: 50, goldMax: 130,
    lootTable: [
      { itemId: "bb_warmaster_blade", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_commander_war_helm", dropChance: 0.4, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_blackburrow_brew", dropChance: 0.9, minQuantity: 2, maxQuantity: 4 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "feral", grudgeThreshold: 3,
    abilities: [
      { id: "axe_whirlwind", name: "Axe Whirlwind", description: "Spins with twin axes in a devastating arc", icon: "🪓", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 105, durationTicks: 0, cooldownTicks: 6, damageType: "slash", unavoidable: false },
      { id: "warlord_cry", name: "Warlord's War Cry", description: "A rallying war cry that amplifies his damage", icon: "📢", triggerType: "once_at_hp", triggerValue: 70, effectType: "frenzy_buff", effectValue: 55, durationTicks: 999, cooldownTicks: 99 },
      { id: "skraag_rage", name: "Skraag's Rage", description: "At near death, fights with suicidal fury", icon: "🔴", triggerType: "once_at_hp", triggerValue: 20, effectType: "frenzy_buff", effectValue: 80, durationTicks: 999, cooldownTicks: 999 },
    ],
    resistances: { pierce: 10, slash: 15, crush: -10, heat: 0, cold: 0, divine: -5 },
  },
  {
    id: "bb_overlord_narlock",
    name: "Overlord Narlock",
    description: "The supreme warlord of Blackburrow — a legend of gnoll-kind",
    level: 20, zone: "Qeynos Hills",
    hp: 3200, maxHp: 3200, attackRating: 385, defenseRating: 295, mitigation: 230, avoidance: 18,
    attackSpeed: 1.9, damageMin: 75, damageMax: 120, xpReward: 2200, goldMin: 150, goldMax: 400,
    lootTable: [
      { itemId: "bb_narlock_seal", dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_warmaster_blade", dropChance: 0.45, minQuantity: 1, maxQuantity: 1 },
      { itemId: "bb_commander_war_helm", dropChance: 0.6, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_strength", dropChance: 0.4, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_blade", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "narlock_overlord_seal", dropChance: 0.75, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_overlord_plate", dropChance: 0.55, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_boss_gnoll", type: "humanoid", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "narlock_warstomp", name: "Warstomp", description: "Narlock stomps with earth-shaking force — unavoidable", icon: "👊", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 150, durationTicks: 0, cooldownTicks: 6, damageType: "crush", unavoidable: true },
      { id: "narlock_fear", name: "Overlord's Gaze", description: "A paralyzing stare that freezes the target in dread", icon: "😱", triggerType: "every_n_ticks", triggerValue: 10, effectType: "fear", effectValue: 2, durationTicks: 2, cooldownTicks: 10, unavoidable: true },
      { id: "narlock_shield", name: "War-Forged Armor", description: "Narlock's legendary armor shrugs off enormous damage", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 75, effectType: "absorb_shield", effectValue: 600, durationTicks: 5, cooldownTicks: 999 },
      { id: "narlock_heal", name: "Warlord's Resilience", description: "Draws on warlord vitality, healing a massive amount", icon: "💊", triggerType: "once_at_hp", triggerValue: 40, effectType: "self_heal", effectValue: 800, durationTicks: 0, cooldownTicks: 999 },
      { id: "narlock_drain", name: "Life Devour", description: "Consumes the target's life essence at 20% HP", icon: "🌀", triggerType: "once_at_hp", triggerValue: 20, effectType: "life_drain", effectValue: 80, durationTicks: 0, cooldownTicks: 999, unavoidable: true },
    ],
    resistances: { pierce: 12, slash: 18, crush: -8, heat: 5, cold: 5, divine: -5 },
  },
  // THUNDERING STEPPES (Levels 10-20)
  {
    id: "steppe_centaur",
    name: "Steppe Centaur",
    description: "A proud centaur warrior of the thundering steppes",
    level: 11, zone: "Thundering Steppes",
    hp: 220, maxHp: 220, attackRating: 85, defenseRating: 58, mitigation: 42, avoidance: 12,
    attackSpeed: 1.8, damageMin: 18, damageMax: 32, xpReward: 150, goldMin: 8, goldMax: 25,
    lootTable: [
      { itemId: "leather_leggings", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "wolf_hide", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
      { itemId: "iron_ore", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "centaur_hoof_chip", dropChance: 0.15, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_journeyman_feather_quill_amulet", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_centaur", type: "humanoid", isBoss: false,
    abilities: [
      { id: "stampede", name: "Stampede", description: "Charges with tremendous force", icon: "🐴", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 40, durationTicks: 0, cooldownTicks: 8, damageType: "crush", unavoidable: false },
      { id: "hoof_strike", name: "Hoof Strike", description: "A powerful rear kick that stuns", icon: "💥", triggerType: "on_hit_proc", triggerValue: 15, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 8 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -10, heat: 0, cold: 5, divine: 0 },
  },
  {
    id: "sand_giant",
    name: "Sand Giant",
    description: "A massive giant that roams the open plains",
    level: 14, zone: "Thundering Steppes",
    hp: 380, maxHp: 380, attackRating: 115, defenseRating: 90, mitigation: 68, avoidance: 5,
    attackSpeed: 2.5, damageMin: 28, damageMax: 48, xpReward: 220, goldMin: 15, goldMax: 40,
    lootTable: [
      { itemId: "iron_greaves", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_gauntlets", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.6, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "boulder_throw", name: "Boulder Throw", description: "Hurls a massive boulder — unavoidable", icon: "🪨", triggerType: "every_n_ticks", triggerValue: 12, effectType: "damage_burst", effectValue: 75, durationTicks: 0, cooldownTicks: 12, damageType: "crush", unavoidable: true },
      { id: "tremor", name: "Tremor", description: "Stomps the ground, stunning nearby foes", icon: "🌍", triggerType: "every_n_ticks", triggerValue: 18, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 18 },
    ],
    resistances: { pierce: 5, slash: 5, crush: -15, heat: 0, cold: 10, divine: 0 },
  },
  {
    id: "harpy_queen",
    name: "Harpy Screamer",
    description: "A terrifying harpy whose screech can shatter bones",
    level: 16, zone: "Thundering Steppes",
    hp: 290, maxHp: 290, attackRating: 128, defenseRating: 72, mitigation: 50, avoidance: 20,
    attackSpeed: 1.5, damageMin: 22, damageMax: 38, xpReward: 195, goldMin: 12, goldMax: 35,
    lootTable: [
      { itemId: "silver_pendant", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.45, minQuantity: 1, maxQuantity: 3 },
      { itemId: "wolf_hide", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "harpy_feather", dropChance: 0.2, minQuantity: 1, maxQuantity: 3 },
      { itemId: "scroll_journeyman_feather_quill_amulet", dropChance: 0.04, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_harpy", type: "beast", isBoss: false,
    abilities: [
      { id: "sonic_shriek", name: "Sonic Shriek", description: "An ear-splitting screech that stuns", icon: "🔊", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 8, unavoidable: true },
      { id: "dive_bomb", name: "Dive Bomb", description: "Swoops down for a devastating strike", icon: "🦅", triggerType: "on_hit_proc", triggerValue: 20, effectType: "damage_burst", effectValue: 50, durationTicks: 0, cooldownTicks: 6, damageType: "pierce" },
    ],
    resistances: { pierce: -10, slash: 0, crush: 0, heat: 5, cold: 5, divine: 0 },
  },
  {
    id: "steppes_boss",
    name: "Varsoon the Undying",
    description: "An ancient lich who refuses to stay dead",
    level: 20, zone: "Thundering Steppes",
    hp: 1200, maxHp: 1200, attackRating: 280, defenseRating: 200, mitigation: 160, avoidance: 15,
    attackSpeed: 1.8, damageMin: 55, damageMax: 85, xpReward: 1000, goldMin: 80, goldMax: 200,
    lootTable: [
      { itemId: "mithril_blade", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "steel_platemail", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "necklace_of_the_deep", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "varsoon_lich_crystal", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "varsoon_lich_essence", dropChance: 0.7, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_lich_focus", dropChance: 0.55, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: true, personality: "ancient", grudgeThreshold: 3,
    abilities: [
      { id: "life_sap", name: "Life Sap", description: "Drains life essence each turn", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 4, effectType: "life_drain", effectValue: 30, durationTicks: 0, cooldownTicks: 4, unavoidable: true, damageType: "divine" },
      { id: "bone_armor", name: "Bone Armor", description: "Encases himself in bone shards, absorbing damage", icon: "🦴", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 400, durationTicks: 6, cooldownTicks: 99 },
      { id: "undying_wrath", name: "Undying Wrath", description: "Rises from death once with fury", icon: "☠️", triggerType: "once_at_hp", triggerValue: 1, effectType: "self_heal", effectValue: 600, durationTicks: 0, cooldownTicks: 999 },
    ],
    resistances: { pierce: 10, slash: 15, crush: -10, heat: 0, cold: 35, divine: -25 },
  },
  // NEKTULOS FOREST (Levels 20-30)
  {
    id: "dark_elf_assassin",
    name: "Teir'Dal Assassin",
    description: "A deadly dark elf from the Teir'Dal tribe",
    level: 21, zone: "Nektulos Forest",
    hp: 450, maxHp: 450, attackRating: 210, defenseRating: 145, mitigation: 105, avoidance: 25,
    attackSpeed: 1.4, damageMin: 38, damageMax: 62, xpReward: 280, goldMin: 20, goldMax: 55,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "ring_of_power", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
      { itemId: "dark_elf_shadow_dust", dropChance: 0.18, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dark_elf", type: "humanoid", isBoss: false,
    abilities: [
      { id: "backstab", name: "Backstab", description: "Strikes from shadows for massive pierce damage", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 90, durationTicks: 0, cooldownTicks: 5, damageType: "pierce" },
      { id: "shadow_meld", name: "Shadow Meld", description: "Fades into shadow, becoming harder to hit", icon: "🌫️", triggerType: "once_at_hp", triggerValue: 60, effectType: "avoidance_buff", effectValue: 25, durationTicks: 4, cooldownTicks: 30 },
    ],
    resistances: { pierce: 10, slash: 5, crush: 0, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "forest_treant",
    name: "Ancient Treant",
    description: "An ancient tree awakened to defend the forest",
    level: 25, zone: "Nektulos Forest",
    hp: 780, maxHp: 780, attackRating: 240, defenseRating: 195, mitigation: 155, avoidance: 5,
    attackSpeed: 2.8, damageMin: 55, damageMax: 88, xpReward: 380, goldMin: 25, goldMax: 70,
    lootTable: [
      { itemId: "steel_legplates", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "fire_opal", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
      { itemId: "treant_heartwood_chip", dropChance: 0.18, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_treant", type: "elemental", isBoss: false,
    abilities: [
      { id: "entangle", name: "Entangle", description: "Roots slither up, slowing the target", icon: "🌿", triggerType: "every_n_ticks", triggerValue: 8, effectType: "slow", effectValue: 20, durationTicks: 3, cooldownTicks: 10 },
      { id: "natures_wrath", name: "Nature's Wrath", description: "Channels the forest's fury in a devastating strike", icon: "🌳", triggerType: "every_n_ticks", triggerValue: 15, effectType: "damage_burst", effectValue: 120, durationTicks: 0, cooldownTicks: 15, damageType: "magic", unavoidable: true },
    ],
    resistances: { pierce: 20, slash: -5, crush: 0, heat: -15, cold: 10, divine: 0, magic: 10 },
  },
  // EVERFROST PEAKS (Levels 30-40)
  {
    id: "frost_giant",
    name: "Frost Giant",
    description: "A colossal giant born from the eternal ice",
    level: 32, zone: "Everfrost Peaks",
    hp: 1400, maxHp: 1400, attackRating: 420, defenseRating: 320, mitigation: 250, avoidance: 5,
    attackSpeed: 2.5, damageMin: 90, damageMax: 145, xpReward: 650, goldMin: 45, goldMax: 120,
    lootTable: [
      { itemId: "steel_pauldrons", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "cloak_of_shadows", dropChance: 0.05, minQuantity: 1, maxQuantity: 1 },
      { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "frost_giant_knuckle", dropChance: 0.18, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_frost_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "frostbite", name: "Frostbite", description: "A biting cold wound that deals ongoing cold damage", icon: "❄️", triggerType: "on_hit_proc", triggerValue: 20, effectType: "bleed_dot", effectValue: 18, durationTicks: 4, cooldownTicks: 8, damageType: "cold" },
      { id: "ice_stomp", name: "Ice Stomp", description: "Slams the frozen earth, sending shockwaves", icon: "🦶", triggerType: "every_n_ticks", triggerValue: 12, effectType: "damage_burst", effectValue: 130, durationTicks: 0, cooldownTicks: 12, damageType: "crush", unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 5, crush: -10, heat: -15, cold: 40, divine: 0 },
  },
  {
    id: "ice_dragon_hatchling",
    name: "Ice Drake",
    description: "A young ice dragon, still terrifying despite its youth",
    level: 38, zone: "Everfrost Peaks",
    hp: 2800, maxHp: 2800, attackRating: 680, defenseRating: 520, mitigation: 410, avoidance: 12,
    attackSpeed: 2.2, damageMin: 145, damageMax: 220, xpReward: 1400, goldMin: 100, goldMax: 280,
    lootTable: [
      { itemId: "darkblade", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "helm_of_the_guardian", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_ore", dropChance: 0.7, minQuantity: 2, maxQuantity: 5 },
    ],
    spriteId: "enemy_dragon", type: "dragon", isBoss: false,
    abilities: [
      { id: "dragon_breath_cold", name: "Dragon Breath", description: "A cone of freezing cold — impossible to dodge", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 7, damageType: "cold", unavoidable: true },
      { id: "ice_armor", name: "Ice Armor", description: "Crystalline ice forms over scales, absorbing damage", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 70, effectType: "absorb_shield", effectValue: 800, durationTicks: 8, cooldownTicks: 99 },
    ],
    resistances: { pierce: 20, slash: 10, crush: 0, heat: -20, cold: 50, divine: 0, magic: 15 },
  },
  // LAVASTORM MOUNTAINS (Levels 40-50+)
  {
    id: "lava_elemental",
    name: "Lava Elemental",
    description: "A being of pure molten rock and fire",
    level: 42, zone: "Lavastorm Mountains",
    hp: 3500, maxHp: 3500, attackRating: 820, defenseRating: 640, mitigation: 500, avoidance: 8,
    attackSpeed: 2.0, damageMin: 175, damageMax: 265, xpReward: 1800, goldMin: 120, goldMax: 350,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.8, minQuantity: 1, maxQuantity: 4 },
      { itemId: "breastplate_of_valor", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "magma_burst", name: "Magma Burst", description: "Erupts in a burst of superheated magma — inescapable", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 240, durationTicks: 0, cooldownTicks: 7, damageType: "heat", unavoidable: true },
      { id: "fire_shield", name: "Fire Shield", description: "Flames encase the elemental, reflecting strikes", icon: "🔥", triggerType: "once_at_hp", triggerValue: 100, effectType: "absorb_shield", effectValue: 300, durationTicks: 999, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 15, crush: 10, heat: 50, cold: -20, divine: 0, magic: 10 },
  },
  {
    id: "nagafen",
    name: "Lord Nagafen",
    description: "The ancient dragon lord of Solusek's Eye — a legendary boss",
    level: 50, zone: "Lavastorm Mountains",
    hp: 15000, maxHp: 15000, attackRating: 2200, defenseRating: 1800, mitigation: 1400, avoidance: 15,
    attackSpeed: 2.0, damageMin: 420, damageMax: 680, xpReward: 8000, goldMin: 500, goldMax: 1500,
    lootTable: [
      { itemId: "nagafen_inferno_scale", dropChance: 0.18, minQuantity: 1, maxQuantity: 1 },
      { itemId: "fabled_greatsword", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "chestguard_of_the_fallen", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "gauntlets_of_might", dropChance: 0.18, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_the_ancients", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_mythic_worldbreaker", dropChance: 0.04, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_mythic_void_mantle", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_shadowsteel", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "nagafen_fire_scale", dropChance: 0.8, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_nagafen", type: "dragon", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "nagafen_breath", name: "Dragon Breath", description: "A torrent of dragonfire scorches everything — utterly unavoidable", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 500, durationTicks: 0, cooldownTicks: 6, damageType: "heat", unavoidable: true },
      { id: "nagafen_fear", name: "Fear", description: "Paralyzing dread causes the target to cower, missing attacks", icon: "😱", triggerType: "every_n_ticks", triggerValue: 8, effectType: "fear", effectValue: 2, durationTicks: 2, cooldownTicks: 8, unavoidable: true },
      { id: "ancient_scales", name: "Ancient Scales", description: "His impenetrable scales harden at half health", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 3000, durationTicks: 6, cooldownTicks: 999 },
      { id: "rebuke", name: "Rebuke", description: "An earth-shattering counterattack at 75% health", icon: "⚡", triggerType: "once_at_hp", triggerValue: 75, effectType: "damage_burst", effectValue: 800, durationTicks: 0, cooldownTicks: 999, damageType: "heat", unavoidable: true },
      { id: "nagafen_frenzy", name: "Lord's Frenzy", description: "Below 25% health Nagafen erupts in a volcanic rage — attack speed doubles", icon: "💢", triggerType: "once_at_hp", triggerValue: 25, effectType: "damage_burst", effectValue: 1400, durationTicks: 0, cooldownTicks: 999, damageType: "heat", unavoidable: true },
    ],
    resistances: { pierce: 30, slash: 20, crush: 10, heat: 100, cold: -15, divine: 20, magic: 20 },
  },

  // ── ANTONICA (Levels 5-15) ───────────────────────────────────────────────
  {
    id: "antonica_gnoll_scout",
    name: "Gnoll Scout",
    description: "A wiry gnoll ranger prowling the Antonica plains",
    level: 5, zone: "Antonica",
    hp: 85, maxHp: 85, attackRating: 42, defenseRating: 28, mitigation: 18, avoidance: 14,
    attackSpeed: 1.6, damageMin: 7, damageMax: 13, xpReward: 55, goldMin: 2, goldMax: 8,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.45, minQuantity: 1, maxQuantity: 2 },
      { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "gnoll_bite", name: "Gnoll Bite", description: "A vicious bite that opens a wound", icon: "🦷", triggerType: "on_hit_proc", triggerValue: 18, effectType: "bleed_dot", effectValue: 5, durationTicks: 3, cooldownTicks: 6, damageType: "pierce" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "antonica_wolf",
    name: "Antonica Prowler",
    description: "A large grey wolf hunting across Antonica's open plains",
    level: 6, zone: "Antonica",
    hp: 95, maxHp: 95, attackRating: 50, defenseRating: 30, mitigation: 15, avoidance: 18,
    attackSpeed: 1.4, damageMin: 8, damageMax: 15, xpReward: 60, goldMin: 1, goldMax: 6,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.7, minQuantity: 1, maxQuantity: 3 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    { itemId: "antonica_bone_fragment", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "wolf_pounce", name: "Pounce", description: "Leaps at the target with savage force", icon: "🐺", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 22, durationTicks: 0, cooldownTicks: 10, damageType: "crush" },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 0, cold: 5, divine: 0 },
  },
  {
    id: "antonica_skeleton",
    name: "Risen Skeleton",
    description: "An undead skeleton reanimated by dark magic seeping from Blackburrow",
    level: 8, zone: "Antonica",
    hp: 120, maxHp: 120, attackRating: 62, defenseRating: 45, mitigation: 28, avoidance: 8,
    attackSpeed: 1.8, damageMin: 10, damageMax: 18, xpReward: 75, goldMin: 3, goldMax: 10,
    lootTable: [
      { itemId: "iron_ore", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "coal", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "bone_rattle", name: "Bone Rattle", description: "Clatters bones to unnerve the foe", icon: "💀", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 12, unavoidable: false },
    ],
    resistances: { pierce: 15, slash: -5, crush: -10, heat: 0, cold: 20, divine: -20 },
  },
  {
    id: "antonica_gnoll_warrior",
    name: "Gnoll Warrior",
    description: "A heavily armed gnoll fighter guarding Antonica territory",
    level: 10, zone: "Antonica",
    hp: 165, maxHp: 165, attackRating: 78, defenseRating: 55, mitigation: 40, avoidance: 10,
    attackSpeed: 1.9, damageMin: 14, damageMax: 24, xpReward: 105, goldMin: 5, goldMax: 15,
    lootTable: [
      { itemId: "leather_leggings", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_ore", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "gnoll_charge", name: "Feral Charge", description: "Rushes forward with a brutal tackle", icon: "💥", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 35, durationTicks: 0, cooldownTicks: 9, damageType: "crush" },
      { id: "gnoll_snarl", name: "Fearsome Snarl", description: "An intimidating snarl that disorients", icon: "😤", triggerType: "once_at_hp", triggerValue: 50, effectType: "fear", effectValue: 1, durationTicks: 1, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 5, crush: -8, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "antonica_orc_raider",
    name: "Darkpaw Raider",
    description: "An orc raider from the Darkpaw clan pillaging Antonica farms",
    level: 12, zone: "Antonica",
    hp: 210, maxHp: 210, attackRating: 95, defenseRating: 68, mitigation: 50, avoidance: 8,
    attackSpeed: 2.0, damageMin: 17, damageMax: 29, xpReward: 135, goldMin: 8, goldMax: 20,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "leather_cap", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_orc", type: "humanoid", isBoss: false,
    abilities: [
      { id: "orc_cleave", name: "Cleave", description: "A wide swing that crushes defenses", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 45, durationTicks: 0, cooldownTicks: 7, damageType: "slash" },
    ],
    resistances: { pierce: 0, slash: -5, crush: 5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "antonica_gnoll_shaman",
    name: "Gnoll Hex-Shaman",
    description: "A gnoll magic-user cursing adventurers with dark hexes",
    level: 13, zone: "Antonica",
    hp: 190, maxHp: 190, attackRating: 88, defenseRating: 52, mitigation: 35, avoidance: 12,
    attackSpeed: 2.2, damageMin: 15, damageMax: 26, xpReward: 140, goldMin: 7, goldMax: 18,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: "rough_amulet", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "antonica_gnoll_pelt", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll_shaman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "dark_hex_bolt", name: "Hex Bolt", description: "Fires a crackling bolt of dark magic", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 40, durationTicks: 0, cooldownTicks: 6, damageType: "magic" },
      { id: "curse_of_weakness", name: "Curse of Weakness", description: "A lingering curse that drains vitality", icon: "🩸", triggerType: "once_at_hp", triggerValue: 70, effectType: "bleed_dot", effectValue: 8, durationTicks: 4, cooldownTicks: 40, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 5, cold: 5, divine: -10, magic: 15 },
  },
  {
    id: "antonica_gnoll_chieftain",
    name: "Gnoll Chieftain Grolnak",
    description: "The fearsome chieftain of the Antonica gnoll clan — a rare mini-boss encounter",
    level: 15, zone: "Antonica",
    hp: 480, maxHp: 480, attackRating: 160, defenseRating: 120, mitigation: 90, avoidance: 12,
    attackSpeed: 1.8, damageMin: 28, damageMax: 45, xpReward: 380, goldMin: 25, goldMax: 65,
    lootTable: [
      { itemId: "iron_breastplate", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_strength", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "antonica_gnoll_claw", dropChance: 0.6, minQuantity: 1, maxQuantity: 2 },
      { itemId: "scroll_expert_shadowsteel", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll_boss", type: "humanoid", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "chieftain_roar", name: "Warchief Roar", description: "A terrifying battle roar that stuns", icon: "😱", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 8, unavoidable: true },
      { id: "chieftain_strike", name: "Warchief Strike", description: "A brutal overhead smash", icon: "🔨", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 80, durationTicks: 0, cooldownTicks: 5, damageType: "crush" },
      { id: "chieftain_shield", name: "Clan Ward", description: "Ancient tribal magic shields him at 50% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 200, durationTicks: 4, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: 8, crush: -10, heat: 0, cold: 0, divine: -5 },
  },

  // ── ENCHANTED LANDS (Levels 25-35) ──────────────────────────────────────
  {
    id: "enchanted_pixie",
    name: "Mischievous Pixie",
    description: "A tiny winged fae whose tricks can be deadly",
    level: 26, zone: "Enchanted Lands",
    hp: 520, maxHp: 520, attackRating: 225, defenseRating: 155, mitigation: 110, avoidance: 30,
    attackSpeed: 1.3, damageMin: 40, damageMax: 65, xpReward: 300, goldMin: 18, goldMax: 50,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.5, minQuantity: 1, maxQuantity: 3 },
      { itemId: "enchanted_dust", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    { itemId: "enchanted_pixie_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_pixie", type: "elemental", isBoss: false,
    abilities: [
      { id: "pixie_dust", name: "Pixie Dust", description: "Shimmering dust confuses and disorients", icon: "✨", triggerType: "every_n_ticks", triggerValue: 6, effectType: "fear", effectValue: 1, durationTicks: 1, cooldownTicks: 10 },
      { id: "fae_bolt", name: "Fae Bolt", description: "A sparkling bolt of raw fae energy", icon: "⚡", triggerType: "every_n_ticks", triggerValue: 4, effectType: "damage_burst", effectValue: 75, durationTicks: 0, cooldownTicks: 4, damageType: "magic" },
    ],
    resistances: { pierce: -10, slash: -5, crush: 0, heat: 0, cold: 0, divine: 10, magic: 25 },
  },
  {
    id: "enchanted_brownie",
    name: "Enraged Brownie",
    description: "A small but ferocious brownie defending the Enchanted Lands",
    level: 28, zone: "Enchanted Lands",
    hp: 640, maxHp: 640, attackRating: 260, defenseRating: 180, mitigation: 130, avoidance: 22,
    attackSpeed: 1.5, damageMin: 48, damageMax: 76, xpReward: 360, goldMin: 22, goldMax: 60,
    lootTable: [
      { itemId: "enchanted_dust", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: "iron_bar", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "enchanted_pixie_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_brownie", type: "humanoid", isBoss: false,
    abilities: [
      { id: "brownie_pummel", name: "Wild Pummel", description: "A flurry of tiny but rapid strikes", icon: "👊", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 90, durationTicks: 0, cooldownTicks: 5, damageType: "crush" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 0, cold: 0, divine: 5, magic: 20 },
  },
  {
    id: "enchanted_satyr",
    name: "Enchanted Satyr",
    description: "A satyr whose enchanted pipes can put adventurers to sleep",
    level: 30, zone: "Enchanted Lands",
    hp: 780, maxHp: 780, attackRating: 300, defenseRating: 210, mitigation: 150, avoidance: 18,
    attackSpeed: 1.8, damageMin: 58, damageMax: 92, xpReward: 420, goldMin: 28, goldMax: 75,
    lootTable: [
      { itemId: "silver_pendant", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "enchanted_dust", dropChance: 0.5, minQuantity: 1, maxQuantity: 3 },
    { itemId: "enchanted_pixie_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_satyr", type: "humanoid", isBoss: false,
    abilities: [
      { id: "satyr_pipes", name: "Enchanted Pipes", description: "Hypnotic music stuns the listener", icon: "🎵", triggerType: "every_n_ticks", triggerValue: 9, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
      { id: "satyr_kick", name: "Goat Kick", description: "A powerful backward hoof kick", icon: "🦶", triggerType: "on_hit_proc", triggerValue: 20, effectType: "damage_burst", effectValue: 100, durationTicks: 0, cooldownTicks: 8, damageType: "crush" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -8, heat: 0, cold: 0, divine: 5, magic: 18 },
  },
  {
    id: "enchanted_dryad",
    name: "Corrupted Dryad",
    description: "A forest spirit twisted by dark magic into a fearsome predator",
    level: 32, zone: "Enchanted Lands",
    hp: 920, maxHp: 920, attackRating: 340, defenseRating: 240, mitigation: 175, avoidance: 15,
    attackSpeed: 2.0, damageMin: 68, damageMax: 105, xpReward: 480, goldMin: 32, goldMax: 88,
    lootTable: [
      { itemId: "enchanted_dust", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: "mithril_ore", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    { itemId: "enchanted_pixie_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_treant", type: "elemental", isBoss: false,
    abilities: [
      { id: "dryad_thorns", name: "Thorn Barrage", description: "Launches razor thorns that pierce armor", icon: "🌿", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 22, durationTicks: 4, cooldownTicks: 10, damageType: "pierce" },
      { id: "dryad_rejuv", name: "Nature's Embrace", description: "Channels nature energy to restore health", icon: "💚", triggerType: "once_at_hp", triggerValue: 55, effectType: "self_heal", effectValue: 300, durationTicks: 0, cooldownTicks: 99 },
    ],
    resistances: { pierce: 10, slash: -10, crush: 0, heat: -20, cold: 10, divine: 0, magic: 5 },
  },
  {
    id: "enchanted_sylph",
    name: "Wind Sylph",
    description: "An air elemental of the Enchanted Lands, swift and elusive",
    level: 34, zone: "Enchanted Lands",
    hp: 860, maxHp: 860, attackRating: 370, defenseRating: 220, mitigation: 145, avoidance: 35,
    attackSpeed: 1.2, damageMin: 72, damageMax: 115, xpReward: 510, goldMin: 35, goldMax: 95,
    lootTable: [
      { itemId: "enchanted_dust", dropChance: 0.5, minQuantity: 2, maxQuantity: 3 },
      { itemId: "cloak_of_shadows", dropChance: 0.05, minQuantity: 1, maxQuantity: 1 },
    { itemId: "enchanted_pixie_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "gale_force", name: "Gale Force", description: "Blasts with howling winds — utterly unavoidable", icon: "🌪️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 120, durationTicks: 0, cooldownTicks: 8, damageType: "magic", unavoidable: true },
      { id: "wind_veil", name: "Wind Veil", description: "Wraps in a shield of deflecting air", icon: "💨", triggerType: "once_at_hp", triggerValue: 80, effectType: "absorb_shield", effectValue: 350, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: -5, slash: 5, crush: 10, heat: 0, cold: 5, divine: 0, magic: 30 },
  },
  {
    id: "enchanted_queen_titania",
    name: "Queen Titania",
    description: "The malevolent fae queen who rules the corrupted Enchanted Lands",
    level: 35, zone: "Enchanted Lands",
    hp: 2800, maxHp: 2800, attackRating: 620, defenseRating: 480, mitigation: 360, avoidance: 20,
    attackSpeed: 1.5, damageMin: 120, damageMax: 185, xpReward: 1600, goldMin: 120, goldMax: 320,
    lootTable: [
      { itemId: "enchanted_dust", dropChance: 0.9, minQuantity: 3, maxQuantity: 6 },
      { itemId: "ring_of_power", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "titania_crown_shard", dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_arcane_ring", dropChance: 0.10, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_fae_queen", type: "elemental", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "royal_hex", name: "Royal Hex", description: "A powerful curse draining life over time", icon: "👑", triggerType: "every_n_ticks", triggerValue: 5, effectType: "life_drain", effectValue: 45, durationTicks: 0, cooldownTicks: 5, unavoidable: true, damageType: "divine" },
      { id: "fae_storm", name: "Fae Storm", description: "Conjures a tempest of raw magical energy", icon: "🌩️", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 250, durationTicks: 0, cooldownTicks: 10, damageType: "magic", unavoidable: true },
      { id: "titania_shell", name: "Arcane Carapace", description: "An impenetrable shell of fae magic", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 900, durationTicks: 6, cooldownTicks: 99 },
      { id: "titania_charm", name: "Beguile", description: "Charms the target, causing them to skip attacks", icon: "💜", triggerType: "every_n_ticks", triggerValue: 14, effectType: "fear", effectValue: 3, durationTicks: 3, cooldownTicks: 20, unavoidable: true },
    ],
    resistances: { pierce: 10, slash: 5, crush: 0, heat: 0, cold: 5, divine: -15, magic: 35 },
  },

  // ── ZEK, THE ORCISH WASTES (Levels 30-40) ───────────────────────────────
  {
    id: "zek_orc_grunt",
    name: "Zek Orc Grunt",
    description: "A battle-hardened orc grunt of the Deathfist clan",
    level: 31, zone: "Zek, the Orcish Wastes",
    hp: 840, maxHp: 840, attackRating: 310, defenseRating: 220, mitigation: 165, avoidance: 8,
    attackSpeed: 2.0, damageMin: 60, damageMax: 95, xpReward: 430, goldMin: 28, goldMax: 75,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
      { itemId: "steel_legplates", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "zek_orc_skull", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_orc", type: "humanoid", isBoss: false,
    abilities: [
      { id: "orc_smash", name: "Orc Smash", description: "A bone-crushing overhead blow", icon: "🔨", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 110, durationTicks: 0, cooldownTicks: 7, damageType: "crush" },
    ],
    resistances: { pierce: 0, slash: -8, crush: 8, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "zek_orc_shaman",
    name: "Deathfist Shaman",
    description: "A savage orc shaman wielding dark earth magic",
    level: 33, zone: "Zek, the Orcish Wastes",
    hp: 960, maxHp: 960, attackRating: 340, defenseRating: 230, mitigation: 168, avoidance: 10,
    attackSpeed: 2.2, damageMin: 65, damageMax: 102, xpReward: 490, goldMin: 32, goldMax: 85,
    lootTable: [
      { itemId: "zek_war_rune", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "fire_opal", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "zek_orc_skull", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_orc_shaman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "earthen_bolt", name: "Earthen Bolt", description: "Hurls a boulder of compressed earth", icon: "🪨", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 130, durationTicks: 0, cooldownTicks: 6, damageType: "crush", unavoidable: true },
      { id: "bloodlust_hex", name: "Bloodlust Hex", description: "Curses the target with bleeding wounds", icon: "🩸", triggerType: "every_n_ticks", triggerValue: 12, effectType: "bleed_dot", effectValue: 28, durationTicks: 4, cooldownTicks: 15 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 5, cold: 0, divine: -8, magic: 12 },
  },
  {
    id: "zek_orc_berserker",
    name: "Deathfist Berserker",
    description: "A frenzied orc warrior consumed by battle madness",
    level: 35, zone: "Zek, the Orcish Wastes",
    hp: 1150, maxHp: 1150, attackRating: 400, defenseRating: 260, mitigation: 185, avoidance: 6,
    attackSpeed: 1.6, damageMin: 78, damageMax: 122, xpReward: 560, goldMin: 38, goldMax: 100,
    lootTable: [
      { itemId: "steel_pauldrons", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "zek_war_rune", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "zek_orc_skull", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_orc", type: "humanoid", isBoss: false,
    abilities: [
      { id: "berserker_frenzy", name: "Berserk Frenzy", description: "A flurry of frenzied strikes", icon: "😡", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 150, durationTicks: 0, cooldownTicks: 5, damageType: "slash" },
      { id: "orc_warcry", name: "Warcry", description: "A bloodcurdling cry that inspires savage strikes", icon: "🗣️", triggerType: "once_at_hp", triggerValue: 40, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 99, damageType: "crush", unavoidable: true },
    ],
    resistances: { pierce: 0, slash: -10, crush: 5, heat: 5, cold: 0, divine: 0 },
  },
  {
    id: "zek_orc_warlord",
    name: "Deathfist Warlord",
    description: "A powerful orc warlord commanding Zek's elite forces",
    level: 37, zone: "Zek, the Orcish Wastes",
    hp: 1450, maxHp: 1450, attackRating: 460, defenseRating: 320, mitigation: 240, avoidance: 10,
    attackSpeed: 1.9, damageMin: 95, damageMax: 148, xpReward: 680, goldMin: 50, goldMax: 130,
    lootTable: [
      { itemId: "steel_platemail", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "zek_war_rune", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
    { itemId: "zek_orc_skull", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_orc_boss", type: "humanoid", isBoss: false,
    abilities: [
      { id: "warlord_slam", name: "Warlord Slam", description: "A devastating two-handed slam", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 8, damageType: "crush", unavoidable: true },
      { id: "warlord_fortify", name: "Iron Skin", description: "Hardens skin into iron at 60% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 500, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: -5, crush: 10, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "zek_deathcaller",
    name: "Deathfist Deathcaller",
    description: "The supreme orc war-priest of Zek, channeling the power of death itself",
    level: 40, zone: "Zek, the Orcish Wastes",
    hp: 3800, maxHp: 3800, attackRating: 680, defenseRating: 520, mitigation: 400, avoidance: 12,
    attackSpeed: 2.0, damageMin: 145, damageMax: 225, xpReward: 2000, goldMin: 150, goldMax: 400,
    lootTable: [
      { itemId: "zek_war_rune", dropChance: 0.8, minQuantity: 3, maxQuantity: 6 },
      { itemId: "helm_of_the_guardian", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "deathfist_seal", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_orc_boss", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "death_call", name: "Death Call", description: "Summons death energies — unavoidable", icon: "💀", triggerType: "every_n_ticks", triggerValue: 6, effectType: "life_drain", effectValue: 60, durationTicks: 0, cooldownTicks: 6, unavoidable: true, damageType: "divine" },
      { id: "orc_warcry_mass", name: "Mass Warcry", description: "A thunderous roar that stuns", icon: "😱", triggerType: "every_n_ticks", triggerValue: 11, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 11, unavoidable: true },
      { id: "death_ward", name: "Death Ward", description: "Shrouds himself in death energy at 50% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 1200, durationTicks: 6, cooldownTicks: 99 },
      { id: "death_explosion", name: "Explosion of Death", description: "Unleashes stored death energy", icon: "💥", triggerType: "once_at_hp", triggerValue: 25, effectType: "damage_burst", effectValue: 600, durationTicks: 0, cooldownTicks: 99, damageType: "divine", unavoidable: true },
    ],
    resistances: { pierce: 10, slash: 5, crush: 0, heat: 0, cold: 15, divine: 20, magic: 10 },
  },

  // Zek additional enemies (brings total to 7)
  {
    id: "zek_war_shaman",
    name: "Zek War Shaman",
    description: "A battle-hardened orc shaman who blesses Zek warriors with unholy power",
    level: 32, zone: "Zek, the Orcish Wastes",
    hp: 780, maxHp: 780, attackRating: 265, defenseRating: 185, mitigation: 140, avoidance: 10,
    attackSpeed: 2.0, damageMin: 55, damageMax: 88, xpReward: 380, goldMin: 25, goldMax: 65,
    lootTable: [
      { itemId: "zek_orc_skull", dropChance: 0.55, minQuantity: 1, maxQuantity: 2 },
      { itemId: "zek_war_rune", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "zek_orcish_badge", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_orc", type: "humanoid", isBoss: false,
    abilities: [
      { id: "war_hex", name: "War Hex", description: "Curses the enemy, reducing their defenses", icon: "💀", triggerType: "every_n_ticks", triggerValue: 9, effectType: "bleed_dot", effectValue: 25, durationTicks: 4, cooldownTicks: 9, damageType: "divine" },
    ],
    resistances: { pierce: 5, slash: 0, crush: 5, heat: 0, cold: 0, divine: 15 },
  },
  {
    id: "zek_siege_engineer",
    name: "Deathfist Siege Engineer",
    description: "An orc engineer who builds and operates war machines in Zek's endless war",
    level: 35, zone: "Zek, the Orcish Wastes",
    hp: 1050, maxHp: 1050, attackRating: 340, defenseRating: 240, mitigation: 185, avoidance: 8,
    attackSpeed: 2.2, damageMin: 70, damageMax: 115, xpReward: 530, goldMin: 35, goldMax: 90,
    lootTable: [
      { itemId: "iron_ore", dropChance: 0.55, minQuantity: 2, maxQuantity: 4 },
      { itemId: "zek_orc_skull", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "zek_orcish_badge", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_orc", type: "humanoid", isBoss: false,
    abilities: [
      { id: "siege_boulder_throw", name: "Boulder Throw", description: "Hurls a massive boulder — crushing impact", icon: "🪨", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 130, durationTicks: 0, cooldownTicks: 8, damageType: "crush", unavoidable: true },
    ],
    resistances: { pierce: 8, slash: 5, crush: -5, heat: 5, cold: -5, divine: 0 },
  },

  // ── LESSER FAYDARK (Levels 30-40) ────────────────────────────────────────
  {
    id: "faydark_treant",
    name: "Faydark Treant",
    description: "An ancient treant guardian of the Lesser Faydark",
    level: 31, zone: "Lesser Faydark",
    hp: 1100, maxHp: 1100, attackRating: 320, defenseRating: 250, mitigation: 200, avoidance: 5,
    attackSpeed: 2.8, damageMin: 65, damageMax: 105, xpReward: 460, goldMin: 30, goldMax: 80,
    lootTable: [
      { itemId: "faydark_wood", dropChance: 0.7, minQuantity: 1, maxQuantity: 3 },
      { itemId: "fire_opal", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    { itemId: "faydark_sprite_wing", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_treant", type: "elemental", isBoss: false,
    abilities: [
      { id: "treant_stomp", name: "Ancient Stomp", description: "The treant's massive foot shakes the earth", icon: "🌳", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 140, durationTicks: 0, cooldownTicks: 9, damageType: "crush", unavoidable: true },
      { id: "bark_skin", name: "Barkskin", description: "Bark hardens at 70% health", icon: "🌿", triggerType: "once_at_hp", triggerValue: 70, effectType: "absorb_shield", effectValue: 400, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 20, slash: -5, crush: 0, heat: -20, cold: 10, divine: 0, magic: 8 },
  },
  {
    id: "faydark_imp",
    name: "Faydark Imp",
    description: "A mischievous imp conjured by the forest's dark energies",
    level: 33, zone: "Lesser Faydark",
    hp: 880, maxHp: 880, attackRating: 360, defenseRating: 220, mitigation: 150, avoidance: 25,
    attackSpeed: 1.4, damageMin: 70, damageMax: 110, xpReward: 500, goldMin: 35, goldMax: 90,
    lootTable: [
      { itemId: "faydark_wood", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
      { itemId: "coal", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "faydark_sprite_wing", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_imp", type: "elemental", isBoss: false,
    abilities: [
      { id: "imp_fireball", name: "Imp Fireball", description: "A burst of imp-fire", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 120, durationTicks: 0, cooldownTicks: 6, damageType: "heat" },
      { id: "imp_cackle", name: "Maddening Cackle", description: "Its laughter disorients the target", icon: "😈", triggerType: "on_hit_proc", triggerValue: 15, effectType: "fear", effectValue: 1, durationTicks: 1, cooldownTicks: 10 },
    ],
    resistances: { pierce: -5, slash: 0, crush: 0, heat: 35, cold: -15, divine: -5, magic: 15 },
  },
  {
    id: "faydark_sprite",
    name: "Dark Sprite",
    description: "A corrupted forest sprite crackling with dark energy",
    level: 35, zone: "Lesser Faydark",
    hp: 980, maxHp: 980, attackRating: 400, defenseRating: 250, mitigation: 170, avoidance: 28,
    attackSpeed: 1.5, damageMin: 78, damageMax: 122, xpReward: 550, goldMin: 40, goldMax: 105,
    lootTable: [
      { itemId: "faydark_wood", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "enchanted_dust", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "faydark_sprite_wing", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_pixie", type: "elemental", isBoss: false,
    abilities: [
      { id: "dark_bolt", name: "Shadow Bolt", description: "A bolt of pure darkness", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 130, durationTicks: 0, cooldownTicks: 5, damageType: "magic" },
      { id: "spirit_drain", name: "Spirit Drain", description: "Drains life force on each hit", icon: "🌀", triggerType: "on_hit_proc", triggerValue: 20, effectType: "life_drain", effectValue: 25, durationTicks: 0, cooldownTicks: 8, damageType: "divine" },
    ],
    resistances: { pierce: -5, slash: 0, crush: 0, heat: 5, cold: 5, divine: -10, magic: 28 },
  },
  {
    id: "faydark_wolf_alpha",
    name: "Faydark Alpha Wolf",
    description: "The enormous alpha wolf ruling the Faydark wolf packs",
    level: 37, zone: "Lesser Faydark",
    hp: 1380, maxHp: 1380, attackRating: 460, defenseRating: 310, mitigation: 230, avoidance: 15,
    attackSpeed: 1.6, damageMin: 92, damageMax: 145, xpReward: 680, goldMin: 48, goldMax: 125,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.8, minQuantity: 2, maxQuantity: 5 },
      { itemId: "faydark_wood", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "faydark_sprite_wing", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "alpha_howl", name: "Alpha Howl", description: "A terrifying howl that stuns", icon: "🐺", triggerType: "every_n_ticks", triggerValue: 10, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
      { id: "pack_hunt", name: "Pack Hunt", description: "Coordinated strike dealing massive damage", icon: "🦷", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 180, durationTicks: 0, cooldownTicks: 6, damageType: "pierce" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 0, cold: 15, divine: 0 },
  },
  {
    id: "faydark_lord_grimthorn",
    name: "Lord Grimthorn",
    description: "The malevolent spirit lord of the Lesser Faydark — a twisted dryad king",
    level: 40, zone: "Lesser Faydark",
    hp: 4200, maxHp: 4200, attackRating: 720, defenseRating: 560, mitigation: 430, avoidance: 15,
    attackSpeed: 2.0, damageMin: 155, damageMax: 240, xpReward: 2200, goldMin: 165, goldMax: 440,
    lootTable: [
      { itemId: "faydark_wood", dropChance: 0.9, minQuantity: 3, maxQuantity: 6 },
      { itemId: "darkblade", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "grimthorn_bark", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_treant", type: "elemental", isBoss: true, personality: "ancient", grudgeThreshold: 3,
    abilities: [
      { id: "grimthorn_slash", name: "Thorn Slash", description: "Razor-sharp thorns tear through armor", icon: "🌿", triggerType: "every_n_ticks", triggerValue: 5, effectType: "bleed_dot", effectValue: 40, durationTicks: 5, cooldownTicks: 8, damageType: "pierce", unavoidable: true },
      { id: "forest_wraith", name: "Forest Wrath", description: "Channels the fury of the entire Faydark", icon: "🌲", triggerType: "every_n_ticks", triggerValue: 12, effectType: "damage_burst", effectValue: 380, durationTicks: 0, cooldownTicks: 12, damageType: "magic", unavoidable: true },
      { id: "grimthorn_regen", name: "Primordial Renewal", description: "Draws upon ancient roots to regenerate", icon: "💚", triggerType: "once_at_hp", triggerValue: 50, effectType: "self_heal", effectValue: 1200, durationTicks: 0, cooldownTicks: 99 },
      { id: "grimthorn_armor", name: "Ancient Bark", description: "Legendary bark armor hardens at 75% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 75, effectType: "absorb_shield", effectValue: 1400, durationTicks: 8, cooldownTicks: 99 },
    ],
    resistances: { pierce: 25, slash: -10, crush: 0, heat: -25, cold: 15, divine: 0, magic: 10 },
  },

  // Lesser Faydark additional enemies (brings total to 7)
  {
    id: "faydark_pixie_scout",
    name: "Faydark Pixie Scout",
    description: "A cunning pixie scout who spies on trespassers in the Lesser Faydark",
    level: 30, zone: "Lesser Faydark",
    hp: 520, maxHp: 520, attackRating: 195, defenseRating: 140, mitigation: 100, avoidance: 25,
    attackSpeed: 1.5, damageMin: 38, damageMax: 62, xpReward: 280, goldMin: 18, goldMax: 50,
    lootTable: [
      { itemId: "faydark_sprite_wing", dropChance: 0.55, minQuantity: 1, maxQuantity: 2 },
      { itemId: "faydark_wood", dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
    { itemId: "faydark_treant_bark", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_sprite", type: "elemental", isBoss: false,
    abilities: [
      { id: "pixie_confusion", name: "Pixie Confusion", description: "Bewildering pixie magic disorients the target", icon: "✨", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 10, damageType: "magic" },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: -10, cold: 0, divine: 10, magic: 20 },
  },
  {
    id: "faydark_shadow_wolf",
    name: "Faydark Shadow Wolf",
    description: "A wolf that has absorbed the dark magic of the corrupted Faydark — its coat is pure shadow",
    level: 34, zone: "Lesser Faydark",
    hp: 840, maxHp: 840, attackRating: 295, defenseRating: 210, mitigation: 160, avoidance: 18,
    attackSpeed: 1.7, damageMin: 62, damageMax: 98, xpReward: 440, goldMin: 28, goldMax: 72,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.65, minQuantity: 1, maxQuantity: 3 },
      { itemId: "faydark_sprite_wing", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    { itemId: "faydark_treant_bark", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "shadow_pounce", name: "Shadow Pounce", description: "Leaps from the shadows for a devastating ambush strike", icon: "🐺", triggerType: "once_at_hp", triggerValue: 100, effectType: "damage_burst", effectValue: 90, durationTicks: 0, cooldownTicks: 99, damageType: "pierce" },
    ],
    resistances: { pierce: 5, slash: 0, crush: 0, heat: 0, cold: 10, divine: -10, magic: 15 },
  },

  // ── FEERROTT (Levels 40-50) ──────────────────────────────────────────────
  {
    id: "feerrott_lizardman",
    name: "Feerrott Lizardman",
    description: "A cunning lizardman warrior from the Feerrott swamps",
    level: 41, zone: "Feerrott",
    hp: 2600, maxHp: 2600, attackRating: 680, defenseRating: 520, mitigation: 400, avoidance: 14,
    attackSpeed: 1.8, damageMin: 130, damageMax: 200, xpReward: 1400, goldMin: 95, goldMax: 250,
    lootTable: [
      { itemId: "feerrott_scale", dropChance: 0.65, minQuantity: 1, maxQuantity: 3 },
      { itemId: "iron_bar", dropChance: 0.25, minQuantity: 2, maxQuantity: 4 },
    { itemId: "feerrott_lizard_scale", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_lizardman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "lizard_frenzy", name: "Lizard Frenzy", description: "A rapid series of claw slashes", icon: "🦎", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 7, damageType: "slash" },
      { id: "poison_spit", name: "Poison Spit", description: "Spits corrosive venom", icon: "🧪", triggerType: "on_hit_proc", triggerValue: 18, effectType: "bleed_dot", effectValue: 35, durationTicks: 5, cooldownTicks: 10, damageType: "magic" },
    ],
    resistances: { pierce: 0, slash: 0, crush: -10, heat: 10, cold: -15, divine: 0, magic: 5 },
  },
  {
    id: "feerrott_swamp_spider",
    name: "Swamp Spider Queen",
    description: "A massive venomous spider lurking in the Feerrott bogs",
    level: 43, zone: "Feerrott",
    hp: 3000, maxHp: 3000, attackRating: 730, defenseRating: 560, mitigation: 430, avoidance: 18,
    attackSpeed: 1.6, damageMin: 145, damageMax: 225, xpReward: 1600, goldMin: 110, goldMax: 290,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.7, minQuantity: 2, maxQuantity: 5 },
      { itemId: "feerrott_scale", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "feerrott_lizard_scale", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_spider", type: "beast", isBoss: false,
    abilities: [
      { id: "spider_web", name: "Web Trap", description: "Encases the target in sticky webbing — unavoidable", icon: "🕸️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
      { id: "venom_bite", name: "Venom Bite", description: "A deep bite injecting lethal venom", icon: "🦷", triggerType: "on_hit_proc", triggerValue: 22, effectType: "bleed_dot", effectValue: 50, durationTicks: 5, cooldownTicks: 8, damageType: "magic" },
    ],
    resistances: { pierce: -10, slash: 5, crush: 0, heat: 5, cold: -10, divine: 0, magic: 10 },
  },
  {
    id: "feerrott_bog_giant",
    name: "Feerrott Bog Giant",
    description: "A colossal giant born from the fetid swamps of the Feerrott",
    level: 45, zone: "Feerrott",
    hp: 4500, maxHp: 4500, attackRating: 860, defenseRating: 680, mitigation: 530, avoidance: 4,
    attackSpeed: 2.6, damageMin: 175, damageMax: 270, xpReward: 2000, goldMin: 140, goldMax: 380,
    lootTable: [
      { itemId: "feerrott_scale", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "mithril_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "feerrott_lizard_scale", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "bog_slam", name: "Bog Slam", description: "Slams the swamp, sending mud and debris — unavoidable", icon: "💥", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 350, durationTicks: 0, cooldownTicks: 10, damageType: "crush", unavoidable: true },
      { id: "swamp_stench", name: "Swamp Stench", description: "Rancid fumes that stun the target", icon: "☁️", triggerType: "every_n_ticks", triggerValue: 15, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 18, unavoidable: true },
    ],
    resistances: { pierce: 5, slash: 5, crush: -12, heat: 0, cold: 5, divine: 0, magic: 5 },
  },
  {
    id: "feerrott_lizard_shaman",
    name: "Lizardman Swamp Shaman",
    description: "A powerful lizardman shaman harnessing the dark power of the Feerrott",
    level: 47, zone: "Feerrott",
    hp: 3800, maxHp: 3800, attackRating: 820, defenseRating: 620, mitigation: 480, avoidance: 12,
    attackSpeed: 2.2, damageMin: 160, damageMax: 250, xpReward: 1900, goldMin: 130, goldMax: 350,
    lootTable: [
      { itemId: "feerrott_scale", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: "fire_opal", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
    { itemId: "feerrott_lizard_scale", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_lizardman_shaman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "swamp_curse", name: "Swamp Curse", description: "A vile curse that saps vitality over time", icon: "🌿", triggerType: "every_n_ticks", triggerValue: 8, effectType: "life_drain", effectValue: 55, durationTicks: 0, cooldownTicks: 8, unavoidable: true, damageType: "magic" },
      { id: "mud_shield", name: "Mud Shield", description: "A thick shield of enchanted mud", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 65, effectType: "absorb_shield", effectValue: 1000, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: 10, cold: -10, divine: -8, magic: 20 },
  },
  {
    id: "feerrott_avatar_cazic",
    name: "Avatar of Cazic-Thule",
    description: "A divine manifestation of Cazic-Thule, the God of Fear — the most terrifying boss in the Feerrott",
    level: 50, zone: "Feerrott",
    hp: 12000, maxHp: 12000, attackRating: 1800, defenseRating: 1400, mitigation: 1100, avoidance: 18,
    attackSpeed: 2.0, damageMin: 340, damageMax: 540, xpReward: 7000, goldMin: 450, goldMax: 1200,
    lootTable: [
      { itemId: "feerrott_scale", dropChance: 0.9, minQuantity: 3, maxQuantity: 6 },
      { itemId: "chestguard_of_the_fallen", dropChance: 0.14, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_the_ancients", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "cazic_idol", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_demon", type: "elemental", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "touch_of_fear", name: "Touch of Fear", description: "Cazic's divine touch paralyzes with pure terror — unavoidable", icon: "😱", triggerType: "every_n_ticks", triggerValue: 7, effectType: "fear", effectValue: 3, durationTicks: 3, cooldownTicks: 7, unavoidable: true },
      { id: "avatar_smite", name: "Divine Smite", description: "A smite from a god — utterly unavoidable", icon: "⚡", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 450, durationTicks: 0, cooldownTicks: 9, damageType: "divine", unavoidable: true },
      { id: "cazic_aura", name: "Aura of Cazic", description: "A draining aura of divine fear", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 5, effectType: "life_drain", effectValue: 70, durationTicks: 0, cooldownTicks: 5, unavoidable: true, damageType: "divine" },
      { id: "cazic_form", name: "True Form", description: "Reveals the true form of the god — massive shield", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 3500, durationTicks: 6, cooldownTicks: 99 },
    ],
    resistances: { pierce: 20, slash: 20, crush: 10, heat: 10, cold: 10, divine: 50, magic: 30 },
  },

  // Feerrott additional enemies (brings total to 7)
  {
    id: "feerrott_swamp_basilisk",
    name: "Feerrott Swamp Basilisk",
    description: "A stone-eyed basilisk lurking in the Feerrott mud — its gaze petrifies",
    level: 42, zone: "Feerrott",
    hp: 2800, maxHp: 2800, attackRating: 710, defenseRating: 535, mitigation: 415, avoidance: 10,
    attackSpeed: 2.3, damageMin: 135, damageMax: 210, xpReward: 1500, goldMin: 100, goldMax: 260,
    lootTable: [
      { itemId: "feerrott_lizard_scale", dropChance: 0.65, minQuantity: 2, maxQuantity: 4 },
      { itemId: "feerrott_swamp_moss", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "feerrott_scale", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_serpent", type: "beast", isBoss: false,
    abilities: [
      { id: "basilisk_gaze", name: "Petrifying Gaze", description: "The basilisk's stone-gaze roots the target in place", icon: "👁️", triggerType: "every_n_ticks", triggerValue: 9, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
    ],
    resistances: { pierce: 8, slash: 8, crush: 5, heat: 5, cold: -10, divine: 0, magic: 12 },
  },
  {
    id: "feerrott_dark_disciple",
    name: "Feerrott Dark Disciple",
    description: "A cultist who worships Cazic-Thule in the Feerrott's festering depths",
    level: 46, zone: "Feerrott",
    hp: 3200, maxHp: 3200, attackRating: 750, defenseRating: 575, mitigation: 445, avoidance: 12,
    attackSpeed: 2.0, damageMin: 145, damageMax: 225, xpReward: 1700, goldMin: 115, goldMax: 300,
    lootTable: [
      { itemId: "feerrott_scale", dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
      { itemId: "cazic_idol", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "feerrott_swamp_moss", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_cultist", type: "humanoid", isBoss: false,
    abilities: [
      { id: "dark_ritual", name: "Dark Ritual", description: "Channels Cazic's power — a divine life drain", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 8, effectType: "life_drain", effectValue: 65, durationTicks: 0, cooldownTicks: 8, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 5, cold: 5, divine: 25, magic: 15 },
  },

  // Nektulos Forest outdoor boss
  {
    id: "nektulos_deathtree",
    name: "The Deathtree",
    description: "An immense, malevolent treant corrupted by centuries of Nektulos dark magic — it hungers",
    level: 28, zone: "Nektulos Forest",
    hp: 3500, maxHp: 3500, attackRating: 520, defenseRating: 400, mitigation: 310, avoidance: 8,
    attackSpeed: 2.8, damageMin: 105, damageMax: 165, xpReward: 1800, goldMin: 140, goldMax: 360,
    lootTable: [
      { itemId: "faydark_treant_bark", dropChance: 0.9, minQuantity: 3, maxQuantity: 6 },
      { itemId: "darkblade", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_the_ancients", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_treant", type: "elemental", isBoss: true, personality: "ancient", grudgeThreshold: 3,
    abilities: [
      { id: "death_roots", name: "Death Roots", description: "Corrupted roots erupt from the earth — entangle and drain", icon: "🌿", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 45, durationTicks: 4, cooldownTicks: 7, damageType: "divine", unavoidable: true },
      { id: "ancient_fury", name: "Ancient Fury", description: "The Deathtree's rage builds to a terrible crescendo", icon: "🌲", triggerType: "every_n_ticks", triggerValue: 13, effectType: "damage_burst", effectValue: 320, durationTicks: 0, cooldownTicks: 13, damageType: "crush", unavoidable: true },
      { id: "dark_bark_armor", name: "Dark Bark Armor", description: "Bark hardened by dark magic — absorbs massive damage", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 1100, durationTicks: 7, cooldownTicks: 99 },
      { id: "death_tree_sap", name: "Death Sap", description: "Oozes corrosive sap — drains life at 30% HP", icon: "☠️", triggerType: "once_at_hp", triggerValue: 30, effectType: "life_drain", effectValue: 180, durationTicks: 0, cooldownTicks: 99, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 20, slash: -15, crush: 5, heat: -30, cold: 10, divine: 20, magic: 10 },
  },

  // ── THUNDERING STEPPES — ADDITIONAL (rounds out to 7 total) ─────────────
  {
    id: "steppes_griffon",
    name: "Steppes Griffon",
    description: "A proud griffon soaring the Thundering Steppes updrafts",
    level: 13, zone: "Thundering Steppes",
    hp: 250, maxHp: 250, attackRating: 105, defenseRating: 72, mitigation: 50, avoidance: 22,
    attackSpeed: 1.6, damageMin: 20, damageMax: 35, xpReward: 175, goldMin: 10, goldMax: 28,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
      { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "silver_pendant", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_harpy", type: "beast", isBoss: false,
    abilities: [
      { id: "griffon_swipe", name: "Talon Swipe", description: "Rakes with razor-sharp talons", icon: "🦅", triggerType: "on_hit_proc", triggerValue: 22, effectType: "bleed_dot", effectValue: 12, durationTicks: 3, cooldownTicks: 6, damageType: "pierce" },
    ],
    resistances: { pierce: -8, slash: 0, crush: 0, heat: 5, cold: 5, divine: 0 },
  },

  // ── NEKTULOS FOREST — ADDITIONAL (rounds out to 5 total) ─────────────────
  {
    id: "nektulos_wraith",
    name: "Nektulos Wraith",
    description: "A spectral wraith haunting the cursed groves of Nektulos",
    level: 22, zone: "Nektulos Forest",
    hp: 490, maxHp: 490, attackRating: 220, defenseRating: 150, mitigation: 108, avoidance: 28,
    attackSpeed: 1.5, damageMin: 40, damageMax: 65, xpReward: 295, goldMin: 22, goldMax: 58,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "wolf_hide", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "wraith_drain", name: "Soul Drain", description: "Sucks the life from the living", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 6, effectType: "life_drain", effectValue: 28, durationTicks: 0, cooldownTicks: 6, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 20, slash: 10, crush: -5, heat: 0, cold: 25, divine: -20, magic: 15 },
  },
  {
    id: "nektulos_vampire",
    name: "Nektulos Vampire",
    description: "A cunning vampire lord stalking unwary travelers",
    level: 28, zone: "Nektulos Forest",
    hp: 680, maxHp: 680, attackRating: 270, defenseRating: 185, mitigation: 138, avoidance: 22,
    attackSpeed: 1.5, damageMin: 52, damageMax: 82, xpReward: 385, goldMin: 28, goldMax: 72,
    lootTable: [
      { itemId: "ring_of_power", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dark_elf", type: "undead", isBoss: false,
    abilities: [
      { id: "vampire_bite", name: "Vampiric Bite", description: "Bites the neck, draining life and healing itself", icon: "🦷", triggerType: "on_hit_proc", triggerValue: 25, effectType: "life_drain", effectValue: 40, durationTicks: 0, cooldownTicks: 8, damageType: "pierce" },
      { id: "mist_form", name: "Mist Form", description: "Shifts into mist, becoming near-impossible to hit", icon: "🌫️", triggerType: "once_at_hp", triggerValue: 45, effectType: "avoidance_buff", effectValue: 30, durationTicks: 4, cooldownTicks: 99 },
    ],
    resistances: { pierce: 10, slash: 15, crush: -8, heat: -15, cold: 30, divine: -25, magic: 10 },
  },
  {
    id: "nektulos_golem",
    name: "Stone Golem",
    description: "A guardian golem of enchanted stone prowling the Nektulos depths",
    level: 29, zone: "Nektulos Forest",
    hp: 850, maxHp: 850, attackRating: 290, defenseRating: 220, mitigation: 180, avoidance: 4,
    attackSpeed: 2.6, damageMin: 65, damageMax: 102, xpReward: 430, goldMin: 30, goldMax: 80,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.5, minQuantity: 1, maxQuantity: 3 },
      { itemId: "coal", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "elemental", isBoss: false,
    abilities: [
      { id: "stone_smash", name: "Stone Smash", description: "A mighty stone-fisted strike", icon: "🪨", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 140, durationTicks: 0, cooldownTicks: 8, damageType: "crush", unavoidable: true },
      { id: "stone_shell", name: "Stone Shell", description: "Reinforces its rocky body", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 300, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 25, slash: 20, crush: -15, heat: 10, cold: 10, divine: 0, magic: 15 },
  },
  {
    id: "nektulos_shade",
    name: "Nektulos Shade",
    description: "A shadow entity that stalks the darkest corners of the forest",
    level: 23, zone: "Nektulos Forest",
    hp: 520, maxHp: 520, attackRating: 228, defenseRating: 158, mitigation: 115, avoidance: 26,
    attackSpeed: 1.6, damageMin: 42, damageMax: 68, xpReward: 308, goldMin: 24, goldMax: 60,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
      { itemId: "coal", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "cloak_of_shadows", dropChance: 0.05, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "shade_rend", name: "Shadow Rend", description: "Tears at the target with shadow claws", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 18, durationTicks: 3, cooldownTicks: 7, damageType: "divine" },
      { id: "shade_merge", name: "Shadow Merge", description: "Merges with the darkness, hard to hit", icon: "🌫️", triggerType: "once_at_hp", triggerValue: 55, effectType: "avoidance_buff", effectValue: 20, durationTicks: 3, cooldownTicks: 99 },
    ],
    resistances: { pierce: 18, slash: 8, crush: 0, heat: 5, cold: 20, divine: -18, magic: 12 },
  },
  {
    id: "nektulos_darkfang_spider",
    name: "Darkfang Spider",
    description: "A massive black spider weaving webs of darkness through the Nektulos groves",
    level: 26, zone: "Nektulos Forest",
    hp: 610, maxHp: 610, attackRating: 248, defenseRating: 168, mitigation: 125, avoidance: 18,
    attackSpeed: 1.7, damageMin: 48, damageMax: 76, xpReward: 355, goldMin: 26, goldMax: 65,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
      { itemId: "mithril_ore", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "leather_leggings", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_spider", type: "beast", isBoss: false,
    abilities: [
      { id: "web_snare", name: "Web Snare", description: "Shoots sticky webbing to slow the target", icon: "🕸️", triggerType: "every_n_ticks", triggerValue: 9, effectType: "slow", effectValue: 25, durationTicks: 3, cooldownTicks: 12 },
      { id: "venom_fang", name: "Venom Fang", description: "Bites with dark venom that lingers", icon: "🕷️", triggerType: "on_hit_proc", triggerValue: 22, effectType: "bleed_dot", effectValue: 20, durationTicks: 4, cooldownTicks: 8, damageType: "pierce" },
    ],
    resistances: { pierce: -5, slash: 0, crush: -8, heat: 0, cold: 15, divine: 0, magic: 5 },
  },

  // ── EVERFROST PEAKS — ADDITIONAL (rounds out to 5 total) ─────────────────
  {
    id: "everfrost_snow_lion",
    name: "Everfrost Snow Lion",
    description: "A massive white lion adapted to hunt in the frozen wastes",
    level: 30, zone: "Everfrost Peaks",
    hp: 1100, maxHp: 1100, attackRating: 380, defenseRating: 280, mitigation: 210, avoidance: 20,
    attackSpeed: 1.6, damageMin: 75, damageMax: 120, xpReward: 580, goldMin: 40, goldMax: 105,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "permafrost_shard", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "ice_pounce", name: "Ice Pounce", description: "Leaps with icy ferocity", icon: "🦁", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 150, durationTicks: 0, cooldownTicks: 8, damageType: "cold" },
      { id: "freeze_breath", name: "Freeze Breath", description: "Breathes a cone of freezing air", icon: "❄️", triggerType: "on_hit_proc", triggerValue: 18, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 10 },
    ],
    resistances: { pierce: 0, slash: 0, crush: -5, heat: -18, cold: 40, divine: 0 },
  },
  {
    id: "everfrost_ice_witch",
    name: "Ice Witch",
    description: "An ancient crone who wields the lethal magic of Everfrost",
    level: 35, zone: "Everfrost Peaks",
    hp: 1600, maxHp: 1600, attackRating: 490, defenseRating: 360, mitigation: 270, avoidance: 15,
    attackSpeed: 2.0, damageMin: 110, damageMax: 172, xpReward: 780, goldMin: 58, goldMax: 155,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "permafrost_shard", dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll_shaman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "blizzard", name: "Blizzard", description: "Summons a localized blizzard — inescapable", icon: "🌨️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 230, durationTicks: 0, cooldownTicks: 8, damageType: "cold", unavoidable: true },
      { id: "ice_prison", name: "Ice Prison", description: "Encases the target in ice, stunning them", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 14, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 18, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: -20, cold: 50, divine: 0, magic: 20 },
  },
  {
    id: "everfrost_mammoth",
    name: "Glacial Mammoth",
    description: "A colossal mammoth preserved by the eternal ice and reanimated by dark magic",
    level: 37, zone: "Everfrost Peaks",
    hp: 2400, maxHp: 2400, attackRating: 580, defenseRating: 450, mitigation: 360, avoidance: 4,
    attackSpeed: 2.4, damageMin: 130, damageMax: 200, xpReward: 1100, goldMin: 80, goldMax: 210,
    lootTable: [
      { itemId: "permafrost_shard", dropChance: 0.4, minQuantity: 2, maxQuantity: 4 },
      { itemId: "steel_pauldrons", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "beast", isBoss: false,
    abilities: [
      { id: "mammoth_charge", name: "Glacial Charge", description: "Charges with frozen tusks — unavoidable", icon: "🦣", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 280, durationTicks: 0, cooldownTicks: 10, damageType: "crush", unavoidable: true },
      { id: "frost_stomp", name: "Frost Stomp", description: "A bone-shaking stomp that stuns", icon: "🦶", triggerType: "every_n_ticks", triggerValue: 15, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 18 },
    ],
    resistances: { pierce: 5, slash: 5, crush: -15, heat: -20, cold: 45, divine: 0 },
  },

  // ── LAVASTORM MOUNTAINS — ADDITIONAL (rounds out to 5 total) ─────────────
  {
    id: "lavastorm_fire_imp",
    name: "Lavastorm Fire Imp",
    description: "A tiny fire elemental that packs a scorching punch",
    level: 40, zone: "Lavastorm Mountains",
    hp: 2200, maxHp: 2200, attackRating: 680, defenseRating: 500, mitigation: 380, avoidance: 22,
    attackSpeed: 1.3, damageMin: 120, damageMax: 185, xpReward: 1100, goldMin: 75, goldMax: 200,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.6, minQuantity: 1, maxQuantity: 3 },
      { itemId: "coal", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_imp", type: "elemental", isBoss: false,
    abilities: [
      { id: "imp_scorch", name: "Scorch", description: "Scorch the target with intense heat", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 160, durationTicks: 0, cooldownTicks: 5, damageType: "heat" },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 50, cold: -25, divine: 0, magic: 15 },
  },
  {
    id: "lavastorm_magma_golem",
    name: "Magma Golem",
    description: "A golem formed of living magma, radiating lethal heat",
    level: 45, zone: "Lavastorm Mountains",
    hp: 4800, maxHp: 4800, attackRating: 900, defenseRating: 720, mitigation: 570, avoidance: 5,
    attackSpeed: 2.4, damageMin: 190, damageMax: 295, xpReward: 2100, goldMin: 150, goldMax: 400,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.7, minQuantity: 2, maxQuantity: 5 },
      { itemId: "mithril_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "magma_slam", name: "Magma Slam", description: "Slams with a fist of flowing magma — unavoidable", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 380, durationTicks: 0, cooldownTicks: 10, damageType: "heat", unavoidable: true },
      { id: "lava_shell", name: "Lava Shell", description: "Solidified lava forms a shield", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 70, effectType: "absorb_shield", effectValue: 1500, durationTicks: 6, cooldownTicks: 99 },
    ],
    resistances: { pierce: 10, slash: 10, crush: -5, heat: 60, cold: -30, divine: 0, magic: 15 },
  },
  {
    id: "lavastorm_fire_drake",
    name: "Lavastorm Fire Drake",
    description: "A fearsome young fire dragon guarding Lavastorm's volcanic passes",
    level: 48, zone: "Lavastorm Mountains",
    hp: 7500, maxHp: 7500, attackRating: 1400, defenseRating: 1100, mitigation: 880, avoidance: 12,
    attackSpeed: 2.0, damageMin: 270, damageMax: 420, xpReward: 4000, goldMin: 280, goldMax: 750,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.8, minQuantity: 3, maxQuantity: 6 },
      { itemId: "fabled_greatsword", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
      { itemId: "breastplate_of_valor", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_dragon", type: "dragon", isBoss: false,
    abilities: [
      { id: "drake_inferno", name: "Inferno Breath", description: "An eruption of dragonfire — truly inescapable", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 380, durationTicks: 0, cooldownTicks: 7, damageType: "heat", unavoidable: true },
      { id: "drake_scales", name: "Dragon Scales", description: "Hardened scales absorb damage at 60% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 2000, durationTicks: 7, cooldownTicks: 99 },
      { id: "drake_frenzy", name: "Drake Frenzy", description: "Enters a killing frenzy at 30% HP", icon: "😡", triggerType: "once_at_hp", triggerValue: 30, effectType: "damage_burst", effectValue: 700, durationTicks: 0, cooldownTicks: 99, damageType: "heat", unavoidable: true },
    ],
    resistances: { pierce: 20, slash: 15, crush: 5, heat: 55, cold: -20, divine: 10, magic: 15 },
  },

  // ── THUNDERING STEPPES — OUTDOOR BOSS + EXTRAS (brings outdoor total to 8) ─
  {
    id: "steppes_cyclops",
    name: "Stormcaller Cyclops",
    description: "A one-eyed giant that hurls lightning across the Thundering Steppes",
    level: 26, zone: "Thundering Steppes",
    hp: 780, maxHp: 780, attackRating: 285, defenseRating: 215, mitigation: 165, avoidance: 8,
    attackSpeed: 2.2, damageMin: 60, damageMax: 95, xpReward: 410, goldMin: 30, goldMax: 80,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "iron_ore", dropChance: 0.4, minQuantity: 2, maxQuantity: 5 },
      { itemId: "wolf_hide", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "cyclops_stomp", name: "Ground Stomp", description: "Shakes the earth with a thunderous stomp", icon: "👊", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 130, durationTicks: 0, cooldownTicks: 9, damageType: "crush" },
    ],
    resistances: { pierce: 5, slash: 5, crush: -10, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "steppes_gnoll_veteran",
    name: "Gnoll Veteran",
    description: "A battle-hardened gnoll warrior roaming the Steppes",
    level: 18, zone: "Thundering Steppes",
    hp: 380, maxHp: 380, attackRating: 165, defenseRating: 115, mitigation: 82, avoidance: 15,
    attackSpeed: 1.5, damageMin: 32, damageMax: 50, xpReward: 220, goldMin: 15, goldMax: 40,
    lootTable: [
      { itemId: "antonica_gnoll_pelt", dropChance: 0.5, minQuantity: 1, maxQuantity: 2 },
      { itemId: "antonica_bone_fragment", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
      { itemId: "iron_ore", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: false,
    abilities: [
      { id: "veteran_cleave", name: "Battle Cleave", description: "Swings in a wide arc with seasoned skill", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 70, durationTicks: 0, cooldownTicks: 7, damageType: "slash" },
    ],
    resistances: { pierce: 0, slash: 5, crush: -5, heat: 0, cold: 0, divine: 0 },
  },
  {
    id: "steppes_warchief",
    name: "Gnoll Warchief Kragnar",
    description: "The fearsome gnoll warchief commanding all Thundering Steppes packs",
    level: 30, zone: "Thundering Steppes",
    hp: 2200, maxHp: 2200, attackRating: 560, defenseRating: 420, mitigation: 320, avoidance: 18,
    attackSpeed: 1.8, damageMin: 95, damageMax: 155, xpReward: 1400, goldMin: 100, goldMax: 280,
    lootTable: [
      { itemId: "antonica_gnoll_pelt", dropChance: 0.8, minQuantity: 2, maxQuantity: 4 },
      { itemId: "iron_bar", dropChance: 0.6, minQuantity: 1, maxQuantity: 3 },
      { itemId: "antonica_bone_fragment", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "chain_coif", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_gnoll", type: "humanoid", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "warchief_battle_cry", name: "Battle Cry", description: "Unleashes a fearsome war cry that shakes the earth", icon: "📯", triggerType: "once_at_hp", triggerValue: 100, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 99, damageType: "divine" },
      { id: "warchief_flurry", name: "Warchief's Flurry", description: "A devastating sequence of rapid strikes", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 180, durationTicks: 0, cooldownTicks: 8, damageType: "slash" },
    ],
    resistances: { pierce: 10, slash: 10, crush: -10, heat: 5, cold: 5, divine: 0 },
  },

  // ── EVERFROST PEAKS — OUTDOOR BOSS + EXTRAS (brings outdoor total to 8) ───
  {
    id: "everfrost_tundra_wolf",
    name: "Everfrost Tundra Wolf",
    description: "A massive white wolf that hunts in the frozen tundra of Everfrost",
    level: 28, zone: "Everfrost Peaks",
    hp: 850, maxHp: 850, attackRating: 310, defenseRating: 220, mitigation: 162, avoidance: 20,
    attackSpeed: 1.5, damageMin: 60, damageMax: 95, xpReward: 450, goldMin: 30, goldMax: 80,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
      { itemId: "everfrost_mammoth_ivory", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: "permafrost_shard", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_wolf", type: "beast", isBoss: false,
    abilities: [
      { id: "tundra_howl", name: "Frost Howl", description: "An eerie howl that freezes foes in their tracks", icon: "❄️", triggerType: "every_n_ticks", triggerValue: 10, effectType: "slow", effectValue: 1, durationTicks: 3, cooldownTicks: 12 },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: -10, cold: 30, divine: 0 },
  },
  {
    id: "everfrost_ice_giant",
    name: "Everfrost Ice Giant",
    description: "A towering ice giant who commands the frozen wastes",
    level: 38, zone: "Everfrost Peaks",
    hp: 2800, maxHp: 2800, attackRating: 750, defenseRating: 580, mitigation: 450, avoidance: 8,
    attackSpeed: 2.5, damageMin: 130, damageMax: 200, xpReward: 1400, goldMin: 95, goldMax: 260,
    lootTable: [
      { itemId: "everfrost_mammoth_ivory", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "permafrost_shard", dropChance: 0.4, minQuantity: 2, maxQuantity: 5 },
      { itemId: "iron_bar", dropChance: 0.3, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "ice_giant_smash", name: "Glacier Smash", description: "Hammers the ground sending ice shards flying", icon: "❄️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 280, durationTicks: 0, cooldownTicks: 8, damageType: "cold" },
    ],
    resistances: { pierce: 10, slash: 5, crush: -15, heat: -20, cold: 50, divine: 0 },
  },
  {
    id: "everfrost_glacier_king",
    name: "Bolgrath the Glacier King",
    description: "The ancient frost giant king who rules all of Everfrost Peaks",
    level: 45, zone: "Everfrost Peaks",
    hp: 8500, maxHp: 8500, attackRating: 1600, defenseRating: 1200, mitigation: 950, avoidance: 10,
    attackSpeed: 2.5, damageMin: 280, damageMax: 440, xpReward: 4500, goldMin: 300, goldMax: 900,
    lootTable: [
      { itemId: "permafrost_shard", dropChance: 0.9, minQuantity: 3, maxQuantity: 6 },
      { itemId: "everfrost_mammoth_ivory", dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
      { itemId: "chain_coif", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "fabled_greatsword", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "glacier_king_freeze", name: "Absolute Zero", description: "Freezes the battlefield solid — inescapable", icon: "🥶", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 500, durationTicks: 0, cooldownTicks: 10, damageType: "cold", unavoidable: true },
      { id: "glacier_king_roar", name: "Glacial Roar", description: "A roar that shatters ice and bone alike", icon: "❄️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 3000, durationTicks: 8, cooldownTicks: 99 },
    ],
    resistances: { pierce: 15, slash: 10, crush: -20, heat: -30, cold: 60, divine: 5, magic: 10 },
  },

  // ── LAVASTORM MOUNTAINS — OUTDOOR BOSS + EXTRAS (brings outdoor total to 7) ─
  {
    id: "lavastorm_fire_giant_warrior",
    name: "Lavastorm Fire Giant",
    description: "A hulking fire giant standing guard in Lavastorm's volcanic passes",
    level: 44, zone: "Lavastorm Mountains",
    hp: 4500, maxHp: 4500, attackRating: 1000, defenseRating: 780, mitigation: 600, avoidance: 8,
    attackSpeed: 2.2, damageMin: 185, damageMax: 290, xpReward: 2200, goldMin: 150, goldMax: 420,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: "lavastorm_magma_slag", dropChance: 0.5, minQuantity: 2, maxQuantity: 5 },
      { itemId: "iron_bar", dropChance: 0.35, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "fire_giant_smash", name: "Lava Smash", description: "Brings a fist of molten rock crashing down", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 320, durationTicks: 0, cooldownTicks: 9, damageType: "heat" },
    ],
    resistances: { pierce: 15, slash: 10, crush: -10, heat: 55, cold: -25, divine: 0, magic: 10 },
  },
  {
    id: "lavastorm_sulfur_beast",
    name: "Sulfur Beast",
    description: "A creature born from pure volcanic sulfur in Lavastorm's vents",
    level: 46, zone: "Lavastorm Mountains",
    hp: 5200, maxHp: 5200, attackRating: 1100, defenseRating: 850, mitigation: 660, avoidance: 10,
    attackSpeed: 1.8, damageMin: 200, damageMax: 310, xpReward: 2500, goldMin: 170, goldMax: 460,
    lootTable: [
      { itemId: "lavastorm_fire_opal", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
      { itemId: "lavastorm_magma_slag", dropChance: 0.6, minQuantity: 2, maxQuantity: 5 },
      { itemId: "coal", dropChance: 0.5, minQuantity: 2, maxQuantity: 5 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "sulfur_cloud", name: "Sulfur Cloud", description: "Releases a choking cloud of toxic sulfur gas", icon: "💨", triggerType: "every_n_ticks", triggerValue: 7, effectType: "bleed_dot", effectValue: 180, durationTicks: 4, cooldownTicks: 10, damageType: "poison" },
    ],
    resistances: { pierce: 10, slash: 10, crush: 0, heat: 50, cold: -30, divine: -5, magic: 10 },
  },
  {
    id: "lavastorm_volcano_lord",
    name: "Ignarath the Volcano Lord",
    description: "An ancient efreeti sultan commanding the elemental forces of Lavastorm",
    level: 50, zone: "Lavastorm Mountains",
    hp: 12000, maxHp: 12000, attackRating: 2000, defenseRating: 1600, mitigation: 1250, avoidance: 12,
    attackSpeed: 2.0, damageMin: 360, damageMax: 560, xpReward: 6000, goldMin: 400, goldMax: 1200,
    lootTable: [
      { itemId: "lavastorm_fire_opal", dropChance: 0.9, minQuantity: 2, maxQuantity: 4 },
      { itemId: "fire_opal", dropChance: 0.8, minQuantity: 3, maxQuantity: 6 },
      { itemId: "lavastorm_magma_slag", dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
      { itemId: "fabled_greatsword", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "volcano_lord_eruption", name: "Volcanic Eruption", description: "Calls down a cascade of lava — utterly inescapable", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 600, durationTicks: 0, cooldownTicks: 8, damageType: "heat", unavoidable: true },
      { id: "volcano_lord_inferno", name: "Sultan's Inferno", description: "Channels the full power of the volcano at 40% HP", icon: "🔥", triggerType: "once_at_hp", triggerValue: 40, effectType: "damage_burst", effectValue: 1200, durationTicks: 0, cooldownTicks: 99, damageType: "heat", unavoidable: true },
    ],
    resistances: { pierce: 20, slash: 15, crush: -5, heat: 65, cold: -35, divine: -10, magic: 20 },
  },

  // ── RUINS OF VARSOON — DUNGEON ENEMIES (Levels 20-30) ────────────────────
  {
    id: "varsoon_skeleton",
    name: "Varsoon Skeleton",
    description: "A reanimated skeleton infused with Varsoon's undying magic",
    level: 20, zone: "Thundering Steppes",
    hp: 380, maxHp: 380, attackRating: 190, defenseRating: 130, mitigation: 95, avoidance: 10,
    attackSpeed: 1.9, damageMin: 34, damageMax: 55, xpReward: 230, goldMin: 15, goldMax: 40,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "coal", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "bb_gnoll_tooth_necklace", dropChance: 0.06, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "varsoon_skel_slash", name: "Bone Slash", description: "A raking strike from sharpened bone", icon: "💀", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 60, durationTicks: 0, cooldownTicks: 8, damageType: "slash" },
    ],
    resistances: { pierce: 15, slash: -8, crush: -12, heat: 0, cold: 20, divine: -20 },
  },
  {
    id: "varsoon_zombie",
    name: "Lich-Made Zombie",
    description: "A shambling corpse reanimated by the Undying's dark arts",
    level: 22, zone: "Thundering Steppes",
    hp: 480, maxHp: 480, attackRating: 208, defenseRating: 148, mitigation: 110, avoidance: 5,
    attackSpeed: 2.2, damageMin: 40, damageMax: 62, xpReward: 268, goldMin: 18, goldMax: 45,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "coal", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "health_potion", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "zombie_grab", name: "Rotting Grab", description: "Grabs and slows the target", icon: "🧟", triggerType: "every_n_ticks", triggerValue: 10, effectType: "stun", effectValue: 1, durationTicks: 1, cooldownTicks: 12 },
    ],
    resistances: { pierce: 10, slash: -5, crush: -10, heat: 0, cold: 20, divine: -18 },
  },
  {
    id: "varsoon_lich_guardian",
    name: "Varsoon Lich Guardian",
    description: "An undead lich serving as Varsoon's personal guard",
    level: 24, zone: "Thundering Steppes",
    hp: 620, maxHp: 620, attackRating: 238, defenseRating: 168, mitigation: 122, avoidance: 14,
    attackSpeed: 1.8, damageMin: 48, damageMax: 75, xpReward: 340, goldMin: 22, goldMax: 58,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "silver_pendant", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "iron_bar", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: false,
    abilities: [
      { id: "lich_bolt", name: "Necrotic Bolt", description: "A bolt of concentrated necrotic energy", icon: "☠️", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 80, durationTicks: 0, cooldownTicks: 6, damageType: "divine" },
      { id: "lich_drain", name: "Life Sap", description: "Drains life to sustain undead flesh", icon: "🌀", triggerType: "on_hit_proc", triggerValue: 20, effectType: "life_drain", effectValue: 22, durationTicks: 0, cooldownTicks: 8, damageType: "divine" },
    ],
    resistances: { pierce: 12, slash: 8, crush: -10, heat: 0, cold: 30, divine: -22, magic: 10 },
  },
  {
    id: "varsoon_ghost",
    name: "Varsoon Specter",
    description: "A spectral ghost trapped in Varsoon's ruins by his unrelenting magic",
    level: 26, zone: "Thundering Steppes",
    hp: 720, maxHp: 720, attackRating: 265, defenseRating: 185, mitigation: 138, avoidance: 20,
    attackSpeed: 1.6, damageMin: 56, damageMax: 88, xpReward: 395, goldMin: 28, goldMax: 70,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "silver_pendant", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "specter_wail", name: "Spectral Wail", description: "A terrifying wail that stuns", icon: "👻", triggerType: "every_n_ticks", triggerValue: 9, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
      { id: "specter_drain", name: "Soul Rend", description: "Tears at the soul, draining life", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 7, effectType: "life_drain", effectValue: 30, durationTicks: 0, cooldownTicks: 7, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 20, slash: 10, crush: 0, heat: 0, cold: 30, divine: -25, magic: 15 },
  },
  {
    id: "varsoon_bone_golem",
    name: "Bone Golem",
    description: "A towering construct of fused bones under Varsoon's command",
    level: 28, zone: "Thundering Steppes",
    hp: 980, maxHp: 980, attackRating: 300, defenseRating: 228, mitigation: 175, avoidance: 6,
    attackSpeed: 2.4, damageMin: 70, damageMax: 108, xpReward: 490, goldMin: 35, goldMax: 88,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "mithril_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      { itemId: "iron_helmet", dropChance: 0.07, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_giant", type: "undead", isBoss: false,
    abilities: [
      { id: "bone_slam", name: "Bone Slam", description: "Slams with a massive bone fist", icon: "🦴", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 140, durationTicks: 0, cooldownTicks: 9, damageType: "crush", unavoidable: true },
      { id: "bone_fortify", name: "Bone Fortification", description: "Reinforces its skeletal structure", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 55, effectType: "absorb_shield", effectValue: 350, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 20, slash: -5, crush: -15, heat: 0, cold: 25, divine: -20, magic: 8 },
  },
  {
    id: "varsoon_dark_priest",
    name: "Dark Priest of Varsoon",
    description: "A fanatical undead priest who worships the Undying Lich",
    level: 29, zone: "Thundering Steppes",
    hp: 840, maxHp: 840, attackRating: 285, defenseRating: 200, mitigation: 150, avoidance: 15,
    attackSpeed: 2.0, damageMin: 65, damageMax: 100, xpReward: 450, goldMin: 32, goldMax: 82,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "ringmail_chest", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mana_potion", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: false,
    abilities: [
      { id: "dark_blessing", name: "Dark Blessing", description: "Heals nearby undead with dark prayer", icon: "🙏", triggerType: "once_at_hp", triggerValue: 40, effectType: "self_heal", effectValue: 280, durationTicks: 0, cooldownTicks: 99 },
      { id: "death_bolt", name: "Death Bolt", description: "Fires a bolt of pure death energy", icon: "☠️", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 110, durationTicks: 0, cooldownTicks: 5, damageType: "divine" },
    ],
    resistances: { pierce: 10, slash: 5, crush: -5, heat: 0, cold: 25, divine: -15, magic: 12 },
  },
  {
    id: "varsoon_wraith_captain",
    name: "Wraith Captain Morvax",
    description: "The ghostly captain of Varsoon's spectral guard",
    level: 28, zone: "Thundering Steppes",
    hp: 1400, maxHp: 1400, attackRating: 350, defenseRating: 250, mitigation: 190, avoidance: 18,
    attackSpeed: 1.7, damageMin: 82, damageMax: 128, xpReward: 750, goldMin: 55, goldMax: 140,
    lootTable: [
      { itemId: "mithril_blade", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "silver_pendant", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_ore", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: true, personality: "ancient", grudgeThreshold: 3,
    abilities: [
      { id: "morvax_cleave", name: "Spectral Cleave", description: "A sweeping ghostly blade attack", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 170, durationTicks: 0, cooldownTicks: 7, damageType: "divine" },
      { id: "morvax_drain", name: "Soul Harvest", description: "Harvests souls for life — unavoidable", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 10, effectType: "life_drain", effectValue: 45, durationTicks: 0, cooldownTicks: 10, unavoidable: true, damageType: "divine" },
      { id: "morvax_phase", name: "Phase Shift", description: "Becomes partially intangible at 50% HP", icon: "👻", triggerType: "once_at_hp", triggerValue: 50, effectType: "avoidance_buff", effectValue: 30, durationTicks: 6, cooldownTicks: 99 },
    ],
    resistances: { pierce: 18, slash: 12, crush: 0, heat: 0, cold: 32, divine: -28, magic: 18 },
  },

  // ── NEKTROPOS CASTLE — DUNGEON ENEMIES (Levels 25-35) ────────────────────
  {
    id: "nektopos_shade",
    name: "Nektropos Shade",
    description: "A shadow wraith servant of the Everling family curse",
    level: 25, zone: "Nektulos Forest",
    hp: 480, maxHp: 480, attackRating: 218, defenseRating: 152, mitigation: 112, avoidance: 22,
    attackSpeed: 1.5, damageMin: 42, damageMax: 68, xpReward: 290, goldMin: 20, goldMax: 52,
    lootTable: [
      { itemId: "spider_silk", dropChance: 0.5, minQuantity: 1, maxQuantity: 3 },
    { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    { itemId: "wolf_hide", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "shade_rend", name: "Shadow Rend", description: "Rends the target with claws of shadow", icon: "🌑", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 75, durationTicks: 0, cooldownTicks: 7, damageType: "magic" },
    ],
    resistances: { pierce: 15, slash: 10, crush: 0, heat: 5, cold: 20, divine: -20, magic: 20 },
  },
  {
    id: "nektopos_revenant",
    name: "Everling Revenant",
    description: "The restless spirit of a Nektropos Castle servant, bound to eternal servitude",
    level: 27, zone: "Nektulos Forest",
    hp: 600, maxHp: 600, attackRating: 248, defenseRating: 172, mitigation: 128, avoidance: 16,
    attackSpeed: 1.8, damageMin: 50, damageMax: 78, xpReward: 340, goldMin: 24, goldMax: 62,
    lootTable: [
      { itemId: "mithril_ore", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "spider_silk", dropChance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dark_elf", type: "undead", isBoss: false,
    abilities: [
      { id: "revenant_grasp", name: "Revenant Grasp", description: "Icy fingers drain vitality", icon: "🖐️", triggerType: "on_hit_proc", triggerValue: 20, effectType: "life_drain", effectValue: 28, durationTicks: 0, cooldownTicks: 8, damageType: "divine" },
    ],
    resistances: { pierce: 12, slash: 8, crush: -5, heat: 0, cold: 28, divine: -18, magic: 12 },
  },
  {
    id: "nektopos_gargoyle",
    name: "Nektropos Gargoyle",
    description: "A stone gargoyle animated to guard the castle battlements",
    level: 29, zone: "Nektulos Forest",
    hp: 760, maxHp: 760, attackRating: 278, defenseRating: 210, mitigation: 162, avoidance: 12,
    attackSpeed: 2.0, damageMin: 58, damageMax: 92, xpReward: 400, goldMin: 28, goldMax: 72,
    lootTable: [
      { itemId: "iron_bar", dropChance: 0.4, minQuantity: 2, maxQuantity: 3 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "elemental", isBoss: false,
    abilities: [
      { id: "gargoyle_dive", name: "Gargoyle Dive", description: "Plunges from above with crushing force", icon: "🏚️", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 125, durationTicks: 0, cooldownTicks: 9, damageType: "crush" },
      { id: "stone_skin_g", name: "Stone Skin", description: "Hardens to near-stone at 60% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 280, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 22, slash: 18, crush: -12, heat: 10, cold: 10, divine: 0, magic: 12 },
  },
  {
    id: "nektopos_dark_knight",
    name: "Nektropos Dark Knight",
    description: "A death knight bound to protect the Everling lineage",
    level: 31, zone: "Nektulos Forest",
    hp: 960, maxHp: 960, attackRating: 330, defenseRating: 238, mitigation: 182, avoidance: 10,
    attackSpeed: 1.9, damageMin: 72, damageMax: 112, xpReward: 490, goldMin: 35, goldMax: 90,
    lootTable: [
      { itemId: "steel_legplates", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_ore", dropChance: 0.18, minQuantity: 1, maxQuantity: 2 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dark_elf", type: "undead", isBoss: false,
    abilities: [
      { id: "dk_strike", name: "Death Strike", description: "A powerful blow infused with death energy", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 150, durationTicks: 0, cooldownTicks: 7, damageType: "divine" },
      { id: "dk_aura", name: "Aura of Death", description: "Radiates death energy — unavoidable drain", icon: "💀", triggerType: "every_n_ticks", triggerValue: 12, effectType: "life_drain", effectValue: 35, durationTicks: 0, cooldownTicks: 12, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 10, slash: 5, crush: 0, heat: 0, cold: 25, divine: -20, magic: 10 },
  },
  {
    id: "nektopos_banshee",
    name: "Everling Banshee",
    description: "The tortured spirit of an Everling daughter, screaming in eternal agony",
    level: 33, zone: "Nektulos Forest",
    hp: 1050, maxHp: 1050, attackRating: 360, defenseRating: 248, mitigation: 188, avoidance: 18,
    attackSpeed: 1.6, damageMin: 80, damageMax: 125, xpReward: 550, goldMin: 38, goldMax: 98,
    lootTable: [
      { itemId: "ring_of_power", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    { itemId: "iron_ore", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_skeleton", type: "undead", isBoss: false,
    abilities: [
      { id: "banshee_scream", name: "Banshee Scream", description: "A soul-shattering scream — unavoidable", icon: "😱", triggerType: "every_n_ticks", triggerValue: 8, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 10, unavoidable: true },
      { id: "banshee_wail", name: "Death Wail", description: "The wail of death itself drains life", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 11, effectType: "life_drain", effectValue: 42, durationTicks: 0, cooldownTicks: 11, unavoidable: true, damageType: "divine" },
    ],
    resistances: { pierce: 18, slash: 12, crush: 0, heat: 0, cold: 28, divine: -22, magic: 20 },
  },
  {
    id: "nektopos_everling_guard",
    name: "Everling Spectral Guard",
    description: "Elite spectral knights serving Lord Everling beyond death",
    level: 34, zone: "Nektulos Forest",
    hp: 1200, maxHp: 1200, attackRating: 390, defenseRating: 268, mitigation: 205, avoidance: 14,
    attackSpeed: 1.8, damageMin: 90, damageMax: 140, xpReward: 600, goldMin: 42, goldMax: 108,
    lootTable: [
      { itemId: "steel_platemail", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      { itemId: "mithril_ore", dropChance: 0.25, minQuantity: 1, maxQuantity: 2 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dark_elf", type: "undead", isBoss: false,
    abilities: [
      { id: "eg_intercept", name: "Spectral Intercept", description: "A sweeping spectral blade", icon: "⚔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 175, durationTicks: 0, cooldownTicks: 8, damageType: "divine" },
      { id: "eg_shield_wall", name: "Shield Wall", description: "Forms a spectral shield at 65% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 65, effectType: "absorb_shield", effectValue: 450, durationTicks: 5, cooldownTicks: 99 },
    ],
    resistances: { pierce: 14, slash: 8, crush: -5, heat: 0, cold: 26, divine: -20, magic: 12 },
  },
  {
    id: "nektopos_high_inquisitor",
    name: "High Inquisitor Dvinn",
    description: "Nektropos Castle's most feared undead torturer and mini-boss",
    level: 33, zone: "Nektulos Forest",
    hp: 2400, maxHp: 2400, attackRating: 500, defenseRating: 358, mitigation: 275, avoidance: 16,
    attackSpeed: 1.8, damageMin: 112, damageMax: 175, xpReward: 1100, goldMin: 80, goldMax: 200,
    lootTable: [
      { itemId: "darkblade", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_power", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "spider_silk", dropChance: 0.35, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: true, personality: "cunning", grudgeThreshold: 3,
    abilities: [
      { id: "dvinn_torture", name: "Soul Torture", description: "Inflicts incredible psychic pain — unavoidable", icon: "🩸", triggerType: "every_n_ticks", triggerValue: 6, effectType: "bleed_dot", effectValue: 45, durationTicks: 5, cooldownTicks: 8, unavoidable: true, damageType: "divine" },
      { id: "dvinn_drain", name: "Dark Harvest", description: "Drains life in a burst", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 10, effectType: "life_drain", effectValue: 60, durationTicks: 0, cooldownTicks: 10, unavoidable: true, damageType: "divine" },
      { id: "dvinn_shield", name: "Torturer's Ward", description: "Dark magic forms a shield at 50% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 800, durationTicks: 6, cooldownTicks: 99 },
      { id: "dvinn_fear", name: "Inquisitor's Gaze", description: "A paralyzing stare of pure terror", icon: "😱", triggerType: "every_n_ticks", triggerValue: 12, effectType: "fear", effectValue: 2, durationTicks: 2, cooldownTicks: 15, unavoidable: true },
    ],
    resistances: { pierce: 14, slash: 10, crush: 0, heat: 0, cold: 28, divine: -20, magic: 15 },
  },
  {
    id: "nektopos_lord_everling",
    name: "Lord Everling",
    description: "The immortal lord of Nektropos Castle — a powerful undead necromancer who refuses to die",
    level: 35, zone: "Nektulos Forest",
    hp: 8000, maxHp: 8000, attackRating: 1100, defenseRating: 880, mitigation: 680, avoidance: 18,
    attackSpeed: 1.8, damageMin: 200, damageMax: 310, xpReward: 5000, goldMin: 350, goldMax: 900,
    lootTable: [
      { itemId: "necklace_of_the_deep", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "darkblade", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_the_ancients", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "everling_signet", dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      { itemId: "everling_dark_shard", dropChance: 0.7, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_expert_shadow_mantle", dropChance: 0.55, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_lich", type: "undead", isBoss: true, personality: "cunning", grudgeThreshold: 3,
    abilities: [
      { id: "everling_doom", name: "Everling's Doom", description: "Channels the castle's curse upon the target — unavoidable", icon: "☠️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "life_drain", effectValue: 65, durationTicks: 0, cooldownTicks: 7, unavoidable: true, damageType: "divine" },
      { id: "everling_necro", name: "Necromantic Fury", description: "Unleashes necromantic power in a deadly burst", icon: "💀", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 350, durationTicks: 0, cooldownTicks: 10, damageType: "magic", unavoidable: true },
      { id: "everling_regen", name: "Undying Resilience", description: "Heals with stolen life energy at 60% HP", icon: "💊", triggerType: "once_at_hp", triggerValue: 60, effectType: "self_heal", effectValue: 2500, durationTicks: 0, cooldownTicks: 99 },
      { id: "everling_ward", name: "Necromancer's Ward", description: "A shield of pure death energy at 40% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 40, effectType: "absorb_shield", effectValue: 2200, durationTicks: 7, cooldownTicks: 99 },
      { id: "everling_terror", name: "Lord's Terror", description: "Paralyzing dread fills the target", icon: "😱", triggerType: "every_n_ticks", triggerValue: 13, effectType: "fear", effectValue: 3, durationTicks: 3, cooldownTicks: 18, unavoidable: true },
    ],
    resistances: { pierce: 18, slash: 12, crush: 0, heat: 0, cold: 35, divine: -30, magic: 20 },
  },

  // ── PERMAFROST KEEP — DUNGEON ENEMIES (Levels 35-45) ─────────────────────
  {
    id: "permafrost_yeti",
    name: "Permafrost Yeti",
    description: "A massive yeti adapted to the killing cold of Permafrost Keep",
    level: 36, zone: "Everfrost Peaks",
    hp: 1550, maxHp: 1550, attackRating: 498, defenseRating: 368, mitigation: 278, avoidance: 8,
    attackSpeed: 2.2, damageMin: 112, damageMax: 175, xpReward: 760, goldMin: 55, goldMax: 145,
    lootTable: [
      { itemId: "wolf_hide", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: "permafrost_shard", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_giant", type: "beast", isBoss: false,
    abilities: [
      { id: "yeti_smash", name: "Ice Smash", description: "Crushes with frozen fists", icon: "🏔️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 200, durationTicks: 0, cooldownTicks: 8, damageType: "cold", unavoidable: true },
    ],
    resistances: { pierce: 5, slash: 5, crush: -12, heat: -22, cold: 45, divine: 0 },
  },
  {
    id: "permafrost_ice_golem",
    name: "Permafrost Ice Golem",
    description: "A guardian golem sculpted from pure eternal ice",
    level: 38, zone: "Everfrost Peaks",
    hp: 2000, maxHp: 2000, attackRating: 560, defenseRating: 420, mitigation: 330, avoidance: 4,
    attackSpeed: 2.6, damageMin: 130, damageMax: 202, xpReward: 900, goldMin: 65, goldMax: 170,
    lootTable: [
      { itemId: "permafrost_shard", dropChance: 0.5, minQuantity: 2, maxQuantity: 4 },
      { itemId: "mithril_ore", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_frost_giant", type: "elemental", isBoss: false,
    abilities: [
      { id: "ice_golem_fist", name: "Glacial Fist", description: "A punch that flash-freezes on contact — unavoidable", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 10, effectType: "stun", effectValue: 2, durationTicks: 2, cooldownTicks: 12, unavoidable: true },
      { id: "ice_golem_armor", name: "Glacial Armor", description: "Reforms shattered ice into a fresh shield", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 65, effectType: "absorb_shield", effectValue: 700, durationTicks: 6, cooldownTicks: 99 },
    ],
    resistances: { pierce: 18, slash: 12, crush: -10, heat: -28, cold: 55, divine: 0, magic: 12 },
  },
  {
    id: "permafrost_frost_knight",
    name: "Frost Knight",
    description: "An elite knight of Permafrost Keep, encased in magical ice armor",
    level: 40, zone: "Everfrost Peaks",
    hp: 2400, maxHp: 2400, attackRating: 640, defenseRating: 475, mitigation: 370, avoidance: 10,
    attackSpeed: 1.9, damageMin: 148, damageMax: 230, xpReward: 1100, goldMin: 80, goldMax: 210,
    lootTable: [
      { itemId: "steel_platemail", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "permafrost_shard", dropChance: 0.4, minQuantity: 2, maxQuantity: 4 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_frost_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "frost_knight_lance", name: "Ice Lance", description: "A lance of ice pierces through armor", icon: "🗡️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 230, durationTicks: 0, cooldownTicks: 8, damageType: "cold" },
      { id: "frost_knight_aura", name: "Frozen Aura", description: "A freezing aura that slows attacks", icon: "❄️", triggerType: "every_n_ticks", triggerValue: 15, effectType: "bleed_dot", effectValue: 30, durationTicks: 4, cooldownTicks: 18, damageType: "cold" },
    ],
    resistances: { pierce: 8, slash: 5, crush: -8, heat: -22, cold: 48, divine: 0, magic: 10 },
  },
  {
    id: "permafrost_blizzard_elemental",
    name: "Blizzard Elemental",
    description: "Pure concentrated blizzard energy given form and fury",
    level: 42, zone: "Everfrost Peaks",
    hp: 2800, maxHp: 2800, attackRating: 700, defenseRating: 510, mitigation: 395, avoidance: 20,
    attackSpeed: 1.6, damageMin: 165, damageMax: 255, xpReward: 1300, goldMin: 95, goldMax: 250,
    lootTable: [
      { itemId: "permafrost_shard", dropChance: 0.7, minQuantity: 3, maxQuantity: 6 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "wolf_hide", dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "blizzard_burst", name: "Blizzard Burst", description: "Erupts in a storm of ice and wind — unavoidable", icon: "🌨️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 280, durationTicks: 0, cooldownTicks: 7, damageType: "cold", unavoidable: true },
      { id: "blizzard_freeze", name: "Deep Freeze", description: "Encases the target in deep ice, stunning them", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 14, effectType: "stun", effectValue: 3, durationTicks: 3, cooldownTicks: 18, unavoidable: true },
    ],
    resistances: { pierce: -5, slash: 5, crush: 10, heat: -30, cold: 60, divine: 0, magic: 25 },
  },
  {
    id: "permafrost_ice_witch_guardian",
    name: "Permafrost Ice Witch",
    description: "A powerful cryomancer guarding Permafrost Keep's inner sanctum",
    level: 44, zone: "Everfrost Peaks",
    hp: 3000, maxHp: 3000, attackRating: 740, defenseRating: 545, mitigation: 422, avoidance: 16,
    attackSpeed: 2.0, damageMin: 178, damageMax: 275, xpReward: 1450, goldMin: 108, goldMax: 285,
    lootTable: [
      { itemId: "permafrost_shard", dropChance: 0.6, minQuantity: 2, maxQuantity: 4 },
      { itemId: "helm_of_the_guardian", dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_gnoll_shaman", type: "humanoid", isBoss: false,
    abilities: [
      { id: "arctic_blast", name: "Arctic Blast", description: "Channels an arctic torrent — inescapable", icon: "🌬️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 320, durationTicks: 0, cooldownTicks: 8, damageType: "cold", unavoidable: true },
      { id: "ice_prison_w", name: "Ice Prison", description: "Encases the target in a prison of ice", icon: "🏔️", triggerType: "every_n_ticks", triggerValue: 15, effectType: "stun", effectValue: 3, durationTicks: 3, cooldownTicks: 20, unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: -25, cold: 52, divine: 0, magic: 22 },
  },
  {
    id: "permafrost_frost_warden",
    name: "Frost Warden Icegrave",
    description: "The legendary warden of Permafrost Keep's deepest chambers — a feared mini-boss",
    level: 42, zone: "Everfrost Peaks",
    hp: 5500, maxHp: 5500, attackRating: 880, defenseRating: 668, mitigation: 520, avoidance: 12,
    attackSpeed: 1.9, damageMin: 210, damageMax: 325, xpReward: 2400, goldMin: 175, goldMax: 460,
    lootTable: [
      { itemId: "helm_of_the_guardian", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "permafrost_shard", dropChance: 0.8, minQuantity: 4, maxQuantity: 8 },
    { itemId: "everfrost_mammoth_ivory", dropChance: 0.3, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_frost_giant", type: "humanoid", isBoss: true, personality: "cold", grudgeThreshold: 3,
    abilities: [
      { id: "icegrave_lance", name: "Grave Ice Lance", description: "A colossal lance of ancient ice — unavoidable", icon: "❄️", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 380, durationTicks: 0, cooldownTicks: 7, damageType: "cold", unavoidable: true },
      { id: "icegrave_blizzard", name: "Permafrost Blizzard", description: "Summons a cataclysmic blizzard", icon: "🌨️", triggerType: "every_n_ticks", triggerValue: 12, effectType: "damage_burst", effectValue: 500, durationTicks: 0, cooldownTicks: 14, damageType: "cold", unavoidable: true },
      { id: "icegrave_shell", name: "Eternal Ice Shell", description: "An indestructible shell of eternal ice at 55% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 55, effectType: "absorb_shield", effectValue: 1800, durationTicks: 7, cooldownTicks: 99 },
      { id: "icegrave_freeze", name: "Mass Freeze", description: "Deep freezes the target solid — unavoidable stun", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 16, effectType: "stun", effectValue: 3, durationTicks: 3, cooldownTicks: 20, unavoidable: true },
    ],
    resistances: { pierce: 12, slash: 8, crush: -8, heat: -30, cold: 58, divine: 0, magic: 18 },
  },

  // ── LADY VOX — Permafrost Keep Main Boss (Level 45) ─────────────────────
  {
    id: "lady_vox",
    name: "Lady Vox",
    description: "The ancient white dragon queen of Permafrost — her breath alone can freeze armies solid",
    level: 45, zone: "Everfrost Peaks",
    hp: 18000, maxHp: 18000, attackRating: 2500, defenseRating: 2000, mitigation: 1600, avoidance: 18,
    attackSpeed: 2.0, damageMin: 480, damageMax: 750, xpReward: 9000, goldMin: 650, goldMax: 1800,
    lootTable: [
      { itemId: "vox_frost_fang", dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      { itemId: "vox_ice_crown", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "gauntlets_of_might", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "permafrost_shard", dropChance: 1.0, minQuantity: 5, maxQuantity: 10 },
      { itemId: "scroll_expert_dragonscale", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "scroll_mythic_eternal_crown", dropChance: 0.03, minQuantity: 1, maxQuantity: 1 },
      { itemId: "vox_ice_scale", dropChance: 0.8, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_dragon", type: "dragon", isBoss: true, personality: "arrogant", grudgeThreshold: 3,
    abilities: [
      { id: "vox_blizzard_breath", name: "Blizzard Breath", description: "An avalanche of glacial cold — utterly inescapable", icon: "🌨️", triggerType: "every_n_ticks", triggerValue: 6, effectType: "damage_burst", effectValue: 600, durationTicks: 0, cooldownTicks: 6, damageType: "cold", unavoidable: true },
      { id: "vox_deep_freeze", name: "Deep Freeze", description: "Encases the target in permafrost — a crippling stun", icon: "🧊", triggerType: "every_n_ticks", triggerValue: 9, effectType: "stun", effectValue: 3, durationTicks: 3, cooldownTicks: 9, unavoidable: true },
      { id: "vox_ice_storm", name: "Ice Storm", description: "Summons a cataclysmic ice storm — damage cannot be avoided", icon: "❄️", triggerType: "every_n_ticks", triggerValue: 14, effectType: "bleed_dot", effectValue: 120, durationTicks: 5, cooldownTicks: 16, damageType: "cold", unavoidable: true },
      { id: "vox_scales", name: "Dragon Scales of Vox", description: "Her legendary ice scales harden further at 60% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 5000, durationTicks: 7, cooldownTicks: 999 },
      { id: "vox_wrath", name: "Queen's Wrath", description: "A devastating counterattack at 30% HP — the power of a goddess", icon: "⚡", triggerType: "once_at_hp", triggerValue: 30, effectType: "damage_burst", effectValue: 1200, durationTicks: 0, cooldownTicks: 999, damageType: "cold", unavoidable: true },
      { id: "vox_ancient_resilience", name: "Ancient Dragon's Resilience", description: "Her draconic vitality surges at 20% HP, healing her wounds", icon: "💙", triggerType: "once_at_hp", triggerValue: 20, effectType: "self_heal", effectValue: 3500, durationTicks: 0, cooldownTicks: 999 },
    ],
    resistances: { pierce: 25, slash: 15, crush: 5, heat: -20, cold: 70, divine: 10, magic: 20 },
  },

  // ── SOLUSEK'S EYE — DUNGEON ENEMIES (Levels 42-52) ───────────────────────
  {
    id: "solusek_goblin_firestarter",
    name: "Solusek Goblin Firestarter",
    description: "A goblin pyromancer who thrives in Solusek's volcanic heat",
    level: 42, zone: "Lavastorm Mountains",
    hp: 2400, maxHp: 2400, attackRating: 690, defenseRating: 520, mitigation: 400, avoidance: 15,
    attackSpeed: 1.5, damageMin: 135, damageMax: 210, xpReward: 1200, goldMin: 85, goldMax: 225,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.55, minQuantity: 1, maxQuantity: 3 },
      { itemId: "coal", dropChance: 0.4, minQuantity: 2, maxQuantity: 4 },
      { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
      { itemId: "fire_goblin_ash", dropChance: 0.18, minQuantity: 1, maxQuantity: 2 },
    ],
    spriteId: "enemy_imp", type: "humanoid", isBoss: false,
    abilities: [
      { id: "fire_bomb", name: "Fire Bomb", description: "Tosses a volatile fire bomb — unavoidable explosion", icon: "💣", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 220, durationTicks: 0, cooldownTicks: 7, damageType: "heat", unavoidable: true },
    ],
    resistances: { pierce: 0, slash: 0, crush: 0, heat: 45, cold: -25, divine: 0, magic: 10 },
  },
  {
    id: "solusek_fire_sprite",
    name: "Solusek Fire Sprite",
    description: "A tiny but devastating sprite of living flame",
    level: 44, zone: "Lavastorm Mountains",
    hp: 2700, maxHp: 2700, attackRating: 740, defenseRating: 558, mitigation: 432, avoidance: 25,
    attackSpeed: 1.3, damageMin: 148, damageMax: 230, xpReward: 1350, goldMin: 95, goldMax: 252,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.7, minQuantity: 2, maxQuantity: 4 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    { itemId: "lavastorm_fire_opal", dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "sprite_scorch", name: "Sprite Scorch", description: "An intense burst of flame energy", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 5, effectType: "damage_burst", effectValue: 190, durationTicks: 0, cooldownTicks: 5, damageType: "heat" },
      { id: "sprite_incinerate", name: "Incinerate", description: "Sets the target on fire with a DoT burn", icon: "🌋", triggerType: "on_hit_proc", triggerValue: 20, effectType: "bleed_dot", effectValue: 55, durationTicks: 5, cooldownTicks: 8, damageType: "heat" },
    ],
    resistances: { pierce: -5, slash: 0, crush: 5, heat: 55, cold: -30, divine: 0, magic: 15 },
  },
  {
    id: "solusek_lava_walker",
    name: "Solusek Lava Walker",
    description: "A towering elemental that walks on liquid magma as if it were solid ground",
    level: 46, zone: "Lavastorm Mountains",
    hp: 3800, maxHp: 3800, attackRating: 860, defenseRating: 660, mitigation: 520, avoidance: 8,
    attackSpeed: 2.2, damageMin: 185, damageMax: 288, xpReward: 1750, goldMin: 128, goldMax: 340,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.8, minQuantity: 2, maxQuantity: 5 },
      { itemId: "mithril_ore", dropChance: 0.15, minQuantity: 1, maxQuantity: 2 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "lava_surge", name: "Lava Surge", description: "Rides a wave of lava into the target — unavoidable", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 9, effectType: "damage_burst", effectValue: 340, durationTicks: 0, cooldownTicks: 9, damageType: "heat", unavoidable: true },
      { id: "lava_absorption", name: "Lava Absorption", description: "Absorbs surrounding lava to heal", icon: "💊", triggerType: "once_at_hp", triggerValue: 55, effectType: "self_heal", effectValue: 1200, durationTicks: 0, cooldownTicks: 99 },
    ],
    resistances: { pierce: 5, slash: 10, crush: -5, heat: 60, cold: -35, divine: 0, magic: 12 },
  },
  {
    id: "solusek_fire_giant",
    name: "Solusek Fire Giant",
    description: "A colossal fire giant forged in Solusek's volcanic furnace",
    level: 48, zone: "Lavastorm Mountains",
    hp: 5500, maxHp: 5500, attackRating: 1100, defenseRating: 850, mitigation: 680, avoidance: 5,
    attackSpeed: 2.4, damageMin: 240, damageMax: 375, xpReward: 2500, goldMin: 180, goldMax: 480,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.8, minQuantity: 3, maxQuantity: 6 },
      { itemId: "breastplate_of_valor", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_frost_giant", type: "humanoid", isBoss: false,
    abilities: [
      { id: "fire_giant_slam", name: "Volcanic Slam", description: "Slams the earth, sending volcanic shockwaves — unavoidable", icon: "🌋", triggerType: "every_n_ticks", triggerValue: 10, effectType: "damage_burst", effectValue: 500, durationTicks: 0, cooldownTicks: 10, damageType: "heat", unavoidable: true },
      { id: "fire_giant_shield", name: "Molten Armor", description: "Molten rock coats him, absorbing damage at 60% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 60, effectType: "absorb_shield", effectValue: 1800, durationTicks: 7, cooldownTicks: 99 },
    ],
    resistances: { pierce: 10, slash: 10, crush: -8, heat: 62, cold: -30, divine: 5, magic: 15 },
  },
  {
    id: "solusek_archon",
    name: "Solusek Archon",
    description: "An elder fire elemental serving as Solusek's temple guardian",
    level: 50, zone: "Lavastorm Mountains",
    hp: 7500, maxHp: 7500, attackRating: 1400, defenseRating: 1100, mitigation: 880, avoidance: 12,
    attackSpeed: 1.9, damageMin: 300, damageMax: 465, xpReward: 3500, goldMin: 250, goldMax: 660,
    lootTable: [
      { itemId: "fire_opal", dropChance: 0.9, minQuantity: 4, maxQuantity: 8 },
      { itemId: "gauntlets_of_might", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lava_elemental", type: "elemental", isBoss: false,
    abilities: [
      { id: "archon_inferno", name: "Archon Inferno", description: "Unleashes a cataclysmic inferno — utterly unavoidable", icon: "☀️", triggerType: "every_n_ticks", triggerValue: 8, effectType: "damage_burst", effectValue: 600, durationTicks: 0, cooldownTicks: 8, damageType: "heat", unavoidable: true },
      { id: "archon_aura", name: "Aura of Sol", description: "Radiates punishing heat that drains", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 5, effectType: "life_drain", effectValue: 80, durationTicks: 0, cooldownTicks: 5, unavoidable: true, damageType: "heat" },
      { id: "archon_shell", name: "Solar Shell", description: "A shell of pure solar energy at 65% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 65, effectType: "absorb_shield", effectValue: 2500, durationTicks: 8, cooldownTicks: 99 },
    ],
    resistances: { pierce: 15, slash: 12, crush: 5, heat: 65, cold: -35, divine: 10, magic: 20 },
  },
  {
    id: "solusek_high_priest_ignus",
    name: "High Priest Ignus",
    description: "The fanatical high priest of Solusek Ro — a terrifying pyromancer mini-boss",
    level: 48, zone: "Lavastorm Mountains",
    hp: 9000, maxHp: 9000, attackRating: 1500, defenseRating: 1200, mitigation: 960, avoidance: 14,
    attackSpeed: 1.8, damageMin: 310, damageMax: 485, xpReward: 4200, goldMin: 300, goldMax: 800,
    lootTable: [
      { itemId: "breastplate_of_valor", dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      { itemId: "ring_of_the_ancients", dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "lavastorm_magma_slag", dropChance: 0.4, minQuantity: 1, maxQuantity: 3 },
    ],
    spriteId: "enemy_lava_elemental", type: "humanoid", isBoss: true, personality: "cunning", grudgeThreshold: 3,
    abilities: [
      { id: "ignus_pyre", name: "Funeral Pyre", description: "Calls down a column of divine fire — inescapable", icon: "🔥", triggerType: "every_n_ticks", triggerValue: 7, effectType: "damage_burst", effectValue: 700, durationTicks: 0, cooldownTicks: 7, damageType: "heat", unavoidable: true },
      { id: "ignus_drain", name: "Soul Burn", description: "Burns and drains the soul simultaneously", icon: "🌀", triggerType: "every_n_ticks", triggerValue: 10, effectType: "life_drain", effectValue: 100, durationTicks: 0, cooldownTicks: 10, unavoidable: true, damageType: "divine" },
      { id: "ignus_ignite", name: "Ignite", description: "Sets the target ablaze with an intense DoT", icon: "🩸", triggerType: "every_n_ticks", triggerValue: 12, effectType: "bleed_dot", effectValue: 80, durationTicks: 5, cooldownTicks: 15, unavoidable: true, damageType: "heat" },
      { id: "ignus_ward", name: "Ignus Ward", description: "A ward of holy fire at 50% HP", icon: "🛡️", triggerType: "once_at_hp", triggerValue: 50, effectType: "absorb_shield", effectValue: 3000, durationTicks: 7, cooldownTicks: 99 },
    ],
    resistances: { pierce: 20, slash: 15, crush: 5, heat: 68, cold: -35, divine: 15, magic: 20 },
  },
];

// Zone-specific materials, named boss drops, and dungeon trophies
ITEMS.push(
  // ── Antonica materials & boss drops ─────────────────────────────────────
  { id: "antonica_gnoll_claw", name: "Gnoll Chieftain's Claw", description: "A trophy claw from Grolnak, chieftain of Antonica's gnolls", type: "material", slot: "none", rarity: "uncommon", level: 15, stats: { attackRating: 2 }, sellPrice: 18, spriteId: "material_claw" },
  { id: "antonica_gnoll_pelt", name: "Gnoll War Pelt", description: "A thick gnoll pelt worn by Antonica's toughest warriors", type: "material", slot: "none", rarity: "common", level: 10, stats: {}, sellPrice: 8, spriteId: "material_hide" },
  { id: "antonica_bone_fragment", name: "Risen Bone Fragment", description: "A bone fragment from the skeletons haunting Antonica's plains", type: "material", slot: "none", rarity: "common", level: 8, stats: {}, sellPrice: 5, spriteId: "material_bone" },
  // ── Enchanted Lands materials & boss drops ───────────────────────────────
  { id: "enchanted_dust", name: "Enchanted Fae Dust", description: "Shimmering dust left behind by Enchanted Lands fae — used in high-end tailoring", type: "material", slot: "none", rarity: "uncommon", level: 28, stats: {}, sellPrice: 22, spriteId: "material_dust" },
  { id: "titania_crown_shard", name: "Crown Shard of Titania", description: "A fragment from Queen Titania's arcane crown, crackling with fae energy", type: "quest", slot: "none", rarity: "legendary", level: 35, stats: { intelligence: 12, wisdom: 8 }, sellPrice: 800, spriteId: "accessory_crown" },
  { id: "fae_wing_membrane", name: "Fae Wing Membrane", description: "The delicate wing membrane of a Lesser Faydark pixie, prized by tailors", type: "material", slot: "none", rarity: "common", level: 26, stats: {}, sellPrice: 12, spriteId: "material_feather" },
  { id: "brownie_charm", name: "Brownie Luck Charm", description: "A charm carved by Enchanted Lands brownies — brings good fortune", type: "accessory", slot: "charm", rarity: "uncommon", level: 28, stats: { charisma: 5, avoidance: 3 }, sellPrice: 75, spriteId: "accessory_charm" },
  // ── Zek materials & boss drops ───────────────────────────────────────────
  { id: "zek_war_rune", name: "Deathfist War Rune", description: "An orc war rune carved by Deathfist shamans — used in orcish tinkering", type: "material", slot: "none", rarity: "uncommon", level: 33, stats: {}, sellPrice: 28, spriteId: "material_rune" },
  { id: "deathfist_seal", name: "Deathfist Clan Seal", description: "The legendary seal of the Deathfist Clan's Deathcaller — legendary proof of victory in Zek", type: "quest", slot: "none", rarity: "legendary", level: 40, stats: { strength: 10, stamina: 8 }, sellPrice: 600, spriteId: "material_seal" },
  { id: "orc_warlord_helm", name: "Warlord's War Helm", description: "The ornate war helm of a Deathfist Warlord, still dented from battle", type: "armor", slot: "head", rarity: "rare", level: 37, stats: { stamina: 14, strength: 8, defenseRating: 80, mitigation: 55 }, sellPrice: 480, spriteId: "helm_orc" },
  { id: "zek_berserker_axe", name: "Berserker's Cleaving Axe", description: "A double-headed axe wielded by Zek's deadliest berserkers", type: "weapon", slot: "primary", rarity: "rare", level: 35, stats: { strength: 22, attackRating: 160, critChance: 5, weaponDamageMin: 80, weaponDamageMax: 125, weaponDelay: 2.2 }, sellPrice: 650, spriteId: "axe_orc" },
  // ── Lesser Faydark materials & boss drops ────────────────────────────────
  { id: "faydark_wood", name: "Faydark Ancient Wood", description: "Wood from ancient Faydark trees, infused with fae energy — prized by tinkerers", type: "material", slot: "none", rarity: "uncommon", level: 33, stats: {}, sellPrice: 24, spriteId: "material_wood" },
  { id: "grimthorn_bark", name: "Lord Grimthorn's Ancient Bark", description: "A shard of Grimthorn's legendary bark, radiating primal forest power", type: "quest", slot: "none", rarity: "legendary", level: 40, stats: { stamina: 15, defenseRating: 90 }, sellPrice: 900, spriteId: "material_bark" },
  { id: "faydark_spirit_gem", name: "Faydark Spirit Gem", description: "A gem crystallized from forest spirit energy deep in the Lesser Faydark", type: "material", slot: "none", rarity: "uncommon", level: 35, stats: {}, sellPrice: 35, spriteId: "gem_green" },
  { id: "grimthorn_staff", name: "Staff of the Thornlord", description: "Lord Grimthorn's legendary staff, crackling with primordial forest magic", type: "weapon", slot: "primary", rarity: "fabled", level: 40, stats: { intelligence: 30, wisdom: 18, attackRating: 260, critChance: 8, weaponDamageMin: 100, weaponDamageMax: 155, weaponDelay: 2.2 }, sellPrice: 3200, spriteId: "staff_fabled", noSell: true },
  // ── Feerrott materials & boss drops ─────────────────────────────────────
  { id: "feerrott_scale", name: "Feerrott Lizardman Scale", description: "A tough lizardman scale from the Feerrott swamps, used in heavy armor crafting", type: "material", slot: "none", rarity: "uncommon", level: 43, stats: {}, sellPrice: 32, spriteId: "material_scale" },
  { id: "cazic_idol", name: "Idol of Cazic-Thule", description: "A terrifying idol dropped by the Avatar of Cazic-Thule, the God of Fear — a legendary trophy", type: "quest", slot: "none", rarity: "legendary", level: 50, stats: { wisdom: 20, charisma: -10, defenseRating: 120 }, sellPrice: 2000, spriteId: "material_idol" },
  { id: "swamp_venom_gland", name: "Swamp Spider Venom Gland", description: "A venom gland from the Swamp Spider Queen — used in master-level alchemy", type: "material", slot: "none", rarity: "uncommon", level: 43, stats: {}, sellPrice: 28, spriteId: "material_venom" },
  { id: "bog_giant_club", name: "Bog Giant's Club", description: "An enormous club torn from the hands of a Feerrott Bog Giant", type: "weapon", slot: "primary", rarity: "rare", level: 45, stats: { strength: 28, stamina: 12, attackRating: 280, weaponDamageMin: 120, weaponDamageMax: 185, weaponDelay: 3.0 }, sellPrice: 900, spriteId: "club_giant" },
  { id: "cazic_fear_cloak", name: "Cloak of the Fearmonger", description: "A cloak soaked in the terror of Cazic-Thule — enemies feel dread in your presence", type: "armor", slot: "back", rarity: "legendary", level: 50, stats: { charisma: 20, avoidance: 15, defenseRating: 110, stamina: 20 }, sellPrice: 3500, spriteId: "cloak_dark" },
  // ── Everfrost / Permafrost materials & boss drops ────────────────────────
  { id: "permafrost_shard", name: "Permafrost Crystal Shard", description: "A fragment of eternal ice from Permafrost Keep, prized by jewelers and mages", type: "material", slot: "none", rarity: "uncommon", level: 38, stats: {}, sellPrice: 30, spriteId: "gem_ice" },
  { id: "vox_frost_fang", name: "Vox's Frost Fang", description: "A legendary fang broken from Lady Vox herself — radiates lethal cold", type: "weapon", slot: "primary", rarity: "legendary", level: 45, stats: { intelligence: 28, wisdom: 15, attackRating: 350, critChance: 10, weaponDamageMin: 130, weaponDamageMax: 200, weaponDelay: 2.0 }, sellPrice: 6500, spriteId: "sword_fabled" },
  { id: "vox_ice_crown", name: "Ice Crown of Vox", description: "The legendary crown worn by Lady Vox, Queen of Permafrost — grants mastery over cold magic", type: "armor", slot: "head", rarity: "legendary", level: 45, stats: { intelligence: 35, wisdom: 20, stamina: 18, defenseRating: 140, mitigation: 100 }, sellPrice: 5500, spriteId: "helm_fabled" },
  { id: "ice_witch_robe", name: "Ice Witch's Enchanted Robe", description: "The robe of an Everfrost ice witch, imbued with cryomantic power", type: "armor", slot: "chest", rarity: "rare", level: 35, stats: { intelligence: 22, wisdom: 12, defenseRating: 95, mitigation: 65 }, sellPrice: 520, spriteId: "robe_ice" },
  // ── Dungeon trophy and unique items ─────────────────────────────────────
  { id: "everling_signet", name: "Everling Family Signet", description: "The signet ring of Lord Everling — proof of conquering Nektropos Castle", type: "accessory", slot: "ringLeft", rarity: "legendary", level: 35, stats: { intelligence: 18, charisma: 12, defenseRating: 60, avoidance: 8 }, sellPrice: 1800, spriteId: "ring_dark" },
  { id: "varsoon_lich_crystal", name: "Varsoon's Lich Crystal", description: "The power crystal torn from Varsoon's phylactery — radiates undying dark energy", type: "accessory", slot: "charm", rarity: "legendary", level: 30, stats: { intelligence: 15, wisdom: 10, attackRating: 80, critChance: 5 }, sellPrice: 1500, spriteId: "gem_dark" },
  { id: "icegrave_relic", name: "Frost Warden's Relic", description: "A relic dropped by Frost Warden Icegrave — a trophy from the depths of Permafrost Keep", type: "accessory", slot: "charm", rarity: "rare", level: 42, stats: { stamina: 12, defenseRating: 85, mitigation: 60 }, sellPrice: 700, spriteId: "accessory_frost" },
  { id: "ignus_pyro_focus", name: "Ignus Pyromantic Focus", description: "High Priest Ignus's focus crystal, containing the essence of Sol Ro's inner flame", type: "accessory", slot: "charm", rarity: "legendary", level: 48, stats: { intelligence: 25, wisdom: 18, attackRating: 180, critChance: 8 }, sellPrice: 3800, spriteId: "gem_fire" },
  { id: "nagafen_scale_armor", name: "Scale of Lord Nagafen", description: "A legendary scale from Lord Nagafen himself — heat-proof and immensely durable", type: "armor", slot: "chest", rarity: "mythical", level: 50, stats: { stamina: 40, strength: 25, defenseRating: 300, mitigation: 220, avoidance: 10 }, sellPrice: 15000, spriteId: "chestplate_fabled", noSell: true },
);

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: "recipe_iron_bar",
    name: "Smelt Iron Bar",
    resultItemId: "iron_bar", resultQuantity: 1,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 1, requiredSkillId: "smithing", craftingTime: 5, xpReward: 20,
  },
  {
    id: "recipe_steel_bar",
    name: "Smelt Steel Bar",
    resultItemId: "steel_bar", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "coal", quantity: 2 }],
    requiredSkillLevel: 15, requiredSkillId: "smithing", craftingTime: 8, xpReward: 65,
  },
  {
    id: "recipe_iron_longsword",
    name: "Forge Iron Longsword",
    resultItemId: "iron_longsword", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 3 }],
    requiredSkillLevel: 5, requiredSkillId: "smithing", craftingTime: 10, xpReward: 45,
  },
  {
    id: "recipe_steel_broadsword",
    name: "Forge Steel Broadsword",
    resultItemId: "steel_broadsword", resultQuantity: 1,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }],
    requiredSkillLevel: 20, requiredSkillId: "smithing", craftingTime: 15, xpReward: 110,
  },
  {
    id: "recipe_iron_helmet",
    name: "Forge Iron Helmet",
    resultItemId: "iron_helmet", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "leather_leggings", quantity: 1 }],
    requiredSkillLevel: 8, requiredSkillId: "smithing", craftingTime: 12, xpReward: 60,
  },
  {
    id: "recipe_leather_vest",
    name: "Craft Leather Vest",
    resultItemId: "leather_vest", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 3 }],
    requiredSkillLevel: 3, requiredSkillId: "tailoring", craftingTime: 8, xpReward: 30,
  },
  {
    id: "recipe_leather_leggings",
    name: "Craft Leather Leggings",
    resultItemId: "leather_leggings", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 1, requiredSkillId: "tailoring", craftingTime: 6, xpReward: 18,
  },
  {
    id: "recipe_health_potion",
    name: "Brew Health Potion",
    resultItemId: "health_potion", resultQuantity: 2,
    ingredients: [{ itemId: "wolf_hide", quantity: 1 }, { itemId: "spider_silk", quantity: 1 }],
    requiredSkillLevel: 5, requiredSkillId: "alchemy", craftingTime: 10, xpReward: 35,
  },
  {
    id: "recipe_mithril_blade",
    name: "Forge Mithril Blade",
    resultItemId: "mithril_blade", resultQuantity: 1,
    ingredients: [{ itemId: "mithril_ore", quantity: 4 }, { itemId: "fire_opal", quantity: 1 }],
    requiredSkillLevel: 35, requiredSkillId: "smithing", craftingTime: 25, xpReward: 280,
  },

  // ─── Smithing: Armor ──────────────────────────────────────────────────────
  {
    id: "recipe_iron_breastplate",
    name: "Forge Iron Breastplate",
    resultItemId: "iron_breastplate", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 4 }, { itemId: "coal", quantity: 2 }],
    requiredSkillLevel: 12, requiredSkillId: "smithing", craftingTime: 18, xpReward: 80,
  },
  {
    id: "recipe_iron_greaves",
    name: "Forge Iron Greaves",
    resultItemId: "iron_greaves", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 3 }],
    requiredSkillLevel: 10, requiredSkillId: "smithing", craftingTime: 14, xpReward: 65,
  },
  {
    id: "recipe_iron_gauntlets",
    name: "Forge Iron Gauntlets",
    resultItemId: "iron_gauntlets", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 9, requiredSkillId: "smithing", craftingTime: 12, xpReward: 55,
  },
  {
    id: "recipe_iron_sabatons",
    name: "Forge Iron Sabatons",
    resultItemId: "iron_sabatons", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }],
    requiredSkillLevel: 7, requiredSkillId: "smithing", craftingTime: 10, xpReward: 48,
  },
  {
    id: "recipe_iron_kite_shield",
    name: "Forge Iron Kite Shield",
    resultItemId: "iron_kite_shield", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 3 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 6, requiredSkillId: "smithing", craftingTime: 12, xpReward: 52,
  },
  {
    id: "recipe_steel_platemail",
    name: "Forge Steel Platemail",
    resultItemId: "steel_platemail", resultQuantity: 1,
    ingredients: [{ itemId: "steel_bar", quantity: 5 }, { itemId: "coal", quantity: 3 }],
    requiredSkillLevel: 25, requiredSkillId: "smithing", craftingTime: 22, xpReward: 160,
  },
  {
    id: "recipe_steel_great_helm",
    name: "Forge Steel Great Helm",
    resultItemId: "steel_great_helm", resultQuantity: 1,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 22, requiredSkillId: "smithing", craftingTime: 16, xpReward: 125,
  },
  {
    id: "recipe_steel_legplates",
    name: "Forge Steel Legplates",
    resultItemId: "steel_legplates", resultQuantity: 1,
    ingredients: [{ itemId: "steel_bar", quantity: 4 }],
    requiredSkillLevel: 20, requiredSkillId: "smithing", craftingTime: 18, xpReward: 115,
  },
  {
    id: "recipe_steel_pauldrons",
    name: "Forge Steel Pauldrons",
    resultItemId: "steel_pauldrons", resultQuantity: 1,
    ingredients: [{ itemId: "steel_bar", quantity: 3 }, { itemId: "iron_bar", quantity: 1 }],
    requiredSkillLevel: 18, requiredSkillId: "smithing", craftingTime: 14, xpReward: 100,
  },
  {
    id: "recipe_iron_girdle",
    name: "Forge Iron Girdle",
    resultItemId: "iron_girdle", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "wolf_hide", quantity: 1 }],
    requiredSkillLevel: 11, requiredSkillId: "smithing", craftingTime: 10, xpReward: 58,
  },
  {
    id: "recipe_mithril_shield",
    name: "Forge Mithril Shield",
    resultItemId: "mithril_shield", resultQuantity: 1,
    ingredients: [{ itemId: "mithril_ore", quantity: 5 }, { itemId: "coal", quantity: 2 }],
    requiredSkillLevel: 40, requiredSkillId: "smithing", craftingTime: 30, xpReward: 320,
  },

  // ─── Smithing: Ranged Weapons ─────────────────────────────────────────────
  {
    id: "recipe_wooden_buckler",
    name: "Craft Wooden Buckler",
    resultItemId: "wooden_buckler", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 1 }, { itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 3, requiredSkillId: "smithing", craftingTime: 8, xpReward: 28,
  },

  // ─── Tailoring: Cloth & Leather Armor ─────────────────────────────────────
  {
    id: "recipe_cloth_leggings",
    name: "Sew Cloth Leggings",
    resultItemId: "cloth_leggings", resultQuantity: 1,
    ingredients: [{ itemId: "spider_silk", quantity: 3 }],
    requiredSkillLevel: 5, requiredSkillId: "tailoring", craftingTime: 9, xpReward: 35,
  },
  {
    id: "recipe_cloth_gloves",
    name: "Sew Cloth Gloves",
    resultItemId: "cloth_gloves", resultQuantity: 1,
    ingredients: [{ itemId: "spider_silk", quantity: 2 }],
    requiredSkillLevel: 4, requiredSkillId: "tailoring", craftingTime: 7, xpReward: 26,
  },
  {
    id: "recipe_leather_gloves",
    name: "Craft Leather Gloves",
    resultItemId: "leather_gloves", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 6, requiredSkillId: "tailoring", craftingTime: 8, xpReward: 32,
  },
  {
    id: "recipe_leather_shoulder_pads",
    name: "Craft Leather Shoulder Pads",
    resultItemId: "leather_shoulder_pads", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 3 }, { itemId: "spider_silk", quantity: 1 }],
    requiredSkillLevel: 8, requiredSkillId: "tailoring", craftingTime: 11, xpReward: 45,
  },
  {
    id: "recipe_leather_bracers",
    name: "Craft Leather Bracers",
    resultItemId: "leather_bracers", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 4, requiredSkillId: "tailoring", craftingTime: 7, xpReward: 28,
  },
  {
    id: "recipe_leather_cap",
    name: "Craft Leather Cap",
    resultItemId: "leather_cap", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 2 }, { itemId: "spider_silk", quantity: 1 }],
    requiredSkillLevel: 2, requiredSkillId: "tailoring", craftingTime: 6, xpReward: 22,
  },
  {
    id: "recipe_worn_cloak",
    name: "Sew Worn Cloak",
    resultItemId: "worn_cloak", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 1 }, { itemId: "spider_silk", quantity: 2 }],
    requiredSkillLevel: 7, requiredSkillId: "tailoring", craftingTime: 10, xpReward: 38,
  },
  {
    id: "recipe_rope_belt",
    name: "Braid Rope Belt",
    resultItemId: "rope_belt", resultQuantity: 1,
    ingredients: [{ itemId: "spider_silk", quantity: 2 }],
    requiredSkillLevel: 2, requiredSkillId: "tailoring", craftingTime: 5, xpReward: 18,
  },
  {
    id: "recipe_worn_boots",
    name: "Craft Worn Boots",
    resultItemId: "worn_boots", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 1 }],
    requiredSkillLevel: 1, requiredSkillId: "tailoring", craftingTime: 5, xpReward: 14,
  },

  // ─── Alchemy: Potions ─────────────────────────────────────────────────────
  {
    id: "recipe_mana_potion",
    name: "Brew Mana Potion",
    resultItemId: "mana_potion", resultQuantity: 2,
    ingredients: [{ itemId: "spider_silk", quantity: 2 }, { itemId: "fire_opal", quantity: 1 }],
    requiredSkillLevel: 8, requiredSkillId: "alchemy", craftingTime: 12, xpReward: 55,
  },
  {
    id: "recipe_blackburrow_brew",
    name: "Brew Blackburrow Moonshine",
    resultItemId: "bb_blackburrow_brew", resultQuantity: 3,
    ingredients: [{ itemId: "coal", quantity: 1 }, { itemId: "wolf_hide", quantity: 2 }, { itemId: "iron_ore", quantity: 1 }],
    requiredSkillLevel: 12, requiredSkillId: "alchemy", craftingTime: 15, xpReward: 70,
  },

  // ─── Jeweling: Rings & Amulets ────────────────────────────────────────────
  {
    id: "recipe_rough_amulet",
    name: "Craft Rough Amulet",
    resultItemId: "rough_amulet", resultQuantity: 1,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 1, requiredSkillId: "jeweling", craftingTime: 8, xpReward: 22,
  },
  {
    id: "recipe_copper_ring",
    name: "Craft Copper Ring",
    resultItemId: "copper_ring", resultQuantity: 1,
    ingredients: [{ itemId: "iron_ore", quantity: 1 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 2, requiredSkillId: "jeweling", craftingTime: 7, xpReward: 18,
  },
  {
    id: "recipe_silver_pendant",
    name: "Craft Silver Pendant",
    resultItemId: "silver_pendant", resultQuantity: 1,
    ingredients: [{ itemId: "mithril_ore", quantity: 1 }, { itemId: "fire_opal", quantity: 1 }],
    requiredSkillLevel: 15, requiredSkillId: "jeweling", craftingTime: 14, xpReward: 90,
  },
  {
    id: "recipe_ring_of_strength",
    name: "Craft Ring of Strength",
    resultItemId: "ring_of_strength", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "fire_opal", quantity: 1 }],
    requiredSkillLevel: 20, requiredSkillId: "jeweling", craftingTime: 16, xpReward: 115,
  },
  {
    id: "recipe_simple_earring",
    name: "Craft Simple Earring",
    resultItemId: "simple_earring", resultQuantity: 1,
    ingredients: [{ itemId: "iron_ore", quantity: 2 }],
    requiredSkillLevel: 3, requiredSkillId: "jeweling", craftingTime: 8, xpReward: 25,
  },
  {
    id: "recipe_lucky_horseshoe",
    name: "Forge Lucky Horseshoe",
    resultItemId: "lucky_horseshoe", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 1 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 10, requiredSkillId: "jeweling", craftingTime: 10, xpReward: 60,
  },

  // ─── Tinkering: Gadgets & Accessories ────────────────────────────────────
  {
    id: "recipe_arcane_bracers",
    name: "Tinker Arcane Bracers",
    resultItemId: "arcane_bracers", resultQuantity: 1,
    ingredients: [{ itemId: "iron_bar", quantity: 2 }, { itemId: "spider_silk", quantity: 3 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 18, requiredSkillId: "tinkering", craftingTime: 16, xpReward: 100,
  },
  {
    id: "recipe_short_bow",
    name: "Craft Short Bow",
    resultItemId: "short_bow", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_hide", quantity: 2 }, { itemId: "iron_bar", quantity: 1 }],
    requiredSkillLevel: 8, requiredSkillId: "tinkering", craftingTime: 12, xpReward: 55,
  },
  {
    id: "recipe_elven_longbow",
    name: "Craft Elven Longbow",
    resultItemId: "elven_longbow", resultQuantity: 1,
    ingredients: [{ itemId: "mithril_ore", quantity: 2 }, { itemId: "spider_silk", quantity: 3 }, { itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 30, requiredSkillId: "tinkering", craftingTime: 22, xpReward: 220,
  },
  {
    id: "recipe_cloak_of_shadows",
    name: "Weave Cloak of Shadows",
    resultItemId: "cloak_of_shadows", resultQuantity: 1,
    ingredients: [{ itemId: "spider_silk", quantity: 5 }, { itemId: "wolf_hide", quantity: 3 }, { itemId: "coal", quantity: 2 }],
    requiredSkillLevel: 28, requiredSkillId: "tinkering", craftingTime: 24, xpReward: 200,
    tier: "journeyman" as RecipeTier,
  },

  // ─── Expert Recipes (learned from scrolls dropped by named/boss enemies) ──
  {
    id: "recipe_expert_shadowsteel_blade",
    name: "Forge Shadowsteel Blade",
    description: "An expert technique for forging a blade from rare shadowsteel — requires mastery of shadow-touched metal.",
    resultItemId: "craft_shadowsteel_blade", resultQuantity: 1,
    ingredients: [
      { itemId: "mithril_ore", quantity: 6 },
      { itemId: "coal", quantity: 4 },
      { itemId: "lavastorm_magma_slag", quantity: 3 },
    ],
    requiredSkillLevel: 35, requiredSkillId: "smithing", craftingTime: 40, xpReward: 500,
    tier: "expert" as RecipeTier,
  },
  {
    id: "recipe_expert_dragonscale_breastplate",
    name: "Forge Dragonscale Breastplate",
    description: "An expert method of working dragonscale into impenetrable armor.",
    resultItemId: "craft_dragonscale_breastplate", resultQuantity: 1,
    ingredients: [
      { itemId: "feerrott_lizard_scale", quantity: 8 },
      { itemId: "steel_bar", quantity: 5 },
      { itemId: "lavastorm_fire_opal", quantity: 2 },
    ],
    requiredSkillLevel: 40, requiredSkillId: "smithing", craftingTime: 50, xpReward: 650,
    tier: "expert" as RecipeTier,
  },
  {
    id: "recipe_expert_arcane_ring",
    name: "Inscribe Arcane Codex Ring",
    description: "An expert jeweling method for inscribing the complete arcane codex onto a ring.",
    resultItemId: "craft_arcane_codex_ring", resultQuantity: 1,
    ingredients: [
      { itemId: "mithril_ore", quantity: 3 },
      { itemId: "fire_opal", quantity: 3 },
      { itemId: "lavastorm_fire_opal", quantity: 1 },
    ],
    requiredSkillLevel: 38, requiredSkillId: "jeweling", craftingTime: 35, xpReward: 480,
    tier: "expert" as RecipeTier,
  },

  // ─── Mythic Recipes (drop from Mythic/Raid bosses; some are one-of-a-kind) ──
  {
    id: "recipe_mythic_worldbreaker_blade",
    name: "Forge Worldbreaker Blade",
    description: "The ancient art of forging a Worldbreaker Blade — a weapon whose equal has never existed and never will again.",
    resultItemId: "craft_worldbreaker_blade", resultQuantity: 1,
    ingredients: [
      { itemId: "nagafen_inferno_scale", quantity: 1 },
      { itemId: "mithril_ore", quantity: 10 },
      { itemId: "lavastorm_magma_slag", quantity: 8 },
      { itemId: "lavastorm_fire_opal", quantity: 5 },
    ],
    requiredSkillLevel: 50, requiredSkillId: "smithing", craftingTime: 120, xpReward: 2000,
    tier: "mythic" as RecipeTier,
    oneOfAKind: true,
  },
  {
    id: "recipe_mythic_void_mantle",
    name: "Weave Void-Touched Mantle",
    description: "The forbidden weaving technique to craft the Void-Touched Mantle — a garment that will exist only once.",
    resultItemId: "craft_void_mantle", resultQuantity: 1,
    ingredients: [
      { itemId: "spider_silk", quantity: 15 },
      { itemId: "faydark_sprite_wing", quantity: 10 },
      { itemId: "faydark_treant_bark", quantity: 6 },
      { itemId: "enchanted_pixie_dust", quantity: 5 },
    ],
    requiredSkillLevel: 45, requiredSkillId: "tinkering", craftingTime: 100, xpReward: 1800,
    tier: "mythic" as RecipeTier,
    oneOfAKind: true,
  },
  {
    id: "recipe_mythic_eternal_crown",
    name: "Crown the Eternal Crown of Norrath",
    description: "The high art of forging the Eternal Crown — once completed, no second crown may ever be made.",
    resultItemId: "craft_eternal_crown", resultQuantity: 1,
    ingredients: [
      { itemId: "mithril_ore", quantity: 12 },
      { itemId: "fire_opal", quantity: 8 },
      { itemId: "lavastorm_fire_opal", quantity: 6 },
      { itemId: "everfrost_mammoth_ivory", quantity: 4 },
    ],
    requiredSkillLevel: 55, requiredSkillId: "jeweling", craftingTime: 150, xpReward: 3000,
    tier: "mythic" as RecipeTier,
    oneOfAKind: true,
  },

  // ── COOKING RECIPES ───────────────────────────────────────────────────────
  { id: "recipe_roasted_mushroom", name: "Cook Roasted Mushroom", resultItemId: "roasted_mushroom", resultQuantity: 2, ingredients: [{ itemId: "wild_mushroom", quantity: 2 }], requiredSkillLevel: 1, requiredSkillId: "cooking", craftingTime: 5, xpReward: 15, tier: "journeyman" as RecipeTier },
  { id: "recipe_berry_pie", name: "Bake Berry Pie", resultItemId: "berry_pie", resultQuantity: 1, ingredients: [{ itemId: "forest_berry", quantity: 3 }, { itemId: "wild_onion", quantity: 1 }], requiredSkillLevel: 8, requiredSkillId: "cooking", craftingTime: 10, xpReward: 35, tier: "journeyman" as RecipeTier },
  { id: "recipe_hearty_stew", name: "Brew Hearty Stew", resultItemId: "hearty_stew", resultQuantity: 1, ingredients: [{ itemId: "wild_mushroom", quantity: 2 }, { itemId: "thornbush_fruit", quantity: 1 }, { itemId: "wild_onion", quantity: 2 }], requiredSkillLevel: 20, requiredSkillId: "cooking", craftingTime: 18, xpReward: 80, tier: "expert" as RecipeTier },
  { id: "recipe_truffle_feast", name: "Prepare Truffle Feast", resultItemId: "truffle_feast", resultQuantity: 1, ingredients: [{ itemId: "deepwood_truffle", quantity: 2 }, { itemId: "wild_mushroom", quantity: 3 }, { itemId: "forest_berry", quantity: 2 }], requiredSkillLevel: 40, requiredSkillId: "cooking", craftingTime: 30, xpReward: 180, tier: "expert" as RecipeTier },

  // ── ENCHANTING RECIPES ────────────────────────────────────────────────────
  { id: "recipe_scroll_of_swiftness", name: "Enchant Scroll of Swiftness", resultItemId: "scroll_of_swiftness", resultQuantity: 1, ingredients: [{ itemId: "enchanting_dust", quantity: 3 }, { itemId: "spider_silk", quantity: 1 }], requiredSkillLevel: 5, requiredSkillId: "enchanting", craftingTime: 12, xpReward: 45, tier: "journeyman" as RecipeTier },
  { id: "recipe_scroll_of_fortitude", name: "Enchant Scroll of Fortitude", resultItemId: "scroll_of_fortitude", resultQuantity: 1, ingredients: [{ itemId: "enchanting_dust", quantity: 5 }, { itemId: "fay_blossom", quantity: 1 }], requiredSkillLevel: 20, requiredSkillId: "enchanting", craftingTime: 20, xpReward: 90, tier: "expert" as RecipeTier },

  // ── WOODWORKING RECIPES ───────────────────────────────────────────────────
  { id: "recipe_hardwood_plank", name: "Cut Hardwood Plank", resultItemId: "hardwood_plank", resultQuantity: 2, ingredients: [{ itemId: "lumber", quantity: 3 }], requiredSkillLevel: 1, requiredSkillId: "woodworking", craftingTime: 6, xpReward: 18, tier: "journeyman" as RecipeTier },
  { id: "recipe_wooden_bow", name: "Craft Wooden Bow", resultItemId: "wooden_bow", resultQuantity: 1, ingredients: [{ itemId: "lumber", quantity: 3 }, { itemId: "hardwood_plank", quantity: 1 }], requiredSkillLevel: 5, requiredSkillId: "woodworking", craftingTime: 12, xpReward: 40, tier: "journeyman" as RecipeTier },
  { id: "recipe_ash_staff", name: "Craft Ash Staff", resultItemId: "ash_staff", resultQuantity: 1, ingredients: [{ itemId: "lumber", quantity: 4 }, { itemId: "hardwood_plank", quantity: 2 }, { itemId: "spider_silk", quantity: 1 }], requiredSkillLevel: 15, requiredSkillId: "woodworking", craftingTime: 20, xpReward: 85, tier: "expert" as RecipeTier },

  // ── LEATHERWORKING RECIPES ────────────────────────────────────────────────
  { id: "recipe_leather_bracers", name: "Craft Leather Bracers", resultItemId: "leather_bracers", resultQuantity: 1, ingredients: [{ itemId: "scraggly_hide", quantity: 2 }], requiredSkillLevel: 1, requiredSkillId: "leatherworking", craftingTime: 6, xpReward: 20, tier: "journeyman" as RecipeTier },
  { id: "recipe_supple_leather_gloves", name: "Craft Supple Leather Gloves", resultItemId: "supple_leather_gloves", resultQuantity: 1, ingredients: [{ itemId: "sturdy_hide", quantity: 2 }, { itemId: "scraggly_hide", quantity: 1 }], requiredSkillLevel: 10, requiredSkillId: "leatherworking", craftingTime: 12, xpReward: 50, tier: "journeyman" as RecipeTier },
  { id: "recipe_reinforced_leather_vest", name: "Craft Reinforced Leather Vest", resultItemId: "reinforced_leather_vest", resultQuantity: 1, ingredients: [{ itemId: "thick_pelt", quantity: 3 }, { itemId: "sturdy_hide", quantity: 2 }], requiredSkillLevel: 20, requiredSkillId: "leatherworking", craftingTime: 22, xpReward: 100, tier: "expert" as RecipeTier },

  // ── PHASE 2: JOURNEYMAN DROP RECIPES (learned from monster scroll drops) ──
  {
    id: "recipe_journeyman_hide_bracers",
    name: "Craft Crude Hide Bracers",
    description: "A journeyman technique for stitching raw beast hide into simple protective bracers.",
    resultItemId: "leather_bracers", resultQuantity: 1,
    ingredients: [{ itemId: "wolf_fang", quantity: 1 }, { itemId: "wolf_hide", quantity: 2 }],
    requiredSkillLevel: 5, requiredSkillId: "leatherworking", craftingTime: 8, xpReward: 35,
    tier: "journeyman" as RecipeTier,
  },
  {
    id: "recipe_journeyman_crude_shortsword",
    name: "Forge Crude Iron Shortsword",
    description: "A journeyman forging technique producing a crude but functional iron shortsword.",
    resultItemId: "rusty_short_sword", resultQuantity: 1,
    ingredients: [{ itemId: "iron_ore", quantity: 3 }, { itemId: "goblin_ear", quantity: 1 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 5, requiredSkillId: "smithing", craftingTime: 10, xpReward: 40,
    tier: "journeyman" as RecipeTier,
  },
  {
    id: "recipe_journeyman_bone_dust_powder",
    name: "Grind Bone Dust Powder",
    description: "A journeyman alchemy method for grinding bleached bones into a fine alchemical powder.",
    resultItemId: "enchanting_dust", resultQuantity: 2,
    ingredients: [{ itemId: "bleached_bone", quantity: 3 }, { itemId: "coal", quantity: 1 }],
    requiredSkillLevel: 4, requiredSkillId: "alchemy", craftingTime: 8, xpReward: 30,
    tier: "journeyman" as RecipeTier,
  },
  {
    id: "recipe_journeyman_gnoll_tooth_ring",
    name: "Craft Gnoll Tooth Ring",
    description: "A journeyman jeweling technique using gnoll fangs wired onto an iron band.",
    resultItemId: "copper_ring", resultQuantity: 1,
    ingredients: [{ itemId: "gnoll_fur_tuft", quantity: 2 }, { itemId: "iron_ore", quantity: 1 }],
    requiredSkillLevel: 8, requiredSkillId: "jeweling", craftingTime: 10, xpReward: 45,
    tier: "journeyman" as RecipeTier,
  },
  {
    id: "recipe_journeyman_feather_quill_amulet",
    name: "Craft Feather Quill Amulet",
    description: "A journeyman jeweling recipe binding harpy feathers into a light amulet of agility.",
    resultItemId: "rough_amulet", resultQuantity: 1,
    ingredients: [{ itemId: "harpy_feather", quantity: 3 }, { itemId: "spider_silk", quantity: 2 }],
    requiredSkillLevel: 18, requiredSkillId: "jeweling", craftingTime: 14, xpReward: 70,
    tier: "journeyman" as RecipeTier,
  },

  // ── PHASE 2: EXPERT (ADEPT) DROP RECIPES (learned from dungeon boss drops) ─
  {
    id: "recipe_expert_warchief_axe",
    name: "Forge Warchief's Heavy Axe",
    description: "An expert smithing technique for crafting the brutal war-axe of a gnoll warchief, using trophy materials.",
    resultItemId: "iron_longsword", resultQuantity: 1,
    ingredients: [
      { itemId: "iron_bar", quantity: 4 },
      { itemId: "warchief_war_medallion", quantity: 1 },
      { itemId: "gnoll_fur_tuft", quantity: 2 },
    ],
    requiredSkillLevel: 12, requiredSkillId: "smithing", craftingTime: 25, xpReward: 200,
    tier: "expert" as RecipeTier,
  },
  {
    id: "recipe_expert_overlord_war_plate",
    name: "Forge Overlord's War Plate",
    description: "An expert armoring technique using Narlock's fractured seal to craft reinforced warlord-tier chest armor.",
    resultItemId: "iron_breastplate", resultQuantity: 1,
    ingredients: [
      { itemId: "iron_bar", quantity: 5 },
      { itemId: "narlock_overlord_seal", quantity: 1 },
      { itemId: "coal", quantity: 3 },
    ],
    requiredSkillLevel: 22, requiredSkillId: "smithing", craftingTime: 35, xpReward: 300,
    tier: "expert" as RecipeTier,
  },
  {
    id: "recipe_expert_lich_focus",
    name: "Craft Lich's Necrotic Focus",
    description: "An expert alchemy recipe channeling Varsoon's lich essence into a potent necrotic focus crystal.",
    resultItemId: "ring_of_power", resultQuantity: 1,
    ingredients: [
      { itemId: "varsoon_lich_essence", quantity: 1 },
      { itemId: "mithril_ore", quantity: 2 },
      { itemId: "spider_silk", quantity: 3 },
    ],
    requiredSkillLevel: 28, requiredSkillId: "alchemy", craftingTime: 40, xpReward: 380,
    tier: "expert" as RecipeTier,
  },
  {
    id: "recipe_expert_shadow_mantle",
    name: "Weave Shadow Mantle of Everling",
    description: "An expert tailoring method weaving Everling's dark shard into a shadow-touched mantle of the night.",
    resultItemId: "cloak_of_shadows", resultQuantity: 1,
    ingredients: [
      { itemId: "everling_dark_shard", quantity: 1 },
      { itemId: "spider_silk", quantity: 6 },
      { itemId: "wolf_hide", quantity: 3 },
    ],
    requiredSkillLevel: 37, requiredSkillId: "tailoring", craftingTime: 50, xpReward: 480,
    tier: "expert" as RecipeTier,
  },
].map(r => ({ tier: "journeyman" as RecipeTier, ...r }));

export const INITIAL_SKILLS = [
  { skillId: "combat", name: "Combat", description: "Proficiency with weapons and melee attacks", category: "combat", icon: "sword", xpPerHour: 0 },
  { skillId: "defense", name: "Defense", description: "Ability to block, dodge, and parry attacks", category: "combat", icon: "shield", xpPerHour: 0 },
  { skillId: "magic", name: "Magic", description: "Harnessing arcane power for spells", category: "combat", icon: "wand", xpPerHour: 0 },
  { skillId: "archery", name: "Archery", description: "Skill with bows and ranged weapons", category: "combat", icon: "bow", xpPerHour: 0 },
  { skillId: "mining", name: "Mining", description: "Extracting ores and gems from the earth", category: "gathering", icon: "pickaxe", xpPerHour: 45 },
  { skillId: "woodcutting", name: "Woodcutting", description: "Felling trees for lumber and resources", category: "gathering", icon: "axe", xpPerHour: 40 },
  { skillId: "fishing", name: "Fishing", description: "Catching fish from rivers, lakes, and seas", category: "gathering", icon: "rod", xpPerHour: 35 },
  { skillId: "herbalism", name: "Herbalism", description: "Gathering herbs and reagents from nature", category: "gathering", icon: "herb", xpPerHour: 38 },
  { skillId: "smithing", name: "Smithing", description: "Forging weapons and armor from metal", category: "crafting", icon: "hammer", xpPerHour: 55 },
  { skillId: "tailoring", name: "Tailoring", description: "Crafting cloth and leather equipment", category: "crafting", icon: "needle", xpPerHour: 48 },
  { skillId: "alchemy", name: "Alchemy", description: "Brewing potions and concoctions", category: "crafting", icon: "flask", xpPerHour: 50 },
  { skillId: "jeweling", name: "Jeweling", description: "Crafting rings, amulets, and adornments", category: "crafting", icon: "gem", xpPerHour: 42 },
  { skillId: "tinkering", name: "Tinkering", description: "Building mechanical devices and gadgets", category: "crafting", icon: "gear", xpPerHour: 45 },
  { skillId: "diplomacy", name: "Diplomacy", description: "Influencing NPCs and improving faction standing", category: "support", icon: "scroll", xpPerHour: 30 },
  { skillId: "tracking", name: "Tracking", description: "Following the trails of beasts and enemies", category: "support", icon: "footprint", xpPerHour: 35 },
  { skillId: "lore", name: "Lore & Legend", description: "Knowledge of the world, its history and secrets", category: "support", icon: "book", xpPerHour: 28 },
  { skillId: "meditation", name: "Meditation", description: "Calming the mind and body to accelerate out-of-combat recovery", category: "combat", icon: "lotus", xpPerHour: 0 },
  { skillId: "dual_wield", name: "Dual Wield", description: "Mastery of fighting with two weapons simultaneously", category: "combat", icon: "dual_swords", xpPerHour: 0 },
  { skillId: "parry", name: "Parry", description: "Advanced technique for deflecting and countering attacks", category: "combat", icon: "parry", xpPerHour: 0 },
  { skillId: "evocation", name: "Evocation", description: "Channeling raw elemental magic for devastating spells", category: "combat", icon: "lightning", xpPerHour: 0 },
  { skillId: "beastmastery", name: "Beastmastery", description: "Commanding and bonding with wild creatures in battle", category: "combat", icon: "paw", xpPerHour: 0 },
  { skillId: "foraging", name: "Foraging", description: "Gathering fruits, mushrooms, and wild food from the land", category: "gathering", icon: "mushroom", xpPerHour: 32 },
  { skillId: "skinning", name: "Skinning", description: "Harvesting hides and pelts from slain beasts", category: "gathering", icon: "hide", xpPerHour: 36 },
  { skillId: "prospecting", name: "Prospecting", description: "Surveying terrain to find rare mineral deposits", category: "gathering", icon: "map", xpPerHour: 28 },
  { skillId: "archaeology", name: "Archaeology", description: "Unearthing ancient relics and buried treasures", category: "gathering", icon: "shovel", xpPerHour: 25 },
  { skillId: "cooking", name: "Cooking", description: "Preparing food and feasts that grant temporary stat buffs", category: "crafting", icon: "pot", xpPerHour: 44 },
  { skillId: "enchanting", name: "Enchanting", description: "Imbuing items with magical properties and enhancements", category: "crafting", icon: "enchant", xpPerHour: 52 },
  { skillId: "woodworking", name: "Woodworking", description: "Crafting bows, staves, and wooden structures", category: "crafting", icon: "saw", xpPerHour: 40 },
  { skillId: "leatherworking", name: "Leatherworking", description: "Crafting leather armor and accessories from hides", category: "crafting", icon: "leather", xpPerHour: 46 },
  { skillId: "first_aid", name: "First Aid", description: "Treating wounds and ailments in the field", category: "support", icon: "bandage", xpPerHour: 33 },
  { skillId: "scouting", name: "Scouting", description: "Surveying zones to reveal hidden enemies and resources", category: "support", icon: "eye", xpPerHour: 30 },
  { skillId: "bartering", name: "Bartering", description: "Negotiating better prices and deals with merchants", category: "support", icon: "coin", xpPerHour: 27 },
  { skillId: "runecrafting", name: "Runecrafting", description: "Inscribing magical runes that enhance gear and abilities", category: "support", icon: "rune", xpPerHour: 38 },
];

export function getItemById(id: string): Item | undefined {
  return ITEMS.find(i => i.id === id);
}

export function getEnemyById(id: string): Enemy | undefined {
  return ENEMIES.find(e => e.id === id);
}

// ─── GATHERING SYSTEM ─────────────────────────────────────────────────────────

export interface GatheringNode {
  id: string;
  name: string;
  description: string;
  skillId: "mining" | "woodcutting" | "fishing" | "herbalism" | "foraging" | "skinning" | "prospecting" | "archaeology";
  requiredLevel: number;
  xpPerGather: number;
  gatherTimeSeconds: number;
  yields: Array<{ itemId: string; baseQuantity: number; weight: number }>;
  rareYield?: { itemId: string; quantity: number };
  icon: string;
  zone?: string;
}

export const GATHERING_NODES: GatheringNode[] = [
  // ── MINING ────────────────────────────────────────────────────────────────
  {
    id: "copper_vein", name: "Copper Vein", icon: "🪨",
    description: "A shallow vein of copper ore near the surface",
    skillId: "mining", requiredLevel: 1, xpPerGather: 15, gatherTimeSeconds: 5,
    yields: [{ itemId: "copper_ore", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "coal_seam", name: "Coal Seam", icon: "⬛",
    description: "A thick seam of coal embedded in the rock face",
    skillId: "mining", requiredLevel: 5, xpPerGather: 22, gatherTimeSeconds: 8,
    yields: [{ itemId: "coal", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "iron_vein", name: "Iron Vein", icon: "🔩",
    description: "A solid vein of iron ore running through the stone",
    skillId: "mining", requiredLevel: 10, xpPerGather: 30, gatherTimeSeconds: 10,
    yields: [{ itemId: "iron_ore", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "silver_vein", name: "Silver Vein", icon: "🥈",
    description: "A sparkling vein of silver ore that catches the light",
    skillId: "mining", requiredLevel: 20, xpPerGather: 55, gatherTimeSeconds: 15,
    yields: [{ itemId: "silver_ore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "fire_opal", quantity: 1 },
  },
  {
    id: "gold_vein", name: "Gold Vein", icon: "🥇",
    description: "Rich gold ore gleaming in the lamplight",
    skillId: "mining", requiredLevel: 35, xpPerGather: 90, gatherTimeSeconds: 20,
    yields: [{ itemId: "gold_ore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "lavastorm_fire_opal", quantity: 1 },
  },
  {
    id: "mithril_vein", name: "Mythril Vein", icon: "💎",
    description: "A shimmering vein of the rarest metal in Norrath",
    skillId: "mining", requiredLevel: 50, xpPerGather: 150, gatherTimeSeconds: 30,
    yields: [{ itemId: "mithril_ore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "ethereal_crystal", quantity: 1 },
  },
  {
    id: "adamantine_vein", name: "Adamantine Vein", icon: "🌑",
    description: "A nearly impenetrable vein of adamantine deep underground",
    skillId: "mining", requiredLevel: 70, xpPerGather: 240, gatherTimeSeconds: 40,
    yields: [{ itemId: "adamantine_ore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "ethereal_crystal", quantity: 2 },
  },
  {
    id: "ethereal_cluster", name: "Ethereal Crystal Cluster", icon: "✨",
    description: "Crystals pulsing with planar energy — only found in the deepest reaches",
    skillId: "mining", requiredLevel: 90, xpPerGather: 400, gatherTimeSeconds: 60,
    yields: [{ itemId: "ethereal_crystal", baseQuantity: 1, weight: 1 }],
  },

  // ── WOODCUTTING ───────────────────────────────────────────────────────────
  {
    id: "birch_grove", name: "Birch Grove", icon: "🌿",
    description: "Young birch trees growing in a sunny clearing",
    skillId: "woodcutting", requiredLevel: 1, xpPerGather: 12, gatherTimeSeconds: 6,
    yields: [{ itemId: "birch_wood", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "maple_copse", name: "Maple Copse", icon: "🍁",
    description: "Young maple trees growing in sheltered clearings",
    skillId: "woodcutting", requiredLevel: 5, xpPerGather: 18, gatherTimeSeconds: 8,
    yields: [{ itemId: "maple_wood", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "elm_stand", name: "Elm Stand", icon: "🌳",
    description: "A stand of mature elm trees with dense canopies",
    skillId: "woodcutting", requiredLevel: 10, xpPerGather: 28, gatherTimeSeconds: 10,
    yields: [{ itemId: "elm_wood", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "oak_forest", name: "Oak Forest", icon: "🍂",
    description: "Ancient oaks that have stood for centuries in the Commonlands",
    skillId: "woodcutting", requiredLevel: 20, xpPerGather: 50, gatherTimeSeconds: 15,
    yields: [{ itemId: "oak_wood", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "faydark_treant_bark", quantity: 1 },
  },
  {
    id: "teak_grove", name: "Teak Grove", icon: "🌴",
    description: "Fine-grained teak trees growing in Norrath's warmer regions",
    skillId: "woodcutting", requiredLevel: 35, xpPerGather: 85, gatherTimeSeconds: 22,
    yields: [{ itemId: "teak_wood", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "ironwood_stand", name: "Ironwood Stand", icon: "🪵",
    description: "Ironwood trees so dense an axe barely bites into them",
    skillId: "woodcutting", requiredLevel: 50, xpPerGather: 140, gatherTimeSeconds: 30,
    yields: [{ itemId: "ironwood", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "ancient_heartwood", quantity: 1 },
  },
  {
    id: "ancient_treant", name: "Ancient Treant Grove", icon: "🧝",
    description: "Thousand-year treants that guard the oldest forests of Norrath",
    skillId: "woodcutting", requiredLevel: 70, xpPerGather: 230, gatherTimeSeconds: 45,
    yields: [{ itemId: "ancient_heartwood", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "planar_grove", name: "Plane of Growth Forest", icon: "🌌",
    description: "Trees from the Plane of Growth itself — they hum with pure life energy",
    skillId: "woodcutting", requiredLevel: 90, xpPerGather: 420, gatherTimeSeconds: 65,
    yields: [{ itemId: "ethereal_timber", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "ancient_heartwood", quantity: 2 },
  },

  // ── FISHING ───────────────────────────────────────────────────────────────
  {
    id: "calm_pond", name: "Calm Pond", icon: "🌊",
    description: "A placid pond teeming with small fish",
    skillId: "fishing", requiredLevel: 1, xpPerGather: 10, gatherTimeSeconds: 8,
    yields: [{ itemId: "small_fish", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "shallow_brook", name: "Shallow Brook", icon: "🏔️",
    description: "A clear, shallow brook where small perch dart between stones",
    skillId: "fishing", requiredLevel: 5, xpPerGather: 16, gatherTimeSeconds: 10,
    yields: [{ itemId: "brook_fish", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "river_bend", name: "River Bend", icon: "🏞️",
    description: "A wide bend in the river where fish congregate",
    skillId: "fishing", requiredLevel: 10, xpPerGather: 25, gatherTimeSeconds: 12,
    yields: [{ itemId: "river_fish", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "mountain_lake", name: "Mountain Lake", icon: "🏔️",
    description: "A crystal-clear mountain lake fed by glacial runoff",
    skillId: "fishing", requiredLevel: 25, xpPerGather: 55, gatherTimeSeconds: 18,
    yields: [{ itemId: "lake_trout", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "ocean_shore", name: "Ocean Shore", icon: "🌅",
    description: "Rocky shores where the Norrathian sea meets the land",
    skillId: "fishing", requiredLevel: 40, xpPerGather: 100, gatherTimeSeconds: 25,
    yields: [{ itemId: "ocean_fish", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "deep_sea", name: "Deep Sea Trench", icon: "🦑",
    description: "A dark abyss where strange luminous creatures dwell",
    skillId: "fishing", requiredLevel: 60, xpPerGather: 180, gatherTimeSeconds: 35,
    yields: [{ itemId: "exotic_fish", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "planar_eel", quantity: 1 },
  },
  {
    id: "plane_of_water", name: "Plane of Water Portal", icon: "🌀",
    description: "A shimmering portal to the Plane of Water — fish from another plane swim through",
    skillId: "fishing", requiredLevel: 80, xpPerGather: 320, gatherTimeSeconds: 50,
    yields: [{ itemId: "planar_eel", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "void_vortex", name: "Void Sea Vortex", icon: "🌑",
    description: "A swirling column of void energy descending into the ocean — void carp swarm at its edge",
    skillId: "fishing", requiredLevel: 90, xpPerGather: 430, gatherTimeSeconds: 65,
    yields: [{ itemId: "void_fish", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "planar_eel", quantity: 2 },
  },

  // ── HERBALISM ─────────────────────────────────────────────────────────────
  {
    id: "meadow_herbs", name: "Sunlit Meadow", icon: "🌸",
    description: "A sunny meadow bursting with common herbs",
    skillId: "herbalism", requiredLevel: 1, xpPerGather: 11, gatherTimeSeconds: 7,
    yields: [{ itemId: "common_herb", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "riverside_reeds", name: "Riverside Reeds", icon: "🌾",
    description: "Tall reeds growing along Norrath's riverbanks — easily gathered with skilled hands",
    skillId: "herbalism", requiredLevel: 5, xpPerGather: 17, gatherTimeSeconds: 9,
    yields: [{ itemId: "riverside_herb", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "forest_floor", name: "Forest Floor", icon: "🍄",
    description: "The shaded forest floor rich with roots and fungi",
    skillId: "herbalism", requiredLevel: 10, xpPerGather: 26, gatherTimeSeconds: 12,
    yields: [{ itemId: "forest_root", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "faydark_glade", name: "Faydark Glade", icon: "🧚",
    description: "A magical glade where faerie blossoms grow year-round",
    skillId: "herbalism", requiredLevel: 25, xpPerGather: 58, gatherTimeSeconds: 18,
    yields: [{ itemId: "fay_blossom", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "enchanted_pixie_dust", quantity: 1 },
  },
  {
    id: "swamp_edge", name: "Feerrott Swamp Edge", icon: "🐸",
    description: "The murky border of the Feerrott where swamp herbs thrive",
    skillId: "herbalism", requiredLevel: 35, xpPerGather: 85, gatherTimeSeconds: 22,
    yields: [{ itemId: "feerrott_swamp_moss", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "desert_oasis", name: "Desert Oasis", icon: "🌵",
    description: "A hidden oasis where rare desert blooms flourish",
    skillId: "herbalism", requiredLevel: 50, xpPerGather: 145, gatherTimeSeconds: 30,
    yields: [{ itemId: "desert_bloom", baseQuantity: 1, weight: 1 }],
  },
  {
    id: "volcanic_peak", name: "Lavastorm Volcanic Vents", icon: "🌋",
    description: "The scalding vents of Lavastorm where only the hardiest herbs survive",
    skillId: "herbalism", requiredLevel: 70, xpPerGather: 250, gatherTimeSeconds: 45,
    yields: [{ itemId: "volcanic_herb", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "lavastorm_fire_opal", quantity: 1 },
  },
  {
    id: "plane_of_growth", name: "Plane of Growth Thicket", icon: "🌿",
    description: "The primordial thickets of the Plane of Growth — bursting with impossible life",
    skillId: "herbalism", requiredLevel: 90, xpPerGather: 440, gatherTimeSeconds: 65,
    yields: [{ itemId: "growth_spore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "enchanted_pixie_dust", quantity: 2 },
  },

  // ── FORAGING ──────────────────────────────────────────────────────────────
  { id: "wild_brush", name: "Wild Brush", icon: "🫐", description: "Scraggly bushes at the edge of the forest", skillId: "foraging", requiredLevel: 1, xpPerGather: 12, gatherTimeSeconds: 6, yields: [{ itemId: "forest_berry", baseQuantity: 1, weight: 1 }, { itemId: "wild_onion", baseQuantity: 1, weight: 1 }] },
  { id: "mushroom_ring", name: "Mushroom Ring", icon: "🍄", description: "A fairy ring of wild mushrooms", skillId: "foraging", requiredLevel: 5, xpPerGather: 20, gatherTimeSeconds: 8, yields: [{ itemId: "wild_mushroom", baseQuantity: 1, weight: 1 }] },
  { id: "thornbush_patch", name: "Thornbush Patch", icon: "🌾", description: "Hardy thornbushes laden with bitter fruit", skillId: "foraging", requiredLevel: 15, xpPerGather: 40, gatherTimeSeconds: 12, yields: [{ itemId: "thornbush_fruit", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "deepwood_truffle", quantity: 1 } },
  { id: "deepwood_grove", name: "Deepwood Grove", icon: "🌲", description: "Ancient grove where rare truffles grow", skillId: "foraging", requiredLevel: 35, xpPerGather: 90, gatherTimeSeconds: 22, yields: [{ itemId: "deepwood_truffle", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "wild_mushroom", quantity: 2 } },

  // ── SKINNING ──────────────────────────────────────────────────────────────
  { id: "gnoll_camp", name: "Gnoll Camp Scraps", icon: "🐺", description: "Hides left behind at gnoll camps", skillId: "skinning", requiredLevel: 1, xpPerGather: 14, gatherTimeSeconds: 7, yields: [{ itemId: "scraggly_hide", baseQuantity: 1, weight: 1 }] },
  { id: "wolf_hunting_ground", name: "Wolf Hunting Ground", icon: "🐾", description: "Trails where wolf pelts can be gathered", skillId: "skinning", requiredLevel: 10, xpPerGather: 32, gatherTimeSeconds: 10, yields: [{ itemId: "sturdy_hide", baseQuantity: 1, weight: 1 }] },
  { id: "bear_territory", name: "Bear Territory", icon: "🐻", description: "Dense woodland where bear pelts are prized", skillId: "skinning", requiredLevel: 30, xpPerGather: 80, gatherTimeSeconds: 20, yields: [{ itemId: "thick_pelt", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "pristine_pelt", quantity: 1 } },

  // ── PROSPECTING ───────────────────────────────────────────────────────────
  { id: "hillside_survey", name: "Hillside Survey", icon: "🔍", description: "Survey hillsides for gem deposits", skillId: "prospecting", requiredLevel: 1, xpPerGather: 18, gatherTimeSeconds: 10, yields: [{ itemId: "raw_gemstone", baseQuantity: 1, weight: 1 }] },
  { id: "karst_survey", name: "Karst Formation Survey", icon: "💎", description: "Limestone karst riddled with gem pockets", skillId: "prospecting", requiredLevel: 20, xpPerGather: 55, gatherTimeSeconds: 18, yields: [{ itemId: "survey_map_fragment", baseQuantity: 1, weight: 1 }, { itemId: "raw_gemstone", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "uncut_diamond", quantity: 1 } },
  { id: "deep_vein_survey", name: "Deep Vein Survey", icon: "🌑", description: "Prospecting deep fissures for precious stones", skillId: "prospecting", requiredLevel: 45, xpPerGather: 130, gatherTimeSeconds: 28, yields: [{ itemId: "uncut_diamond", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "raw_gemstone", quantity: 3 } },

  // ── ARCHAEOLOGY ───────────────────────────────────────────────────────────
  { id: "commonlands_ruins", name: "Commonlands Ruins", icon: "🏛️", description: "Crumbled ruins from an ancient civilization", skillId: "archaeology", requiredLevel: 1, xpPerGather: 16, gatherTimeSeconds: 9, yields: [{ itemId: "ancient_shard", baseQuantity: 1, weight: 1 }] },
  { id: "antonica_dig_site", name: "Antonica Dig Site", icon: "⛏️", description: "A formal dig site uncovering buried relics", skillId: "archaeology", requiredLevel: 15, xpPerGather: 42, gatherTimeSeconds: 14, yields: [{ itemId: "relic_fragment", baseQuantity: 1, weight: 1 }] },
  { id: "feerrott_temple", name: "Feerrott Temple Excavation", icon: "🗿", description: "An overgrown temple filled with ancient tablets", skillId: "archaeology", requiredLevel: 40, xpPerGather: 110, gatherTimeSeconds: 25, yields: [{ itemId: "relic_fragment", baseQuantity: 1, weight: 1 }, { itemId: "ancient_shard", baseQuantity: 1, weight: 1 }], rareYield: { itemId: "engraved_tablet", quantity: 1 } },

  // ── TRADESKILL HARVESTING ──────────────────────────────────────────────────
  {
    id: "shadowroot_tree", name: "Shadowroot Tree", icon: "🌑",
    description: "A gnarled tree with dark bark found in shadowy zones, prized by smiths and armorers",
    skillId: "woodcutting", requiredLevel: 30, xpPerGather: 80, gatherTimeSeconds: 20,
    yields: [{ itemId: "shadowroot_timber", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "thornvine", quantity: 2 },
    zone: "dark",
  },
  {
    id: "emberstone_outcrop", name: "Emberstone Outcrop", icon: "🔥",
    description: "A volcanic rock outcrop in fire zones that yields emberstone fragments",
    skillId: "mining", requiredLevel: 35, xpPerGather: 100, gatherTimeSeconds: 25,
    yields: [{ itemId: "emberstone_fragment", baseQuantity: 1, weight: 1 }],
    zone: "fire",
  },
  {
    id: "frostbloom_meadow", name: "Frostbloom Meadow", icon: "❄️",
    description: "A frozen meadow where rare frostbloom flowers grow in ice zones",
    skillId: "herbalism", requiredLevel: 25, xpPerGather: 70, gatherTimeSeconds: 18,
    yields: [{ itemId: "frostbloom_petal", baseQuantity: 2, weight: 1 }],
    zone: "ice",
  },
  {
    id: "manaweave_grove", name: "Manaweave Grove", icon: "🌿",
    description: "An arcane grove where magical plants grow, their fibers woven with mana",
    skillId: "herbalism", requiredLevel: 40, xpPerGather: 120, gatherTimeSeconds: 30,
    yields: [{ itemId: "manaweave_fiber", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "glimmerdust", quantity: 1 },
    zone: "arcane",
  },
  {
    id: "venom_nest", name: "Venom Nest", icon: "🕷️",
    description: "A nest of venomous creatures in mid-tier zones, carefully harvested for venom sacs",
    skillId: "foraging", requiredLevel: 20, xpPerGather: 60, gatherTimeSeconds: 15,
    yields: [{ itemId: "venom_sac", baseQuantity: 1, weight: 1 }],
    zone: "swamp",
  },
  {
    id: "astral_vein", name: "Astral Vein", icon: "✨",
    description: "A rare celestial ore vein found only in high-level arcane zones",
    skillId: "mining", requiredLevel: 55, xpPerGather: 180, gatherTimeSeconds: 40,
    yields: [{ itemId: "astral_ore", baseQuantity: 1, weight: 1 }],
    rareYield: { itemId: "ethereal_crystal", quantity: 1 },
    zone: "celestial",
  },
  {
    id: "corrupted_hunting_ground", name: "Corrupted Hunting Ground", icon: "☠️",
    description: "A zone where corrupted beasts roam, yielding thick corrupted hide when skinned",
    skillId: "skinning", requiredLevel: 35, xpPerGather: 95, gatherTimeSeconds: 22,
    yields: [{ itemId: "corrupted_hide", baseQuantity: 1, weight: 1 }],
    zone: "corrupted",
  },
  {
    id: "glimmerdust_hollow", name: "Glimmerdust Hollow", icon: "💫",
    description: "A hollow where magical crystalline formations shed glimmerdust",
    skillId: "prospecting", requiredLevel: 30, xpPerGather: 85, gatherTimeSeconds: 20,
    yields: [{ itemId: "glimmerdust", baseQuantity: 2, weight: 1 }],
    zone: "arcane",
  },
  {
    id: "deepmoss_cave", name: "Deepmoss Cave", icon: "🍄",
    description: "Deep caverns where deepmoss grows in thick carpets along cave walls",
    skillId: "herbalism", requiredLevel: 15, xpPerGather: 45, gatherTimeSeconds: 12,
    yields: [{ itemId: "deepmoss", baseQuantity: 2, weight: 1 }],
    zone: "cave",
  },
  {
    id: "thornvine_thicket", name: "Thornvine Thicket", icon: "🌵",
    description: "A dense thicket of thornvines that must be carefully harvested",
    skillId: "woodcutting", requiredLevel: 20, xpPerGather: 55, gatherTimeSeconds: 14,
    yields: [{ itemId: "thornvine", baseQuantity: 2, weight: 1 }],
    zone: "forest",
  },
];

export function getGatheringNodeById(id: string): GatheringNode | undefined {
  return GATHERING_NODES.find(n => n.id === id);
}

export function xpForLevel(level: number): number {
  // EQ2-inspired formula: exponential scaling
  return Math.floor(83 * Math.pow(level, 1.5));
}
