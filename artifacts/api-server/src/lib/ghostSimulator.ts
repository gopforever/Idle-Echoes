/**
 * Ghost Player Simulation Engine v2
 * 60 ghost players with distinct personalities, organic level progression from 1,
 * economy participation, and richer world-building events.
 *
 * Personalities:
 *   Aggressive  — high boss encounter rate, brutal kill messages
 *   Cautious    — avoids bosses, lingers in safer zones, survives longer
 *   Explorer    — travels frequently regardless of level, generates discovery events
 *   Greedy      — high loot chance, hoards gold, rarely spends
 *   Scholarly   — lore-rich events, discovers texts/runes, buys materials & adornments
 *   Devout      — faction-aligned, prefers aligned zones, generates faction narrative
 *
 * Economy: after each win, ghosts have a personality-weighted chance to "purchase"
 * from the ghost_market_demand table, driving shop price fluctuations for the real player.
 */

import { db } from "@workspace/db";
import {
  worldPlayersTable,
  worldEventsTable,
  factionsTable,
  ghostMarketDemandTable,
  loreCacheTable,
  auctionListingsTable,
  charactersTable,
  ghostDungeonClearsTable,
  ghostRaidClearsTable,
  ghostEpicQuestProgressTable,
} from "@workspace/db/schema";
import { and, desc, eq, gt, lt, sql, inArray, isNull } from "drizzle-orm";
import { GHOST_SEEDS, type GhostPersonality } from "./ghostSeeds.js";
import { PERSONALITY_CATALOG, getArchetype } from "./ghostPersonalities.js";
import { xpForLevel, computeStats, computeGearScore } from "./eq2Formulas.js";
import { cleanExpiredListings } from "./auctionService.js";
import {
  CRAFTING_RECIPES,
  GATHERING_NODES,
  getItemById,
  ITEMS,
  type ExperimentFocus,
  type ItemStats,
} from "./gameData.js";
import {
  knownRecipesTable,
  ghostKnownRecipesTable,
  oneOfAKindCraftedTable,
  inventoryTable,
  ghostInventoryTable,
  recipesTable,
  ghostLegacyTable,
} from "@workspace/db/schema";
import { DUNGEONS } from "./dungeonData.js";
import { RAIDS } from "./raidData.js";
import { generateOoakName, TRADESKILL_CLASSES } from "./tradeskillData.js";
import type { TradeskillClass } from "./tradeskillData.js";
import { rollItem, type ProceduralRarity } from "./proceduralItems.js";
import { getEpicWeaponByClass } from "./epicQuestData.js";

// ─── Simulator version — bump to force a reset of ghost data ─────────────────
const SIMULATOR_VERSION = 7;

// ─── Zone registry ────────────────────────────────────────────────────────────

interface ZoneInfo {
  id: string; name: string; min: number; max: number; factionId?: string;
}

const ZONE_LIST: ZoneInfo[] = [
  { id: "commonlands",        name: "Commonlands",             min: 1,  max: 10,  factionId: "freeport"  },
  { id: "antonica",           name: "Antonica",                min: 1,  max: 10,  factionId: "qeynos"   },
  { id: "thundering_steppes", name: "Thundering Steppes",      min: 10, max: 20               },
  { id: "nektulos_forest",    name: "Nektulos Forest",         min: 20, max: 30, factionId: "neriak"   },
  { id: "enchanted_lands",    name: "Enchanted Lands",         min: 20, max: 30, factionId: "concordium"},
  { id: "zek",                name: "Zek, the Orcish Wastes",  min: 25, max: 35               },
  { id: "everfrost",          name: "Everfrost Peaks",         min: 30, max: 40               },
  { id: "lavastorm",          name: "Lavastorm Mountains",     min: 40, max: 50, factionId: "nagafen"  },
  { id: "lesser_faydark",     name: "Lesser Faydark",          min: 35, max: 45               },
  { id: "feerrott",           name: "Feerrott",                min: 45, max: 55               },
];

const ZONE_BY_NAME = new Map(ZONE_LIST.map(z => [z.name, z]));

// ─── Zone enemies ─────────────────────────────────────────────────────────────

interface ZoneEnemy {
  name: string; type: string;
  levelMod: number;
  dmgMin: number; dmgMax: number;
  attackRating: number; defense: number; mitigation: number; avoidance: number;
  xpMult: number; goldMult: number; isBoss?: boolean;
  factionId?: string;
}

const ZONE_ENEMIES: Record<string, ZoneEnemy[]> = {
  commonlands: [
    { name: "gnoll scout", type: "beast", levelMod: 0, dmgMin: 8, dmgMax: 16, attackRating: 80, defense: 60, mitigation: 8, avoidance: 5, xpMult: 1.0, goldMult: 1.0 },
    { name: "skeleton warrior", type: "undead", levelMod: 0, dmgMin: 10, dmgMax: 20, attackRating: 90, defense: 50, mitigation: 12, avoidance: 3, xpMult: 1.1, goldMult: 0.8 },
    { name: "gnoll warchief", type: "beast", levelMod: 2, dmgMin: 18, dmgMax: 32, attackRating: 140, defense: 100, mitigation: 18, avoidance: 8, xpMult: 2.0, goldMult: 2.5, isBoss: true, factionId: "freeport" },
  ],
  antonica: [
    { name: "antonica wolf", type: "beast", levelMod: 0, dmgMin: 9, dmgMax: 18, attackRating: 85, defense: 65, mitigation: 10, avoidance: 8, xpMult: 1.0, goldMult: 1.0 },
    { name: "greystone golem", type: "construct", levelMod: 1, dmgMin: 12, dmgMax: 24, attackRating: 100, defense: 80, mitigation: 20, avoidance: 2, xpMult: 1.2, goldMult: 1.3 },
    { name: "Bloodskull Champion", type: "humanoid", levelMod: 3, dmgMin: 22, dmgMax: 38, attackRating: 155, defense: 110, mitigation: 22, avoidance: 6, xpMult: 2.2, goldMult: 2.8, isBoss: true },
  ],
  thundering_steppes: [
    { name: "thundering basilisk", type: "reptile", levelMod: 0, dmgMin: 14, dmgMax: 28, attackRating: 120, defense: 90, mitigation: 14, avoidance: 6, xpMult: 1.0, goldMult: 1.0 },
    { name: "ravasect", type: "insect", levelMod: 0, dmgMin: 16, dmgMax: 30, attackRating: 130, defense: 85, mitigation: 12, avoidance: 12, xpMult: 1.1, goldMult: 1.1 },
    { name: "Stonemite Elder", type: "elemental", levelMod: 3, dmgMin: 30, dmgMax: 55, attackRating: 200, defense: 160, mitigation: 28, avoidance: 8, xpMult: 2.5, goldMult: 3.0, isBoss: true },
  ],
  nektulos_forest: [
    { name: "dark elf assassin", type: "humanoid", levelMod: 0, dmgMin: 18, dmgMax: 36, attackRating: 160, defense: 120, mitigation: 15, avoidance: 18, xpMult: 1.0, goldMult: 1.2, factionId: "neriak" },
    { name: "shadowmere", type: "undead", levelMod: 1, dmgMin: 20, dmgMax: 40, attackRating: 170, defense: 110, mitigation: 18, avoidance: 10, xpMult: 1.2, goldMult: 1.0 },
    { name: "Noctivagant Overlord", type: "undead", levelMod: 4, dmgMin: 42, dmgMax: 72, attackRating: 280, defense: 200, mitigation: 35, avoidance: 12, xpMult: 2.8, goldMult: 3.5, isBoss: true },
  ],
  enchanted_lands: [
    { name: "corrupt brownie", type: "fae", levelMod: 0, dmgMin: 16, dmgMax: 32, attackRating: 150, defense: 100, mitigation: 12, avoidance: 15, xpMult: 1.0, goldMult: 1.0 },
    { name: "enraged satyr", type: "humanoid", levelMod: 1, dmgMin: 20, dmgMax: 38, attackRating: 165, defense: 115, mitigation: 16, avoidance: 10, xpMult: 1.1, goldMult: 1.2 },
    { name: "Darkfae Queen", type: "fae", levelMod: 4, dmgMin: 40, dmgMax: 68, attackRating: 265, defense: 185, mitigation: 30, avoidance: 18, xpMult: 2.6, goldMult: 3.2, isBoss: true },
  ],
  zek: [
    { name: "orc warlord", type: "humanoid", levelMod: 0, dmgMin: 20, dmgMax: 40, attackRating: 180, defense: 140, mitigation: 22, avoidance: 8, xpMult: 1.0, goldMult: 1.2 },
    { name: "rallosian soldier", type: "humanoid", levelMod: 1, dmgMin: 22, dmgMax: 44, attackRating: 195, defense: 150, mitigation: 24, avoidance: 7, xpMult: 1.2, goldMult: 1.3 },
    { name: "Rallosian Demi-god", type: "humanoid", levelMod: 5, dmgMin: 55, dmgMax: 90, attackRating: 330, defense: 240, mitigation: 40, avoidance: 10, xpMult: 3.0, goldMult: 4.0, isBoss: true },
  ],
  everfrost: [
    { name: "frost giant", type: "giant", levelMod: 0, dmgMin: 24, dmgMax: 48, attackRating: 210, defense: 160, mitigation: 28, avoidance: 5, xpMult: 1.0, goldMult: 1.3 },
    { name: "dire wolf", type: "beast", levelMod: 0, dmgMin: 20, dmgMax: 40, attackRating: 190, defense: 130, mitigation: 18, avoidance: 14, xpMult: 1.0, goldMult: 1.0 },
    { name: "Permafrost Guardian", type: "elemental", levelMod: 5, dmgMin: 60, dmgMax: 100, attackRating: 360, defense: 260, mitigation: 45, avoidance: 8, xpMult: 3.2, goldMult: 4.5, isBoss: true },
  ],
  lavastorm: [
    { name: "fire giant", type: "giant", levelMod: 0, dmgMin: 30, dmgMax: 58, attackRating: 260, defense: 200, mitigation: 35, avoidance: 6, xpMult: 1.0, goldMult: 1.5 },
    { name: "lava elemental", type: "elemental", levelMod: 1, dmgMin: 32, dmgMax: 62, attackRating: 275, defense: 210, mitigation: 38, avoidance: 5, xpMult: 1.2, goldMult: 1.4 },
    { name: "Nagafen's Chosen", type: "dragon", levelMod: 6, dmgMin: 80, dmgMax: 130, attackRating: 450, defense: 340, mitigation: 55, avoidance: 12, xpMult: 4.0, goldMult: 6.0, isBoss: true },
  ],
  lesser_faydark: [
    { name: "darkened treant", type: "plant", levelMod: 0, dmgMin: 22, dmgMax: 44, attackRating: 200, defense: 160, mitigation: 25, avoidance: 5, xpMult: 1.0, goldMult: 1.2 },
    { name: "evil sprite", type: "fae", levelMod: 0, dmgMin: 20, dmgMax: 40, attackRating: 190, defense: 140, mitigation: 18, avoidance: 16, xpMult: 1.1, goldMult: 1.1 },
    { name: "Faerie Dragon", type: "dragon", levelMod: 5, dmgMin: 65, dmgMax: 110, attackRating: 380, defense: 280, mitigation: 48, avoidance: 14, xpMult: 3.5, goldMult: 5.0, isBoss: true },
  ],
  feerrott: [
    { name: "ogre shaman", type: "humanoid", levelMod: 0, dmgMin: 34, dmgMax: 65, attackRating: 290, defense: 220, mitigation: 38, avoidance: 7, xpMult: 1.0, goldMult: 1.5 },
    { name: "lizardman seer", type: "humanoid", levelMod: 1, dmgMin: 36, dmgMax: 68, attackRating: 300, defense: 230, mitigation: 35, avoidance: 10, xpMult: 1.2, goldMult: 1.4 },
    { name: "Temple Guardian", type: "construct", levelMod: 6, dmgMin: 90, dmgMax: 150, attackRating: 500, defense: 380, mitigation: 60, avoidance: 8, xpMult: 4.5, goldMult: 7.0, isBoss: true },
  ],
};

// ─── Personality configuration ────────────────────────────────────────────────

interface PersonalityConfig {
  bossChance: number;
  lootChance: number;
  spendChance: number;
  explorerTick: boolean;         // travels every N ticks regardless of level-up
  preferAlignedZone: boolean;
  spendCategories: { cat: string; weight: number }[];
}

const PERSONALITY_CONFIG: Record<GhostPersonality, PersonalityConfig> = {
  Aggressive: {
    bossChance: 0.20,
    lootChance: 0.10,
    spendChance: 0.15,
    explorerTick: false,
    preferAlignedZone: false,
    spendCategories: [
      { cat: "weapons", weight: 40 },
      { cat: "armor", weight: 40 },
      { cat: "consumables", weight: 20 },
    ],
  },
  Cautious: {
    bossChance: 0.02,
    lootChance: 0.10,
    spendChance: 0.18,
    explorerTick: false,
    preferAlignedZone: false,
    spendCategories: [
      { cat: "consumables", weight: 50 },
      { cat: "armor", weight: 40 },
      { cat: "weapons", weight: 10 },
    ],
  },
  Explorer: {
    bossChance: 0.08,
    lootChance: 0.10,
    spendChance: 0.12,
    explorerTick: true,
    preferAlignedZone: false,
    spendCategories: [
      { cat: "consumables", weight: 30 },
      { cat: "materials", weight: 40 },
      { cat: "armor", weight: 30 },
    ],
  },
  Greedy: {
    bossChance: 0.08,
    lootChance: 0.25,
    spendChance: 0.05,
    explorerTick: false,
    preferAlignedZone: false,
    spendCategories: [
      { cat: "consumables", weight: 60 },
      { cat: "materials", weight: 40 },
    ],
  },
  Scholarly: {
    bossChance: 0.05,
    lootChance: 0.08,
    spendChance: 0.20,
    explorerTick: false,
    preferAlignedZone: false,
    spendCategories: [
      { cat: "materials", weight: 40 },
      { cat: "adornments", weight: 40 },
      { cat: "consumables", weight: 20 },
    ],
  },
  Devout: {
    bossChance: 0.08,
    lootChance: 0.10,
    spendChance: 0.16,
    explorerTick: false,
    preferAlignedZone: true,
    spendCategories: [
      { cat: "consumables", weight: 40 },
      { cat: "armor", weight: 40 },
      { cat: "adornments", weight: 20 },
    ],
  },
};

// ─── Narrative message templates ──────────────────────────────────────────────
// Each personality has its own pool per event type

const KILL_MSGS: Record<GhostPersonality, Record<string, string[]>> = {
  Aggressive: {
    Fighter: [
      "{name} rampages through {zone}, leaving a trail of {enemy} corpses!",
      "{name} charges headlong into a {enemy}, pulverising it in {zone}.",
      "{name} unleashes an unstoppable fury, destroying a {enemy} in {zone}!",
      "{name} roars triumphantly over a slain {enemy} in {zone}.",
    ],
    Scout: [
      "{name} ambushes a {enemy} with overwhelming ferocity in {zone}!",
      "{name} recklessly charges a {enemy} and cuts it down in {zone}.",
      "{name} drives a blade through a {enemy}'s back in {zone}, grinning.",
      "{name} hunts down a fleeing {enemy} in {zone}.",
    ],
    Mage: [
      "{name} incinerates a {enemy} with reckless abandon in {zone}!",
      "{name} blasts through a {enemy} without hesitation in {zone}.",
      "{name} chain-casts destruction spells on a {enemy} in {zone}.",
      "{name} overwhelms a {enemy} with raw magical force in {zone}.",
    ],
    Priest: [
      "{name} smites a {enemy} with divine fury in {zone}!",
      "{name} calls down righteous wrath upon a {enemy} in {zone}.",
      "{name} crushes a {enemy} without mercy in {zone}.",
      "{name} purges a {enemy} with holy vengeance in {zone}.",
    ],
  },
  Cautious: {
    Fighter: [
      "{name} methodically wears down a {enemy} in {zone}.",
      "{name} shields up and patiently outlasts a {enemy} in {zone}.",
      "{name} times a careful strike, defeating a {enemy} in {zone}.",
      "{name} stays defensive, eventually besting a {enemy} in {zone}.",
    ],
    Scout: [
      "{name} scouts the terrain before dispatching a {enemy} in {zone}.",
      "{name} takes no chances — fires from distance on a {enemy} in {zone}.",
      "{name} waits for the perfect moment, then fells a {enemy} in {zone}.",
      "{name} carefully picks off a {enemy} from the shadows of {zone}.",
    ],
    Mage: [
      "{name} keeps a safe distance and methodically defeats a {enemy} in {zone}.",
      "{name} uses crowd control before finishing a {enemy} in {zone}.",
      "{name} casts measured spells, conserving mana, defeating a {enemy} in {zone}.",
      "{name} retreats and casts — the {enemy} falls in {zone}.",
    ],
    Priest: [
      "{name} heals through the fight and outlasts a {enemy} in {zone}.",
      "{name} carefully channels power to defeat a {enemy} in {zone}.",
      "{name} uses divine protection and bests a {enemy} in {zone}.",
      "{name} prays for endurance before defeating a {enemy} in {zone}.",
    ],
  },
  Explorer: {
    Fighter: [
      "{name} discovered a {enemy} while mapping new territory in {zone}!",
      "{name} wanders off the beaten path and fights a {enemy} in {zone}.",
      "{name} explores deeper into {zone} and encounters a {enemy}.",
      "{name} blazes a trail through {zone}, besting a {enemy}.",
    ],
    Scout: [
      "{name} scouted ahead and encountered a {enemy} in uncharted {zone}.",
      "{name} charts the wilds of {zone} and picks off a {enemy}.",
      "{name} marks a {enemy}'s patrol route in {zone} then strikes.",
      "{name} discovers {zone}'s hidden paths while dealing with a {enemy}.",
    ],
    Mage: [
      "{name} studies {zone}'s ley lines and blasts a {enemy} aside.",
      "{name} surveys new arcane sites in {zone}, defeating a {enemy}.",
      "{name} catalogues {zone}'s magical phenomena, pausing to slay a {enemy}.",
      "{name} traces ancient power in {zone}, incinerating a {enemy} en route.",
    ],
    Priest: [
      "{name} consecrates new ground in {zone}, defeating a {enemy} along the way.",
      "{name} draws a sacred map of {zone} and banishes a {enemy}.",
      "{name} names a new shrine in {zone} after defeating a {enemy}.",
      "{name} seeks holy sites in {zone} and drives off a {enemy}.",
    ],
  },
  Greedy: {
    Fighter: [
      "{name} kills a {enemy} in {zone} and immediately checks its pockets.",
      "{name} guts a {enemy} in {zone} — first things first: loot.",
      "{name} drops a {enemy} in {zone}, eyes gleaming at the potential gold.",
      "{name} defeats a {enemy} in {zone} and haggles over the corpse's worth.",
    ],
    Scout: [
      "{name} targets the richest-looking {enemy} in {zone}.",
      "{name} picks a {enemy}'s valuables in {zone} before the body even falls.",
      "{name} eliminates a {enemy} in {zone} with profit in mind.",
      "{name} sifts through a dead {enemy} in {zone}, pocketing everything.",
    ],
    Mage: [
      "{name} vaporises a {enemy} in {zone} and collects what's left.",
      "{name} calculates the loot value before casting at a {enemy} in {zone}.",
      "{name} destroys a {enemy} in {zone} — the gold was the priority anyway.",
      "{name} loots a {enemy}'s essence crystals in {zone}.",
    ],
    Priest: [
      "{name} claims a {enemy}'s gold as a 'tithe' in {zone}.",
      "{name} smites a {enemy} in {zone} and pockets the coins.",
      "{name} defeats a {enemy} in {zone} — the gods approve of the looting.",
      "{name} blesses the loot on a {enemy} in {zone} before taking it.",
    ],
  },
  Scholarly: {
    Fighter: [
      "{name} studies a {enemy}'s combat patterns in {zone} then defeats it.",
      "{name} documents a {enemy} encounter in {zone} for future research.",
      "{name} notes weaknesses of the {enemy} species before striking in {zone}.",
      "{name} writes field notes on {enemy} behaviour while fighting in {zone}.",
    ],
    Scout: [
      "{name} observes a {enemy}'s habits in {zone} then assassinates it.",
      "{name} catalogues {enemy} patrol routes in {zone}.",
      "{name} sketches a {enemy} in their journal before dispatching it in {zone}.",
      "{name} records a {enemy} sighting in their field guide for {zone}.",
    ],
    Mage: [
      "{name} analyses a {enemy}'s magical resonance in {zone} before striking.",
      "{name} theorises about {enemy} origins while defeating it in {zone}.",
      "{name} takes magical readings on a {enemy} in {zone} for their research.",
      "{name} adds a {enemy} to their bestiary after slaying it in {zone}.",
    ],
    Priest: [
      "{name} studies divine texts on {enemy} classification in {zone}.",
      "{name} performs a ritual analysis of a {enemy} in {zone}.",
      "{name} inscribes the {enemy} defeat in the sacred chronicles of {zone}.",
      "{name} teaches an apprentice about {enemy} weaknesses after the fight in {zone}.",
    ],
  },
  Devout: {
    Fighter: [
      "{name} consecrates a blade and slays a {enemy} for the gods in {zone}.",
      "{name} fights with holy purpose, besting a {enemy} in {zone}.",
      "{name} chants a battle prayer and defeats a {enemy} in {zone}.",
      "{name} dedicates the kill of a {enemy} in {zone} to their patron deity.",
    ],
    Scout: [
      "{name} marks a {enemy} for divine judgement in {zone}.",
      "{name} scouts with faith guiding each step, killing a {enemy} in {zone}.",
      "{name} whispers a prayer before ambushing a {enemy} in {zone}.",
      "{name} carries out holy orders — one {enemy} fewer in {zone}.",
    ],
    Mage: [
      "{name} channels divine magic to smite a {enemy} in {zone}.",
      "{name} calls upon sacred power to destroy a {enemy} in {zone}.",
      "{name} weaves holy light through arcane fire, defeating a {enemy} in {zone}.",
      "{name} invokes a blessing and obliterates a {enemy} in {zone}.",
    ],
    Priest: [
      "{name} serves divine will, purging a {enemy} from {zone}.",
      "{name} channels pure faith, banishing a {enemy} from {zone}.",
      "{name} leads the faithful in prayer and defeats a {enemy} in {zone}.",
      "{name} speaks the Word — the {enemy} falls in {zone}.",
    ],
  },
};

const BOSS_MSGS: Record<GhostPersonality, string[]> = {
  Aggressive: [
    "{name} hunts down and destroys the mighty {enemy} in {zone}!",
    "{name} challenges {enemy} in {zone} — the boss falls!",
    "{name} tears through {enemy} with unrelenting savagery in {zone}!",
  ],
  Cautious: [
    "{name} outmanoeuvres and defeats {enemy} in {zone} through careful strategy.",
    "{name} survives the encounter with {enemy} in {zone} — barely.",
    "{name} patiently waits for openings and slays {enemy} in {zone}.",
  ],
  Explorer: [
    "{name} stumbles upon {enemy} while mapping {zone} — and wins!",
    "{name} charts unknown territory in {zone} and defeats {enemy}.",
    "{name} discovers {enemy}'s lair deep in {zone} and claims victory.",
  ],
  Greedy: [
    "{name} defeats {enemy} in {zone} — the rare loot was the whole point.",
    "{name} calculated the boss loot tables before fighting {enemy} in {zone}.",
    "{name} loots {enemy}'s treasure hoard in {zone}!",
  ],
  Scholarly: [
    "{name} defeats the legendary {enemy} in {zone} and transcribes the encounter.",
    "{name} conducts a scholarly analysis of {enemy} mid-battle in {zone}!",
    "{name} documents {enemy}'s abilities in the {zone} compendium — after winning.",
  ],
  Devout: [
    "{name} slays the heretical {enemy} in {zone} with divine blessing.",
    "{name} enacts righteous judgement on {enemy} in {zone}!",
    "{name} dedicates the fall of {enemy} in {zone} to the gods.",
  ],
};

const LEVEL_MSGS: Record<GhostPersonality, string[]> = {
  Aggressive: [
    "{name} smashes through to level {level} — nothing in {zone} can stop them now!",
    "Level {level}! {name} is only getting more dangerous in {zone}.",
    "{name} dings level {level} in {zone} and immediately looks for a bigger fight.",
  ],
  Cautious: [
    "{name} reaches level {level} in {zone} — steady and careful.",
    "Level {level} for {name}! Hard work and patience paid off in {zone}.",
    "{name} advances to level {level} in {zone}, still careful as ever.",
  ],
  Explorer: [
    "{name} levels to {level} in {zone} — and immediately sets off to explore more!",
    "Level {level}! {name} marks the milestone on their map of {zone}.",
    "{name} hits level {level} while charting new paths through {zone}.",
  ],
  Greedy: [
    "Level {level}! {name} counts coins in {zone} — more levels, more loot.",
    "{name} hits level {level} in {zone}. The gold per kill just went up.",
    "Level {level} for {name} — gold farming efficiency increases in {zone}.",
  ],
  Scholarly: [
    "{name} reaches level {level}, recording the milestone in their journal in {zone}.",
    "Level {level}! {name} adds a new chapter to their bestiary of {zone}.",
    "{name} attains level {level} in {zone} — knowledge is power.",
  ],
  Devout: [
    "{name} is blessed with level {level} in {zone} by their patron deity.",
    "The gods smile upon {name} — level {level} reached in {zone}!",
    "{name} offers thanks for level {level} after prayer in {zone}.",
  ],
};

const ZONE_MSGS: Record<GhostPersonality, string[]> = {
  Aggressive: [
    "{name} storms into {zone} looking for worthy opponents.",
    "{name} conquers {zone} and moves on — nothing was challenging enough.",
    "{name} arrives in {zone}, fists already clenched.",
  ],
  Cautious: [
    "{name} scouts ahead and carefully enters {zone}.",
    "{name} retreats to the relative safety of {zone}.",
    "{name} studies {zone} from the border before entering cautiously.",
  ],
  Explorer: [
    "{name} charts a course to unvisited {zone}!",
    "{name} crosses into {zone} — first time here, lots to discover.",
    "{name} adds {zone} to their growing map of Norrath.",
  ],
  Greedy: [
    "{name} relocates to {zone} after researching its loot tables.",
    "{name} follows word of rich pickings into {zone}.",
    "{name} arrives in {zone} having heard rumours of rare treasure.",
  ],
  Scholarly: [
    "{name} journeys to {zone} to study its unique ecosystem.",
    "{name} arrives in {zone}, quill and parchment already in hand.",
    "{name} transfers to {zone} to research its ancient ruins.",
  ],
  Devout: [
    "{name} travels to {zone} following a divine calling.",
    "{name} enters {zone} to carry out holy mission.",
    "{name} consecrates their arrival in {zone} with a brief prayer.",
  ],
};

const LOOT_MSGS: Record<GhostPersonality, string[]> = {
  Aggressive: [
    "{name} tears open a chest in {zone} — {gold} gold inside!",
    "{name} smashes through a locked box in {zone} and finds {gold} gold.",
    "Victory pays! {name} loots {gold} gold from the battlefield in {zone}.",
  ],
  Cautious: [
    "{name} carefully examines a cache in {zone} and finds {gold} gold.",
    "{name} checks for traps then recovers {gold} gold in {zone}.",
    "Slow and steady — {name} discovers {gold} gold in {zone}.",
  ],
  Explorer: [
    "{name} discovers a hidden cache in {zone}: {gold} gold!",
    "{name}'s exploring pays off — {gold} gold found in uncharted {zone}.",
    "{name} marks a treasure site on their map of {zone}: {gold} gold.",
  ],
  Greedy: [
    "{name} pockets {gold} gold from a corpse in {zone} — as expected.",
    "Windfall! {name} loots {gold} gold in {zone} and counts every coin.",
    "{name} sniffs out {gold} gold from a hidden cache in {zone}.",
  ],
  Scholarly: [
    "{name} finds {gold} gold beside ancient texts in {zone}.",
    "Research pays! {name} discovers {gold} gold and a rare tome in {zone}.",
    "{name} uncovers {gold} gold at an abandoned campsite in {zone}.",
  ],
  Devout: [
    "{name} offers tithe — then pockets {gold} gold in {zone}.",
    "The gods provide: {name} finds {gold} gold in {zone}.",
    "{name} discovers a blessed cache of {gold} gold in {zone}.",
  ],
};

const DISCOVERY_MSGS: Record<GhostPersonality, string[]> = {
  Explorer: [
    "{name} discovers the ruins of the Siren's Outpost deep in {zone}!",
    "{name} charts the location of the Sunken Wayshrine in {zone}.",
    "{name} finds an ancient stone circle in the heart of {zone}.",
    "{name} maps the Valley of Echoes, hidden within {zone}.",
    "{name} uncovers the Lost Crossroads of Norrath in {zone}!",
    "{name} locates the Whispering Grove — a secret corner of {zone}.",
  ],
  Scholarly: [
    "{name} transcribes ancient Combine runes found on a monolith in {zone}.",
    "{name} translates a forgotten dialect from a cave wall in {zone}.",
    "{name} studies the star charts etched into the ruins of {zone}.",
    "{name} discovers a cache of pre-Shattering texts in {zone}.",
    "{name} deciphers an ancient map fragment found in {zone}.",
    "{name} records a new magical anomaly deep within {zone}.",
  ],
  Aggressive: [],
  Cautious: [],
  Greedy: [],
  Devout: [],
};

const PURCHASE_MSGS: Record<string, string> = {
  weapons:     "{name} pays a merchant in {zone} for new weapons.",
  armor:       "{name} invests in fresh armor from a vendor in {zone}.",
  consumables: "{name} stocks up on supplies from a trader in {zone}.",
  mounts:      "{name} inquires about mounts at the stables in {zone}.",
  materials:   "{name} purchases crafting materials from a shop in {zone}.",
  adornments:  "{name} buys adornments to enhance their gear in {zone}.",
  accessories: "{name} picks up accessories from a {zone} merchant.",
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(tmpl: string, vars: Record<string, string | number>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function zoneForLevel(level: number): ZoneInfo {
  const suitable = ZONE_LIST.filter(z => level >= z.min - 2 && level <= z.max + 3);
  return pick(suitable.length ? suitable : ZONE_LIST);
}

function alignedZone(alignment: string, level: number): ZoneInfo | null {
  const factionMap: Record<string, string> = {
    Qeynos: "qeynos", Freeport: "freeport",
  };
  const factionId = factionMap[alignment];
  if (!factionId) return null;
  const candidates = ZONE_LIST.filter(z => z.factionId === factionId && level >= z.min - 2 && level <= z.max + 3);
  return candidates.length ? pick(candidates) : null;
}

function enemiesForZone(zoneId: string): ZoneEnemy[] {
  return ZONE_ENEMIES[zoneId] ?? ZONE_ENEMIES["commonlands"];
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ─── Run one combat round (EQ2 formulas) ─────────────────────────────────────

function simulateCombat(player: {
  level: number; archetype: string;
  stats: { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };
}, enemy: ZoneEnemy, enemyLevel: number): {
  playerWins: boolean;
  rounds: number;
} {
  const cs = computeStats({
    level: player.level,
    strength: player.stats.strength,
    agility: player.stats.agility,
    stamina: player.stats.stamina,
    intelligence: player.stats.intelligence,
    wisdom: player.stats.wisdom,
    charisma: player.stats.charisma,
    gearAttackRating: player.level * 5,
    gearDefenseRating: player.level * 3,
    gearMitigation: player.level * 2,
    gearHaste: 0,
    gearCritChance: 0,
    gearCritBonus: 0,
    gearWeaponDamageMin: player.stats.strength * 0.8 + player.level * 2,
    gearWeaponDamageMax: player.stats.strength * 1.5 + player.level * 4,
    gearWeaponDelay: 2.0,
    gearHealth: player.level * 10,
    gearPower: player.level * 5,
  });

  const lvlMod = Math.max(0.5, Math.min(1.5, 1.0 + (player.level - enemyLevel) / 20));
  const eDefense  = enemy.defense  * lvlMod;
  const eMit      = enemy.mitigation;
  const eAvoid    = Math.min(50, enemy.avoidance);
  const eDmgMin   = enemy.dmgMin * lvlMod;
  const eDmgMax   = enemy.dmgMax * lvlMod;

  const playerHpMax = Math.floor(player.stats.stamina * 10 + player.level * 15 + 100);
  const enemyHpMax  = Math.floor((enemy.dmgMin + enemy.dmgMax) * 3 * lvlMod);

  let playerHp = playerHpMax;
  let enemyHp  = enemyHpMax;
  let rounds   = 0;
  const maxRounds = 30;

  while (playerHp > 0 && enemyHp > 0 && rounds < maxRounds) {
    rounds++;
    const avoidRoll = Math.random() * 100;
    if (avoidRoll >= eAvoid) {
      const isCrit = Math.random() * 100 < cs.critChance;
      const rawDmg = cs.weaponDamageMin + Math.random() * (cs.weaponDamageMax - cs.weaponDamageMin);
      const ratingDiff = cs.attackRating - eDefense;
      const ratingMod  = Math.max(0.5, Math.min(1.5, 1.0 + ratingDiff / 500));
      const mitMod     = 1 - Math.min(0.75, eMit / 100);
      let   dmg        = rawDmg * ratingMod * mitMod;
      if (isCrit) dmg  *= (1 + cs.critBonus / 100);
      enemyHp -= Math.max(1, Math.round(dmg));
    }
    if (enemyHp <= 0) break;
    const eAvoidRoll = Math.random() * 100;
    if (eAvoidRoll >= cs.avoidance) {
      const eIsCrit = Math.random() < 0.10;
      let eDmg = eDmgMin + Math.random() * (eDmgMax - eDmgMin);
      const eRatingMod = Math.max(0.5, Math.min(1.5, 1.0 + (enemy.attackRating * lvlMod - cs.defenseRating) / 500));
      const eMitMod    = 1 - Math.min(0.75, cs.mitigation / 100);
      eDmg = eDmg * eRatingMod * eMitMod;
      if (eIsCrit) eDmg *= 1.4;
      playerHp -= Math.max(1, Math.round(eDmg));
    }
  }

  const archHealBonus = player.archetype === "Priest" ? 0.20 : 0;
  const levelHealBonus = Math.min(0.30, player.level / 100);
  const winChance = Math.max(0.15, Math.min(0.95, (playerHp > 0 ? 0.75 : 0.35) + archHealBonus + levelHealBonus));
  const playerWins = Math.random() < winChance;
  return { playerWins, rounds };
}

// ─── Simulation tick counter ──────────────────────────────────────────────────

let globalTick = 0;
const explorerTickTracker = new Map<number, number>();  // playerId → last-travel-tick

// ─── Market event cooldowns ───────────────────────────────────────────────────
const marketEventCooldowns = new Map<string, number>(); // `${type}_${category}` → last tick fired

// ─── Ghost gear assignment ─────────────────────────────────────────────────────

const ARCHETYPE_SLOTS: Record<string, string[]> = {
  Fighter: ["primary", "secondary", "head", "chest", "legs", "shoulder", "hands", "feet", "wrist", "back", "neck", "ringLeft", "ringRight"],
  Priest:  ["primary", "head", "chest", "legs", "shoulder", "hands", "feet", "wrist", "back", "neck", "ringLeft", "ringRight"],
  Mage:    ["primary", "head", "chest", "legs", "shoulder", "hands", "feet", "wrist", "back", "neck", "ringLeft", "ringRight"],
  Scout:   ["primary", "ranged", "head", "chest", "legs", "shoulder", "hands", "feet", "wrist", "back", "neck", "ringLeft", "ringRight"],
};

// Map our gear slots to item slot types in ITEMS
const SLOT_TO_ITEM_SLOT: Record<string, string[]> = {
  primary:   ["primary", "mainhand", "weapon", "staff", "sword", "axe", "mace", "dagger"],
  secondary: ["secondary", "offhand", "shield"],
  ranged:    ["ranged", "bow", "wand"],
  head:      ["head", "helm", "helmet"],
  chest:     ["chest", "breastplate", "robe"],
  legs:      ["legs", "leggings"],
  shoulder:  ["shoulder", "shoulders", "pauldrons"],
  hands:     ["hands", "gloves", "gauntlets"],
  feet:      ["feet", "boots"],
  wrist:     ["wrist", "bracers"],
  back:      ["back", "cloak", "cape"],
  neck:      ["neck", "necklace", "amulet"],
  ringLeft:  ["ringLeft", "ring", "ringright", "ringleft"],
  ringRight: ["ringRight", "ring", "ringright", "ringleft"],
};

const RARITY_WEIGHT: Record<string, number> = {
  common: 1, uncommon: 2, rare: 3, legendary: 4, fabled: 5, mythical: 6,
};

function assignGhostGear(
  ghost: { level: number; archetype: string },
  currentGear: Record<string, unknown>,
): Record<string, unknown> {
  const slots = ARCHETYPE_SLOTS[ghost.archetype] ?? ARCHETYPE_SLOTS["Fighter"];
  const newGear: Record<string, unknown> = { ...currentGear };

  const levelMin = ghost.level - 5;
  const levelMax = ghost.level + 2;

  const eligibleItems = ITEMS.filter(item =>
    item.level >= levelMin && item.level <= levelMax && item.slot && item.slot !== "none"
  );

  for (const slot of slots) {
    const acceptedSlots = SLOT_TO_ITEM_SLOT[slot] ?? [slot];
    const candidates = eligibleItems.filter(item =>
      acceptedSlots.some(s => (item.slot ?? "").toLowerCase().includes(s.toLowerCase()))
    );
    if (candidates.length === 0) continue;

    // Pick best by rarity then level
    candidates.sort((a, b) => {
      const rarityDiff = (RARITY_WEIGHT[b.rarity] ?? 0) - (RARITY_WEIGHT[a.rarity] ?? 0);
      if (rarityDiff !== 0) return rarityDiff;
      return b.level - a.level;
    });
    const best = candidates[0];

    // Only upgrade if new item is better level than current
    const current = newGear[slot] as Record<string, unknown> | undefined;
    const currentLevel = current ? (current.level as number ?? 0) : 0;
    if (best.level > currentLevel) {
      newGear[slot] = best;
    }
  }

  return newGear;
}

// ─── Ghost auction loot pool ──────────────────────────────────────────────────

interface GhostLootTemplate {
  itemId: string; itemName: string; category: string;
  basePrice: number; rarity: string;
  itemData: Record<string, unknown>;
}

const GHOST_LOOT_POOL: GhostLootTemplate[] = [
  { itemId: "ghost_loot_iron_ore",      itemName: "Iron Ore",          category: "materials",   basePrice: 15,  rarity: "common",   itemData: { id: "ghost_loot_iron_ore",      name: "Iron Ore",          type: "material",     slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 10,  description: "Raw iron ore, useful for smithing." } },
  { itemId: "ghost_loot_leather_scraps",itemName: "Leather Scraps",    category: "materials",   basePrice: 12,  rarity: "common",   itemData: { id: "ghost_loot_leather_scraps",name: "Leather Scraps",    type: "material",     slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 8,   description: "Rough scraps of cured hide." } },
  { itemId: "ghost_loot_bone_chips",    itemName: "Bone Chips",        category: "materials",   basePrice: 8,   rarity: "common",   itemData: { id: "ghost_loot_bone_chips",    name: "Bone Chips",        type: "material",     slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 5,   description: "Shards of bone from defeated enemies." } },
  { itemId: "ghost_loot_silk_thread",   itemName: "Silk Thread",       category: "materials",   basePrice: 25,  rarity: "uncommon", itemData: { id: "ghost_loot_silk_thread",   name: "Silk Thread",       type: "material",     slot: "none", rarity: "uncommon", level: 10, stats: {}, sellPrice: 18,  description: "Fine silk spun by rare spiders." } },
  { itemId: "ghost_loot_mithril_shard", itemName: "Mithril Shard",     category: "materials",   basePrice: 55,  rarity: "uncommon", itemData: { id: "ghost_loot_mithril_shard", name: "Mithril Shard",     type: "material",     slot: "none", rarity: "uncommon", level: 20, stats: {}, sellPrice: 40,  description: "A fragment of enchanted mithril metal." } },
  { itemId: "ghost_loot_voidsteel_ore", itemName: "Voidsteel Ore",     category: "materials",   basePrice: 120, rarity: "rare",     itemData: { id: "ghost_loot_voidsteel_ore", name: "Voidsteel Ore",     type: "material",     slot: "none", rarity: "rare",     level: 35, stats: {}, sellPrice: 90,  description: "Dark ore imbued with void energy." } },
  { itemId: "ghost_loot_health_tonic",  itemName: "Health Tonic",      category: "consumables", basePrice: 20,  rarity: "common",   itemData: { id: "ghost_loot_health_tonic",  name: "Health Tonic",      type: "consumable",   slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 12,  description: "Restores a modest amount of health." } },
  { itemId: "ghost_loot_power_draught", itemName: "Power Draught",     category: "consumables", basePrice: 25,  rarity: "common",   itemData: { id: "ghost_loot_power_draught", name: "Power Draught",     type: "consumable",   slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 15,  description: "Replenishes arcane power." } },
  { itemId: "ghost_loot_str_elixir",    itemName: "Strength Elixir",   category: "consumables", basePrice: 45,  rarity: "uncommon", itemData: { id: "ghost_loot_str_elixir",    name: "Strength Elixir",   type: "consumable",   slot: "none", rarity: "uncommon", level: 15, stats: {}, sellPrice: 30,  description: "Briefly enhances physical strength." } },
  { itemId: "ghost_loot_gnoll_fang",    itemName: "Gnoll Fang",        category: "materials",   basePrice: 10,  rarity: "common",   itemData: { id: "ghost_loot_gnoll_fang",    name: "Gnoll Fang",        type: "material",     slot: "none", rarity: "common",   level: 1,  stats: {}, sellPrice: 6,   description: "A sharp tooth from a gnoll warrior." } },
  { itemId: "ghost_loot_spectral_dust", itemName: "Spectral Dust",     category: "materials",   basePrice: 35,  rarity: "uncommon", itemData: { id: "ghost_loot_spectral_dust", name: "Spectral Dust",     type: "material",     slot: "none", rarity: "uncommon", level: 20, stats: {}, sellPrice: 22,  description: "Shimmering dust from spectral entities." } },
  { itemId: "ghost_loot_fire_gem",      itemName: "Fire Gem",          category: "materials",   basePrice: 80,  rarity: "rare",     itemData: { id: "ghost_loot_fire_gem",      name: "Fire Gem",          type: "material",     slot: "none", rarity: "rare",     level: 40, stats: {}, sellPrice: 60,  description: "A gem pulsing with volcanic heat." } },
  { itemId: "ghost_loot_rusty_sword",   itemName: "Rusty Longsword",   category: "weapons",     basePrice: 30,  rarity: "common",   itemData: { id: "ghost_loot_rusty_sword",   name: "Rusty Longsword",   type: "weapon",       slot: "main_hand", rarity: "common",   level: 1,  stats: { strength: 2 }, sellPrice: 18, description: "A worn but serviceable blade." } },
  { itemId: "ghost_loot_worn_shield",   itemName: "Worn Kite Shield",  category: "armor",       basePrice: 35,  rarity: "common",   itemData: { id: "ghost_loot_worn_shield",   name: "Worn Kite Shield",  type: "armor",        slot: "off_hand", rarity: "common",   level: 1,  stats: { stamina: 3 }, sellPrice: 20, description: "A battered shield, still functional." } },
  { itemId: "ghost_loot_chain_coif_f",  itemName: "Chain Coif",        category: "armor",       basePrice: 60,  rarity: "uncommon", itemData: { id: "ghost_loot_chain_coif_f",  name: "Chain Coif",        type: "armor",        slot: "head",     rarity: "uncommon", level: 10, stats: { stamina: 5, agility: 2 }, sellPrice: 40, description: "A linked mail hood offering solid protection." } },
];

// ─── Reset ghost players (version-bump migration) ────────────────────────────

const MARKET_CATEGORIES = ["weapons", "armor", "consumables", "materials", "adornments"] as const;
const MARKET_NEUTRAL_SCORE = 50;

export async function resetGhostPlayers(): Promise<void> {
  console.log(`[Ghost] Resetting ghost players to v${SIMULATOR_VERSION} (${GHOST_SEEDS.length} seeds)...`);
  await db.delete(worldPlayersTable);
  await db.delete(worldEventsTable);
  await db.delete(ghostMarketDemandTable);
  await db.delete(ghostEpicQuestProgressTable);
  for (const category of MARKET_CATEGORIES) {
    await db.insert(ghostMarketDemandTable).values({
      category,
      demandScore: MARKET_NEUTRAL_SCORE,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: ghostMarketDemandTable.category,
      set: { demandScore: MARKET_NEUTRAL_SCORE, updatedAt: new Date() },
    });
  }
  await seedGhostPlayersInner();
  await storeSimVersion(SIMULATOR_VERSION);
  console.log("[Ghost] Reset complete.");
}

async function seedGhostPlayersInner(): Promise<void> {
  for (const seed of GHOST_SEEDS) {
    const zone = ZONE_LIST.find(z => z.name === seed.zone) ?? zoneForLevel(seed.level);
    const xpRequired = xpForLevel(seed.level);
    const [inserted] = await db.insert(worldPlayersTable).values({
      name: seed.name,
      race: seed.race,
      class: seed.class,
      archetype: seed.archetype,
      alignment: seed.alignment,
      personality: seed.personality,
      level: seed.level,
      xp: seed.xp,
      xpToNextLevel: xpRequired,
      gold: seed.gold,
      zone: zone.name,
      killCount: seed.killCount,
      deathCount: seed.deathCount,
      bossKills: seed.bossKills,
      totalGoldEarned: seed.totalGoldEarned,
      totalGoldSpent: seed.totalGoldSpent,
      stats: seed.stats,
      gear: {},
      generation: 1,
      lastTickAt: new Date(),
      activeHoursStart: seed.activeHoursStart ?? 0,
      activeHoursEnd:   seed.activeHoursEnd   ?? 23,
    }).returning();
    if (inserted) {
      const gear = assignGhostGear({ level: inserted.level, archetype: inserted.archetype }, {});
      if (Object.keys(gear).length > 0) {
        await db.update(worldPlayersTable).set({ gear }).where(eq(worldPlayersTable.id, inserted.id));
      }
    }
  }
}

// ─── Seed ghost players (first boot) ─────────────────────────────────────────

const VERSION_CACHE_KEY = "ghost_sim_version";

/** Reads the persisted simulator version from lore_cache. Returns null if not set. */
async function getStoredSimVersion(): Promise<number | null> {
  const [row] = await db.select().from(loreCacheTable).where(eq(loreCacheTable.cacheKey, VERSION_CACHE_KEY)).limit(1);
  if (!row) return null;
  const parsed = parseInt(row.content, 10);
  return isNaN(parsed) ? null : parsed;
}

/** Persists the current simulator version to lore_cache. */
async function storeSimVersion(version: number): Promise<void> {
  await db.insert(loreCacheTable)
    .values({ cacheKey: VERSION_CACHE_KEY, content: String(version) })
    .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: String(version) } });
}

export async function seedGhostPlayers(): Promise<void> {
  const existing = await db.select().from(worldPlayersTable).limit(1);
  if (existing.length > 0) {
    const storedVersion = await getStoredSimVersion();
    // Reset whenever the stored version doesn't match the current SIMULATOR_VERSION.
    // To force a full ghost reset, bump SIMULATOR_VERSION at the top of this file.
    const needsReset = storedVersion === null || storedVersion !== SIMULATOR_VERSION;
    if (needsReset) {
      console.log(`[Ghost] Resetting ghost players (storedVersion=${storedVersion}, currentVersion=${SIMULATOR_VERSION}).`);
      await resetGhostPlayers();
      await storeSimVersion(SIMULATOR_VERSION);
    }
    return;
  }

  console.log(`[Ghost] Seeding ${GHOST_SEEDS.length} ghost players at level 1...`);
  await seedGhostPlayersInner();
  await storeSimVersion(SIMULATOR_VERSION);
  console.log("[Ghost] Seeding complete.");
}

// ─── Ghost auction participation ─────────────────────────────────────────────

// ─── Difficulty ordering ──────────────────────────────────────────────────────
const DIFFICULTY_ORDER = ["normal", "expert", "legendary", "mythical"];
function isBetterDifficulty(a: string, b: string): boolean {
  const aIdx = DIFFICULTY_ORDER.indexOf(a);
  const bIdx = DIFFICULTY_ORDER.indexOf(b);
  return (aIdx === -1 ? 0 : aIdx) > (bIdx === -1 ? 0 : bIdx);
}

// ─── Ghost dungeon/raid progression tick ─────────────────────────────────────

async function ghostDungeonProgressTick(
  players: typeof worldPlayersTable.$inferSelect[],
  tick: number,
): Promise<void> {
  const events: Array<typeof worldEventsTable.$inferInsert> = [];
  const now = new Date();

  for (const ghost of players) {
    const gearObj = (ghost.gear as Record<string, unknown>) ?? {};
    const gearScore = computeGearScore(
      Object.entries(gearObj).map(([slot, val]) => ({
        level: (val as Record<string, unknown>)?.level as number ?? 0,
        rarity: (val as Record<string, unknown>)?.rarity as string ?? "common",
        slot,
      })),
    );

    // ── Dungeon attempts (level >= 10, 12% chance) ───────────────────────────
    if (ghost.level >= 10 && Math.random() < 0.12) {
      const eligible = DUNGEONS.filter(d =>
        ghost.level >= d.minLevel - 2 && ghost.level <= d.maxLevel + 5
      );
      if (eligible.length > 0) {
        const dungeon = eligible[Math.floor(Math.random() * eligible.length)];

        // Determine difficulty from gear score
        let difficulty = "normal";
        if (gearScore >= 250) difficulty = "mythical";
        else if (gearScore >= 100) difficulty = "legendary";
        else if (gearScore >= 30) difficulty = "expert";

        const winChance = Math.max(0.3, Math.min(0.9, 0.6 + (ghost.level - dungeon.minLevel) / 20));
        if (Math.random() < winChance) {
          // Upsert dungeon clear
          const existing = await db.select()
            .from(ghostDungeonClearsTable)
            .where(and(
              eq(ghostDungeonClearsTable.ghostId, ghost.id),
              eq(ghostDungeonClearsTable.dungeonId, dungeon.id),
            ))
            .limit(1)
            .catch(() => []);

          if (existing.length > 0) {
            const newBest = isBetterDifficulty(difficulty, existing[0].bestDifficulty)
              ? difficulty : existing[0].bestDifficulty;
            await db.update(ghostDungeonClearsTable)
              .set({
                clearCount: existing[0].clearCount + 1,
                bestDifficulty: newBest,
                lastClearedAt: now,
              })
              .where(eq(ghostDungeonClearsTable.id, existing[0].id))
              .catch(() => {});
          } else {
            await db.insert(ghostDungeonClearsTable).values({
              ghostId: ghost.id,
              dungeonId: dungeon.id,
              clearCount: 1,
              bestDifficulty: difficulty,
              lastClearedAt: now,
            }).onConflictDoNothing().catch(() => {});
          }

          events.push({
            type: "dungeon_clear",
            message: `${ghost.name} cleared ${dungeon.name} on ${difficulty} difficulty!`,
            playerName: ghost.name,
            zone: ghost.zone,
            importance: 3,
            tick,
          });
        }
      }
    }

    // ── Raid attempts (level >= 40, 5% chance) ────────────────────────────────
    if (ghost.level >= 40 && Math.random() < 0.05) {
      const eligibleRaids = RAIDS.filter(r => ghost.level >= r.minLevel - 5);
      if (eligibleRaids.length > 0) {
        const raid = eligibleRaids[Math.floor(Math.random() * eligibleRaids.length)];
        const winChance = Math.max(0.2, Math.min(0.8, 0.4 + (ghost.level - raid.minLevel) / 30));
        if (Math.random() < winChance) {
          const maxPhase = Math.min(raid.phases.length, 1 + Math.floor(Math.random() * raid.phases.length));

          const existingRaid = await db.select()
            .from(ghostRaidClearsTable)
            .where(and(
              eq(ghostRaidClearsTable.ghostId, ghost.id),
              eq(ghostRaidClearsTable.raidId, raid.id),
            ))
            .limit(1)
            .catch(() => []);

          if (existingRaid.length > 0) {
            await db.update(ghostRaidClearsTable)
              .set({
                clearCount: existingRaid[0].clearCount + 1,
                maxPhase: Math.max(existingRaid[0].maxPhase, maxPhase),
                lastClearedAt: now,
              })
              .where(eq(ghostRaidClearsTable.id, existingRaid[0].id))
              .catch(() => {});
          } else {
            await db.insert(ghostRaidClearsTable).values({
              ghostId: ghost.id,
              raidId: raid.id,
              clearCount: 1,
              maxPhase,
              lastClearedAt: now,
            }).onConflictDoNothing().catch(() => {});
          }

          events.push({
            type: "raid_clear",
            message: `${ghost.name} defeated ${raid.bossName} in ${raid.name} (Phase ${maxPhase})!`,
            playerName: ghost.name,
            zone: ghost.zone,
            importance: 4,
            tick,
          });
        }
      }
    }
  }

  if (events.length > 0) {
    await db.insert(worldEventsTable).values(events).catch(() => {});
  }
}

// ─── Ghost Epic Quest Tick ────────────────────────────────────────────────────
// Runs after each dungeon/raid tick. For every ghost that meets the epic quest
// conditions (level 70, 200 boss kills, clears of all 3 required raid bosses),
// insert or update a ghost_epic_quest_progress record.
// Required raid clears: harla_dar, trakanon, mayong_mistmoore.
// Mythical is awarded when each of the three required raids has clearCount >= 3.

const EPIC_REQUIRED_RAIDS = ["harla_dar", "trakanon", "mayong_mistmoore"] as const;
const EPIC_MYTHICAL_CLEARS = 3;

async function ghostEpicQuestTick(
  players: Array<typeof worldPlayersTable.$inferSelect>,
): Promise<void> {
  // Only consider ghosts who could possibly qualify
  const candidates = players.filter(g => g.level >= 70 && g.bossKills >= 200);
  if (candidates.length === 0) return;

  // Fetch existing ghost epic quest records for these candidates in one query
  const candidateIds = candidates.map(g => g.id);
  const existing = await db
    .select()
    .from(ghostEpicQuestProgressTable)
    .where(inArray(ghostEpicQuestProgressTable.ghostId, candidateIds))
    .catch(() => [] as Array<typeof ghostEpicQuestProgressTable.$inferSelect>);

  const existingByGhostId = new Map(existing.map(r => [r.ghostId, r]));

  // Fetch all relevant raid clears for candidates in one query
  const raidClears = await db
    .select()
    .from(ghostRaidClearsTable)
    .where(
      and(
        inArray(ghostRaidClearsTable.ghostId, candidateIds),
        inArray(ghostRaidClearsTable.raidId, [...EPIC_REQUIRED_RAIDS]),
      ),
    )
    .catch(() => [] as Array<typeof ghostRaidClearsTable.$inferSelect>);

  // Group raid clears by ghostId -> raidId -> clearCount
  const clearsByGhost = new Map<number, Map<string, number>>();
  for (const rc of raidClears) {
    let ghostMap = clearsByGhost.get(rc.ghostId);
    if (!ghostMap) { ghostMap = new Map(); clearsByGhost.set(rc.ghostId, ghostMap); }
    ghostMap.set(rc.raidId, rc.clearCount);
  }

  const now = new Date();

  for (const ghost of candidates) {
    const epicDef = getEpicWeaponByClass(ghost.class);
    if (!epicDef) continue;

    const clears = clearsByGhost.get(ghost.id) ?? new Map<string, number>();
    const hasAllRaids = EPIC_REQUIRED_RAIDS.every(raidId => (clears.get(raidId) ?? 0) >= 1);
    if (!hasAllRaids) continue;

    const mythicalAwarded = EPIC_REQUIRED_RAIDS.every(
      raidId => (clears.get(raidId) ?? 0) >= EPIC_MYTHICAL_CLEARS,
    );
    const mythicalWeaponId = mythicalAwarded ? epicDef.mythicalItemId : null;

    const current = existingByGhostId.get(ghost.id);
    if (!current) {
      // First time this ghost qualifies — insert a new record
      await db
        .insert(ghostEpicQuestProgressTable)
        .values({
          ghostId: ghost.id,
          classId: epicDef.classId,
          fabledWeaponId: epicDef.fabledItemId,
          mythicalAwarded,
          mythicalWeaponId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .catch(() => {});
    } else if (mythicalAwarded && !current.mythicalAwarded) {
      // Ghost already had a record but has now earned enough clears for mythical
      await db
        .update(ghostEpicQuestProgressTable)
        .set({ mythicalAwarded: true, mythicalWeaponId, updatedAt: now })
        .where(eq(ghostEpicQuestProgressTable.id, current.id))
        .catch(() => {});
    }
  }
}

const GENERATION_SUFFIX = ["", "Jr.", "II", "III", "IV", "V"];

async function spawnChildGhost(
  parent: typeof worldPlayersTable.$inferSelect,
  tick: number,
): Promise<void> {
  const parentGeneration = parent.generation ?? 1;
  if (parentGeneration >= 5) return;

  const childGeneration = parentGeneration + 1;
  const firstName = parent.name.split(" ")[0] ?? parent.name;
  const suffix = GENERATION_SUFFIX[childGeneration] ?? "V";
  const childName = `${firstName} ${suffix}`;

  const childLevel = Math.max(1, Math.floor(parent.level * 0.3));
  const childZone = zoneForLevel(childLevel);
  const parentStats = parent.stats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };

  // Inherit top 2 gear slots from parent by item level
  const parentGear = (parent.gear as Record<string, unknown>) ?? {};
  const gearEntries = Object.entries(parentGear)
    .filter(([, v]) => v && typeof v === "object")
    .sort((a, b) => ((b[1] as Record<string, unknown>)?.level as number ?? 0) - ((a[1] as Record<string, unknown>)?.level as number ?? 0));
  const inheritedGear: Record<string, unknown> = {};
  for (const [slot, item] of gearEntries.slice(0, 2)) {
    inheritedGear[slot] = item;
  }

  const childGold = Math.floor((parent.gold ?? 0) * 0.2);

  const [inserted] = await db.insert(worldPlayersTable).values({
    name: childName,
    race: parent.race,
    class: parent.class,
    archetype: parent.archetype,
    alignment: parent.alignment,
    personality: parent.personality,
    level: childLevel,
    xp: 0,
    xpToNextLevel: xpForLevel(childLevel),
    gold: childGold,
    zone: childZone.name,
    killCount: 0,
    deathCount: 0,
    bossKills: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    stats: { ...parentStats },
    gear: inheritedGear,
    generation: childGeneration,
    parentId: parent.id,
    inheritedTraits: [parent.personality, parent.alignment],
    lastTickAt: new Date(),
    activeHoursStart: parent.activeHoursStart ?? 0,
    activeHoursEnd:   parent.activeHoursEnd   ?? 23,
  }).returning().catch(() => []);

  if (inserted) {
    await db.insert(worldEventsTable).values({
      type: "ghost_lineage",
      message: `A new adventurer rises: ${childName}, child of the legendary ${parent.name}!`,
      playerName: childName,
      zone: childZone.name,
      importance: 5,
      tick,
    }).catch(() => {});
  }
}

const GHOST_AUCTION_LISTING_DURATION_MS = 24 * 30 * 1000;
const MAX_GHOST_ACTIVE_LISTINGS = 80;

// demandScore 0–100 → multiplier 0.90–1.15  (mirrors shop.ts formula)
function auctionDemandMultiplier(score: number): number {
  return 0.90 + (Math.max(0, Math.min(100, score)) / 100) * 0.25;
}

const JOURNEYMAN_RECIPE_IDS = CRAFTING_RECIPES
  .filter(r => r.tier === "journeyman")
  .map(r => r.id);

const RARITY_ORDER_GHOST = ["common", "uncommon", "rare", "legendary", "fabled", "mythical"];
function bumpRarityGhost(rarity: string): string {
  const idx = RARITY_ORDER_GHOST.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER_GHOST.length - 1) return rarity;
  return RARITY_ORDER_GHOST[idx + 1];
}

function applyFocusBoostGhost(
  stats: ItemStats,
  focus: ExperimentFocus,
  points: number,
  resourceQuality: number,
): ItemStats {
  const boosted = { ...stats };
  const boost = 1 + (points * 0.15) * (resourceQuality / 100);
  if (focus === "attack") {
    if (boosted.attackRating) boosted.attackRating = Math.round(boosted.attackRating * boost);
    if (boosted.weaponDamageMin) boosted.weaponDamageMin = Math.round(boosted.weaponDamageMin * boost);
    if (boosted.weaponDamageMax) boosted.weaponDamageMax = Math.round(boosted.weaponDamageMax * boost);
    if (boosted.strength) boosted.strength = Math.round(boosted.strength * boost);
  } else if (focus === "defense") {
    if (boosted.defenseRating) boosted.defenseRating = Math.round(boosted.defenseRating * boost);
    if (boosted.mitigation) boosted.mitigation = Math.round(boosted.mitigation * boost);
    if (boosted.stamina) boosted.stamina = Math.round(boosted.stamina * boost);
  } else {
    if (boosted.wisdom) boosted.wisdom = Math.round(boosted.wisdom * boost);
    if (boosted.intelligence) boosted.intelligence = Math.round(boosted.intelligence * boost);
    if (boosted.power) boosted.power = Math.round(boosted.power * boost);
  }
  return boosted;
}

// ── Expert recipe IDs available for ghost acquisition ────────────────────────
const GHOST_EXPERT_RECIPES = CRAFTING_RECIPES.filter(r => r.tier === "expert");

// ── Ghost material availability simulation ────────────────────────────────────
// Maps recipe ingredient itemIds → minimum ghost level required to plausibly
// have that material from loot/gathering. Ghosts accumulate materials as they
// adventure; this gate ensures only plausible crafts happen.
const GHOST_INGREDIENT_MIN_LEVEL: Record<string, number> = {
  iron_ore:          1,
  coal:              1,
  gnoll_fang:        1,
  bone_chips:        1,
  leather_scraps:    1,
  wolf_hide:         5,
  spider_silk:       8,
  iron_bar:          10,
  steel_bar:         15,
  mithril_ore:       20,
  fire_opal:         25,
  spectral_dust:     20,
  silk_thread:       10,
  mithril_shard:     20,
  voidsteel_ore:     35,
  fire_gem:          40,
  leather_leggings:  5,
  leather_boots:     5,
};

/**
 * Returns true if a ghost of the given level plausibly has all ingredients
 * for the recipe, based on the GHOST_INGREDIENT_MIN_LEVEL gate.
 * Also simulates a per-ingredient availability probability so high-quantity
 * rare-material recipes don't always succeed.
 */
function ghostHasMaterials(recipe: typeof CRAFTING_RECIPES[number], ghostLevel: number): boolean {
  for (const { itemId, quantity } of recipe.ingredients) {
    const minLevel = GHOST_INGREDIENT_MIN_LEVEL[itemId] ?? 50;
    if (ghostLevel < minLevel) return false;
    // Availability probability: common materials are reliably stocked; higher
    // quantities and rarer materials reduce the chance the ghost actually has
    // enough gathered this tick.
    const levelRatio = Math.min(1, (ghostLevel - minLevel + 5) / 20);
    const qtyPenalty = Math.max(0, (quantity - 1) * 0.08);
    const availChance = Math.max(0.05, levelRatio - qtyPenalty);
    if (Math.random() > availChance) return false;
  }
  return true;
}

/**
 * Computes average quality score for the recipe's ingredients based on ghost
 * level and zone. Higher-level ghosts in tough zones bring back better materials.
 */
function ghostIngredientQuality(ghostLevel: number): number {
  const base = 25 + Math.floor(ghostLevel * 0.8);
  const jitter = Math.floor(Math.random() * 20) - 10;
  return Math.min(100, Math.max(10, base + jitter));
}

async function ghostCraftingTick(players: typeof worldPlayersTable.$inferSelect[]): Promise<void> {
  const craftedOnce = await db.select().from(oneOfAKindCraftedTable).catch(() => []);
  const craftedOnceIds = new Set(craftedOnce.map(r => r.recipeId));
  const now = new Date();

  // ── Ghost expert recipe acquisition ──────────────────────────────────────
  // High-level ghosts (level >= 30) have a chance each tick to "discover" an
  // Expert recipe they don't yet know, simulating loot-drops and scrolls.
  for (const ghost of players) {
    if (ghost.level < 30) continue;
    if (Math.random() > 0.05) continue;

    const ghostKnown = await db
      .select({ recipeId: ghostKnownRecipesTable.recipeId })
      .from(ghostKnownRecipesTable)
      .where(eq(ghostKnownRecipesTable.ghostId, ghost.id))
      .catch(() => []);
    const ghostKnownIds = new Set(ghostKnown.map(r => r.recipeId));

    const unknown = GHOST_EXPERT_RECIPES.filter(r => !ghostKnownIds.has(r.id));
    if (unknown.length === 0) continue;

    const toLearn = unknown[Math.floor(Math.random() * unknown.length)];
    await db.insert(ghostKnownRecipesTable).values({
      ghostId: ghost.id,
      recipeId: toLearn.id,
    }).onConflictDoNothing().catch(() => {});
  }

  for (const ghost of players) {
    if (ghost.level < 10) continue;
    if (Math.random() > 0.12) continue;

    const ghostKnown = await db
      .select({ recipeId: ghostKnownRecipesTable.recipeId })
      .from(ghostKnownRecipesTable)
      .where(eq(ghostKnownRecipesTable.ghostId, ghost.id))
      .catch(() => []);

    const knownIds = new Set([
      ...JOURNEYMAN_RECIPE_IDS,
      ...ghostKnown.map(r => r.recipeId),
    ]);

    const eligibleRecipes = CRAFTING_RECIPES.filter(r => {
      if (!knownIds.has(r.id)) return false;
      if (craftedOnceIds.has(r.id)) return false;
      if (r.tier === "mythic") return false;
      if (r.requiredSkillLevel > ghost.level * 1.2) return false;
      // Gate on simulated material availability: ghosts only craft recipes for
      // which they plausibly have all ingredients based on their adventuring level.
      if (!ghostHasMaterials(r, ghost.level)) return false;
      return true;
    });

    if (eligibleRecipes.length === 0) continue;

    const recipe = eligibleRecipes[Math.floor(Math.random() * eligibleRecipes.length)];
    const baseItem = getItemById(recipe.resultItemId);
    if (!baseItem) continue;

    // Derive resource quality from ingredient quality simulation (level + zone dependent)
    const clampedQuality = ghostIngredientQuality(ghost.level);
    const skillLevel = Math.min(100, ghost.level + Math.floor(Math.random() * 10));
    const critChance = (skillLevel + clampedQuality) / 200;
    const isCritical = Math.random() < critChance;
    const focuses: ExperimentFocus[] = ["attack", "defense", "utility"];
    const focus = focuses[Math.floor(Math.random() * focuses.length)];
    const points = Math.max(1, Math.floor(skillLevel / 10));

    const finalRarity = isCritical ? bumpRarityGhost(baseItem.rarity) : baseItem.rarity;
    const boostedStats = applyFocusBoostGhost({ ...baseItem.stats }, focus, points, clampedQuality);

    const craftedMeta = {
      craftedBy: ghost.name,
      resourceQuality: clampedQuality,
      experimentFocus: focus,
      isCritical,
      recipeId: recipe.id,
      recipeTier: recipe.tier,
      isGhostCrafter: true,
    };

    const qualityBoost = 1 + (clampedQuality - 50) / 200;
    const basePrice = Math.max(1, Math.floor(baseItem.sellPrice * qualityBoost * (isCritical ? 1.5 : 1)));
    const ghostMarkup = 1.1 + Math.random() * 0.3;
    const listPrice = Math.round(basePrice * ghostMarkup);

    const craftedItemId = `ghost_crafted_${recipe.resultItemId}_${ghost.id}_${Date.now()}`;
    const resultItemData = {
      ...baseItem,
      id: craftedItemId,
      rarity: finalRarity,
      stats: boostedStats,
      sellPrice: basePrice,
      craftedMeta,
      description: `${baseItem.description} Handcrafted by ${ghost.name} (Ghost Crafter).`,
    };

    const expiresAt = new Date(now.getTime() + 24 * 30 * 1000);
    const itemType = baseItem.type;
    const category = itemType === "weapon" ? "weapons"
      : itemType === "armor" ? "armor"
      : itemType === "accessory" ? "accessories"
      : "misc";

    await db.insert(auctionListingsTable).values({
      sellerId: String(ghost.id),
      sellerName: `${ghost.name} (Ghost Crafter)`,
      itemId: craftedItemId,
      itemName: `${resultItemData.name}${isCritical ? " [Critical]" : ""}`,
      itemData: resultItemData as Record<string, unknown>,
      quantity: 1,
      buyoutPrice: listPrice,
      category,
      postedAt: now,
      expiresAt,
      sold: false,
      cancelled: false,
    }).catch(err => {
      console.error("[Ghost Crafting] Failed to list crafted item:", err);
    });
  }
}

// ─── Ghost Gathering ──────────────────────────────────────────────────────────

const GHOST_GATHERING_MESSAGES: Record<string, string[]> = {
  mining:      ["strikes ore with a practised swing", "loosens a fresh vein from the rock face", "hauls a heavy load of ore from the deep", "chips away at the unyielding stone"],
  woodcutting: ["fells a great oak with a single clean stroke", "splits timber by the cord", "carries fresh-cut logs to camp", "eyes a prize ironwood across the glade"],
  fishing:     ["hauls a fine catch from the shallows", "plays a big one on the line", "casts into the deep with a knowing smile", "lands a trout fat enough to last a week"],
  herbalism:   ["knows exactly where the rare blossoms grow", "plucks herbs with careful, practiced hands", "fills a satchel with rare forest roots", "harvests the season's first Fay Blossom"],
};

async function ghostGatheringTick(
  players: typeof worldPlayersTable.$inferSelect[],
  _events: (typeof worldEventsTable.$inferInsert)[],
  tick: number,
): Promise<void> {
  const now = new Date();
  const gatherEvents: (typeof worldEventsTable.$inferInsert)[] = [];

  for (const ghost of players) {
    const personality = getArchetype(ghost.personality ?? "Aggressive");
    const roll = Math.random();

    const gatherChance =
      personality === "Greedy"    ? 0.12 :
      personality === "Scholarly" ? 0.10 :
      personality === "Explorer"  ? 0.08 :
      0.05;

    if (roll > gatherChance) continue;

    const skillPrefs: Record<GhostPersonality, string[]> = {
      Greedy:    ["mining", "mining", "woodcutting"],
      Scholarly: ["herbalism", "herbalism", "fishing"],
      Explorer:  ["mining", "woodcutting", "fishing", "herbalism"],
      Aggressive: ["mining"],
      Cautious:  ["herbalism", "fishing"],
      Devout:    ["herbalism"],
    };

    const prefs = skillPrefs[personality] ?? ["mining"];
    const skillId = prefs[Math.floor(Math.random() * prefs.length)];

    // Bias toward higher-level nodes based on ghost level
    const ghostSkillLevel = Math.min(ghost.level, 100);
    const accessibleNodes = GATHERING_NODES.filter(
      n => n.skillId === skillId && n.requiredLevel <= ghostSkillLevel
    );
    if (accessibleNodes.length === 0) continue;

    // Prefer higher-tier nodes (pick from top half of accessible nodes)
    const minIdx = Math.max(0, Math.floor(accessibleNodes.length / 2) - 1);
    const nodeIdx = minIdx + Math.floor(Math.random() * (accessibleNodes.length - minIdx));
    const node = accessibleNodes[Math.min(nodeIdx, accessibleNodes.length - 1)];

    const msgs = GHOST_GATHERING_MESSAGES[skillId] ?? [];
    const msg = msgs[Math.floor(Math.random() * msgs.length)] ?? "gathers resources";

    gatherEvents.push({
      type: "gathering",
      playerName: ghost.name,
      zone: ghost.zone ?? "Commonlands",
      message: `${ghost.name} ${msg} at ${node.name}`,
      importance: 1,
      tick,
    });

    // ── Gather materials → stash in ghost inventory → post to auction ─────────
    const primaryYield = node.yields[0];
    if (!primaryYield) continue;

    const item = getItemById(primaryYield.itemId);
    if (!item) continue;

    // Yield bonus: mirrors player formula — +10% per 25 levels, applied probabilistically
    // For baseQuantity=1 at level 25: expected = 1.1, so floor(1.1)=1 + 10% chance of +1
    const bonusSteps = Math.floor(ghostSkillLevel / 25);
    const bonusFraction = bonusSteps * 0.1;
    const baseExpected = primaryYield.baseQuantity * (1 + bonusFraction);
    const qty = Math.floor(baseExpected) + (Math.random() < (baseExpected % 1) ? 1 : 0);

    // Rare yield chance (mirrors player formula)
    let rareQty = 0;
    let rareItemId: string | undefined;
    if (node.rareYield && ghostSkillLevel >= 50) {
      const rareChanceVal = Math.min((ghostSkillLevel - 50) * 0.005, 0.15);
      if (Math.random() < rareChanceVal) {
        rareQty = node.rareYield.quantity;
        rareItemId = node.rareYield.itemId;
      }
    }

    // Step 1: Accumulate materials in ghost_inventory stash
    await db.insert(ghostInventoryTable).values({
      ghostId: String(ghost.id),
      ghostName: ghost.name,
      itemId: item.id,
      quantity: qty,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [ghostInventoryTable.ghostId, ghostInventoryTable.itemId],
      set: {
        quantity: sql`${ghostInventoryTable.quantity} + ${qty}`,
        updatedAt: now,
      },
    }).catch(() => {});

    if (rareQty > 0 && rareItemId) {
      await db.insert(ghostInventoryTable).values({
        ghostId: String(ghost.id),
        ghostName: ghost.name,
        itemId: rareItemId,
        quantity: rareQty,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [ghostInventoryTable.ghostId, ghostInventoryTable.itemId],
        set: {
          quantity: sql`${ghostInventoryTable.quantity} + ${rareQty}`,
          updatedAt: now,
        },
      }).catch(() => {});
    }

    // Step 2: Drain inventory stash to auction house (batch threshold = 5 items)
    const AUCTION_BATCH_THRESHOLD = 5;
    const stash = await db.select().from(ghostInventoryTable)
      .where(and(
        eq(ghostInventoryTable.ghostId, String(ghost.id)),
        gt(ghostInventoryTable.quantity, AUCTION_BATCH_THRESHOLD - 1),
      ))
      .catch(() => []);

    // Price: item sell price × personality markup × slight variance
    const PERSONALITY_PRICE_MULT: Record<GhostPersonality, number> = {
      Greedy:     1.30,
      Aggressive: 1.05,
      Scholarly:  1.20,
      Devout:     1.00,
      Explorer:   0.90,
      Cautious:   0.82,
    };
    const variance = 0.85 + Math.random() * 0.30;
    const listingDuration = GHOST_AUCTION_LISTING_DURATION_MS;

    for (const stashEntry of stash) {
      const stashItem = getItemById(stashEntry.itemId);
      if (!stashItem) continue;

      const basePrice = stashItem.sellPrice ?? 1;
      const isRare = stashEntry.itemId !== item.id;
      const priceMult = isRare ? 1.5 * variance : PERSONALITY_PRICE_MULT[personality] * variance;
      const price = Math.max(1, Math.round(basePrice * priceMult));

      const itemData: Record<string, unknown> = {
        id: stashItem.id, name: stashItem.name, description: stashItem.description,
        type: stashItem.type, slot: stashItem.slot, rarity: stashItem.rarity,
        level: stashItem.level, stats: stashItem.stats, sellPrice: stashItem.sellPrice,
        buyPrice: stashItem.buyPrice ?? 0, spriteId: stashItem.spriteId,
        stackable: stashItem.stackable ?? true,
      };

      await db.insert(auctionListingsTable).values({
        sellerId: String(ghost.id),
        sellerName: ghost.name,
        itemId: stashItem.id,
        itemName: stashItem.name,
        itemData,
        quantity: stashEntry.quantity,
        buyoutPrice: price * stashEntry.quantity,
        category: "materials",
        postedAt: now,
        expiresAt: new Date(now.getTime() + listingDuration),
        sold: false,
        cancelled: false,
        sellerPersonality: personality,
      }).catch(() => {});

      // Reset stash quantity after listing
      await db.update(ghostInventoryTable)
        .set({ quantity: 0, updatedAt: now })
        .where(and(
          eq(ghostInventoryTable.ghostId, String(ghost.id)),
          eq(ghostInventoryTable.itemId, stashEntry.itemId),
        ))
        .catch(() => {});
    }
  }

  if (gatherEvents.length > 0) {
    await db.insert(worldEventsTable).values(gatherEvents);
  }
}

async function ghostAuctionTick(players: typeof worldPlayersTable.$inferSelect[], tick: number): Promise<void> {
  const now = new Date();

  // Expire stale listings + return items to poster — runs every tick regardless of user activity
  await cleanExpiredListings().catch(() => {});

  // Fetch market demand multipliers (mirrors shop.ts getMarketMultipliers)
  const demandRows = await db.select().from(ghostMarketDemandTable).catch(() => [] as typeof ghostMarketDemandTable.$inferSelect[]);
  const demandMultipliers: Record<string, number> = {};
  const demandScores: Record<string, number> = {};
  for (const row of demandRows) {
    demandMultipliers[row.category] = auctionDemandMultiplier(row.demandScore);
    demandScores[row.category] = row.demandScore;
  }

  // ── Market surge/crash events ─────────────────────────────────────────────
  const marketEvents: Array<typeof worldEventsTable.$inferInsert> = [];
  for (const [category, demandScore] of Object.entries(demandScores)) {
    const surgeKey = `surge_${category}`;
    const crashKey = `crash_${category}`;
    const lastSurge = marketEventCooldowns.get(surgeKey) ?? 0;
    const lastCrash = marketEventCooldowns.get(crashKey) ?? 0;

    if (demandScore > 75 && tick - lastSurge > 10) {
      marketEvents.push({
        type: "market_surge",
        message: `${category.toUpperCase()} prices are surging! Demand is at ${demandScore.toFixed(0)}`,
        playerName: "Market",
        zone: "Commonlands",
        importance: 3,
        tick,
      });
      marketEventCooldowns.set(surgeKey, tick);
    } else if (demandScore < 15 && tick - lastCrash > 10) {
      marketEvents.push({
        type: "market_crash",
        message: `${category.toUpperCase()} market is crashing! Oversupplied.`,
        playerName: "Market",
        zone: "Commonlands",
        importance: 3,
        tick,
      });
      marketEventCooldowns.set(crashKey, tick);
    }
  }
  if (marketEvents.length > 0) {
    await db.insert(worldEventsTable).values(marketEvents).catch(() => {});
  }

  // ── High-level ghost personal consumption ────────────────────────────────
  for (const ghost of players) {
    if (ghost.level >= 25 && Math.random() < 0.05) {
      await db.execute(sql`
        UPDATE ghost_inventory SET quantity = GREATEST(0, quantity - 1), updated_at = now()
        WHERE ghost_id = ${String(ghost.id)} AND item_id = (
          SELECT item_id FROM ghost_inventory WHERE ghost_id = ${String(ghost.id)} AND quantity > 0 LIMIT 1
        )
      `).catch(() => {});
    }
  }
  const [playerChar] = await db.select({ id: charactersTable.id }).from(charactersTable).limit(1).catch(() => []);

  // Count current active ghost listings (non-player, unsold, uncancelled, not expired)
  const [listingCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auctionListingsTable)
    .where(
      and(
        eq(auctionListingsTable.sold, false),
        eq(auctionListingsTable.cancelled, false),
        gt(auctionListingsTable.expiresAt, now),
        sql`${auctionListingsTable.sellerId} != 'player'`
      )
    );
  const activeGhostListings = Number(listingCountRow?.count ?? 0);

  // Each tick pick a subset of ghosts to participate
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const participants = shuffled.slice(0, Math.min(8, shuffled.length));

  // Track listings inserted this tick so the cap is accurate even mid-loop
  let ghostListingsInserted = 0;

  // Personality-based listing price multipliers: how aggressively each type marks up
  const PERSONALITY_PRICE_MULT: Record<GhostPersonality, number> = {
    Greedy:     1.25, // maximises profit
    Aggressive: 1.05, // slight dominance markup
    Scholarly:  1.15, // values their knowledge-related items more
    Devout:     1.00, // fair, community-minded pricing
    Explorer:   0.95, // just wants items gone quickly
    Cautious:   0.88, // undercuts to guarantee the sale
  };

  for (const ghost of participants) {
    // Derive archetype from stored personality label — supports both legacy archetype
    // names ("Aggressive") and new 300-label names ("the Berserker")
    const personality: GhostPersonality = getArchetype(ghost.personality ?? "Aggressive");
    const pCfg = PERSONALITY_CONFIG[personality];
    const personalityPriceMult = PERSONALITY_PRICE_MULT[personality];

    // Ghost posts a loot item (uses personality lootChance, capped total)
    // Use activeGhostListings + ghostListingsInserted to prevent mid-tick overshoot
    if (Math.random() < pCfg.lootChance && (activeGhostListings + ghostListingsInserted) < MAX_GHOST_ACTIVE_LISTINGS) {
      const levelMult = 1 + (ghost.level - 1) * 0.02;
      const expiresAt = new Date(now.getTime() + GHOST_AUCTION_LISTING_DURATION_MS);

      // 60% chance: use procedural item based on ghost zone/level
      // 40% chance: use legacy GHOST_LOOT_POOL for variety
      if (Math.random() < 0.6) {
        const rarityRoll = Math.random();
        const rarity: ProceduralRarity = ghost.level >= 50
          ? (rarityRoll < 0.15 ? "fabled" : rarityRoll < 0.45 ? "legendary" : "rare")
          : ghost.level >= 30
            ? (rarityRoll < 0.05 ? "fabled" : rarityRoll < 0.25 ? "legendary" : rarityRoll < 0.55 ? "rare" : "uncommon")
            : (rarityRoll < 0.15 ? "rare" : rarityRoll < 0.45 ? "uncommon" : "common");

        const procItem = rollItem(ghost.zone ?? "commonlands", ghost.level, rarity);
        const basePrice = procItem.sellPrice ?? Math.max(10, ghost.level * 15);
        const demandMult = demandMultipliers[procItem.type === "weapon" ? "weapons" : procItem.type === "armor" ? "armor" : "misc"] ?? 1.0;
        const variance = 0.7 + Math.random() * 0.6;
        const listPrice = Math.max(1, Math.floor(basePrice * levelMult * personalityPriceMult * demandMult * variance));

        const category = procItem.type === "weapon" ? "weapons"
          : procItem.type === "armor" ? "armor"
          : procItem.type === "accessory" ? "accessories"
          : "misc";

        const inserted = await db.insert(auctionListingsTable).values({
          sellerId: String(ghost.id),
          sellerName: ghost.name,
          itemId: procItem.id,
          itemName: procItem.name,
          itemData: procItem as unknown as Record<string, unknown>,
          quantity: 1,
          buyoutPrice: listPrice,
          category,
          postedAt: now,
          expiresAt,
          sold: false,
          cancelled: false,
          sellerPersonality: personality,
        }).returning({ id: auctionListingsTable.id })
          .catch(() => [] as { id: number }[]);
        if (inserted.length > 0) ghostListingsInserted++;
      } else {
        // Legacy GHOST_LOOT_POOL path
        const preferredCat = Math.random() < 0.90
          ? weightedPick(pCfg.spendCategories).cat
          : null;
        const eligible = GHOST_LOOT_POOL.filter(l =>
          preferredCat === null || l.category === preferredCat || Math.random() < 0.15
        );
        const pool = eligible.length > 0 ? eligible : GHOST_LOOT_POOL;
        const template = pool[Math.floor(Math.random() * pool.length)];
        const qty = Math.random() < 0.3 ? Math.floor(Math.random() * 4) + 2 : 1;

        const demandMult = demandMultipliers[template.category] ?? 1.0;
        const scholarlyCatBonus =
          personality === "Scholarly" && (template.category === "materials" || template.category === "adornments")
            ? 1.10 : 1.0;
        const variance = 0.7 + Math.random() * 0.6;
        const price = Math.max(1, Math.floor(
          template.basePrice * levelMult * personalityPriceMult * scholarlyCatBonus * demandMult * variance
        ));

        const inserted = await db.insert(auctionListingsTable).values({
          sellerId: String(ghost.id),
          sellerName: ghost.name,
          itemId: template.itemId,
          itemName: template.itemName,
          itemData: template.itemData,
          quantity: qty,
          buyoutPrice: price,
          category: template.category,
          postedAt: now,
          expiresAt,
          sold: false,
          cancelled: false,
          sellerPersonality: personality,
        }).returning({ id: auctionListingsTable.id })
          .catch((err: unknown) => {
            console.error("[Auction] Ghost listing insert failed:", err);
            return [] as { id: number }[];
          });
        if (inserted.length > 0) ghostListingsInserted++;
      }

      // High-level ghosts (50+) occasionally post raid-tier loot
      if (ghost.level >= 50 && Math.random() < 0.10 && (activeGhostListings + ghostListingsInserted) < MAX_GHOST_ACTIVE_LISTINGS) {
        const raidRarity: ProceduralRarity = Math.random() < 0.3 ? "fabled" : "legendary";
        const raidItem = rollItem(ghost.zone ?? "commonlands", ghost.level, raidRarity);
        const raidPrice = Math.max(500, (raidItem.sellPrice ?? 500) * (3 + Math.random() * 2) * personalityPriceMult);
        await db.insert(auctionListingsTable).values({
          sellerId: String(ghost.id),
          sellerName: ghost.name,
          itemId: raidItem.id,
          itemName: raidItem.name,
          itemData: raidItem as unknown as Record<string, unknown>,
          quantity: 1,
          buyoutPrice: Math.floor(raidPrice),
          category: raidItem.type === "weapon" ? "weapons" : "armor",
          postedAt: now,
          expiresAt: new Date(now.getTime() + GHOST_AUCTION_LISTING_DURATION_MS * 2),
          sold: false,
          cancelled: false,
          sellerPersonality: personality,
        }).catch(() => {});
        ghostListingsInserted++;
      }
    }

    // Ghost buys player listings (uses personality spendChance)
    // Category preference weights drive which listings get picked
    if (Math.random() < pCfg.spendChance) {
      const playerListings = await db
        .select()
        .from(auctionListingsTable)
        .where(
          and(
            eq(auctionListingsTable.sellerId, "player"),
            eq(auctionListingsTable.sold, false),
            eq(auctionListingsTable.cancelled, false),
            gt(auctionListingsTable.expiresAt, now),
          )
        );

      if (playerListings.length > 0) {
        // Weight candidates: use personality's category weight + demand score
        const scored = playerListings.map(l => {
          const demandScore = demandScores[l.category] ?? 50;
          const catEntry = pCfg.spendCategories.find(s => s.cat === l.category);
          const catWeight = catEntry ? catEntry.weight : 10; // low weight for off-category
          return { listing: l, weight: catWeight * (demandScore / 50) };
        });
        // Weighted random pick
        const totalWeight = scored.reduce((s, x) => s + x.weight, 0);
        let roll = Math.random() * totalWeight;
        let target = scored[0].listing;
        for (const { listing, weight } of scored) {
          roll -= weight;
          if (roll <= 0) { target = listing; break; }
        }

        // Buy if price affordable (scaled by demand: ghosts pay more for high-demand items)
        const ghostGold = ghost.gold ?? 0;
        const demandMult = demandMultipliers[target.category] ?? 1.0;
        const maxWillPay = Math.max(ghostGold * 0.4, 50) * demandMult;
        if (target.buyoutPrice <= maxWillPay) {
          // Atomic claim: conditional update guards against cancel/expiry race
          const [claimed] = await db
            .update(auctionListingsTable)
            .set({ sold: true })
            .where(
              and(
                eq(auctionListingsTable.id, target.id),
                eq(auctionListingsTable.sold, false),
                eq(auctionListingsTable.cancelled, false),
                gt(auctionListingsTable.expiresAt, now),
              )
            )
            .returning()
            .catch((err: unknown) => {
              console.error("[Auction] Ghost buy claim failed:", err);
              return [] as typeof auctionListingsTable.$inferSelect[];
            });

          // Only settle gold if the claim succeeded
          if (claimed) {
            if (playerChar) {
              await db
                .update(charactersTable)
                .set({ gold: sql`${charactersTable.gold} + ${claimed.buyoutPrice}`, updatedAt: now })
                .where(eq(charactersTable.id, playerChar.id))
                .catch((err: unknown) => {
                  console.error("[Auction] Ghost buy: player gold credit failed:", err);
                });
            }
            const newGhostGold = Math.max(0, ghostGold - claimed.buyoutPrice);
            await db
              .update(worldPlayersTable)
              .set({ gold: newGhostGold })
              .where(eq(worldPlayersTable.id, ghost.id))
              .catch((err: unknown) => {
                console.error("[Auction] Ghost buy: ghost gold deduct failed:", err);
              });
          }
        }
      }
    }
  }
}

// ─── Ghost Legacy Drop ────────────────────────────────────────────────────────
// Called when a ghost retires. Gives it a chance to leave behind a recipe or item.

async function generateGhostLegacyDrop(
  ghost: typeof worldPlayersTable.$inferSelect,
  tick: number,
): Promise<void> {
  const roll = Math.random();

  // 5–10% chance: OoaK recipe named after the ghost
  if (roll < 0.07) {
    const tsClass = TRADESKILL_CLASSES[Math.floor(Math.random() * TRADESKILL_CLASSES.length)] as TradeskillClass;
    const ooakName = generateOoakName(tsClass, ghost.name);
    const ooakOutput = {
      name: ooakName,
      description: `A legendary relic left behind by the ghost of ${ghost.name} — it can never be replicated.`,
      type: "weapon" as const,
      slot: "primary",
      rarity: "legendary" as const,
      stats: { weaponDamageMin: 280, weaponDamageMax: 460, attackRating: 230, strength: 75, critChance: 18 },
      sellPrice: 45000,
      quantity: 1,
      xpGained: 6000,
      spriteId: "weapon_sword",
    };
    const [inserted] = await db.insert(recipesTable).values({
      name: ooakName,
      tradeskillClass: tsClass,
      tier: "master",
      minSkill: 80,
      minLevel: 60,
      craftTimeSeconds: 3600,
      ingredients: [
        { itemId: "prismatic_dragon_scale", quantity: 1 },
        { itemId: "vampire_lord_fang", quantity: 1 },
        { itemId: "plague_dragon_spine", quantity: 1 },
      ],
      output: ooakOutput,
      acquisitionType: "raid",
      vendorCost: null,
      isOoak: true,
      claimedBy: null,
    }).returning();

    if (inserted) {
      await db.insert(ghostLegacyTable).values({
        ghostId: ghost.id,
        ghostName: ghost.name,
        dropType: "ooak_recipe",
        dropName: ooakName,
        dropReference: String(inserted.id),
      });
      await db.insert(worldEventsTable).values({
        type: "ghost_legacy",
        message: `The ghost of ${ghost.name} has retired and left behind a legendary recipe: [${ooakName}] — unclaimed and waiting for a worthy crafter!`,
        playerName: ghost.name,
        zone: ghost.zone,
        importance: 9,
        tick,
      });
    }
    return;
  }

  // ~30% chance: leave behind a known recipe
  if (roll < 0.37) {
    const ghostKnown = await db
      .select({ recipeId: ghostKnownRecipesTable.recipeId })
      .from(ghostKnownRecipesTable)
      .where(eq(ghostKnownRecipesTable.ghostId, ghost.id));

    if (ghostKnown.length > 0) {
      const picked = ghostKnown[Math.floor(Math.random() * ghostKnown.length)];
      const [recipe] = await db
        .select({ id: recipesTable.id, name: recipesTable.name, tier: recipesTable.tier })
        .from(recipesTable)
        .where(eq(recipesTable.id, Number(picked.recipeId)))
        .limit(1);

      if (recipe) {
        await db.insert(ghostLegacyTable).values({
          ghostId: ghost.id,
          ghostName: ghost.name,
          dropType: "recipe",
          dropName: recipe.name,
          dropReference: String(recipe.id),
        });
        await db.insert(worldEventsTable).values({
          type: "ghost_legacy",
          message: `The ghost of ${ghost.name} has retired and left behind the recipe [${recipe.name}] in the world legacy pool.`,
          playerName: ghost.name,
          zone: ghost.zone,
          importance: 6,
          tick,
        });
      }
      return;
    }
  }

  // ~30% chance: leave behind a gear item
  if (roll < 0.67) {
    const gearSlots = Object.values((ghost.gear as Record<string, string>) ?? {}).filter(Boolean);
    if (gearSlots.length > 0) {
      const itemId = gearSlots[Math.floor(Math.random() * gearSlots.length)];
      const item = getItemById(itemId);
      const dropName = item?.name ?? itemId;
      await db.insert(ghostLegacyTable).values({
        ghostId: ghost.id,
        ghostName: ghost.name,
        dropType: "item",
        dropName,
        dropReference: itemId,
      });
      await db.insert(worldEventsTable).values({
        type: "ghost_legacy",
        message: `The ghost of ${ghost.name} has retired and left behind [${dropName}] in the world legacy pool.`,
        playerName: ghost.name,
        zone: ghost.zone,
        importance: 5,
        tick,
      });
    }
  }
  // ~33% chance: no drop (ghost retires quietly)
}

// ─── Main simulation tick ─────────────────────────────────────────────────────

export async function tickGhostSimulation(): Promise<void> {
  globalTick++;
  const tick = globalTick;

  const allPlayers = await db.select().from(worldPlayersTable);

  // ── Active-hours filter: only tick ghosts whose login window includes this UTC hour ──
  const currentHour = new Date().getUTCHours();
  const players = allPlayers.filter(p => {
    const start = p.activeHoursStart ?? 0;
    const end   = p.activeHoursEnd   ?? 23;
    // Default 0–23 = always active
    if (start === 0 && end === 23) return true;
    // Non-wrapping window (e.g. 6–14)
    if (end >= start) return currentHour >= start && currentHour <= end;
    // Wrapping window (e.g. 21–5 = 9 pm to 5 am)
    return currentHour >= start || currentHour <= end;
  });

  const events: Array<typeof worldEventsTable.$inferInsert> = [];
  const factionDeltas: Record<string, number> = {};
  const marketDeltas: Record<string, number> = {};

  // Decay all market demand scores by 10% each tick
  await db.execute(sql`
    UPDATE ghost_market_demand
    SET demand_score = GREATEST(0, demand_score * 0.90),
        updated_at = now()
  `);

  for (const player of players) {
    const personality = getArchetype(player.personality ?? "Aggressive");
    const pCfg = PERSONALITY_CONFIG[personality];
    const zoneInfo = ZONE_BY_NAME.get(player.zone) ?? zoneForLevel(player.level);
    const zoneId   = zoneInfo.id;
    const candidates = enemiesForZone(zoneId);

    // Boss chance is personality-driven
    const isBossRoll = Math.random() < pCfg.bossChance;
    const bossCandidates = candidates.filter(e => e.isBoss);
    const regularCandidates = candidates.filter(e => !e.isBoss);

    let enemy: ZoneEnemy;
    if (isBossRoll && bossCandidates.length > 0) {
      enemy = pick(bossCandidates);
    } else {
      enemy = pick(regularCandidates.length ? regularCandidates : candidates);
    }

    const enemyLevel = Math.max(1, player.level + enemy.levelMod);
    const combat = simulateCombat(player, enemy, enemyLevel);

    const stats = player.stats as { strength: number; agility: number; stamina: number; intelligence: number; wisdom: number; charisma: number };

    if (combat.playerWins) {
      // ── Ghost wins ──
      const xpGain  = Math.floor(player.level * 35 * enemy.xpMult * (1 + Math.random() * 0.3));
      const goldGain = Math.floor(player.level * 4 * enemy.goldMult * (0.8 + Math.random() * 0.4));
      let   newXp    = player.xp + xpGain;
      let   newLevel = player.level;
      const xpRequired = xpForLevel(newLevel);

      let leveledUp = false;
      if (newXp >= xpRequired && newLevel < 100) {
        newXp -= xpRequired;
        newLevel++;
        leveledUp = true;
      }
      if (newLevel >= 100) {
        newXp = Math.min(newXp, xpForLevel(100));
      }

      // Zone travel logic
      let newZone = player.zone;

      // Explorers travel every 3-4 ticks regardless of level-up (always to a different zone)
      if (pCfg.explorerTick) {
        const lastTravel = explorerTickTracker.get(player.id) ?? 0;
        const travelInterval = 3 + Math.floor(Math.random() * 2); // 3-4
        if (tick - lastTravel >= travelInterval) {
          const betterZones = ZONE_LIST.filter(z =>
            z.name !== player.zone &&                          // exclude current zone
            player.level >= z.min - 2 && player.level <= z.max + 3
          );
          if (betterZones.length) {
            newZone = pick(betterZones).name;
            explorerTickTracker.set(player.id, tick);
          }
        }
      } else if (leveledUp) {
        // Devout prefer faction-aligned zones if available
        if (pCfg.preferAlignedZone) {
          const aligned = alignedZone(player.alignment, newLevel);
          if (aligned && Math.random() < 0.7) {
            newZone = aligned.name;
          } else {
            const betterZones = ZONE_LIST.filter(z => newLevel >= z.min && newLevel <= z.max);
            if (betterZones.length && Math.random() < 0.5) newZone = pick(betterZones).name;
          }
        } else {
          const betterZones = ZONE_LIST.filter(z => newLevel >= z.min && newLevel <= z.max);
          if (betterZones.length && Math.random() < 0.5) newZone = pick(betterZones).name;
        }
      }

      // ── Market spending ──
      let goldSpent = 0;
      let spentCategory = "";
      if (player.gold > 0 && Math.random() < pCfg.spendChance) {
        const chosen = weightedPick(pCfg.spendCategories);
        const spendAmount = Math.min(player.gold, Math.floor(player.level * 10 * (0.5 + Math.random())));
        if (spendAmount > 0) {
          goldSpent = spendAmount;
          spentCategory = chosen.cat;
          marketDeltas[chosen.cat] = (marketDeltas[chosen.cat] ?? 0) + spendAmount / 50;
        }
      }

      await db.update(worldPlayersTable).set({
        killCount:        player.killCount + 1,
        bossKills:        player.bossKills + (enemy.isBoss ? 1 : 0),
        xp:               newXp,
        xpToNextLevel:    xpForLevel(newLevel),
        level:            newLevel,
        gold:             Math.max(0, player.gold + goldGain - goldSpent),
        totalGoldEarned:  player.totalGoldEarned + goldGain,
        totalGoldSpent:   (player.totalGoldSpent ?? 0) + goldSpent,
        zone:             newZone,
        lastTickAt:       new Date(),
      }).where(eq(worldPlayersTable.id, player.id));

      // ── Update gear on level-up ──
      if (leveledUp) {
        const currentGear = (player.gear as Record<string, unknown>) ?? {};
        const newGear = assignGhostGear({ level: newLevel, archetype: player.archetype }, currentGear);
        const slotsAdded = Object.keys(newGear).length > Object.keys(currentGear).length;
        const slotsUpgraded = Object.entries(newGear).some(([slot, val]) => {
          const cur = currentGear[slot] as Record<string, unknown> | undefined;
          return !cur || ((val as Record<string, unknown>)?.level as number ?? 0) > (cur?.level as number ?? 0);
        });
        if (slotsAdded || slotsUpgraded) {
          await db.update(worldPlayersTable).set({ gear: newGear }).where(eq(worldPlayersTable.id, player.id)).catch(() => {});
        }
      }

      // Faction standing impact
      if (enemy.factionId) {
        factionDeltas[enemy.factionId] = (factionDeltas[enemy.factionId] ?? 0) - 5;
        const oppFaction = enemy.factionId === "freeport" ? "qeynos" : enemy.factionId === "qeynos" ? "freeport" : null;
        if (oppFaction) factionDeltas[oppFaction] = (factionDeltas[oppFaction] ?? 0) + 3;
      }
      if (zoneInfo.factionId) {
        factionDeltas[zoneInfo.factionId] = (factionDeltas[zoneInfo.factionId] ?? 0) + 1;
      }

      // ── World event: kill ──
      const killPool = KILL_MSGS[personality][player.archetype] ?? KILL_MSGS[personality]["Fighter"];
      events.push({
        type:       enemy.isBoss ? "boss_kill" : "kill",
        message:    fmt(pick(enemy.isBoss ? BOSS_MSGS[personality] : killPool), {
          name: player.name, enemy: enemy.name, zone: newZone,
        }),
        playerName: player.name,
        zone:       newZone,
        importance: enemy.isBoss ? 3 : 1,
        tick,
      });

      // ── World event: level-up ──
      if (leveledUp) {
        events.push({
          type:       "level_up",
          message:    fmt(pick(LEVEL_MSGS[personality]), { name: player.name, level: newLevel, zone: newZone }),
          playerName: player.name,
          zone:       newZone,
          importance: 4,
          tick,
        });
      }

      // ── World event: zone travel ──
      if (newZone !== player.zone) {
        events.push({
          type:       "zone_travel",
          message:    fmt(pick(ZONE_MSGS[personality]), { name: player.name, zone: newZone }),
          playerName: player.name,
          zone:       newZone,
          importance: 2,
          tick,
        });
      }

      // ── World event: loot (personality-weighted chance) ──
      if (Math.random() < pCfg.lootChance) {
        const bonusGold = Math.floor(player.level * 12 * (1 + Math.random()));
        await db.update(worldPlayersTable)
          .set({
            gold: Math.max(0, player.gold + goldGain - goldSpent + bonusGold),
            totalGoldEarned: player.totalGoldEarned + goldGain + bonusGold,
          })
          .where(eq(worldPlayersTable.id, player.id));
        events.push({
          type:       "loot",
          message:    fmt(pick(LOOT_MSGS[personality]), { name: player.name, gold: bonusGold, zone: newZone }),
          playerName: player.name,
          zone:       newZone,
          importance: 1,
          tick,
        });
      }

      // ── World event: discovery (Explorer & Scholarly, ~15% chance) ──
      const discoveryPool = DISCOVERY_MSGS[personality];
      if (discoveryPool && discoveryPool.length > 0 && Math.random() < 0.15) {
        events.push({
          type:       "discovery",
          message:    fmt(pick(discoveryPool), { name: player.name, zone: newZone }),
          playerName: player.name,
          zone:       newZone,
          importance: 2,
          tick,
        });
      }

      // ── World event: market purchase ──
      if (goldSpent > 0 && spentCategory) {
        const purchaseMsg = PURCHASE_MSGS[spentCategory] ?? "{name} makes a purchase in {zone}.";
        events.push({
          type:       "purchase",
          message:    fmt(purchaseMsg, { name: player.name, zone: newZone }),
          playerName: player.name,
          zone:       newZone,
          importance: 1,
          tick,
        });
      }

    } else {
      // ── Ghost loses — death penalty ──
      const saferZones = ZONE_LIST.filter(z => player.level >= z.min + 3 && player.level > z.min);
      const safeZone   = saferZones.length ? pick(saferZones) : zoneForLevel(Math.max(1, player.level - 5));
      const newDeathCount = player.deathCount + 1;

      await db.update(worldPlayersTable).set({
        deathCount: newDeathCount,
        zone:       safeZone.name,
        lastTickAt: new Date(),
      }).where(eq(worldPlayersTable.id, player.id));

      // ── Generational ghost retirement (at 500 deaths) ──
      if (newDeathCount >= 500 && (player.generation ?? 1) < 5) {
        const freshPlayer = { ...player, deathCount: newDeathCount };
        await spawnChildGhost(freshPlayer, tick).catch(() => {});
        // Retire the parent — remove from world
        await db.delete(worldPlayersTable).where(eq(worldPlayersTable.id, player.id)).catch((e) => { console.error("[Ghost] Failed to delete retired ghost:", e); });
        await db.delete(ghostDungeonClearsTable).where(eq(ghostDungeonClearsTable.ghostId, player.id)).catch((e) => { console.error("[Ghost] Failed to delete dungeon clears for retired ghost:", e); });
        await db.delete(ghostRaidClearsTable).where(eq(ghostRaidClearsTable.ghostId, player.id)).catch((e) => { console.error("[Ghost] Failed to delete raid clears for retired ghost:", e); });
        await db.delete(ghostEpicQuestProgressTable).where(eq(ghostEpicQuestProgressTable.ghostId, player.id)).catch((e) => { console.error("[Ghost] Failed to delete epic quest progress for retired ghost:", e); });

        // ── Phase 3: Ghost Legacy Drop ──────────────────────────────────────
        // Determine what the ghost leaves behind (item, recipe, or OoaK recipe).
        await generateGhostLegacyDrop(player, tick).catch((e) => { console.error("[Ghost] Failed to generate legacy drop:", e); });

        await db.insert(worldEventsTable).values({
          type: "ghost_retirement",
          message: `${player.name} has fought their last battle after 500 deaths — their legacy lives on!`,
          playerName: player.name,
          zone: player.zone,
          importance: 5,
          tick,
        }).catch((e) => { console.error("[Ghost] Failed to insert retirement event:", e); });
      }
    }
  }

  if (events.length > 0) {
    await db.insert(worldEventsTable).values(events);
  }

  // ── Apply faction deltas ──
  if (Object.keys(factionDeltas).length > 0) {
    try {
      for (const [factionId, delta] of Object.entries(factionDeltas)) {
        if (!delta) continue;
        const [existing] = await db.select().from(factionsTable)
          .where(eq(factionsTable.factionId, factionId)).limit(1);
        if (existing) {
          const newStanding = Math.max(-40000, Math.min(40000, existing.standing + delta));
          await db.update(factionsTable)
            .set({ standing: newStanding, updatedAt: new Date() })
            .where(eq(factionsTable.factionId, factionId));
        }
      }
    } catch {
      // Faction update is non-critical
    }
  }

  // ── Apply market demand deltas ──
  if (Object.keys(marketDeltas).length > 0) {
    try {
      for (const [cat, delta] of Object.entries(marketDeltas)) {
        if (!delta) continue;
        await db.execute(sql`
          INSERT INTO ghost_market_demand (category, demand_score, updated_at)
          VALUES (${cat}, ${delta}, now())
          ON CONFLICT (category)
          DO UPDATE SET
            demand_score = LEAST(100, ghost_market_demand.demand_score + ${delta}),
            updated_at = now()
        `);
      }
    } catch {
      // Market update is non-critical
    }
  }

  // ── Ghost auction participation ──
  await ghostAuctionTick(players, tick).catch(() => {});

  // ── Ghost crafting participation ──
  await ghostCraftingTick(players).catch(() => {});

  // ── Ghost gathering participation ──
  await ghostGatheringTick(players, events, tick).catch(() => {});

  // ── Ghost dungeon/raid progression ──
  await ghostDungeonProgressTick(players, tick).catch(() => {});

  // ── Ghost epic quest progression ──
  await ghostEpicQuestTick(players).catch(() => {});

  // ── Rival detection ──────────────────────────────────────────────────────
  try {
    const [playerChar] = await db.select().from(charactersTable).limit(1);
    if (playerChar) {
      const playerLevel = playerChar.level ?? 1;
      const playerKills = playerChar.killCount ?? 0;
      const rivalIds = (playerChar.rivals as number[] | null) ?? [];

      for (const ghost of players) {
        const levelDiff = Math.abs(ghost.level - playerLevel);
        if (levelDiff > 10) continue;
        if (rivalIds.includes(ghost.id)) continue;

        let surgeMsg: string | null = null;
        if (ghost.level > playerLevel) {
          surgeMsg = `${ghost.name} (Lv ${ghost.level}) has surpassed your level!`;
        } else if (ghost.killCount > playerKills) {
          surgeMsg = `${ghost.name} (Lv ${ghost.level}) has more kills than you!`;
        }

        if (surgeMsg) {
          await db.insert(worldEventsTable).values({
            type: "rival_surge",
            message: surgeMsg,
            playerName: ghost.name,
            zone: ghost.zone,
            importance: 5,
            tick,
          }).catch(() => {});
          break; // Only one rival_surge per tick
        }
      }
    }
  } catch {
    // Rival detection is non-critical
  }

  // ── Prune old events (keep last 500) ──
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(worldEventsTable);
  const count = Number(countRow?.count ?? 0);
  if (count > 500) {
    const oldestToKeep = await db
      .select({ id: worldEventsTable.id })
      .from(worldEventsTable)
      .orderBy(desc(worldEventsTable.createdAt))
      .limit(500);
    if (oldestToKeep.length > 0) {
      const minId = Math.min(...oldestToKeep.map(r => r.id));
      await db.delete(worldEventsTable).where(sql`${worldEventsTable.id} < ${minId}`);
    }
  }
}

// ─── Start / Stop background loop ────────────────────────────────────────────

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export function startGhostSimulation(): void {
  if (simulationInterval) return;

  seedGhostPlayers().then(() => {
    tickGhostSimulation().catch(console.error);
    simulationInterval = setInterval(() => {
      tickGhostSimulation().catch(console.error);
    }, 30_000);
    console.log(`[Ghost] Living World simulation v${SIMULATOR_VERSION} started (30s tick).`);
  }).catch(console.error);
}

export function stopGhostSimulation(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}
