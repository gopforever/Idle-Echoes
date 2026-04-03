/**
 * Character Portrait Routes
 * AI-generated painterly portrait cached by race+class+armorTier in lore_cache.
 * The armor tier is derived from *actually equipped* gear (not the class default),
 * so the portrait updates when a player switches between cloth/leather/chain/plate armor.
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { loreCacheTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { getOrCreateCharacter } from "./character.js";
import { CLASSES } from "../lib/eq2Data.js";
import { getItemById } from "../lib/gameData.js";

const router: IRouter = Router();

// Armor tier → portrait keyword
const ARMOR_TIER_LABEL: Record<string, string> = {
  plate:   "full plate armor, heavily armored warrior",
  chain:   "chain mail hauberk, medium-armored adventurer",
  leather: "leather armor, scout's light gear",
  cloth:   "flowing mage robes, cloth caster",
};

// Race → visual description
const RACE_VISUALS: Record<string, string> = {
  human:         "human adventurer with determined expression",
  high_elf:      "tall elegant high elf with silver hair and pointed ears",
  dark_elf:      "dark elf with violet skin, white hair and glowing red eyes",
  dwarf:         "stocky red-bearded dwarf with weathered skin",
  halfling:      "cheerful halfling with curly hair and bright eyes",
  gnome:         "clever gnome with tinkered goggles and mechanical accessories",
  barbarian:     "towering barbarian human with tribal tattoos and fierce expression",
  erudite:       "tall pale erudite scholar with high forehead and arcane markings",
  wood_elf:      "lithe wood elf with leaf-braided hair and nature motifs",
  half_elf:      "half-elf with slightly pointed ears and mixed heritage features",
  froglok:       "green frog-like froglok knight with noble bearing",
  iksar:         "reptilian iksar with iridescent scales and amber eyes",
  kerra:         "leonine kerra with tawny fur and feline features",
  ratonga:       "nimble ratonga rogue with sleek dark fur and bright clever eyes",
  sarnak:        "dragonkin sarnak with red scales and horned head",
  troll:         "massive greenish troll berserker with jutting tusks",
  ogre:          "hulking grey-skinned ogre warrior with brutal strength",
  arasai:        "diminutive winged dark faerie with mischievous expression",
  fae:           "delicate glowing faerie with butterfly wings and luminous skin",
  vampire:       "pale vampire noble in dark finery with burning eyes",
};

// Class archetype → pose/weapon hint
const CLASS_POSE: Record<string, string> = {
  Fighter:  "wielding a sword and shield in a battle-ready stance",
  Scout:    "holding a shortbow with arrows at the ready, crouched",
  Mage:     "hands glowing with arcane energy, mystic sigils swirling",
  Priest:   "hands raised in divine light, holy symbol visible",
};

// Armor slots we inspect to determine what the player is actually wearing
const ARMOR_SLOTS = ["chest", "shoulder", "head", "hands", "legs", "feet", "back"] as const;

// Explicit keyword → tier mappings so heavy metals like "iron", "steel", "mithril"
// reliably resolve to "plate" even when the token doesn't literally say "plate".
const TOKEN_TO_TIER: Record<string, "plate" | "chain" | "leather" | "cloth"> = {
  // Direct tier keywords
  plate:   "plate",
  chain:   "chain",
  leather: "leather",
  cloth:   "cloth",
  // Heavy metals / materials → plate
  iron:    "plate",
  steel:   "plate",
  mithril: "plate",
  dark:    "plate",   // "dark plate" / "darkened steel" items
  imbued:  "plate",
  // Medium metals → chain
  bronze:  "chain",
  copper:  "chain",
  ring:    "chain",   // "ring mail" style items
  scale:   "chain",
  // Light materials → leather
  hide:    "leather",
  pelt:    "leather",
  wolf:    "leather",
  crab:    "leather",
  gnoll:   "leather",
  bone:    "leather",
  shadow:  "leather", // shadow-leather scout gear
  // Cloth casters
  robe:    "cloth",
  linen:   "cloth",
  silk:    "cloth",
  arcane:  "cloth",
  woven:   "cloth",
};

/**
 * Detects armor tier from equipped gear item IDs.
 * Checks ARMOR_SLOTS in priority order; returns the tier of the first matching item.
 * Uses an explicit keyword → tier mapping so "iron"/"steel"/"mithril" reliably
 * resolve to "plate" even if they lack a literal "plate" token.
 * Falls back to the class-default armorType when no armor is equipped.
 */
function detectArmorTierFromGear(
  gear: Record<string, string>,
  classDefault: "plate" | "chain" | "leather" | "cloth",
): "plate" | "chain" | "leather" | "cloth" {
  for (const slot of ARMOR_SLOTS) {
    const itemId = gear[slot];
    if (!itemId) continue;

    const item = getItemById(itemId);
    if (!item) continue;

    // Tokenise both the spriteId and the raw item id, prefer spriteId tokens first
    const tokenSources = [item.spriteId, itemId];
    for (const src of tokenSources) {
      for (const token of src.toLowerCase().split(/[_\s-]+/)) {
        const tier = TOKEN_TO_TIER[token];
        if (tier) return tier;
      }
    }
  }

  return classDefault;
}

// ─── GET /character/portrait ──────────────────────────────────────────────────
router.get("/character/portrait", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const classDef = CLASSES.find(c => c.id.toLowerCase() === character.class.toLowerCase()) ??
                     CLASSES.find(c => c.name.toLowerCase() === character.class.toLowerCase());

    const classDefault = (classDef?.armorType ?? "leather") as "plate" | "chain" | "leather" | "cloth";
    const archetype = classDef?.archetype ?? "Fighter";
    const gear = (character.gear ?? {}) as Record<string, string>;

    // ← key difference: derive tier from EQUIPPED items, not class default
    const armorType = detectArmorTierFromGear(gear, classDefault);

    const cacheKey = `portrait_${character.race}_${character.class}_${armorType}_v3`
      .toLowerCase().replace(/\s+/g, "_");

    // Check DB cache
    const [cached] = await db.select().from(loreCacheTable)
      .where(eq(loreCacheTable.cacheKey, cacheKey)).limit(1);

    if (cached) {
      res.json({ portrait: cached.content, cached: true, cacheKey, armorType });
      return;
    }

    // Build a rich painterly portrait prompt
    const raceDesc  = RACE_VISUALS[character.race] ?? `${character.race} adventurer`;
    const armorDesc = ARMOR_TIER_LABEL[armorType] ?? "adventurer's gear";
    const poseDesc  = CLASS_POSE[archetype] ?? "in an adventuring pose";

    const prompt = [
      `A ${raceDesc}`,
      `wearing ${armorDesc}`,
      `${poseDesc}`,
      `EverQuest 2 painterly illustrated character portrait style`,
      `rich colors, dramatic fantasy lighting, detailed face and armor`,
      `heroic composition, shallow depth of field, dark atmospheric background`,
      `high quality fantasy RPG portrait painting, no text, no UI`,
      character.alignment === "Freeport" ? "slightly menacing dark tone" :
      character.alignment === "Qeynos"   ? "noble heroic light tone" : "neutral adventurer tone",
    ].join(", ");

    // Generate portrait image
    const imageBuffer = await generateImageBuffer(prompt, "1024x1024");
    const b64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    // Persist to DB cache
    await db.insert(loreCacheTable)
      .values({ cacheKey, content: b64 })
      .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: b64 } });

    res.json({ portrait: b64, cached: false, cacheKey, armorType });
  } catch (err) {
    req.log.error({ err }, "Error generating character portrait");
    res.status(500).json({ error: "Failed to generate portrait" });
  }
});

// ─── POST /character/portrait/refresh ─────────────────────────────────────────
// Busts the cache for the current equipped-armor-tier portrait and re-generates
router.post("/character/portrait/refresh", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const classDef = CLASSES.find(c => c.id.toLowerCase() === character.class.toLowerCase()) ??
                     CLASSES.find(c => c.name.toLowerCase() === character.class.toLowerCase());

    const classDefault = (classDef?.armorType ?? "leather") as "plate" | "chain" | "leather" | "cloth";
    const gear = (character.gear ?? {}) as Record<string, string>;
    const armorType = detectArmorTierFromGear(gear, classDefault);

    const cacheKey = `portrait_${character.race}_${character.class}_${armorType}_v3`
      .toLowerCase().replace(/\s+/g, "_");

    await db.delete(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey));

    res.json({ success: true, armorType, message: `Portrait cache cleared (${armorType} tier). Fetch /api/character/portrait to regenerate.` });
  } catch (err) {
    req.log.error({ err }, "Error refreshing portrait");
    res.status(500).json({ error: "Failed to refresh portrait" });
  }
});

export default router;
