# Blackburrow Dungeon — Frontend UI

## What & Why
Build the player-facing dungeon experience: a dungeon lobby page for selecting Blackburrow and difficulty, a floor-progress HUD layered on the existing combat view, and a loot rewards screen on completion. Also adds a gear score badge to the Character page so players know where they stand.

## Done looks like
- A new "Dungeons" entry appears in the sidebar nav
- `/dungeons` page shows the Blackburrow dungeon card with: zone art placeholder, min level, a gear score requirement badge per difficulty tier, and the player's current gear score so they can see which tiers they qualify for
- Selecting a difficulty and clicking "Enter Blackburrow" starts a run and takes the player to `/dungeons/run`
- `/dungeons/run` shows a split layout: left side = current floor progress (floor X/5, enemy icons with HP indicators, mini-boss indicator, kills counter); right side = the existing combat component so the player fights enemies normally
- Enemies for the current floor are listed as selectable targets (just like the combat page's enemy list); clicking one starts a combat via the existing combat flow
- When the floor is cleared (5 kills + mini-boss), a "Floor Complete" banner appears with a Continue button to advance
- On floor 5, after the main boss dies, a full-screen "Dungeon Complete" modal appears showing all loot earned (item cards with rarity colors), total XP/gold earned, and a "Claim & Exit" button that returns to `/dungeons`
- Character page shows a "Gear Score: ###" badge in the stats summary panel
- If the player tries to enter a difficulty tier above their gear score, the button is disabled with a tooltip showing the requirement

## Out of scope
- Group/party member UI (future)
- Dungeon history or leaderboard
- Timer or speed-run tracking
- Any new backend routes (all API work is in the previous task)

## Tasks
1. **Sidebar nav entry** — Add "Dungeons" with a dungeon/tower icon to the sidebar navigation component between the EverQuest II section links.

2. **Dungeons lobby page** — Create `/dungeons` page that fetches `GET /api/dungeons`, renders the Blackburrow card with lore blurb, floor count, and four difficulty buttons (Normal / Expert / Legendary / Mythical) each showing their gear score requirement. Buttons above the player's gear score are disabled. "Enter" triggers `POST /api/dungeons/blackburrow/start` and redirects to `/dungeons/run`.

3. **Dungeon run page** — Create `/dungeons/run` page that polls `GET /api/dungeons/run/current` every 3 seconds. Shows floor progress panel (floor X/5, kill count X/5, mini-boss badge). Lists the current floor's enemies as fight buttons that start normal combat via the existing combat flow. When the floor is clearable (kills + mini-boss met), shows a "Advance to Floor X" button that calls `POST /api/dungeons/run/advance`.

4. **Floor complete + dungeon complete states** — After `POST /api/dungeons/run/advance` on floor 5, the response will include `completed: true` and `lootEarned`. Show a full-screen modal listing loot items (icon, name, rarity badge, level) with a "Claim & Exit" button. For mid-dungeon floor advances, show a brief animated "Floor X Complete" banner before revealing the next floor's enemies.

5. **Gear score on character page** — Add a "Gear Score" row to the "At a Glance" stats panel on the Character page, sourced from `GET /api/character/stats`. Display a colored badge (grey for 0–59, green 60–149, blue 150–299, orange 300+).

## Relevant files
- `artifacts/melvor-eq2/src/components/layout/sidebar.tsx`
- `artifacts/melvor-eq2/src/pages/character.tsx`
- `artifacts/melvor-eq2/src/App.tsx`
- `artifacts/melvor-eq2/src/lib/api.ts`
