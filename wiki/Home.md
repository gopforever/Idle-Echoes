# Idle Echoes — Wiki

Welcome to the **Idle Echoes** wiki! Idle Echoes (internally named **Melvor EQ2**) is a browser-based idle RPG that fuses the passive skill-training loop of [Melvor Idle](https://melvoridle.com/) with the deep lore, zones, combat mechanics, and gear systems of **EverQuest 2**.

---

## 📖 Table of Contents

1. [What is Idle Echoes?](#what-is-idle-echoes)
2. [Core Gameplay Loop](#core-gameplay-loop)
3. [Combat System](#combat-system)
4. [Skills](#skills)
5. [Gear & Items](#gear--items)
6. [Zones](#zones)
7. [Dungeons & Raids](#dungeons--raids)
8. [Living World — Ghost Players](#living-world--ghost-players)
9. [Crafting & Tradeskills](#crafting--tradeskills)
10. [Social Features](#social-features)
11. [Technical Architecture](#technical-architecture)

---

## What is Idle Echoes?

Idle Echoes is a **persistent, browser-based idle RPG** where players create a character set in the world of **Norrath** (the EverQuest universe) and progress through it largely automatically. Inspired by Melvor Idle's approach to RuneScape, this game takes EverQuest 2's rich world and translates it into a zero-attention-required idle format—you can set your character to train skills or fight enemies, then come back later to see the rewards.

The game is hosted at **[idle-echoes-api-server.vercel.app](https://idle-echoes-api-server.vercel.app)** and runs entirely in the browser.

---

## Core Gameplay Loop

1. **Create a character** — choose a name and start fresh in Norrath.
2. **Select a zone** — send your character to a zone appropriate to their level.
3. **Idle combat runs automatically** — a real-time `setInterval`-driven combat loop attacks enemies without player input.
4. **Loot & level up** — defeated enemies drop items and grant XP across all relevant skills.
5. **Train idle skills** — toggle gathering, crafting, and support skills to run in the background while you do anything else.
6. **Gear up** — equip better items from your inventory, shop, or crafting to improve your stats.
7. **Progress to harder content** — unlock Expert/Legendary/Mythical dungeons and raids as your Gear Score climbs.

---

## Combat System

Combat is fully automatic and server-side driven. It uses authentic **EverQuest 2 combat formulas**:

| Stat | Description |
|------|-------------|
| **Attack Rating** | Determines hit chance against enemy avoidance |
| **Mitigation** | Reduces incoming physical damage |
| **Avoidance** | Chance to dodge/deflect incoming attacks |
| **Crits** | Critical hit chance and multiplier |
| **Haste** | Increases attack speed (lowers interval between swings) |

- Combat ticks run via `setInterval` on the server.
- Each tick resolves attacks, applies status effects, and writes to the `combat_log` table.
- Enemies have **abilities**, **resistances**, and **status effects**.
- The `combat_state` table persists your current fight across sessions.

---

## Skills

There are **16 skills** split across four categories. All skills can be toggled to train idly in the background.

### ⚔️ Combat
| Skill | Notes |
|-------|-------|
| Attack | Melee combat proficiency |
| Defense | Mitigation and avoidance |
| Ranged | Bow/ranged weapon use |
| Magic | Spell casting |

### 🌿 Gathering
| Skill | Notes |
|-------|-------|
| Mining | Ore and stone collection |
| Woodcutting | Lumber gathering |
| Fishing | Fish for food and ingredients |
| Foraging | Herbs and plants |

### 🔨 Crafting
| Skill | Notes |
|-------|-------|
| Smithing | Forge armor and weapons |
| Woodworking | Craft bows, staves, and furniture |
| Tailoring | Cloth and leather armor |
| Alchemy | Potions and elixirs |
| Jeweling | Rings, earrings, and charms |

### 🛠️ Support
| Skill | Notes |
|-------|-------|
| Cooking | Food buffs for combat |
| Tinkering | Gadgets and mechanical items |
| Transmuting | Convert materials and currency |

---

## Gear & Items

### Gear Slots (18 total)
`head` · `neck` · `shoulder` · `chest` · `back` · `wrist` · `hands` · `waist` · `legs` · `feet` · `earLeft` · `earRight` · `ringLeft` · `ringRight` · `charm` · `primary` · `secondary` · `ranged`

### Item Rarities
| Rarity | Color tier |
|--------|-----------|
| Common | White |
| Uncommon | Green |
| Rare | Blue |
| Legendary | Purple |
| Fabled | Orange |
| Mythical | Red/Gold |

There are **50+ unique items** spread across all rarities and slots.

### Gear Score
Your overall power is measured by **Gear Score**, calculated by `computeGearScore()` in `eq2Formulas.ts` and exposed on the `/api/character/stats` endpoint.

| Tier | Gear Score Required |
|------|-------------------|
| Normal content | 0 |
| Expert dungeons | 60 |
| Legendary dungeons | 150 |
| Mythical dungeons | 300 |

---

## Zones

Zones are the open-world areas your character can explore. Each has an appropriate level range and unique enemy roster.

| Zone | Level Range | Notes |
|------|------------|-------|
| Commonlands | 1–10 | Starter zone |
| Antonica | 1–10 | Alternate starter zone |
| Qeynos Hills | 10–20 | Gateway to Blackburrow dungeon |
| Thundering Steppes | 10–20 | — |
| Nektulos Forest | 20–30 | — |
| Everfrost Peaks | 30–40 | — |
| Lavastorm Mountains | 40–50+ | High-level zone |

There are **49+ enemies** across **11 zones**, each with unique abilities, resistances, and status effects.

---

## Dungeons & Raids

### Dungeons
Dungeons are instanced, multi-floor encounters gated by **Gear Score**.

**Blackburrow** (accessed from Qeynos Hills) is the flagship dungeon:
- **5 floors** with scaling difficulty
- **25 normal enemies** + **5 mini-bosses** + **Overlord Narlock** (the AI-narrated main boss)
- Difficulty modes: Normal (1×), Expert (1.5×), Legendary, Mythical

Dungeon progress is tracked in the `dungeon_runs` table (floor, kills, status, loot granted).

### Raids
Raids are large-scale encounters accessed via `/dungeons/raids`. Like dungeons, they feature multi-stage progression and unique loot.

---

## Living World — Ghost Players

One of Idle Echoes' signature features is the **Living World** system:

- **30 AI-simulated "ghost" adventurers** roam all 10 zones of Norrath simultaneously.
- A background simulation tick fires every **30 seconds**, generating kills, boss kills, level-ups, zone travel events, and loot drops.
- Events are stored in `world_events` (auto-pruned to the last 500 entries) and displayed on the **World** page in real time.

### Ghost Chronicles & Rival System
Each ghost player has:
- An **AI-generated portrait** (lazy-loaded, cached in the `lore_cache` DB table)
- An **AI-generated lore chronicle** — epithet, origin story, deeds, reputation, and motto
- A **Rival relationship** — your character can have up to **3 rivals** chosen from ghost players, adding a social/competitive layer to the idle experience

---

## Crafting & Tradeskills

### Crafting
The crafting system has **9 recipes** that let you combine gathered materials into usable gear and consumables. Recipes are unlocked based on your crafting skill levels.

### Tradeskills
Tradeskills go deeper than basic crafting — they represent the EQ2-style professions system with their own XP tracks, recipe tiers, and material requirements. Tradeskill progress is tracked server-side via the `/tradeskills` API route.

---

## Social Features

| Feature | Description |
|---------|-------------|
| **Achievements** | Unlock achievements for combat, gathering, dungeon clears, and more |
| **Leaderboard** | Global rankings by level, gear score, kills, and other stats |
| **Factions** | Reputation tracks with Norrathian factions that unlock rewards |
| **Collections** | Collect sets of items to complete collections for bonus rewards |
| **Mounts** | Cosmetic and utility mounts available from the shop and content |
| **Quests** | Quest log with objectives tied to zones, enemies, and crafting |
| **AA Tree** | Alternate Advancement point tree for post-cap character customization |
| **Adornments** | Socket extra stat bonuses onto equipped gear |
| **Bank** | Extended storage beyond your main inventory |
| **Auction House** | Player-driven economy — list and buy items from other players |

---

## Technical Architecture

Idle Echoes is a **pnpm workspace monorepo** built with TypeScript.

```
Idle-Echoes/
├── artifacts/
│   ├── api-server/      # Express 5 REST API (deployed to Vercel)
│   ├── melvor-eq2/      # React + Vite game frontend
│   ├── leaderboard/     # Standalone leaderboard app
│   ├── tracker/         # Local dev tracker dashboard
│   └── mockup-sandbox/  # UI prototyping
├── lib/
│   ├── api-spec/        # OpenAPI spec + Orval codegen config
│   ├── api-client-react/# Generated React Query hooks
│   ├── api-zod/         # Generated Zod validation schemas
│   ├── db/              # Drizzle ORM schema + PostgreSQL connection
│   └── integrations-openai-*/  # OpenAI AI integrations (portraits, lore)
└── scripts/             # Utility scripts
```

### Key Technologies
| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Framer Motion |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API Codegen | Orval (from OpenAPI spec) |
| AI Features | OpenAI (portraits, lore, boss narration) |
| Package Manager | pnpm workspaces |
| Language | TypeScript 5.9 |

### Database Tables
| Table | Purpose |
|-------|---------|
| `characters` | Character stats, gear (slot→itemId JSON), XP, gold, rivals |
| `combat_state` | Active combat state including enemy data and HP |
| `combat_log` | Per-tick combat action log |
| `inventory` | Player inventory items |
| `skills` | All 16 skills with XP/level and idle-training toggle |
| `world_players` | 30 ghost AI characters with full EQ2 stats |
| `world_events` | Living world event log (auto-pruned to 500 entries) |
| `dungeon_runs` | Active and completed dungeon run tracking |
| `lore_cache` | Cached AI-generated portraits and chronicles |

---

*This wiki is auto-generated from the source code of [gopforever/Idle-Echoes](https://github.com/gopforever/Idle-Echoes).*