/**
 * Epic Weapon Quest Data
 *
 * One per class — EQ2-inspired epic weapon quest chains.
 * Each chain has 5 steps leading to the class's Fabled epic weapon,
 * which can then be upgraded to Mythical using raid materials.
 *
 * Real EQ2 epic 1.0 weapon names are used as inspiration.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EpicWeaponDef {
  classId: string;
  className: string;
  archetype: string;
  /** Item ID of the Fabled version (awarded on quest completion) */
  fablesItemId: string;
  /** Item ID of the Mythical upgrade */
  mythicalItemId: string;
  /** Short weapon lore / flavour text shown in the quest UI */
  weaponLore: string;
  /** Quest chain NPC name */
  questGiver: string;
  /** In-universe reason this class seeks their epic weapon */
  questHook: string;
}

export interface EpicQuestStep {
  step: number;
  title: string;
  description: string;
  lore: string;
}

// ─── Shared quest steps (same narrative structure for all classes) ─────────────

export const EPIC_QUEST_STEPS: EpicQuestStep[] = [
  {
    step: 1,
    title: "The Legend's Call",
    description: "Prove yourself a true champion of Norrath. Only those who have reached the pinnacle of mortal power — Level 70 — are deemed worthy to begin this legendary journey.",
    lore: "Across Norrath, ancient sages whisper of weapons forged in an age before memory. These artifacts, bound by oath and sacrifice, await champions of supreme power. The call has come to you.",
  },
  {
    step: 2,
    title: "Proof of Might",
    description: "Demonstrate your battle-hardened experience by defeating 200 powerful bosses across the dungeons and raids of Norrath.",
    lore: "The epic weapon chooses no weakling. Its spirit demands proof: blood spilled across countless battlefields, the corpses of the mightiest enemies, and a will unbroken by a hundred desperate fights.",
  },
  {
    step: 3,
    title: "The Dragon's Scale",
    description: "Slay Harla Dar, the Prismatic Dragon of the Tenebrous Tangle, and claim a Prismatic Dragon Scale from the depths of the Temple of Harla Dar.",
    lore: "The first component of the ritual — a scale from Harla Dar, the most ancient prismatic dragon — must be obtained from her shattered form. The scale pulses with elemental energy that will infuse your weapon with prismatic power.",
  },
  {
    step: 4,
    title: "The Plague Dragon's Spine",
    description: "Journey into the depths of Sebilis and slay Trakanon, the Plague Dragon. Claim a Plague Dragon's Spine from his pestilent corpse.",
    lore: "The second component — a spine from Trakanon, the most feared plague-dragon in all of Norrath — carries within it the corruption of a thousand battles. This vile essence will sharpen your weapon's edge to supernatural keenness.",
  },
  {
    step: 5,
    title: "Blood of the Vampire Lord",
    description: "Descend into the Mistmoore Catacombs and destroy Mayong Mistmoore. Claim a Vampire Lord's Fang from the most ancient vampire in all of Norrath.",
    lore: "The final trial awaits in darkness. Mayong Mistmoore — vampire lord, would-be dark god — guards the last ingredient: his own ancient fang. Only by destroying this eternal being can you complete the ritual and awaken your epic weapon.",
  },
];

// ─── Upgrade quest ────────────────────────────────────────────────────────────

export const EPIC_UPGRADE_REQUIREMENTS = {
  prismatic_dragon_scale: 3,
  plague_dragon_spine: 3,
  vampire_lord_fang: 3,
};

// ─── Per-class epic weapon definitions ───────────────────────────────────────

export const EPIC_WEAPONS: EpicWeaponDef[] = [
  // ── FIGHTERS ────────────────────────────────────────────────────────────────
  {
    classId: "guardian",
    className: "Guardian",
    archetype: "Fighter",
    fablesItemId: "epic_guardian_fabled",
    mythicalItemId: "epic_guardian_mythical",
    weaponLore: "The Protector's Realm — a greatsword forged from the fallen shields of ten generations of Guardians. Its edge never dulls and its wielder never retreats.",
    questGiver: "Elder Paladin Morvak",
    questHook: "The ancient order of Guardians maintained a sacred weapon passed down across millennia. It was lost during the Rending of Norrath, its pieces scattered across the deadliest raids. Only the greatest Guardian can restore it.",
  },
  {
    classId: "berserker",
    className: "Berserker",
    archetype: "Fighter",
    fablesItemId: "epic_berserker_fabled",
    mythicalItemId: "epic_berserker_mythical",
    weaponLore: "Soulcrusher — an axe that drinks the essence of the fallen, growing stronger with each kill. It was forged from the shattered bones of the first true Berserker.",
    questGiver: "War-Master Thren Ironmaw",
    questHook: "The spirit of the first Berserker, Kraytoc himself, speaks to those worthy enough to hear. He demands a weapon of legend be reforged in blood and fury before his line can claim dominion over the battlefields of Norrath.",
  },
  {
    classId: "paladin",
    className: "Paladin",
    archetype: "Fighter",
    fablesItemId: "epic_paladin_fabled",
    mythicalItemId: "epic_paladin_mythical",
    weaponLore: "Soulfire — the legendary holy blade, first wielded by the High Priest of Mithaniel Marr in the Age of War. Its flame burns only evil, never wavering in the hand of the truly righteous.",
    questGiver: "High Priest Aldavar of Mithaniel",
    questHook: "Mithaniel Marr himself has sent a vision: the holy blade Soulfire was shattered in the war against the gods and must be reforged from components scattered across Norrath's darkest raids. The worthy Paladin must undertake this sacred quest.",
  },
  {
    classId: "shadowknight",
    className: "Shadowknight",
    archetype: "Fighter",
    fablesItemId: "epic_shadowknight_fabled",
    mythicalItemId: "epic_shadowknight_mythical",
    weaponLore: "Lifebane — a blade of shadow-steel that drains the life force of any it strikes, feeding the power of its wielder. It has toppled kings and brought nations to their knees.",
    questGiver: "Dark Emissary Xethrix",
    questHook: "The dark gods demand a blood-covenant: a legendary weapon forged in shadow and death, tempered in the essence of the greatest predators. Innoruuk himself has promised his truest champion this weapon — if they are strong enough to claim it.",
  },
  {
    classId: "monk",
    className: "Monk",
    archetype: "Fighter",
    fablesItemId: "epic_monk_fabled",
    mythicalItemId: "epic_monk_mythical",
    weaponLore: "Ashenhand — fist weapons of hardened iron, their knuckles carved from the bones of celestial beings. Each strike channels the sum of a hundred thousand hours of perfect discipline.",
    questGiver: "Grand Master Shan of the Iron Fist",
    questHook: "The Grand Master has spoken: true enlightenment cannot be achieved without facing the greatest evils. The components for the legendary Ashenhand knuckles are scattered among Norrath's most powerful raid bosses. Seek them. Return victorious. Or do not return at all.",
  },
  {
    classId: "bruiser",
    className: "Bruiser",
    archetype: "Fighter",
    fablesItemId: "epic_bruiser_fabled",
    mythicalItemId: "epic_bruiser_mythical",
    weaponLore: "Kraytoc's Fist of Iceflame — cestus gauntlets crackling with both fire and frost, forged by the legendary Bruiser Kraytoc in his final battle against a god of war.",
    questGiver: "Veteran Brawler Griznak",
    questHook: "Old Griznak has heard the call from Kraytoc's ghost: the legendary gauntlets must be reclaimed. Three raid bosses carry the components. Take them. Forge the weapon. Prove you are Kraytoc's worthy heir.",
  },
  // ── SCOUTS ───────────────────────────────────────────────────────────────────
  {
    classId: "ranger",
    className: "Ranger",
    archetype: "Scout",
    fablesItemId: "epic_ranger_fabled",
    mythicalItemId: "epic_ranger_mythical",
    weaponLore: "Windtalker — a longbow carved from the heartwood of the oldest Faydark tree. Its arrows fly on the wind itself, striking targets as if guided by the forest's ancient will.",
    questGiver: "Sylvan Elder Taelis",
    questHook: "The ancient forest spirit has chosen you: Windtalker, the bow of the First Ranger, must be reclaimed from the forces of darkness. Its components were scattered when the Faydark was wounded. Restore the bow; restore the forest's guardian.",
  },
  {
    classId: "assassin",
    className: "Assassin",
    archetype: "Scout",
    fablesItemId: "epic_assassin_fabled",
    mythicalItemId: "epic_assassin_mythical",
    weaponLore: "Banisher — twin daggers of shadow-glass, each inscribed with the name of a target that can never escape once marked. The Black Rose Consortium forged them as a gift to death itself.",
    questGiver: "Shadow Broker Nil",
    questHook: "The Black Rose Consortium holds your contract: retrieve three components from Norrath's deadliest bosses, and Banisher — the legendary daggers of the supreme assassin — will be yours. Fail, and become another name inscribed on someone else's blades.",
  },
  {
    classId: "swashbuckler",
    className: "Swashbuckler",
    archetype: "Scout",
    fablesItemId: "epic_swashbuckler_fabled",
    mythicalItemId: "epic_swashbuckler_mythical",
    weaponLore: "Swashbuckler's Rapier of the Seven Seas — a rapier of sea-blue steel that moves like a tidal wave, impossible to parry and quicker than thought. Legends say its former owner won a duel against the god of the ocean.",
    questGiver: "Captain Valdara Silvertide",
    questHook: "The legendary pirate-captain Valdara has set a final challenge: retrieve the components of the greatest blade ever to cross the Seven Seas. The Rapier awaits the boldest Swashbuckler who dares enter the raids of Norrath.",
  },
  {
    classId: "brigand",
    className: "Brigand",
    archetype: "Scout",
    fablesItemId: "epic_brigand_fabled",
    mythicalItemId: "epic_brigand_mythical",
    weaponLore: "Slanderous Tongue of the Tribunals — a pair of razor-edged blades once used by the most feared brigand in the Tribunal's employ. They cut through armor and reputation with equal ease.",
    questGiver: "Underworld Fixer Zex",
    questHook: "The Tribunal wants the legendary blades back in the hands of someone worthy. Three raid bosses hold the pieces. Steal them, bribe your way, kill your way — however you get there, the Slanderous Tongue awaits the cleverest Brigand alive.",
  },
  {
    classId: "troubador",
    className: "Troubador",
    archetype: "Scout",
    fablesItemId: "epic_troubador_fabled",
    mythicalItemId: "epic_troubador_mythical",
    weaponLore: "Mystical Lute of the Endless Melody — a lute carved from starwood that plays a melody remembered from before the Age of War. Its song can inspire armies, silence gods, and make the dead weep.",
    questGiver: "Songmaster Elindra Fairweave",
    questHook: "The melody of the ages has been silenced. Norrath's greatest Troubador must reclaim the components of the legendary Endless Melody Lute from the darkest corners of the world and restore music to the hearts of Norrath's champions.",
  },
  {
    classId: "dirge",
    className: "Dirge",
    archetype: "Scout",
    fablesItemId: "epic_dirge_fabled",
    mythicalItemId: "epic_dirge_mythical",
    weaponLore: "Lute of the Howling Caress — an instrument of mourning and terror, its strings woven from the hair of a thousand fallen heroes. The sound it makes drives enemies mad with grief.",
    questGiver: "Death-Singer Morven",
    questHook: "The spirits of the dead demand a song of remembrance. Only by facing the greatest raid bosses in Norrath — and claiming their essence — can the Lute of the Howling Caress be reconstructed and the fallen appeased.",
  },
  // ── MAGES ────────────────────────────────────────────────────────────────────
  {
    classId: "wizard",
    className: "Wizard",
    archetype: "Mage",
    fablesItemId: "epic_wizard_fabled",
    mythicalItemId: "epic_wizard_mythical",
    weaponLore: "Cane of Transvection — a rod of impossibly dense arcane crystal. It bends the laws of physics with each incantation, allowing spells to be cast faster, farther, and more devastatingly than should be possible.",
    questGiver: "Arch-Mage Serathis of the Arcane Order",
    questHook: "The Arcane Order records speak of Transvection — a staff that transcends the limits of arcane law. Destroyed in the wars of the gods, its shards were scattered to the most dangerous raids. Only a Wizard of supreme power can reassemble it.",
  },
  {
    classId: "warlock",
    className: "Warlock",
    archetype: "Mage",
    fablesItemId: "epic_warlock_fabled",
    mythicalItemId: "epic_warlock_mythical",
    weaponLore: "Abashi's Rod of Disempowerment — the former rod of the Warlock-God Abashi, capable of stripping power from any being. It was shattered when its wielder fought the gods and was forged anew in darkness.",
    questGiver: "Dark Covenant Envoy Relax",
    questHook: "Abashi's broken rod has called out to the worthy. The Dark Covenant has tracked its shards to three of Norrath's mightiest raid bosses. Retrieve them. Reassemble the Rod. Claim the power of a Warlock-God.",
  },
  {
    classId: "conjuror",
    className: "Conjuror",
    archetype: "Mage",
    fablesItemId: "epic_conjuror_fabled",
    mythicalItemId: "epic_conjuror_mythical",
    weaponLore: "Staff of Crystalline Storms — a staff topped with a living storm-crystal that allows the Conjuror to summon elemental servants of unprecedented power and fury.",
    questGiver: "Elementalist Savior Orindax",
    questHook: "The elemental planes have sent a message: only a Conjuror who has proven mastery over the greatest evils may claim the Storm Crystal Staff. Its components rest in the hands of Norrath's most powerful bosses.",
  },
  {
    classId: "necromancer",
    className: "Necromancer",
    archetype: "Mage",
    fablesItemId: "epic_necromancer_fabled",
    mythicalItemId: "epic_necromancer_mythical",
    weaponLore: "Staff of the Lich Lord — a staff carved from the spine of a lich-king, topped with a skull that whispers the names of the dead. Its wielder commands undead armies of terrifying scale.",
    questGiver: "Grave-Sage Uldrix",
    questHook: "The Lords of Death have spoken: the Staff of the Lich Lord was claimed by Norrath's greatest raid bosses when the last Lich-King fell. The time has come for it to be returned to a worthy Necromancer.",
  },
  {
    classId: "coercer",
    className: "Coercer",
    archetype: "Mage",
    fablesItemId: "epic_coercer_fabled",
    mythicalItemId: "epic_coercer_mythical",
    weaponLore: "Scepter of the Hive — a scepter that connects the wielder's mind to every consciousness within miles. Originally created by a Coercer who sought to become the mind of an entire world.",
    questGiver: "Mind-Weaver Thessix",
    questHook: "The Hive-Mind stirs. The Scepter's components have been absorbed by three of Norrath's most powerful entities. The Coercer must reclaim them — and in doing so, prove they are the supreme mind in all of Norrath.",
  },
  {
    classId: "illusionist",
    className: "Illusionist",
    archetype: "Mage",
    fablesItemId: "epic_illusionist_fabled",
    mythicalItemId: "epic_illusionist_mythical",
    weaponLore: "Staff of the Observers — a staff that exists in multiple dimensions simultaneously. Looking into its crystal reveals the true form of all things — and lets the Illusionist reshape them at will.",
    questGiver: "Dream-Walker Aelindra",
    questHook: "The Observers — beings of pure thought from beyond the veil — have chosen an Illusionist to carry their instrument of perception. The Staff's components are guarded by beings of immense power. Face them; convince them, trick them, destroy them — claim the Staff.",
  },
  // ── PRIESTS ──────────────────────────────────────────────────────────────────
  {
    classId: "templar",
    className: "Templar",
    archetype: "Priest",
    fablesItemId: "epic_templar_fabled",
    mythicalItemId: "epic_templar_mythical",
    weaponLore: "Wand of the Soulfire — a divine scepter crafted by Rodcet Nife himself. Its light heals all wounds and burns all evil. It has not been seen since the last Templar who wielded it sacrificed themselves to hold back an invasion of the underworld.",
    questGiver: "High Templar Arindaex",
    questHook: "Rodcet Nife has sent a vision: the Wand of the Soulfire must be restored. Its divine fragments were absorbed by the most powerful evil entities in Norrath during the wars of the gods. The worthy Templar must reclaim them.",
  },
  {
    classId: "inquisitor",
    className: "Inquisitor",
    archetype: "Priest",
    fablesItemId: "epic_inquisitor_fabled",
    mythicalItemId: "epic_inquisitor_mythical",
    weaponLore: "Instrument of Nife — a sacred flail whose chains were forged from the tears of heretics. The Inquisition's supreme tool of judgment — it burns brightest in the presence of evil.",
    questGiver: "Grand Inquisitor Malveth",
    questHook: "The Inquisition has judged and found wanting: three of Norrath's greatest evil beings have desecrated the sacred instrument. The Instrument of Nife must be restored by a champion of justice willing to wade into the darkest raids.",
  },
  {
    classId: "mystic",
    className: "Mystic",
    archetype: "Priest",
    fablesItemId: "epic_mystic_fabled",
    mythicalItemId: "epic_mystic_mythical",
    weaponLore: "Hierophant's Crook — the staff of the Highest Mystic, used to speak directly with the spirits of the ancient world. Its silver tip channels the accumulated wisdom of ten thousand spirit voices.",
    questGiver: "Elder Spirit-Walker Zhovaan",
    questHook: "The ancient spirits are restless. The Hierophant's Crook was shattered and its pieces absorbed into the bodies of Norrath's greatest evil beings. The spirits demand a Mystic retrieve each fragment from the clutches of these powerful enemies.",
  },
  {
    classId: "defiler",
    className: "Defiler",
    archetype: "Priest",
    fablesItemId: "epic_defiler_fabled",
    mythicalItemId: "epic_defiler_mythical",
    weaponLore: "Pact of the Shadow Serpent — a totem bound by an ancient dark covenant, channeling the power of shadow serpents who have guarded the Defiler's dark secrets since the world was young.",
    questGiver: "Shadow Covenant Shamaness Vrrix",
    questHook: "The Shadow Serpent has spoken: the Pact must be renewed. Three raid bosses absorbed the binding stones of the covenant. A Defiler of supreme will must retrieve each stone and reforge the eternal Pact.",
  },
  {
    classId: "warden",
    className: "Warden",
    archetype: "Priest",
    fablesItemId: "epic_warden_fabled",
    mythicalItemId: "epic_warden_mythical",
    weaponLore: "Staff of the Zephyr — a living branch from the World Tree, tipped with the feather of the last great zephyr-bird. It carries the breath of the forest itself, healing those near it with every swing.",
    questGiver: "Grove Keeper Sylindra",
    questHook: "The World Tree weeps. The Zephyr Staff was sundered when a dark force attacked the ancient grove. Its fragments were taken by three of Norrath's most destructive forces. The Warden who restores it will become the guardian of the world itself.",
  },
  {
    classId: "fury",
    className: "Fury",
    archetype: "Priest",
    fablesItemId: "epic_fury_fabled",
    mythicalItemId: "epic_fury_mythical",
    weaponLore: "Scimitar of the Emerald Rains — a curved blade of living emerald, its edge honed by a thousand storm-seasons. The Fury who wields it commands the weather itself and their spells become elemental forces of nature.",
    questGiver: "Storm-Caller Aranthos",
    questHook: "The emerald storms have spoken: the Scimitar was torn from the hands of the last great Storm-Fury by Norrath's most powerful raid bosses. Retrieve the fragments. Reforge the blade. Become the eye of the storm.",
  },
];

/** Look up an epic weapon definition by class ID. */
export function getEpicWeaponByClass(classId: string): EpicWeaponDef | undefined {
  return EPIC_WEAPONS.find(w => w.classId === classId.toLowerCase());
}

/** Look up an epic weapon definition by item ID (fabled or mythical). */
export function getEpicWeaponByItemId(itemId: string): EpicWeaponDef | undefined {
  return EPIC_WEAPONS.find(
    w => w.fablesItemId === itemId || w.mythicalItemId === itemId,
  );
}
