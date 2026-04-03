# Item Sprites & Gear-Reactive Player Portrait

## What & Why
Replace emoji placeholder icons with classic EQ2-style illustrated item icons and add a painted player portrait that reflects equipped gear tier. Items are a core feedback loop in idle RPGs — seeing your loot as real art makes every drop feel meaningful. The portrait gives the player a visual identity that evolves as they gear up.

## Done looks like
- Every item in the inventory, shop, and gear slots shows an AI-generated illustrated icon in the classic EQ2 painterly style, with a rarity-colored border (grey/common → green/uncommon → blue/rare → purple/legendary → orange/fabled)
- The Character screen shows a painted portrait of the player's race + class combination
- The portrait changes appearance based on equipped armor tier: a lightly-geared character looks different from one in full plate or robes
- Portrait generation happens on demand (cached after first generation) — a loading placeholder shows while generating
- Item icons are pre-generated as static assets and served from the public directory — no per-request AI calls for items

## Out of scope
- Pixel-perfect layered gear overlays (individual item pieces composited onto portrait)
- NPC, enemy, or ghost player portraits (future task)
- Animated sprites or combat animations
- Boss monster art

## Tasks

1. **AI item icon generation script** — Write a Node.js script that iterates over all unique `spriteId` values from the ITEMS constant and calls the image generation API for each, using a consistent "classic EQ2 illustrated RPG item icon, painterly style, dark background, square frame" prompt customized per item type/slot. Save resulting PNGs to `public/sprites/items/`. Include a manifest JSON mapping spriteId → filename.

2. **ItemIcon component upgrade** — Replace the emoji-based `item-icon.tsx` component with one that loads the generated PNG for the item's `spriteId` from the manifest, applies a CSS rarity-colored border/glow frame matching EQ2 style, and falls back to the existing emoji if the sprite is missing.

3. **Portrait generation API endpoint** — Add `GET /api/character/portrait` that reads the character's race, class, and equipped gear (to determine armor tier: light/medium/heavy/robes), builds a descriptive AI image prompt, generates a portrait via the image generation API, caches the result by `race_class_armortier` key in `lore_cache`, and returns the image URL. Regenerates if equipped armor tier changes.

4. **Character screen portrait UI** — Display the portrait image on the Character page in a painted frame with the character's name, level, and title. Show a stylized placeholder/skeleton while the portrait loads. Add a subtle "Refresh Portrait" button that clears the cache key and regenerates.

## Relevant files
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/melvor-eq2/src/components/game/item-icon.tsx`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/melvor-eq2/src/pages/character.tsx`
- `artifacts/melvor-eq2/src/pages/shop.tsx`
- `artifacts/api-server/src/routes/gm.ts`
- `lib/db/src/schema/gamestate.ts`
- `.local/skills/media-generation/SKILL.md`
- `.local/skills/ai-integrations-openai/SKILL.md`
