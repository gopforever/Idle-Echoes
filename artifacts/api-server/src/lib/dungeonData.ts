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

  // ── STORMHOLD (Levels 5-15, Antonica) ───────────────────────────────────
  {
    id: "stormhold",
    name: "Stormhold",
    zone: "Antonica",
    description: "The ancient gnoll fortress carved into Antonica's cliffs — five floors of warriors, shamans, and the fearsome Chieftain Grolnak.",
    lore: "Stormhold predates the city of Qeynos itself. The gnoll clans have held this crumbling fortress for generations, using it as a staging ground for raids across Antonica. Its five floors descend from the outer ramparts down to the Chieftain's war chamber, where Grolnak commands with absolute brutality. Young adventurers who survive Stormhold emerge hardened and ready for greater challenges.",
    minLevel: 5,
    maxLevel: 15,
    mainBossId: "antonica_gnoll_chieftain",
    spriteId: "dungeon_ruins",
    bossPersonality: "arrogant",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Outer Ramparts",
        description: "The crumbling outer walls — patrolled by scouts and their wolf companions.",
        enemyIds: ["antonica_gnoll_scout", "antonica_wolf", "antonica_gnoll_scout", "antonica_wolf", "antonica_gnoll_scout"],
        miniBossId: "antonica_skeleton",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Gatehouse Tunnels",
        description: "Narrow passages beneath the gatehouse — the dead walk here too.",
        enemyIds: ["antonica_gnoll_scout", "antonica_wolf", "antonica_skeleton", "antonica_gnoll_scout", "antonica_skeleton"],
        miniBossId: "antonica_gnoll_warrior",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Warrior Barracks",
        description: "Where Stormhold's seasoned warriors rest and sharpen their blades.",
        enemyIds: ["antonica_skeleton", "antonica_gnoll_warrior", "antonica_skeleton", "antonica_gnoll_warrior", "antonica_gnoll_warrior"],
        miniBossId: "antonica_orc_raider",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Raider Encampment",
        description: "A filthy encampment of orc raiders allied with the gnoll clan.",
        enemyIds: ["antonica_gnoll_warrior", "antonica_orc_raider", "antonica_orc_raider", "antonica_gnoll_warrior", "antonica_orc_raider"],
        miniBossId: "antonica_gnoll_shaman",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Chieftain's War Chamber",
        description: "The deep heart of Stormhold — where Grolnak rules from his throne of bones.",
        enemyIds: ["antonica_orc_raider", "antonica_gnoll_shaman", "antonica_gnoll_shaman", "antonica_orc_raider", "antonica_gnoll_shaman"],
        miniBossId: "antonica_skeleton",
        normalsRequired: 5,
      },
    ],
  },

  // ── PALACE OF QUEEN TITANIA (Levels 25-35, Enchanted Lands) ─────────────
  {
    id: "palace_of_titania",
    name: "Palace of Queen Titania",
    zone: "Enchanted Lands",
    description: "The corrupted fae palace hidden deep in the Enchanted Lands — five floors of twisted fairy magic leading to the mad queen herself.",
    lore: "Queen Titania once ruled the Enchanted Lands with whimsy and grace. Something ancient and dark corrupted her court, twisting her sprites and satyrs into vicious predators. Her palace — once a wonder of fae architecture — has become a labyrinth of deadly illusions and arcane traps. Those who reach the Throne of Petals face Titania herself, a being of terrible beauty wielding magic that unravels the mind.",
    minLevel: 25,
    maxLevel: 35,
    mainBossId: "enchanted_queen_titania",
    spriteId: "dungeon_ruins",
    bossPersonality: "arrogant",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Enchanted Gates",
        description: "The gilded outer gates of the palace — mischievous pixies harry all who enter.",
        enemyIds: ["enchanted_pixie", "enchanted_brownie", "enchanted_pixie", "enchanted_brownie", "enchanted_pixie"],
        miniBossId: "enchanted_satyr",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Brownie Warrens",
        description: "Cramped tunnels dug beneath the palace by Titania's brownie servants.",
        enemyIds: ["enchanted_brownie", "enchanted_satyr", "enchanted_brownie", "enchanted_satyr", "enchanted_brownie"],
        miniBossId: "enchanted_dryad",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Hall of Illusions",
        description: "A grand hall filled with mirror-magic — satyrs and pixies hunt through false reflections.",
        enemyIds: ["enchanted_satyr", "enchanted_pixie", "enchanted_satyr", "enchanted_pixie", "enchanted_satyr"],
        miniBossId: "enchanted_sylph",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Corrupted Gardens",
        description: "Once beautiful gardens — now dryads and wind sylphs attack on sight.",
        enemyIds: ["enchanted_dryad", "enchanted_sylph", "enchanted_dryad", "enchanted_sylph", "enchanted_dryad"],
        miniBossId: "enchanted_satyr",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Throne of Petals",
        description: "Titania's inner sanctum — a throne room of dead flowers and shattered mirrors.",
        enemyIds: ["enchanted_dryad", "enchanted_sylph", "enchanted_sylph", "enchanted_dryad", "enchanted_sylph"],
        miniBossId: "enchanted_brownie",
        normalsRequired: 5,
      },
    ],
  },

  // ── DEATHFIST CITADEL (Levels 30-40, Zek, the Orcish Wastes) ────────────
  {
    id: "deathfist_citadel",
    name: "Deathfist Citadel",
    zone: "Zek, the Orcish Wastes",
    description: "The iron fortress of the Deathfist orc clan — five floors of savage warriors and ruthless shamans, commanded by the death-priest Deathcaller.",
    lore: "The Deathfist Clan built their Citadel on the bones of their enemies in the heart of the Orcish Wastes. Five floors of iron-reinforced stone house the most battle-hardened orcs in Norrath — grunts, berserkers, warlords, and the war-shamans who bind them together with dark earth magic. The Deathcaller at the top channels the power of death itself, making him perhaps the most dangerous non-dragon boss in all of Zek.",
    minLevel: 30,
    maxLevel: 40,
    mainBossId: "zek_deathcaller",
    spriteId: "dungeon_blackburrow",
    bossPersonality: "cold",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Outer Palisade",
        description: "The fortified outer walls patrolled by Deathfist grunts and war shamans.",
        enemyIds: ["zek_orc_grunt", "zek_war_shaman", "zek_orc_grunt", "zek_war_shaman", "zek_orc_grunt"],
        miniBossId: "zek_orc_shaman",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Barracks",
        description: "Row upon row of orc barracks — grunts and shamans training for endless war.",
        enemyIds: ["zek_orc_grunt", "zek_orc_shaman", "zek_orc_grunt", "zek_orc_shaman", "zek_orc_grunt"],
        miniBossId: "zek_war_shaman",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Shaman Sanctum",
        description: "Where Deathfist war-shamans commune with dark earth spirits.",
        enemyIds: ["zek_orc_shaman", "zek_war_shaman", "zek_orc_shaman", "zek_war_shaman", "zek_orc_shaman"],
        miniBossId: "zek_orc_berserker",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Elite War Hall",
        description: "The domain of Deathfist berserkers and warlords — the finest orc fighters alive.",
        enemyIds: ["zek_orc_berserker", "zek_orc_warlord", "zek_orc_berserker", "zek_orc_warlord", "zek_orc_berserker"],
        miniBossId: "zek_siege_engineer",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Deathcaller's Throne",
        description: "The iron throne room of the Deathcaller — a chamber reeking of death magic.",
        enemyIds: ["zek_orc_warlord", "zek_orc_berserker", "zek_orc_warlord", "zek_orc_berserker", "zek_orc_warlord"],
        miniBossId: "zek_war_shaman",
        normalsRequired: 5,
      },
    ],
  },

  // ── THORNWOOD KEEP (Levels 35-45, Lesser Faydark) ───────────────────────
  {
    id: "thornwood_keep",
    name: "Thornwood Keep",
    zone: "Lesser Faydark",
    description: "The tangled fortress of Lord Grimthorn in the heart of the Lesser Faydark — five floors of nature-corrupted creatures guarding the dryad king.",
    lore: "Long ago, Thornwood Keep was a sanctuary of natural harmony in the Lesser Faydark. Lord Grimthorn — once a benevolent spirit lord — was twisted by ancient dark magic seeping up from Norrath's roots. Now his Keep is a labyrinth of corrupted treants, shadow wolves, and feral sprites. The ancient power Grimthorn draws upon makes him one of the most regenerative bosses in the Faydark — killing him requires relentless focus.",
    minLevel: 35,
    maxLevel: 45,
    mainBossId: "faydark_lord_grimthorn",
    spriteId: "dungeon_ruins",
    bossPersonality: "ancient",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Overgrown Approach",
        description: "Tangled undergrowth patrolled by pixie scouts and shadow wolves.",
        enemyIds: ["faydark_pixie_scout", "faydark_shadow_wolf", "faydark_pixie_scout", "faydark_shadow_wolf", "faydark_pixie_scout"],
        miniBossId: "faydark_imp",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Treant Grove",
        description: "Ancient treants have taken root in the Keep's lower halls.",
        enemyIds: ["faydark_treant", "faydark_pixie_scout", "faydark_treant", "faydark_pixie_scout", "faydark_treant"],
        miniBossId: "faydark_wolf_alpha",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Imp Warrens",
        description: "Passages infested with dark sprites and imps drawn to Grimthorn's power.",
        enemyIds: ["faydark_imp", "faydark_sprite", "faydark_imp", "faydark_sprite", "faydark_imp"],
        miniBossId: "faydark_shadow_wolf",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Wolf Dens",
        description: "The inner dens of the Faydark alpha wolves — massive and battle-hardened.",
        enemyIds: ["faydark_wolf_alpha", "faydark_shadow_wolf", "faydark_wolf_alpha", "faydark_shadow_wolf", "faydark_wolf_alpha"],
        miniBossId: "faydark_treant",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "Grimthorn's Heartchamber",
        description: "The deep root chamber where Lord Grimthorn draws his immortal strength.",
        enemyIds: ["faydark_treant", "faydark_sprite", "faydark_treant", "faydark_sprite", "faydark_treant"],
        miniBossId: "faydark_wolf_alpha",
        normalsRequired: 5,
      },
    ],
  },

  // ── TEMPLE OF CAZIC-THULE (Levels 45-55, Feerrott) ──────────────────────
  {
    id: "temple_of_cazic_thule",
    name: "Temple of Cazic-Thule",
    zone: "Feerrott",
    description: "The most feared dungeon in the Feerrott — a temple of divine terror leading to an Avatar of the God of Fear himself.",
    lore: "Deep in the festering swamps of the Feerrott stands the Temple of Cazic-Thule, carved from fear-stone by lizardman cultists thousands of years ago. Every floor is more terrifying than the last — lizardman shamans, swamp basilisks, bog giants, and Cazic's dark disciples guard the inner sanctum. At the temple's heart, the Avatar of Cazic-Thule awaits: a near-divine being of absolute terror that has never been convincingly defeated. Those who survive emerge forever changed.",
    minLevel: 45,
    maxLevel: 55,
    mainBossId: "feerrott_avatar_cazic",
    spriteId: "dungeon_ruins",
    bossPersonality: "cold",
    bossGrudgeThreshold: 3,
    floors: [
      {
        floorNumber: 1,
        name: "The Fear-Stone Gates",
        description: "The outer temple grounds — lizardman warriors guard every archway.",
        enemyIds: ["feerrott_lizardman", "feerrott_swamp_basilisk", "feerrott_lizardman", "feerrott_swamp_basilisk", "feerrott_lizardman"],
        miniBossId: "feerrott_swamp_spider",
        normalsRequired: 5,
      },
      {
        floorNumber: 2,
        name: "The Swamp Catacombs",
        description: "Flooded lower passages where the swamp spider queen holds court.",
        enemyIds: ["feerrott_lizardman", "feerrott_swamp_spider", "feerrott_lizardman", "feerrott_swamp_spider", "feerrott_lizardman"],
        miniBossId: "feerrott_swamp_basilisk",
        normalsRequired: 5,
      },
      {
        floorNumber: 3,
        name: "The Giant's Hall",
        description: "Soaring halls built for beings far larger than any adventurer.",
        enemyIds: ["feerrott_bog_giant", "feerrott_swamp_basilisk", "feerrott_bog_giant", "feerrott_swamp_basilisk", "feerrott_bog_giant"],
        miniBossId: "feerrott_lizard_shaman",
        normalsRequired: 5,
      },
      {
        floorNumber: 4,
        name: "The Shaman's Sanctum",
        description: "The inner ritual chambers where lizard-shamans and dark disciples commune.",
        enemyIds: ["feerrott_lizard_shaman", "feerrott_dark_disciple", "feerrott_lizard_shaman", "feerrott_dark_disciple", "feerrott_lizard_shaman"],
        miniBossId: "feerrott_bog_giant",
        normalsRequired: 5,
      },
      {
        floorNumber: 5,
        name: "The Sanctum of Fear",
        description: "The innermost sanctum — the Avatar of Cazic-Thule's domain of absolute terror.",
        enemyIds: ["feerrott_bog_giant", "feerrott_dark_disciple", "feerrott_lizard_shaman", "feerrott_dark_disciple", "feerrott_bog_giant"],
        miniBossId: "feerrott_swamp_basilisk",
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
    dungeonId: "stormhold",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Gnollskin Warrior's",      theme: "rough-hewn armor stripped from Stormhold's gnoll warriors, crude but battle-tested" },
          expert:    { name: "Rampart Warchief's",        theme: "armor worn by Stormhold's rampart warchiefs who never retreat and never surrender" },
          legendary: { name: "Chieftain's Iron Will",     theme: "the indomitable iron will of Gnoll Chieftain Grolnak forged into formidable battle armor" },
          mythical:  { name: "Grolnak's Dominion",        theme: "the supreme dominion of Chieftain Grolnak, the most feared gnoll warlord in Antonica" },
        },
        mythicalProc: { name: "Gnoll Warchief's Fury", description: "25% chance on hit to unleash a warchief's fury for +90% damage for 2 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 90, durationTicks: 2 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Bone Shaman's",         theme: "healing charms carved from gnoll bone by Stormhold's tribal shamans" },
          expert:    { name: "Hex-Shaman's Mantle",   theme: "mystical robes of Stormhold's hex-shamans who weave curses and healing in equal measure" },
          legendary: { name: "War-Totem's Calling",   theme: "sacred vestments blessed by the war-totems of Stormhold's innermost shamanic sanctum" },
          mythical:  { name: "Spirit of Grolnak",     theme: "shamanic regalia channeling the spiritual fury of Chieftain Grolnak into healing power" },
        },
        mythicalProc: { name: "Ancestral Ward", description: "20% chance on taking damage to raise an ancestral ward absorbing 45% max HP damage for 5 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 45, durationTicks: 5 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Hex-Rune Weaver's",      theme: "robes threaded with gnoll hex-runes from Stormhold's ritual chambers" },
          expert:    { name: "Dark Hex-Shaman's",      theme: "cursed robes of Stormhold's dark shamans who channel shadow magic through bone fetishes" },
          legendary: { name: "Warchief's Hexblade",    theme: "robes amplifying the terrible hexes of Stormhold's most powerful arcane practitioners" },
          mythical:  { name: "Grolnak's Hex Mastery",  theme: "the supreme dark hex-craft of Chieftain Grolnak translated into raw arcane dominion" },
        },
        mythicalProc: { name: "Dark Hex Explosion", description: "25% chance on spell hit to trigger a dark hex explosion for 80% bonus shadow damage", triggerChance: 25, effectType: "damage_burst", effectValue: 80, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "palace_of_titania",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Fae Court Guard's",       theme: "armor worn by Queen Titania's corrupted fae court guardians in the palace outer halls" },
          expert:    { name: "Pixie Knight's Raiment",  theme: "enchanted armor of the pixie knights who defend Titania's inner palace with fanatical devotion" },
          legendary: { name: "Titania's Champion",      theme: "the enchanted armor of Titania's chosen fae champion, infused with wild arcane magic" },
          mythical:  { name: "Queen's Arcane Dominion", theme: "the supreme fae war-power of Queen Titania herself, armor that pulses with raw chaos magic" },
        },
        mythicalProc: { name: "Fae Chaos Strike", description: "25% chance on hit to trigger a chaos burst for +95% bonus magic damage for 2 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 95, durationTicks: 2 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Fairy Court Silk",        theme: "silks worn by the fairy court healers who once tended to Titania's corrupted subjects" },
          expert:    { name: "Dryad Warden's Silk",     theme: "robes of the dryad wardens who channel Titania's corrupted nature magic into healing" },
          legendary: { name: "Titania's Chosen Silk",   theme: "sacred vestments chosen by Queen Titania for her most devoted healer courtiers" },
          mythical:  { name: "Queen's Eternal Embrace", theme: "robes channeling the immortal fae magic of Queen Titania into life-sustaining power" },
        },
        mythicalProc: { name: "Fae Deathward", description: "15% chance to negate a lethal blow — the fae magic refuses to let the wearer die", triggerChance: 15, effectType: "negate_death", effectValue: 1, durationTicks: 0 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Pixie Arcane Robes",      theme: "robes threaded with pixie magic from the outer halls of Titania's enchanted palace" },
          expert:    { name: "Satyr Enchanter's",       theme: "robes worn by the satyr enchanters who weave illusions throughout Titania's palace" },
          legendary: { name: "Palace Arcanum",          theme: "the accumulated arcane knowledge of Titania's palace mage council distilled into robes" },
          mythical:  { name: "Titania's Wild Arcanum",  theme: "the supreme wild magic of Queen Titania the fae queen whose power unravels reality" },
        },
        mythicalProc: { name: "Wild Fae Surge", description: "25% chance on spell hit to trigger a wild fae surge for 85% bonus magic damage", triggerChance: 25, effectType: "damage_burst", effectValue: 85, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "deathfist_citadel",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Deathfist Iron",           theme: "crude iron armor beaten into shape by Deathfist orc smiths in the citadel forges" },
          expert:    { name: "Warlord's Battle Plate",   theme: "battle-worn plate of the Deathfist warlords who command the citadel's elite fighting force" },
          legendary: { name: "Deathcaller's Iron Will",  theme: "armor forged from the Deathcaller's iron will — indestructible and terrifying in equal measure" },
          mythical:  { name: "Deathfist Sovereign",      theme: "the supreme iron dominion of the Deathfist Clan forged from the bones of their fallen enemies" },
        },
        mythicalProc: { name: "Death Frenzy", description: "30% chance on critical hit to trigger a death frenzy for +100% bonus damage for 2 ticks", triggerChance: 30, effectType: "damage_burst", effectValue: 100, durationTicks: 2 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Clan Shaman's",            theme: "vestments worn by Deathfist clan shamans who sustain the orc army through dark earth magic" },
          expert:    { name: "War-Priest's Mantle",      theme: "robes of the Deathfist war-priests who consecrate their warriors with orc death rites" },
          legendary: { name: "Deathcaller's Devoted",    theme: "sacred vestments of the Deathcaller's most devoted healer-priests in the citadel sanctum" },
          mythical:  { name: "Death Rite Vestments",     theme: "vestments channeling the death-rite power of the supreme Deathfist war-priest" },
        },
        mythicalProc: { name: "Death Rite Ward", description: "20% chance on being struck to raise a death-rite ward absorbing 50% max HP damage for 4 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 50, durationTicks: 4 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Earthen Rune Robes",       theme: "robes threaded with earthen runes by the Deathfist shamans who study dark earth magic" },
          expert:    { name: "Necrotic Shaman's",        theme: "robes of the Deathfist necrotic shamans who channel death energy in the citadel's sanctum" },
          legendary: { name: "Death-Caller's Arcanum",   theme: "the dark arcane power of the Deathcaller's inner sanctum woven into robes of war" },
          mythical:  { name: "Deathfist Necrotic Dominion", theme: "the supreme necrotic power of the Deathfist Clan's most feared death-caller" },
        },
        mythicalProc: { name: "Necrotic Death Burst", description: "25% chance on spell hit to trigger a necrotic death burst for 90% bonus divine damage", triggerChance: 25, effectType: "damage_burst", effectValue: 90, durationTicks: 1 },
      },
    },
  },
  {
    dungeonId: "thornwood_keep",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Bark-Plate Warden's",     theme: "armor plated with enchanted bark from the outermost treants of Thornwood Keep" },
          expert:    { name: "Forest Guardian's Plate", theme: "plate armor of the forest guardians who protect Lord Grimthorn's inner sanctum" },
          legendary: { name: "Grimthorn's Forest Will", theme: "the indestructible forest will of Lord Grimthorn made manifest as ancient bark-plate armor" },
          mythical:  { name: "Thornwood Sovereign",     theme: "the primordial sovereignty of the Thornwood's ancient spirit lord forged from heartwood and thorn" },
        },
        mythicalProc: { name: "Thornwood Rend", description: "25% chance on hit to trigger a thorn-rend for +85% bleed damage over 4 ticks", triggerChance: 25, effectType: "damage_burst", effectValue: 85, durationTicks: 4 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Dryad Spirit Silk",       theme: "silks woven from dryad spirit-threads found in Thornwood Keep's lower forest floors" },
          expert:    { name: "Grove Warden's Mantle",   theme: "vestments of the grove wardens who maintain Thornwood Keep's primal healing energies" },
          legendary: { name: "Grimthorn's Grove",       theme: "sacred vestments imbued with Lord Grimthorn's ancient primordial healing power" },
          mythical:  { name: "Primordial Grove Spirit", theme: "robes channeling the eternal primordial spirit of the Faydark's most ancient forest grove" },
        },
        mythicalProc: { name: "Primordial Ward", description: "20% chance on taking damage to raise a primordial ward absorbing 48% max HP for 5 ticks", triggerChance: 20, effectType: "absorb_shield", effectValue: 48, durationTicks: 5 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Faydark Spirit Robes",    theme: "robes threaded with faydark spirit-energy from the enchanted groves of Thornwood Keep" },
          expert:    { name: "Sprite Weaver's",         theme: "robes of the dark sprite weavers who channel corrupted fae magic in Lord Grimthorn's service" },
          legendary: { name: "Forest Arcanum",          theme: "the ancient forest arcane knowledge of Thornwood's corrupted sprite-mage council" },
          mythical:  { name: "Grimthorn's Wild Arcanum",theme: "the supreme wild forest magic of Lord Grimthorn the twisted spirit lord of the Lesser Faydark" },
        },
        mythicalProc: { name: "Nature's Wrath Burst", description: "25% chance on spell hit to trigger nature's wrath for 80% bonus magic damage", triggerChance: 25, effectType: "damage_burst", effectValue: 80, durationTicks: 1 },
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
  {
    dungeonId: "temple_of_cazic_thule",
    archetypes: {
      fighter: {
        difficulties: {
          normal:    { name: "Fear-Stone Warden's",     theme: "armor carved from the fear-stone of Cazic-Thule's outer temple by lizardman warrior priests" },
          expert:    { name: "Lizard Knight's Plate",   theme: "battle plate of the lizardman knights who guard Cazic's inner temple with fanatical devotion" },
          legendary: { name: "Avatar's Iron Resolve",   theme: "armor forged from the iron resolve of those who survived the Avatar of Cazic-Thule's terror" },
          mythical:  { name: "Cazic's Fear-Forged",     theme: "the supreme fear-forged plate of Cazic-Thule himself — armor that inspires dread in all who face it" },
        },
        mythicalProc: { name: "Touch of Terror", description: "30% chance on hit to trigger a touch of terror — deals +100% divine damage and fears the target for 1 tick", triggerChance: 30, effectType: "damage_burst", effectValue: 100, durationTicks: 1 },
      },
      healer: {
        difficulties: {
          normal:    { name: "Swamp Cult Vestments",    theme: "vestments of the Feerrott swamp cultists who worship Cazic and sustain his lizardman armies" },
          expert:    { name: "Dark Disciple's Mantle",  theme: "robes of Cazic's dark disciples who convert divine fear into restorative power" },
          legendary: { name: "Cazic's Devoted",         theme: "sacred vestments of Cazic-Thule's most devoted healer-priests in the temple sanctum" },
          mythical:  { name: "Avatar's Divine Terror",  theme: "vestments channeling Cazic's near-divine terror into life-sustaining power for his chosen" },
        },
        mythicalProc: { name: "Terror Ward", description: "15% chance to negate a lethal blow — Cazic's terror grants the wearer an impossible reprieve", triggerChance: 15, effectType: "negate_death", effectValue: 1, durationTicks: 0 },
      },
      caster: {
        difficulties: {
          normal:    { name: "Fear-Rune Robes",         theme: "robes threaded with fear-runes by lizardman shamans who study in Cazic's outer temple" },
          expert:    { name: "Swamp Shaman's Arcanum",  theme: "robes of the Feerrott swamp shamans who channel the god's terror into destructive magic" },
          legendary: { name: "Cazic's Arcane Terror",   theme: "the terrifying arcane knowledge of the Avatar's inner sanctum woven into robes of conquest" },
          mythical:  { name: "Avatar's Divine Arcanum", theme: "the supreme divine terror of the Avatar of Cazic-Thule distilled into near-godlike arcane robes" },
        },
        mythicalProc: { name: "Divine Terror Burst", description: "30% chance on spell critical hit to trigger divine terror for 100% bonus divine damage", triggerChance: 30, effectType: "damage_burst", effectValue: 100, durationTicks: 1 },
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
