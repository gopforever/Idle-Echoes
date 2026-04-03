/**
 * Raid Definitions — 3 multi-phase raid bosses drawn from EQ2 raid lore.
 * Each raid has a single boss with 3 phases, min GS/level requirements,
 * and phase-specific abilities.
 */

import { DUNGEON_GS_GATE } from "./eq2Formulas.js";

export interface RaidPhase {
  phase: number;
  name: string;
  description: string;
  hpThreshold: number;
  abilities: string[];
  damageMultiplier: number;
  hpMultiplier: number;
}

export interface RaidDefinition {
  id: string;
  name: string;
  zone: string;
  lore: string;
  description: string;
  minLevel: number;
  minGearScore: number;
  phases: RaidPhase[];
  bossId: string;
  bossName: string;
  spriteId: string;
  minPartySize: number;
  maxPartySize: number;
  lootTier: "legendary" | "fabled" | "mythical";
}

export const RAIDS: RaidDefinition[] = [
  {
    id: "harla_dar",
    name: "Temple of Harla Dar",
    zone: "Tenebrous Tangle",
    lore: "Harla Dar is an ancient prismatic dragon who guards the upper reaches of the Tenebrous Tangle. She has lived for eons, accumulating a hoard of power that rivals the gods themselves. Only the most disciplined raid parties — those who can weather her prismatic breath and adapt to her ever-shifting elemental defenses — have any hope of besting this legendary creature.",
    description: "Face Harla Dar, the Prismatic Dragon of the Tenebrous Tangle, in a 3-phase encounter of elemental shifting and devastating breath attacks.",
    minLevel: 55,
    minGearScore: 400,
    bossId: "raid_harla_dar",
    bossName: "Harla Dar",
    spriteId: "raid_dragon",
    minPartySize: 4,
    maxPartySize: 6,
    lootTier: "fabled",
    phases: [
      {
        phase: 1,
        name: "Prismatic Awakening",
        description: "Harla Dar opens with prismatic breath — her element shifts every 20 seconds between fire, ice, and lightning.",
        hpThreshold: 100,
        abilities: ["Prismatic Breath", "Elemental Shift", "Wing Buffet", "Scale Barrage"],
        damageMultiplier: 1.0,
        hpMultiplier: 1.0,
      },
      {
        phase: 2,
        name: "Chromatic Fury",
        description: "Below 60% HP, Harla Dar enters a frenzied state — simultaneous multi-element attacks and aura damage.",
        hpThreshold: 60,
        abilities: ["Chromatic Aura", "Twin Breath", "Tail Slam", "Arcane Overload"],
        damageMultiplier: 1.4,
        hpMultiplier: 1.0,
      },
      {
        phase: 3,
        name: "Prismatic Annihilation",
        description: "At 25% HP, Harla Dar channels all prismatic energy into a devastating final form — survive the onslaught to claim victory.",
        hpThreshold: 25,
        abilities: ["Prismatic Annihilation", "Rainbow Nova", "Ancient Roar", "Final Scale Burst"],
        damageMultiplier: 1.8,
        hpMultiplier: 1.0,
      },
    ],
  },

  {
    id: "mayong_mistmoore",
    name: "Mistmoore Catacombs",
    zone: "Loping Plains",
    lore: "Mayong Mistmoore is the most ancient and powerful vampire in all of Norrath. He has ruled the Mistmoore bloodline for thousands of years, has survived conflicts that toppled empires, and has achieved a form of dark divinity. Raiding his catacombs beneath the Loping Plains is an act of supreme audacity — and those who manage it earn the most coveted spoils in the known world.",
    description: "Delve into Mayong Mistmoore's domain for a legendary battle across 3 phases: mortal, undying, and divine.",
    minLevel: 65,
    minGearScore: 550,
    bossId: "raid_mayong_mistmoore",
    bossName: "Mayong Mistmoore",
    spriteId: "raid_vampire",
    minPartySize: 4,
    maxPartySize: 6,
    lootTier: "mythical",
    phases: [
      {
        phase: 1,
        name: "The Mortal Veil",
        description: "Mayong tests your resolve in his humanoid form — devastating melee attacks and life drain.",
        hpThreshold: 100,
        abilities: ["Life Drain", "Vampiric Strike", "Bat Swarm", "Blood Frenzy"],
        damageMultiplier: 1.0,
        hpMultiplier: 1.0,
      },
      {
        phase: 2,
        name: "The Undying Form",
        description: "At 65% HP, Mayong transforms — regeneration, necrotic bursts, and charm effects make this phase brutal.",
        hpThreshold: 65,
        abilities: ["Necrotic Burst", "Charm of Blood", "Unholy Regeneration", "Shadow Step"],
        damageMultiplier: 1.5,
        hpMultiplier: 1.0,
      },
      {
        phase: 3,
        name: "Dark Apotheosis",
        description: "Below 30% HP, Mayong ascends to a near-divine state — only the most coordinated party survives his final transcendence.",
        hpThreshold: 30,
        abilities: ["Dark Apotheosis", "Blood God's Wrath", "Ancient Curse", "Eternal Night"],
        damageMultiplier: 2.0,
        hpMultiplier: 1.0,
      },
    ],
  },

  {
    id: "trakanon",
    name: "The Trakanon Depths",
    zone: "Sebilis",
    lore: "Trakanon is the undying plague dragon of Sebilis — a creature of pestilence and death who was once the most feared dragon in the Kunark continent. Killed by adventurers long ago, Trakanon refused to stay dead, rising again as a poison-fueled monstrosity. His breath weapon corrupts everything it touches; his very presence causes disease to spread. Only parties with exceptional healing can hope to survive the plague depths.",
    description: "Confront Trakanon the undying plague dragon across 3 devastating phases of escalating poison, disease, and pestilence.",
    minLevel: 60,
    minGearScore: 475,
    bossId: "raid_trakanon",
    bossName: "Trakanon",
    spriteId: "raid_plague_dragon",
    minPartySize: 4,
    maxPartySize: 6,
    lootTier: "fabled",
    phases: [
      {
        phase: 1,
        name: "Pestilent Awakening",
        description: "Trakanon opens with plague breath and persistent DoTs — healers must stay vigilant.",
        hpThreshold: 100,
        abilities: ["Plague Breath", "Infectious Bite", "Tail Sweep", "Venom Spray"],
        damageMultiplier: 1.0,
        hpMultiplier: 1.0,
      },
      {
        phase: 2,
        name: "Virulent Spread",
        description: "Below 55% HP, Trakanon begins spreading disease to all party members simultaneously.",
        hpThreshold: 55,
        abilities: ["Virulent Contagion", "Mass Infection", "Death Rattle", "Bone Crunch"],
        damageMultiplier: 1.5,
        hpMultiplier: 1.0,
      },
      {
        phase: 3,
        name: "Undying Plague",
        description: "At 20% HP, Trakanon activates his undying plague form — the room becomes a miasma of death.",
        hpThreshold: 20,
        abilities: ["Undying Plague", "Pestilent Nova", "Corpse Explosion", "Dragon's Demise"],
        damageMultiplier: 1.9,
        hpMultiplier: 1.0,
      },
    ],
  },
];

export function getRaidById(id: string): RaidDefinition | undefined {
  return RAIDS.find(r => r.id === id);
}

export const RAID_GS_GATE: Record<string, number> = {
  harla_dar: 400,
  mayong_mistmoore: 550,
  trakanon: 475,
};
