# Ghost Chronicles & Rival System

## What & Why
The 30 ghost players already run a full living-world simulation — personalities, economy influence, world events — but they're faceless and anonymous. This task gives each ghost an AI-generated portrait and lore chronicle, and lets the real player designate up to 3 ghosts as rivals whose progress is tracked head-to-head on the dashboard.

## Done looks like

**Ghost Portraits:**
- Every ghost card on the World page shows a small AI-generated portrait (same style as the player portrait: race + class + personality → painterly EQ2 bust)
- Portraits are generated on first request and cached in `lore_cache` with key `ghost_portrait_{name}_{race}_{class}` — subsequent loads are instant
- A subtle personality-colored frame border (e.g. red for Aggressive, blue for Cautious) wraps each portrait

**Ghost Chronicles:**
- Clicking any ghost card on the World page opens a slide-over or modal panel showing their full profile: portrait, name, race/class/level, personality badge, current zone, kill/boss kill counts, and a 2–3 sentence AI-generated "chronicle" — a flavored narrative summary of their adventures so far (e.g. "Kael'dan the Barbarian has carved a bloody path through the Thundering Steppes, besting two Elite bosses and earning the fear of every gnoll in the region…")
- Chronicle is generated once and cached in `lore_cache` with key `ghost_chronicle_{name}_v1`; a "Refresh Chronicle" button allows regeneration
- New API route: `GET /api/world/player/:id/chronicle` — returns `{ chronicle: string }` (generates + caches if missing)

**Rival Tracking:**
- Each ghost card has a "Track as Rival" button (max 3 rivals at once; button becomes "Untrack" when active)
- Rival selections are stored per-character in a new `character_rivals` DB column (jsonb array of ghost player IDs, max 3)
- Dashboard shows a new "Rivals" card below the gold/level stat cards listing each rival: their portrait thumbnail, name, level vs your level (with a colored delta indicator — red if they're ahead, green if you're ahead), and kills vs your kills
- API: `GET /api/character/rivals` returns rival profiles enriched with the real player's current stats for comparison; `POST /api/character/rivals` accepts `{ ghostId, action: "add"|"remove" }`

## Out of scope
- Ghost-vs-ghost rivalries or ghost-to-ghost social interactions
- Push notifications when a rival levels up (real-time is a separate infrastructure task)
- Rival challenge mechanics / combat between player and ghost
- Ghost gear slots or inventory (ghosts don't have an inventory table)

## Tasks

1. **Ghost portrait API** — Add `GET /api/world/player/:id/portrait` that generates (or retrieves from `lore_cache`) an AI portrait for the ghost using their race, class, and personality as prompt inputs. Mirror the player portrait generation approach but prompt for "NPC adventurer" rather than player character. Add a `POST /api/world/player/:id/portrait/refresh` to bust the cache.

2. **Ghost chronicle API** — Add `GET /api/world/player/:id/chronicle` that asks the LLM (GPT-4o, same as GM routes) to write a 2–3 sentence in-world narrative about this ghost's career, using their current stats (level, killCount, bossKills, zone, personality) as context. Cache in `lore_cache` with key `ghost_chronicle_{name}_v1`.

3. **Rivals DB column + API** — Add `rivals` jsonb column (default `[]`) to `charactersTable`. Add `GET /api/character/rivals` (returns enriched rival + player comparison data) and `POST /api/character/rivals` (add/remove with 3-rival cap). Push schema.

4. **Ghost profile panel UI** — On the World page, clicking any ghost card opens a right-side panel (sheet/modal) showing: portrait image, name/race/class/personality, level + zone, kill stats, chronicle text, and "Track as Rival" / "Untrack" button. Portrait and chronicle load asynchronously with skeleton states.

5. **World page portrait thumbnails** — Show each ghost's portrait as a small avatar (32×32) on their leaderboard and player-list cards. Load lazily so the page doesn't block on 30 portrait generations — show the personality emoji as fallback while loading.

6. **Dashboard rivals card** — Add a "Rivals" section to the dashboard (below the stat cards) showing each tracked rival's portrait, name, level delta vs player, and kill delta vs player. Link to open their ghost profile panel. Show "No rivals yet — visit the World page to track adventurers" when the list is empty.

## Relevant files
- `artifacts/api-server/src/routes/world.ts`
- `artifacts/api-server/src/routes/portrait.ts`
- `artifacts/api-server/src/routes/gm.ts`
- `artifacts/api-server/src/lib/ghostSimulator.ts`
- `artifacts/api-server/src/lib/ghostSeeds.ts`
- `artifacts/melvor-eq2/src/pages/world.tsx`
- `artifacts/melvor-eq2/src/pages/dashboard.tsx`
- `lib/db/src/schema/character.ts`
- `lib/db/src/schema/world.ts`
