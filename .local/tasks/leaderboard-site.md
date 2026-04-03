# Leaderboard Website — All Players

## What & Why
Build a standalone leaderboard website that ranks every real player and ghost player on combined progression metrics: level, XP, gear score, dungeon completions, raid completions, kill count, and boss kills. This gives the world a persistent competitive backdrop and lets the player see how they stack up against the entire population.

## Done looks like
- A new separate website (new artifact) at `/leaderboard` shows a ranked table of all real + ghost players
- Tabs or sections for: Overall Rank, Dungeon Progression, Raid Progression
- Overall tab: rank, player name (with ghost indicator badge), class, level, gear score, total kills, boss kills
- Dungeon tab: rank, name, dungeons completed, floors cleared, heroic completions
- Raid tab: rank, name, raids completed, highest phase reached, total raid kills
- Each row is styled to distinguish ghost players from real players (e.g. subtle ghost icon or muted color)
- The real player's row is highlighted so they can spot themselves instantly
- Data is fetched from new leaderboard API endpoints added to the API server
- Live refresh (polling every 30s or a manual refresh button)

## Out of scope
- Auth / login (no login wall)
- Pagination beyond a reasonable cap (top 100 is fine)
- Per-player profile drilldown pages (future)
- Mobile app version

## Tasks
1. **Leaderboard API endpoints** — Add `GET /api/leaderboard/overall`, `GET /api/leaderboard/dungeons`, and `GET /api/leaderboard/raids` to the API server. Each endpoint joins the `characters` table and `worldPlayers` table, annotates rows as `type: "player" | "ghost"`, and returns them sorted by the relevant metric. Include dungeon run aggregate stats (runs completed, floors cleared, heroic count) and raid aggregate stats (raids completed, max phase, raid kills) from the run history tables.

2. **New leaderboard artifact** — Scaffold a new React + Vite web artifact at slug `leaderboard` (preview path `/leaderboard`). Build the leaderboard UI with three tabs (Overall, Dungeons, Raids), a ranked table per tab, ghost vs. real player styling, real-player row highlight, and auto-refresh. Match the dark fantasy aesthetic of the main game (dark backgrounds, gold/amber accents).

## Relevant files
- `artifacts/api-server/src/routes/`
- `lib/db/src/schema/character.ts`
- `lib/db/src/schema/world.ts`
- `lib/db/src/schema/dungeons.ts`
- `artifacts/api-server/src/lib/dungeonData.ts`
- `artifacts/api-server/src/lib/raidData.ts`
- `artifacts/melvor-eq2/src/index.css`
