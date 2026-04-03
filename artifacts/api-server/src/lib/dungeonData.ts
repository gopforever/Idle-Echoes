import { DUNGEON_DIFFICULTY_MULTIPLIER, DUNGEON_GS_GATE } from "./eq2Formulas.js";
import type { Enemy, BossPersonality } from "./gameData.js";

export interface DungeonFloor {
  floorNumber: number;
  name: string;
  description: string;
  enemyIds: string[];
  miniBossId: string;
  normalsRequired: number;
}

export interface DungeonDefinition {
  id: string;
  name: string;
  zone: string;
  description: string;
  lore: string;
  minLevel: number;
  maxLevel: number;
  floors: DungeonFloor[];
  mainBossId: string;
  spriteId: string;
  /** Personality of the dungeon's main boss — drives AI narration tone */
  bossPersonality?: BossPersonality;
  /** Kill count threshold before boss enrages on re-encounter */
  bossGrudgeThreshold?: number;
}

export const DUNGEONS: DungeonDefinition[] = [
  {
    id: "blackburrow",
    name: "Blackburrow",
    zone: "Qeynos Hills",
    description: "The gnoll warrens beneath the Qeynos Hills — five treacherous floors leading to Overlord Narlock.",
    lore: "Blackburrow has been a gnoll stronghold since the Age of Turmoil. Carved from living rock, its five floors descend ever deeper into darkness. Generations of gnoll warlords have fortified its passages. Those who reach the throne of Overlord Narlock — the undisputed master of all gnoll-kind in the Qeynos Hills — have faced the full might of Blackburrow.",
    minLevel: 10,
    maxLevel: 20,
    mainBossId: "bb_overlord_narlock",
    spriteId: "dungeon_blackburrow",
    bossPersonality: "arrogant",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Digging Tunnels",
        description: "Crude excavation tunnels alive with diggers and their overseers.",
        enemyIds: ["bb_gnoll_digger", "bb_gnoll_pup", "bb_gnoll_scrapper", "bb_gnoll_tunneler", "bb_gnoll_sentry"],
        miniBossId: "bb_gnoll_overseer",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Warrior Barracks",
        description: "Where Blackburrow's warriors train and prepare for raids.",
        enemyIds: ["bb_gnoll_shaman", "bb_gnoll_warrior", "bb_gnoll_scout", "bb_gnoll_berserker", "bb_gnoll_ward_priest"],
        miniBossId: "bb_gnoll_battlemaster",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Shaman Sanctum",
        description: "Sacred halls where gnoll shamans commune with dark spirits.",
        enemyIds: ["bb_gnoll_cultist", "bb_gnoll_elder", "bb_gnoll_invoker", "bb_gnoll_runecaster", "bb_gnoll_hexblade"],
        miniBossId: "bb_gnoll_high_shaman",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Elite Guard Quarters",
        description: "Home to Blackburrow's deadliest warriors — the elite guard.",
        enemyIds: ["bb_gnoll_blade", "bb_gnoll_warden", "bb_gnoll_reaver", "bb_gnoll_witch", "bb_gnoll_zealot"],
        miniBossId: "bb_gnoll_general",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Warlord's Throne Room",
        description: "The deepest floor — seat of Overlord Narlock's brutal reign.",
        enemyIds: ["bb_gnoll_champion", "bb_gnoll_inquisitor", "bb_gnoll_vanguard", "bb_gnoll_deathreaver", "bb_gnoll_shadow_blade"],
        miniBossId: "bb_gnoll_throne_guardian",
        normalsRequired: 5,
      },
    ],
  },

  // ── RUINS OF VARSOON (Levels 20-30, Thundering Steppes) ─────────────────
  {
    id: "ruins_of_varsoon",
    name: "Ruins of Varsoon",
    zone: "Thundering Steppes",
    description: "The crumbling ruins of Varsoon's ancient tower — five floors of undead horrors guarded by the Undying Lich himself.",
    lore: "Varsoon the Undying built his tower ages ago as a sanctuary for his unholy experiments with lichdom. The tower has since crumbled, but its five underground levels remain intact, infested with the fruits of his dark labor. Skeletal warriors, lich guardians, and spectral horrors patrol every corridor. Those brave enough to reach Varsoon's inner sanctum face the lich himself — an enemy who has never truly been killed.",
    minLevel: 20,
    maxLevel: 30,
    mainBossId: "steppes_boss",
    spriteId: "dungeon_ruins",
    bossPersonality: "ancient",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Collapsed Entry Hall",
        description: "Rubble and reanimated bones choke the ancient entry halls.",
        enemyIds: ["varsoon_skeleton", "varsoon_zombie", "varsoon_skeleton", "varsoon_zombie", "varsoon_skeleton"],
        miniBossId: "varsoon_lich_guardian",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Spectral Corridors",
        description: "Ghostly figures drift through torch-lit corridors, attacking on sight.",
        enemyIds: ["varsoon_ghost", "varsoon_skeleton", "varsoon_ghost", "varsoon_zombie", "varsoon_ghost"],
        miniBossId: "varsoon_lich_guardian",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Bone Laboratory",
        description: "Where Varsoon once conducted experiments, now guarded by bone golems.",
        enemyIds: ["varsoon_bone_golem", "varsoon_dark_priest", "varsoon_bone_golem", "varsoon_dark_priest", "varsoon_bone_golem"],
        miniBossId: "varsoon_wraith_captain",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Dark Priest Sanctum",
        description: "Fanatic priests of the Undying hold dark rites in this defiled sanctum.",
        enemyIds: ["varsoon_dark_priest", "varsoon_ghost", "varsoon_dark_priest", "varsoon_zombie", "varsoon_dark_priest"],
        miniBossId: "varsoon_wraith_captain",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "Varsoon's Inner Sanctum",
        description: "The deepest chamber — Varsoon the Undying awaits his next challenger.",
        enemyIds: ["varsoon_bone_golem", "varsoon_ghost", "varsoon_dark_priest", "varsoon_skeleton", "varsoon_zombie"],
        miniBossId: "varsoon_wraith_captain",
        normalsRequired: 5,
      },
    ],
  },

  // ── NEKTROPOS CASTLE (Levels 25-35, Nektulos Forest) ────────────────────
  {
    id: "nektropos_castle",
    name: "Nektropos Castle",
    zone: "Nektulos Forest",
    description: "The cursed estate of Lord Everling — five haunted floors where the living are not welcome.",
    lore: "Nektropos Castle stands at the heart of Nektulos Forest like a festering wound on the land. Lord Everling, obsessed with immortality, made a terrible bargain with the forces of death. He achieved undeath but at tremendous cost — his entire household was cursed along with him. Now his spectral family, servants, and knights defend the castle for eternity, loyal beyond death to their undying master.",
    minLevel: 25,
    maxLevel: 35,
    mainBossId: "nektopos_lord_everling",
    spriteId: "dungeon_castle",
    bossPersonality: "cunning",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Castle Courtyard",
        description: "Shades and revenants patrol the overgrown courtyard — the first line of defense.",
        enemyIds: ["nektopos_shade", "nektopos_revenant", "nektopos_shade", "nektopos_revenant", "nektopos_shade"],
        miniBossId: "nektopos_high_inquisitor",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Great Hall",
        description: "The banquet hall of the damned, where revenant servants forever prepare a feast no one will eat.",
        enemyIds: ["nektopos_revenant", "nektopos_shade", "nektopos_revenant", "nektopos_banshee", "nektopos_revenant"],
        miniBossId: "nektopos_gargoyle",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Keep Dungeons",
        description: "The dungeon beneath the castle, where banshees wail endlessly.",
        enemyIds: ["nektopos_banshee", "nektopos_shade", "nektopos_banshee", "nektopos_revenant", "nektopos_banshee"],
        miniBossId: "nektopos_dark_knight",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Everling Family Quarters",
        description: "The private quarters where Everling's cursed family haunts forever.",
        enemyIds: ["nektopos_everling_guard", "nektopos_banshee", "nektopos_everling_guard", "nektopos_revenant", "nektopos_dark_knight"],
        miniBossId: "nektopos_high_inquisitor",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "Lord Everling's Throne Room",
        description: "The throne room of the undying lord — where Everling holds court over his cursed domain.",
        enemyIds: ["nektopos_everling_guard", "nektopos_dark_knight", "nektopos_banshee", "nektopos_gargoyle", "nektopos_shade"],
        miniBossId: "nektopos_high_inquisitor",
        normalsRequired: 5,
      },
    ],
  },

  // ── PERMAFROST KEEP (Levels 35-45, Everfrost Peaks) ─────────────────────
  {
    id: "permafrost_keep",
    name: "Permafrost Keep",
    zone: "Everfrost Peaks",
    description: "An ancient fortress entombed in eternal ice — five floors of frozen horror culminating in the lair of Lady Vox, Queen of Permafrost.",
    lore: "Permafrost Keep was built ages ago by frost giants who sought to carve a kingdom from the eternal ice of the Everfrost Peaks. The keep was eventually conquered by the ancient white dragon Lady Vox, who transformed it into her frozen palace. Ice golems, frost knights, and blizzard elementals now guard its halls in her name. Those who survive five floors of glacial devastation face Lady Vox herself — the most deadly cold dragon on all of Norrath.",
    minLevel: 35,
    maxLevel: 45,
    mainBossId: "lady_vox",
    spriteId: "dungeon_frost",
    bossPersonality: "cold",
    bossGrudgeThreshold: 2,
    floors: [
      {
        floorNumber: 1,
        name: "The Frozen Gates",
        description: "The entrance to Permafrost, where yeti form the first line of defense.",
        enemyIds: ["permafrost_yeti", "permafrost_blizzard_elemental", "permafrost_yeti", "permafrost_blizzard_elemental", "permafrost_yeti"],
        miniBossId: "permafrost_frost_knight",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Frost Knight Barracks",
        description: "Where Permafrost's elite frost knights train in the killing cold.",
        enemyIds: ["permafrost_yeti", "permafrost_blizzard_elemental", "permafrost_yeti", "permafrost_blizzard_elemental", "permafrost_yeti"],
        miniBossId: "permafrost_ice_golem",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Blizzard Chamber",
        description: "A vast chamber where blizzard elementals swirl in an endless storm.",
        enemyIds: ["permafrost_blizzard_elemental", "permafrost_frost_knight", "permafrost_blizzard_elemental", "permafrost_ice_golem", "permafrost_blizzard_elemental"],
        miniBossId: "permafrost_ice_witch_guardian",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Witch's Sanctum",
        description: "The ice witch's private sanctum, crackling with cryomantic power.",
        enemyIds: ["permafrost_ice_witch_guardian", "permafrost_blizzard_elemental", "permafrost_frost_knight", "permafrost_ice_golem", "permafrost_blizzard_elemental"],
        miniBossId: "permafrost_frost_warden",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Eternal Ice Vault",
        description: "The deepest vault of Permafrost Keep — Frost Warden Icegrave awaits amid towering columns of eternal ice.",
        enemyIds: ["permafrost_blizzard_elemental", "permafrost_frost_knight", "permafrost_ice_golem", "permafrost_ice_witch_guardian", "permafrost_yeti"],
        miniBossId: "permafrost_frost_warden",
        normalsRequired: 5,
      },
    ],
  },

  // ── SOLUSEK'S EYE (Levels 42-52, Lavastorm Mountains) ───────────────────
  {
    id: "soluseks_eye",
    name: "Solusek's Eye",
    zone: "Lavastorm Mountains",
    description: "The volcanic temple of the fire god Solusek Ro — five floors of searing heat and fire elementals leading to Lord Nagafen.",
    lore: "Solusek's Eye is the sacred temple of Solusek Ro, the god of fire, carved into the heart of Lavastorm's most active volcano. Fire giants, lava elementals, and goblin pyromancers serve as the temple's faithful guardians. Deep within the volcanic chambers, Lord Nagafen — the ancient fire dragon — makes his lair. Those who survive five floors of volcanic devastation face the most powerful dragon on Norrath.",
    minLevel: 42,
    maxLevel: 52,
    mainBossId: "nagafen",
    spriteId: "dungeon_volcano",
    bossPersonality: "arrogant",
    bossGrudgeThreshold: 2,
    floors: [
      {
        floorNumber: 1,
        name: "The Volcanic Entry",
        description: "The scorching entrance to Solusek's Eye, where goblin firestarters patrol the lava flows.",
        enemyIds: ["solusek_goblin_firestarter", "solusek_archon", "solusek_goblin_firestarter", "solusek_archon", "solusek_goblin_firestarter"],
        miniBossId: "solusek_lava_walker",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Lava Caverns",
        description: "Vast caverns of flowing magma where fire sprites and goblins roam.",
        enemyIds: ["solusek_goblin_firestarter", "solusek_fire_sprite", "solusek_goblin_firestarter", "solusek_fire_sprite", "solusek_goblin_firestarter"],
        miniBossId: "solusek_fire_giant",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Fire Giant Forge",
        description: "An immense volcanic forge where lava walkers and archons stand guard.",
        enemyIds: ["solusek_lava_walker", "solusek_archon", "solusek_lava_walker", "solusek_fire_sprite", "solusek_lava_walker"],
        miniBossId: "solusek_high_priest_ignus",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Temple of Sol Ro",
        description: "The sacred inner temple where Solusek Archons perform eternal rites in Sol Ro's name.",
        enemyIds: ["solusek_archon", "solusek_fire_giant", "solusek_archon", "solusek_lava_walker", "solusek_archon"],
        miniBossId: "solusek_high_priest_ignus",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "Nagafen's Lair",
        description: "The innermost volcanic chamber — the ancient fire dragon Lord Nagafen makes his lair here, surrounded by his most devoted servants.",
        enemyIds: ["solusek_archon", "solusek_fire_giant", "solusek_archon", "solusek_lava_walker", "solusek_goblin_firestarter"],
        miniBossId: "solusek_high_priest_ignus",
        normalsRequired: 5,
      },
    ],
  },
];

export function getDungeonById(id: string): DungeonDefinition | undefined {
  return DUNGEONS.find(d => d.id === id);
}

/**
 * Scale an enemy's stats for a dungeon encounter.
 * Formula: baseStat × (playerLevel / dungeonMinLevel) × difficultyMultiplier
 * playerLevel defaults to dungeonMinLevel if omitted (backward compat).
 */
export function scaleEnemyForDifficulty(enemy: Enemy, difficulty: string, playerLevel?: number, dungeonMinLevel: number = 10): Enemy {
  const diffMult = DUNGEON_DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0;
  const levelFactor = playerLevel ? Math.max(1.0, playerLevel / dungeonMinLevel) : 1.0;
  const mult = diffMult * levelFactor;
  return {
    ...enemy,
    hp: Math.round(enemy.maxHp * mult),
    maxHp: Math.round(enemy.maxHp * mult),
    damageMin: Math.round(enemy.damageMin * mult),
    damageMax: Math.round(enemy.damageMax * mult),
    xpReward: Math.round(enemy.xpReward * mult),
    goldMin: Math.round(enemy.goldMin * mult),
    goldMax: Math.round(enemy.goldMax * mult),
  };
}

export const DIFFICULTY_LEVELS = ["normal", "expert", "legendary", "mythical"] as const;
export type DungeonDifficulty = typeof DIFFICULTY_LEVELS[number];

export { DUNGEON_GS_GATE, DUNGEON_DIFFICULTY_MULTIPLIER };
