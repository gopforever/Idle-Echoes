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

// ─── Gear Set System ──────────────────────────────────────────────────────────

export type GearSetSlot = "head" | "shoulder" | "chest" | "wrist" | "legs" | "feet";
export type GearSetArchetype = "fighter" | "healer" | "caster";

export interface GearSetBonusEffect {
  name: string;
  description: string;
  triggerChance: number;
  effectType: "damage_burst" | "damage_reduction" | "absorb_shield" | "negate_death";
  effectValue: number;
  durationTicks: number;
}

export interface GearSetBonus {
  piecesRequired: number;
  /** Maps to a key in SetStatBoosts (attackRating, critChance, mitigation, etc.) */
  stat?: string;
  value?: number;
  isPercent?: boolean;
  description: string;
  effect?: GearSetBonusEffect;
}

export interface GearSetPiece {
  slot: GearSetSlot;
  /** Which floor advance (1-5) awards this piece */
  dropFloor: number;
}

export interface GearSetDefinition {
  id: string;
  dungeonId: string;
  difficulty: DungeonDifficulty;
  archetype: GearSetArchetype;
  /** Default set name — AI will generate a flavor name on first run */
  setNameTemplate: string;
  /** Passed to AI to generate thematic names and lore */
  theme: string;
  pieces: GearSetPiece[];
  bonuses: GearSetBonus[];
}

// ─── Piece layouts by difficulty (shared across all archetypes) ───────────────

const PIECES_BY_DIFFICULTY: Record<string, GearSetPiece[]> = {
  normal:    [{ slot: "chest", dropFloor: 3 }, { slot: "legs", dropFloor: 5 }],
  expert:    [{ slot: "head", dropFloor: 2 }, { slot: "chest", dropFloor: 3 }, { slot: "legs", dropFloor: 4 }, { slot: "feet", dropFloor: 5 }],
  legendary: [{ slot: "head", dropFloor: 1 }, { slot: "shoulder", dropFloor: 2 }, { slot: "chest", dropFloor: 3 }, { slot: "legs", dropFloor: 4 }, { slot: "feet", dropFloor: 5 }],
  mythical:  [{ slot: "head", dropFloor: 1 }, { slot: "shoulder", dropFloor: 2 }, { slot: "chest", dropFloor: 3 }, { slot: "wrist", dropFloor: 4 }, { slot: "legs", dropFloor: 5 }, { slot: "feet", dropFloor: 5 }],
};

// ─── Bonus generators by archetype ───────────────────────────────────────────

function fighterBonuses(diff: string, proc: GearSetBonusEffect): GearSetBonus[] {
  if (diff === "normal") return [{ piecesRequired: 2, stat: "attackRating", value: 20, description: "+20 Attack Rating" }];
  if (diff === "expert") return [
    { piecesRequired: 2, stat: "attackRating", value: 35, description: "+35 Attack Rating" },
    { piecesRequired: 4, stat: "critChance",   value: 5,  description: "+5% Critical Hit Chance" },
  ];
  if (diff === "legendary") return [
    { piecesRequired: 2, stat: "attackRating", value: 50, description: "+50 Attack Rating" },
    { piecesRequired: 3, stat: "avoidance",    value: 6,  description: "+6% Avoidance" },
    { piecesRequired: 5, stat: "mitigation",   value: 8,  description: "+8% Mitigation" },
  ];
  return [
    { piecesRequired: 2, stat: "attackRating", value: 80,  description: "+80 Attack Rating" },
    { piecesRequired: 4, stat: "critChance",   value: 12,  description: "+12% Critical Hit Chance" },
    { piecesRequired: 6, description: `${proc.name}: ${proc.description}`, effect: proc },
  ];
}

function healerBonuses(diff: string, proc: GearSetBonusEffect): GearSetBonus[] {
  if (diff === "normal") return [{ piecesRequired: 2, stat: "maxHpPercent", value: 8, isPercent: true, description: "+8% Max Health" }];
  if (diff === "expert") return [
    { piecesRequired: 2, stat: "maxHpPercent",    value: 10, isPercent: true, description: "+10% Max Health" },
    { piecesRequired: 4, stat: "maxPowerPercent",  value: 5,  isPercent: true, description: "+5% Max Power" },
  ];
  if (diff === "legendary") return [
    { piecesRequired: 2, stat: "maxHpPercent",    value: 12, isPercent: true, description: "+12% Max Health" },
    { piecesRequired: 3, stat: "spellCritChance", value: 5,  description: "+5% Spell Critical Chance" },
    { piecesRequired: 5, stat: "maxPowerPercent", value: 10, isPercent: true, description: "+10% Max Power" },
  ];
  return [
    { piecesRequired: 2, stat: "maxHpPercent",    value: 15, isPercent: true, description: "+15% Max Health" },
    { piecesRequired: 4, stat: "spellCritChance", value: 8,  description: "+8% Spell Critical Chance" },
    { piecesRequired: 6, description: `${proc.name}: ${proc.description}`, effect: proc },
  ];
}

function casterBonuses(diff: string, proc: GearSetBonusEffect): GearSetBonus[] {
  if (diff === "normal") return [{ piecesRequired: 2, stat: "spellCritChance", value: 5, description: "+5% Spell Critical Chance" }];
  if (diff === "expert") return [
    { piecesRequired: 2, stat: "spellCritChance", value: 8, description: "+8% Spell Critical Chance" },
    { piecesRequired: 4, stat: "maxPowerPercent", value: 6, isPercent: true, description: "+6% Max Power" },
  ];
  if (diff === "legendary") return [
    { piecesRequired: 2, stat: "spellDamage",     value: 10, isPercent: true, description: "+10% Spell Damage" },
    { piecesRequired: 3, stat: "spellCritChance", value: 8,  description: "+8% Spell Critical Chance" },
    { piecesRequired: 5, stat: "maxPowerPercent", value: 15, isPercent: true, description: "+15% Max Power" },
  ];
  return [
    { piecesRequired: 2, stat: "spellDamage",     value: 15, isPercent: true, description: "+15% Spell Damage" },
    { piecesRequired: 4, stat: "spellCritChance", value: 12, description: "+12% Spell Critical Chance" },
    { piecesRequired: 6, description: `${proc.name}: ${proc.description}`, effect: proc },
  ];
}

// ─── Set name/theme data per dungeon × archetype × difficulty ─────────────────

interface ArchetypeMeta {
  difficulties: Record<string, { name: string; theme: string }>;
  mythicalProc: GearSetBonusEffect;
}

const GEAR_SET_META: Array<{ dungeonId: string; archetypes: Record<GearSetArchetype, ArchetypeMeta> }> = [
  {
    dungeonId: "blackburrow",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Tunneler's Might",   theme: "gnoll warriors burrowing through dark earth with brutal relentlessness" },
          expert:    { name: "Warchief's Arms",     theme: "elite gnoll warchiefs who command Blackburrow's armies with an iron fist" },
          legendary: { name: "Narlock's Vanguard",  theme: "the warlord Narlock's personal war guard, the most feared fighters in the Qeynos Hills" },
          mythical:  { name: "Overlord's Dominion", theme: "the absolute dominion of the gnoll Overlord, forged in darkness and conquest" },
        },
        mythicalProc: { name: "Gnoll Frenzy", description: "25% chance on hit to gain +80% damage for 3 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 80, durationTicks: 3 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Burrow Shaman's",       theme: "healing charms crafted by gnoll shamans in the dark tunnels of Blackburrow" },
          expert:    { name: "Witch Doctor's Mantle",  theme: "mystical regalia of gnoll witch doctors who commune with dark earth spirits" },
          legendary: { name: "High Shaman's Calling",  theme: "sacred vestments of Blackburrow's high shaman empowered by dark spirits" },
          mythical:  { name: "Spirit of Narlock",      theme: "shamanic regalia channeling the spiritual power of Overlord Narlock himself" },
        },
        mythicalProc: { name: "Earth Spirit Ward", description: "20% chance on taking damage to grant an absorb shield for 40% max HP for 5 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 40, durationTicks: 5 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Gnoll Runeweaver's",    theme: "arcane runes etched by gnoll invokers in Blackburrow's ritual chambers" },
          expert:    { name: "Dark Shaman's Curse",    theme: "cursed robes of gnoll dark shamans who practice forbidden magic in Blackburrow" },
          legendary: { name: "Shadowcaster's Mantle",  theme: "shadowed robes of Blackburrow's elite shadowcasters who weave dark magic" },
          mythical:  { name: "Narlock's Hexblade",     theme: "the terrible hex of Overlord Narlock translated into raw arcane power" },
        },
        mythicalProc: { name: "Gnoll Hex Burst", description: "25% chance on spell hit to trigger a hex burst for 70% bonus shadow damage", triggerChance: 25, effectType: "damage_burst", effectValue: 70, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "ruins_of_varsoon",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Skeletal Guard's",    theme: "armor stripped from Varsoon's skeletal soldier guardians in the outer ruins" },
          expert:    { name: "Lich Knight's Plate", theme: "armor worn by Varsoon's elite lich knights who never tire and never fall" },
          legendary: { name: "Undying Champion's",  theme: "the indestructible armor of Varsoon's undying champion, never defeated in battle" },
          mythical:  { name: "Varsoon's Iron Will", theme: "armor forged from the iron will of the undying lich Varsoon who has conquered death" },
        },
        mythicalProc: { name: "Lich Strike", description: "25% chance on hit to trigger an undying surge for 75% bonus necrotic damage for 2 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 75, durationTicks: 2 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Soul Warden's",      theme: "vestments worn by soul wardens who tend to Varsoon's undead thralls" },
          expert:    { name: "Wraith's Mantle",    theme: "spectral robes of the wraith healers who restore Varsoon's fallen soldiers" },
          legendary: { name: "Varsoon's Enduring", theme: "immortal vestments imbued with Varsoon the Undying's essence of eternal resilience" },
          mythical:  { name: "Undying Will",       theme: "robes channeling the indestructible will of the lich who has never truly died" },
        },
        mythicalProc: { name: "Undying Will", description: "15% chance to negate a lethal blow, surviving with 1 HP", triggerChance: 15, effectType: "negate_death", effectValue: 1, durationTicks: 0 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Lich's Shroud",       theme: "shadowed robes imbued with Varsoon's necromantic energies from the outer ruins" },
          expert:    { name: "Necromancer's Grasp", theme: "robes soaked in the dark magic of Varsoon's inner sanctum necromancers" },
          legendary: { name: "Specter's Dominion",  theme: "spectral robes commanding the spirits of the fallen within Varsoon's ruins" },
          mythical:  { name: "Lich Lord's Arcanum", theme: "the supreme arcane power of the lich lord Varsoon distilled into robes" },
        },
        mythicalProc: { name: "Spectral Burst", description: "25% chance on spell hit to trigger a spectral explosion for 65% bonus necrotic damage", triggerChance: 25, effectType: "damage_burst", effectValue: 65, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "nektropos_castle",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Everling's Guard",       theme: "armor worn by Lord Everling's undead household guardians in Nektropos Castle" },
          expert:    { name: "Castle Knight's Plate",  theme: "armor of Nektropos Castle's elite undead knights who protect Everling's secrets" },
          legendary: { name: "Castle Lord's Will",     theme: "the indomitable will of Lord Everling made manifest in formidable battle armor" },
          mythical:  { name: "Everling's Curse",       theme: "armor infused with Everling's terrible curse that grants power through eternal haunting" },
        },
        mythicalProc: { name: "Phantom Strike", description: "25% chance on hit to trigger a phantom blow for 80% bonus spectral damage for 2 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 80, durationTicks: 2 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Everling's Whisper",  theme: "ghostly healing power whispered by Everling's spectral daughters in Nektropos Castle" },
          expert:    { name: "Spirit Matron's",     theme: "vestments of the spirit matrons who maintain Lord Everling's cursed household" },
          legendary: { name: "Cursed Healer's",     theme: "robes of Nektropos Castle's cursed healers who serve Lord Everling in undeath" },
          mythical:  { name: "Everling's Embrace",  theme: "the haunted embrace of Lord Everling that sustains his servants through cursed eternal life" },
        },
        mythicalProc: { name: "Spirit Ward", description: "20% chance on taking damage to summon a spirit ward absorbing 50% max HP damage for 4 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 50, durationTicks: 4 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Specter's Touch",          theme: "spectral magic from the ghost mages who haunt the halls of Nektropos Castle" },
          expert:    { name: "Phantom Weaver's",         theme: "robes of the phantom weavers who manipulate spectral energies in Everling's service" },
          legendary: { name: "Haunted Arcanum",          theme: "the ancient arcane knowledge of Nektropos Castle's spectral mage council" },
          mythical:  { name: "Everling's Dark Arcanum",  theme: "the terrible dark magic of Lord Everling's cursed arcane legacy distilled into robes" },
        },
        mythicalProc: { name: "Spectral Chain", description: "25% chance on spell hit to trigger a spectral chain for 60% bonus shadow damage", triggerChance: 25, effectType: "damage_burst", effectValue: 60, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "permafrost_keep",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Frostborn",            theme: "armor forged from Permafrost ice by frost giants before Lady Vox conquered the keep" },
          expert:    { name: "Vox's Blessing",       theme: "gear blessed by Lady Vox the ancient white dragon queen of Permafrost Keep" },
          legendary: { name: "Lady's Embrace",       theme: "armor frozen in Lady Vox's eternal embrace, encasing the wearer in protective ice" },
          mythical:  { name: "Permafrost Sovereign", theme: "the supreme power of the Permafrost Sovereign forged from the glacier's eternal heart" },
        },
        mythicalProc: { name: "Blizzard Shroud", description: "25% chance on being hit to shroud the attacker reducing their damage by 25% for 5 ticks", triggerChance: 25, effectType: "damage_reduction", effectValue: 25, durationTicks: 5 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Frost Shaman's",    theme: "vestments of the frost shamans who tend to Lady Vox's wounded ice soldiers" },
          expert:    { name: "Glacial Healer's",  theme: "robes of Permafrost Keep's glacial healers who channel cold into restorative power" },
          legendary: { name: "Vox's Chosen",      theme: "sacred vestments bestowed upon Lady Vox's most devoted healer followers" },
          mythical:  { name: "Permafrost Eternal",theme: "vestments channeling the eternal frost magic of Permafrost Keep's deep glacial heart" },
        },
        mythicalProc: { name: "Glacial Aegis", description: "20% chance on being struck to form a glacial aegis absorbing 45% max HP damage for 4 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 45, durationTicks: 4 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Iceweaver's",         theme: "robes threaded with frost magic by the ice mages who study at Lady Vox's feet" },
          expert:    { name: "Glacial Invoker's",   theme: "robes of the glacial invokers who channel Lady Vox's freezing breath into spell power" },
          legendary: { name: "Frostfire Arcanum",   theme: "arcane robes combining Permafrost's glacial power with ancient frost rune magic" },
          mythical:  { name: "Vox's Icy Dominion",  theme: "robes channeling the supreme ice magic of Lady Vox the white dragon queen" },
        },
        mythicalProc: { name: "Frost Nova Burst", description: "25% chance on spell hit to trigger a frost nova for 70% bonus ice damage", triggerChance: 25, effectType: "damage_burst", effectValue: 70, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "soluseks_eye",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Ember's",           theme: "gear tempered in volcanic fires of Solusek's Eye glowing with inner flame" },
          expert:    { name: "Nagafen's Fury",    theme: "armor infused with Lord Nagafen's volcanic fury and draconic fire magic" },
          legendary: { name: "Sol Ro's Blessing", theme: "armor blessed by Solusek Ro god of fire granting mastery over flame and combat" },
          mythical:  { name: "Lord Nagafen's",    theme: "the supreme power of Lord Nagafen the most feared dragon on all of Norrath" },
        },
        mythicalProc: { name: "Dragonfire", description: "30% chance on critical hit to trigger a volcanic burst for 100% bonus fire damage", triggerChance: 30, effectType: "damage_burst", effectValue: 100, durationTicks: 1 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Flame Warden's",     theme: "vestments of the flame wardens who tend to Nagafen's wounded fire servants" },
          expert:    { name: "Volcanic Healer's",  theme: "robes of Solusek's Eye priests who convert volcanic heat into restorative flame" },
          legendary: { name: "Sol Ro's Chosen",    theme: "sacred vestments chosen by the fire god Sol Ro for his most devoted healer priests" },
          mythical:  { name: "Nagafen's Renewal",  theme: "vestments drawing on Lord Nagafen's immortal fire to sustain the wearer eternally" },
        },
        mythicalProc: { name: "Volcanic Resurrection", description: "20% chance on near-death to gain a volcanic surge absorbing 60% max HP damage for 3 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 60, durationTicks: 3 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Pyromancer's",              theme: "robes threaded with fire magic by the pyromancers who study Solusek's Eye" },
          expert:    { name: "Arcane Inferno's",          theme: "robes of the arcane inferno mages who master the volcanic energies of Sol Ro" },
          legendary: { name: "Sol Ro's Arcanum",          theme: "arcane robes blessed by Solusek Ro himself granting mastery over all fire magic" },
          mythical:  { name: "Nagafen's Conflagration",   theme: "robes channeling the supreme fire power of Lord Nagafen ancient dragon of flame" },
        },
        mythicalProc: { name: "Conflagration", description: "30% chance on spell critical hit to trigger a conflagration for 100% bonus fire damage", triggerChance: 30, effectType: "damage_burst", effectValue: 100, durationTicks: 1 },
      },
    },
  },
];

export const GEAR_SETS: GearSetDefinition[] = GEAR_SET_META.flatMap(({ dungeonId, archetypes }) =>
  (["fighter", "healer", "caster"] as GearSetArchetype[]).flatMap(archetype => {
    const archetypeData = archetypes[archetype];
    return (["normal", "expert", "legendary", "mythical"] as const).map(difficulty => {
      const meta = archetypeData.difficulties[difficulty];
      const proc = archetypeData.mythicalProc;
      const bonusFn = archetype === "fighter" ? fighterBonuses : archetype === "healer" ? healerBonuses : casterBonuses;
      return {
        id: `${dungeonId}_${difficulty}_${archetype}`,
        dungeonId,
        difficulty,
        archetype,
        setNameTemplate: meta.name,
        theme: meta.theme,
        pieces: PIECES_BY_DIFFICULTY[difficulty],
        bonuses: bonusFn(difficulty, proc),
      };
    });
  })
);

export function getGearSetById(id: string): GearSetDefinition | undefined {
  return GEAR_SETS.find(s => s.id === id);
}

export function getGearSetsForFloor(dungeonId: string, difficulty: DungeonDifficulty, floor: number, archetype: GearSetArchetype): GearSetPiece[] {
  const set = GEAR_SETS.find(s => s.dungeonId === dungeonId && s.difficulty === difficulty && s.archetype === archetype);
  if (!set) return [];
  return set.pieces.filter(p => p.dropFloor === floor);
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
