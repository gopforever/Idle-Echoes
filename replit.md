# Workspace

## Overview

pnpm workspace monorepo using TypeScript. A Melvor Idle x EverQuest 2 idle RPG browser game called "Melvor EQ2".

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind v4 + Framer Motion
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── melvor-eq2/         # React+Vite game frontend (preview path: /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Game Features

- EverQuest 2 combat formulas (attack rating, mitigation, avoidance, crits, haste)
- Melvor Idle idle skill training (16 skills across combat/gathering/crafting/support)
- Full EQ2 gear system: 18 gear slots (head, neck, shoulder, chest, back, wrist, hands, waist, legs, feet, earLeft, earRight, ringLeft, ringRight, charm, primary, secondary, ranged)
- 50+ unique items across all rarities (common, uncommon, rare, legendary, fabled, mythical)
- 49+ enemies across 11 zones with abilities, resistances, status effects (includes full Blackburrow dungeon roster)
- Crafting system with 9 recipes
- Real-time auto-combat loop via setInterval
- 2D pixel-art inspired CSS sprites for characters and enemies
- Dark fantasy UI with amber/gold accents on deep slate
- **Ghost Players / Living World**: 30 AI-simulated adventurers explore all 10 zones of Norrath; background simulation ticks every 30 seconds generating kills, boss kills, level-ups, zone travel, and loot events; full Living World page + dashboard widget; leaderboard by kills/level/gold/boss kills
- **Ghost Chronicles & Rival System**: Each ghost has an AI-generated portrait (lazy-loaded, DB-cached in `lore_cache`), AI-generated lore chronicle (epithet, origin, deeds, reputation, motto), and rival tracking (up to 3 rivals stored in `characters.rivals` jsonb); World page: click any ghost card to open profile slide-over with portrait + chronicle + rival toggle; portrait thumbnails on leaderboard rows + player cards; Dashboard: Rivals card shows head-to-head comparison (level/kills/gold delta vs player); API: `GET /world/player/:id/portrait`, `GET /world/player/:id/chronicle`, `POST /world/player/:id/portrait/refresh`, `GET /api/character/rivals`, `POST /api/character/rivals`
- **Gear Score system**: `computeGearScore()` in eq2Formulas.ts; exposed in `/api/character/stats` (`gearScore` + `dungeonAccess`); gates: Normal=0, Expert=60, Legendary=150, Mythical=300
- **Blackburrow Dungeon backend**: 5-floor dungeon (Qeynos Hills zone), 25 normal enemies + 5 mini-bosses + Overlord Narlock (AI-narrated main boss); difficulty scaling (Normal 1×, Expert 1.5×, Legendary 2×, Mythical 3×); dungeon run tracking in DB; `progressDungeonKill()` hooked into combat kill flow; loot generation per floor completion

## Database Schema

- `characters` — character stats, gear (stored as slot -> itemId JSON), XP, gold, rivals (jsonb array of ghost player IDs, max 3)
- `combat_state` — active combat state including enemy data and HP
- `combat_log` — combat action log entries
- `inventory` — player inventory items
- `skills` — all 16 skills with XP/level tracking, idle training toggle
- `world_players` — 30 ghost/AI player characters with full EQ2 stats and zone tracking
- `world_events` — living world event log (kills, boss kills, level-ups, zone travel, loot); auto-pruned to 500 entries
- `dungeon_runs` — tracks active and completed dungeon runs (id, characterId, dungeonId, difficulty, currentFloor, floorKills, totalKills, status, lootGranted)

## Zones

- Commonlands (Level 1-10)
- Antonica (Level 1-10)
- Qeynos Hills (Level 10-20) — gateway to Blackburrow dungeon
- Thundering Steppes (Level 10-20)
- Nektulos Forest (Level 20-30)
- Everfrost Peaks (Level 30-40)
- Lavastorm Mountains (Level 40-50+)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json`. Run `pnpm run typecheck` for full check.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
- `pnpm --filter @workspace/db run push` — sync DB schema changes
