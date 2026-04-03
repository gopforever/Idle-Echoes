/**
 * Ghost Player Seed Data — 30 authentic EQ2-style characters.
 * All start at level 1 and progress organically from the newbie zones.
 * Personalities shape combat style, world events, and economy participation.
 */

export type GhostPersonality = "Aggressive" | "Cautious" | "Explorer" | "Greedy" | "Scholarly" | "Devout";

export interface GhostSeed {
  name: string;
  race: string;
  class: string;
  archetype: string;
  alignment: "Qeynos" | "Freeport" | "Neutral";
  personality: GhostPersonality;
  level: number;
  xp: number;
  gold: number;
  zone: string;
  killCount: number;
  deathCount: number;
  bossKills: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  stats: {
    strength: number; agility: number; stamina: number;
    intelligence: number; wisdom: number; charisma: number;
  };
}

export const GHOST_SEEDS: GhostSeed[] = [
  {
    name: "Tharindel",
    race: "High Elf", class: "Wizard", archetype: "Mage", alignment: "Qeynos",
    personality: "Scholarly",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 8, agility: 12, stamina: 14, intelligence: 52, wisdom: 38, charisma: 20 },
  },
  {
    name: "Morigath",
    race: "Dark Elf", class: "Shadowknight", archetype: "Fighter", alignment: "Freeport",
    personality: "Greedy",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 45, agility: 22, stamina: 40, intelligence: 18, wisdom: 14, charisma: 10 },
  },
  {
    name: "Sylvarra",
    race: "Wood Elf", class: "Ranger", archetype: "Scout", alignment: "Qeynos",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 20, agility: 48, stamina: 22, intelligence: 16, wisdom: 18, charisma: 14 },
  },
  {
    name: "Durgrak",
    race: "Ogre", class: "Berserker", archetype: "Fighter", alignment: "Freeport",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 60, agility: 14, stamina: 55, intelligence: 8, wisdom: 10, charisma: 6 },
  },
  {
    name: "Liria Sunwhisper",
    race: "Fae", class: "Fury", archetype: "Priest", alignment: "Qeynos",
    personality: "Cautious",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 10, agility: 30, stamina: 16, intelligence: 22, wisdom: 44, charisma: 28 },
  },
  {
    name: "Zhangar",
    race: "Sarnak", class: "Inquisitor", archetype: "Priest", alignment: "Freeport",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 22, agility: 18, stamina: 28, intelligence: 30, wisdom: 55, charisma: 20 },
  },
  {
    name: "Kelindra",
    race: "Kerra", class: "Swashbuckler", archetype: "Scout", alignment: "Qeynos",
    personality: "Cautious",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 24, agility: 50, stamina: 20, intelligence: 14, wisdom: 12, charisma: 22 },
  },
  {
    name: "Brunnhildr",
    race: "Barbarian", class: "Berserker", archetype: "Fighter", alignment: "Qeynos",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 55, agility: 20, stamina: 50, intelligence: 10, wisdom: 12, charisma: 14 },
  },
  {
    name: "Naxxaril",
    race: "Arasai", class: "Necromancer", archetype: "Mage", alignment: "Freeport",
    personality: "Greedy",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 10, agility: 20, stamina: 14, intelligence: 52, wisdom: 20, charisma: 16 },
  },
  {
    name: "Tumblefoot",
    race: "Gnome", class: "Illusionist", archetype: "Mage", alignment: "Qeynos",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 8, agility: 22, stamina: 12, intelligence: 55, wisdom: 25, charisma: 35 },
  },
  {
    name: "Gorrak Stonehide",
    race: "Troll", class: "Shadowknight", archetype: "Fighter", alignment: "Freeport",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 52, agility: 16, stamina: 58, intelligence: 10, wisdom: 8, charisma: 6 },
  },
  {
    name: "Elindra",
    race: "Half Elf", class: "Troubador", archetype: "Scout", alignment: "Qeynos",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 16, agility: 32, stamina: 18, intelligence: 20, wisdom: 16, charisma: 40 },
  },
  {
    name: "Vorrigan",
    race: "Human", class: "Paladin", archetype: "Fighter", alignment: "Qeynos",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 42, agility: 18, stamina: 45, intelligence: 14, wisdom: 30, charisma: 22 },
  },
  {
    name: "Ssalika",
    race: "Iksar", class: "Monk", archetype: "Fighter", alignment: "Freeport",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 36, agility: 42, stamina: 32, intelligence: 16, wisdom: 22, charisma: 12 },
  },
  {
    name: "Pyrelia",
    race: "Erudite", class: "Coercer", archetype: "Mage", alignment: "Qeynos",
    personality: "Scholarly",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 8, agility: 14, stamina: 12, intelligence: 60, wisdom: 30, charisma: 45 },
  },
  {
    name: "Thonk",
    race: "Halfling", class: "Dirge", archetype: "Scout", alignment: "Qeynos",
    personality: "Cautious",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 12, agility: 38, stamina: 14, intelligence: 16, wisdom: 14, charisma: 30 },
  },
  {
    name: "Rivendarax",
    race: "Dark Elf", class: "Wizard", archetype: "Mage", alignment: "Freeport",
    personality: "Greedy",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 10, agility: 16, stamina: 14, intelligence: 62, wisdom: 22, charisma: 18 },
  },
  {
    name: "Gwendolyn Ashveil",
    race: "Human", class: "Templar", archetype: "Priest", alignment: "Qeynos",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 20, agility: 16, stamina: 28, intelligence: 20, wisdom: 55, charisma: 28 },
  },
  {
    name: "Krix",
    race: "Gnome", class: "Warlock", archetype: "Mage", alignment: "Freeport",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 8, agility: 18, stamina: 12, intelligence: 58, wisdom: 18, charisma: 22 },
  },
  {
    name: "Arzuhl",
    race: "Sarnak", class: "Berserker", archetype: "Fighter", alignment: "Freeport",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 55, agility: 24, stamina: 50, intelligence: 10, wisdom: 12, charisma: 10 },
  },
  {
    name: "Caladiel",
    race: "High Elf", class: "Fury", archetype: "Priest", alignment: "Qeynos",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 10, agility: 24, stamina: 18, intelligence: 28, wisdom: 52, charisma: 30 },
  },
  {
    name: "Thurak",
    race: "Ogre", class: "Guardian", archetype: "Fighter", alignment: "Freeport",
    personality: "Aggressive",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 56, agility: 12, stamina: 58, intelligence: 8, wisdom: 10, charisma: 6 },
  },
  {
    name: "Whisperwind",
    race: "Fae", class: "Warden", archetype: "Priest", alignment: "Qeynos",
    personality: "Cautious",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 10, agility: 28, stamina: 14, intelligence: 18, wisdom: 46, charisma: 30 },
  },
  {
    name: "Daxaran",
    race: "Half Elf", class: "Swashbuckler", archetype: "Scout", alignment: "Freeport",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 22, agility: 48, stamina: 22, intelligence: 14, wisdom: 12, charisma: 28 },
  },
  {
    name: "Torgrath",
    race: "Troll", class: "Defiler", archetype: "Priest", alignment: "Freeport",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 22, agility: 16, stamina: 30, intelligence: 24, wisdom: 52, charisma: 8 },
  },
  {
    name: "Elindor Swiftblade",
    race: "Wood Elf", class: "Assassin", archetype: "Scout", alignment: "Qeynos",
    personality: "Explorer",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 22, agility: 55, stamina: 24, intelligence: 14, wisdom: 12, charisma: 18 },
  },
  {
    name: "Ironfist",
    race: "Dwarf", class: "Guardian", archetype: "Fighter", alignment: "Qeynos",
    personality: "Devout",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 50, agility: 18, stamina: 52, intelligence: 10, wisdom: 14, charisma: 14 },
  },
  {
    name: "Maeloria",
    race: "Erudite", class: "Templar", archetype: "Priest", alignment: "Qeynos",
    personality: "Scholarly",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 14, agility: 16, stamina: 22, intelligence: 35, wisdom: 60, charisma: 32 },
  },
  {
    name: "Razzik",
    race: "Iksar", class: "Necromancer", archetype: "Mage", alignment: "Freeport",
    personality: "Greedy",
    level: 1, xp: 0, gold: 0, zone: "Commonlands",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 12, agility: 22, stamina: 16, intelligence: 55, wisdom: 22, charisma: 12 },
  },
  {
    name: "Sunaria",
    race: "Kerra", class: "Troubador", archetype: "Scout", alignment: "Qeynos",
    personality: "Cautious",
    level: 1, xp: 0, gold: 0, zone: "Antonica",
    killCount: 0, deathCount: 0, bossKills: 0, totalGoldEarned: 0, totalGoldSpent: 0,
    stats: { strength: 18, agility: 42, stamina: 20, intelligence: 18, wisdom: 14, charisma: 45 },
  },
];
