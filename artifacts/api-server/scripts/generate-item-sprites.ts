/**
 * Sprite Generation Script — artifacts/api-server/scripts/generate-item-sprites.ts
 *
 * Deterministically iterates all unique item spriteIds from ITEMS (gameData.ts),
 * generates missing painterly PNG icons via OpenAI image generation, saves them
 * to artifacts/melvor-eq2/public/sprites/items/, and updates manifest.json.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx scripts/generate-item-sprites.ts
 *
 * Options (env vars):
 *   FORCE=1   — regenerate even if PNG already exists
 *   BATCH=5   — number of images to generate per batch (default 3)
 */

import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { ITEMS } from "../src/lib/gameData.js";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Paths ─────────────────────────────────────────────────────────────────
const PUBLIC_DIR = join(__dirname, "../../melvor-eq2/public/sprites/items");
const MANIFEST_PATH = join(PUBLIC_DIR, "manifest.json");

// ─── Sprite prompt builder ─────────────────────────────────────────────────
// Parses spriteId tokens to build a lore-appropriate prompt.
// Token format: {slot}_{material}_{variant?}  e.g. "sword_iron", "chest_plate_royal"

const SLOT_LABELS: Record<string, string> = {
  sword: "one-handed sword", axe: "battle axe", mace: "war mace",
  staff: "wizard staff", bow: "shortbow", dagger: "dagger",
  shield: "shield", helm: "helmet", head: "headgear",
  chest: "chest armor", back: "cloak or cape", shoulder: "pauldrons",
  legs: "leg armor", hands: "gauntlets", feet: "boots",
  wrist: "bracers", waist: "belt", neck: "necklace or gorget",
  ear: "earring", ring: "ring", charm: "charm trinket",
  potion: "potion vial", elixir: "elixir bottle", food: "cooked food",
  ore: "raw mineral ore", hide: "tanned pelt", wood: "carved wood",
  gem: "cut gemstone", herb: "bundled herb", fish: "fish",
  mount: "mount figurine",
};

const MATERIAL_LABELS: Record<string, string> = {
  common: "plain", iron: "iron", steel: "tempered steel", mithril: "mithril",
  dark: "darkened", fabled: "fabled", plate: "plate armor", chain: "chain mail",
  leather: "leather", cloth: "cloth", shadow: "shadow-touched",
  silver: "polished silver", gold: "golden", bone: "bone-carved",
  royal: "ornate royal", gnoll: "gnoll-crafted", rusty: "rusty old",
  copper: "copper", health: "crimson healing", mana: "arcane blue",
  wolf: "wolf pelt", crab: "crab shell", horseshoe: "iron horseshoe",
  oracle: "mystical oracle", cloak: "adventurer's cloak",
};

function buildPrompt(spriteId: string): string {
  const tokens = spriteId.toLowerCase().split("_");
  const slot = SLOT_LABELS[tokens[0]] ?? tokens[0];
  const material = tokens.slice(1).map(t => MATERIAL_LABELS[t] ?? t).join(" ").trim();

  const baseDesc = material ? `${material} ${slot}` : slot;
  return [
    `A ${baseDesc}`,
    "EverQuest 2 painterly item icon",
    "single item centered on transparent or dark background",
    "fantasy RPG art style, rich colors, dramatic lighting",
    "detailed texture, heroic proportions",
    "no text, no UI, no hands, no characters — item only",
    "square composition, icon format",
  ].join(", ");
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const force = process.env.FORCE === "1";
  const batchSize = parseInt(process.env.BATCH ?? "3", 10);

  // Ensure output directory exists
  mkdirSync(PUBLIC_DIR, { recursive: true });

  // Load existing manifest
  let manifest: Record<string, string> = {};
  if (existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<string, string>;
    } catch {
      manifest = {};
    }
  }

  // Collect all unique spriteIds from ITEMS (deterministic, sorted)
  const allSpriteIds = [...new Set(ITEMS.map(item => item.spriteId))].sort();
  console.log(`Found ${allSpriteIds.length} unique spriteIds across ${ITEMS.length} items.`);

  // Determine which sprites need generation
  const toGenerate = allSpriteIds.filter(id => {
    if (force) return true;
    const pngPath = join(PUBLIC_DIR, `${id}.png`);
    return !existsSync(pngPath) || !manifest[id];
  });

  if (toGenerate.length === 0) {
    console.log("All sprites already generated. Use FORCE=1 to regenerate.");
    return;
  }

  console.log(`Generating ${toGenerate.length} missing sprites (batch=${batchSize})...`);
  let generated = 0, failed = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < toGenerate.length; i += batchSize) {
    const batch = toGenerate.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (spriteId) => {
        const pngPath = join(PUBLIC_DIR, `${spriteId}.png`);
        const prompt = buildPrompt(spriteId);

        try {
          console.log(`  [${i + batch.indexOf(spriteId) + 1}/${toGenerate.length}] ${spriteId}`);
          const buffer = await generateImageBuffer(prompt, "1024x1024");
          writeFileSync(pngPath, buffer);
          manifest[spriteId] = `/sprites/items/${spriteId}.png`;
          generated++;
        } catch (err) {
          console.error(`  FAILED ${spriteId}:`, (err as Error).message);
          failed++;
        }
      }),
    );

    // Save manifest after every batch (so partial runs preserve progress)
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    // Brief pause between batches to respect rate limits
    if (i + batchSize < toGenerate.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Final manifest write (ensure all entries present, alphabetically sorted)
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2));

  console.log(`\nDone. Generated: ${generated}  Failed: ${failed}`);
  console.log(`Manifest updated at: ${MANIFEST_PATH}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
