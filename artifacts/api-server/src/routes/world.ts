import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { db } from "@workspace/db";
import {
  worldPlayersTable,
  worldEventsTable,
  charactersTable,
  loreCacheTable,
} from "@workspace/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { openai } from "@workspace/integrations-openai-ai-server";
import { resetGhostPlayers } from "../lib/ghostSimulator.js";
import { getOrCreateCharacter } from "./character.js";

// ─── AI Helper ───────────────────────────────────────────────────────────────

async function aiComplete(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens: number = 300,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Ghost Portrait Helpers (mirrors portrait.ts but for NPC adventurers) ────

const GHOST_RACE_VISUALS: Record<string, string> = {
  "Human":      "human NPC adventurer with rugged features",
  "High Elf":   "tall elegant high elf NPC with silver hair and pointed ears",
  "Dark Elf":   "dark elf NPC with violet skin, white hair and glowing red eyes",
  "Dwarf":      "stocky red-bearded dwarf NPC with weathered skin",
  "Halfling":   "cheerful halfling NPC with curly hair and bright eyes",
  "Gnome":      "clever gnome NPC with tinkered goggles and mechanical accessories",
  "Barbarian":  "towering barbarian NPC with tribal tattoos and fierce expression",
  "Erudite":    "tall pale erudite NPC scholar with high forehead and arcane markings",
  "Wood Elf":   "lithe wood elf NPC with leaf-braided hair and nature motifs",
  "Half Elf":   "half-elf NPC with slightly pointed ears and mixed heritage features",
  "Iksar":      "reptilian iksar NPC with iridescent scales and amber eyes",
  "Kerra":      "leonine kerra NPC with tawny fur and feline features",
  "Sarnak":     "dragonkin sarnak NPC with red scales and horned head",
  "Troll":      "massive greenish troll NPC berserker with jutting tusks",
  "Ogre":       "hulking grey-skinned ogre NPC warrior with brutal strength",
  "Arasai":     "diminutive winged dark faerie NPC with mischievous expression",
  "Fae":        "delicate glowing faerie NPC with butterfly wings and luminous skin",
};

const GHOST_CLASS_POSE: Record<string, string> = {
  Fighter:  "wielding a sword and shield in a battle-ready stance",
  Scout:    "holding a shortbow with arrows at the ready, crouched",
  Mage:     "hands glowing with arcane energy, mystic sigils swirling",
  Priest:   "hands raised in divine light, holy symbol visible",
};

const GHOST_PERSONALITY_TONE: Record<string, string> = {
  Aggressive: "fierce battle-hardened warrior expression, intense gaze",
  Cautious:   "watchful cautious expression, alert and composed",
  Explorer:   "curious adventurous expression, world-weary but hopeful",
  Greedy:     "cunning opportunistic expression, sharp calculating eyes",
  Scholarly:  "thoughtful intellectual expression, wisdom in the eyes",
  Devout:     "serene holy expression, calm devoted face",
};

function ghostPortraitKey(name: string, race: string, cls: string): string {
  return `ghost_portrait_${name}_${race}_${cls}`
    .toLowerCase().replace(/[\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function ghostChronicleKey(name: string): string {
  return `ghost_chronicle_${name}_v1`
    .toLowerCase().replace(/[\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const router = Router();

const worldRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

router.use("/world", worldRateLimit);

// ─── Zone registry (must match ghostSimulator) ────────────────────────────────

const ZONE_LIST = [
  { id: "commonlands",        name: "Commonlands",            min: 1,  max: 10  },
  { id: "antonica",           name: "Antonica",               min: 1,  max: 10  },
  { id: "thundering_steppes", name: "Thundering Steppes",     min: 10, max: 20  },
  { id: "nektulos_forest",    name: "Nektulos Forest",        min: 20, max: 30  },
  { id: "enchanted_lands",    name: "Enchanted Lands",        min: 20, max: 30  },
  { id: "zek",                name: "Zek, the Orcish Wastes", min: 25, max: 35  },
  { id: "everfrost",          name: "Everfrost Peaks",        min: 30, max: 40  },
  { id: "lavastorm",          name: "Lavastorm Mountains",    min: 40, max: 50  },
  { id: "lesser_faydark",     name: "Lesser Faydark",         min: 35, max: 45  },
  { id: "feerrott",           name: "Feerrott",               min: 45, max: 55  },
];

// ─── GET /world/players — ghosts + real player, sorted by level ───────────────

router.get("/world/players", async (_req, res, next) => {
  try {
    const ghosts = await db
      .select()
      .from(worldPlayersTable)
      .orderBy(desc(worldPlayersTable.level), desc(worldPlayersTable.killCount));

    // Fetch the real player character (first row in characters table)
    const [char] = await db.select().from(charactersTable).limit(1);

    const all: unknown[] = [...ghosts];
    if (char) {
      all.push({
        id:              -1,
        name:            char.name,
        race:            char.race,
        class:           char.class,
        archetype:       char.archetype,
        alignment:       char.alignment,
        level:           char.level,
        xp:              char.xp,
        xpToNextLevel:   char.xpToNextLevel,
        gold:            char.gold,
        zone:            char.zone,
        killCount:       char.killCount,
        deathCount:      char.deathCount,
        bossKills:       0,
        totalGoldEarned: char.totalGoldEarned,
        stats:           char.baseStats,
        lastTickAt:      char.updatedAt,
        createdAt:       char.createdAt,
        isRealPlayer:    true,
      });
    }

    // Sort once by level desc then kill_count desc (real player included)
    (all as any[]).sort((a, b) => b.level - a.level || b.killCount - a.killCount);

    res.json(all);
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/player/:id — single ghost player profile ─────────────────────

router.get("/world/player/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid player ID" }); return;
    }

    if (id === -1) {
      // Real player — look up from characters table
      const [char] = await db.select().from(charactersTable).limit(1);
      if (!char) { res.status(404).json({ error: "Player not found" }); return; }
      res.json({
        id: -1, name: char.name, race: char.race, class: char.class,
        archetype: char.archetype, alignment: char.alignment,
        level: char.level, xp: char.xp, gold: char.gold, zone: char.zone,
        killCount: char.killCount, deathCount: char.deathCount,
        bossKills: 0, totalGoldEarned: char.totalGoldEarned,
        stats: char.baseStats, lastTickAt: char.updatedAt,
        createdAt: char.createdAt, isRealPlayer: true,
      }); return;
    }

    const [player] = await db.select().from(worldPlayersTable)
      .where(eq(worldPlayersTable.id, id)).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }
    res.json({ ...player, isRealPlayer: false });
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/events ────────────────────────────────────────────────────────

router.get("/world/events", async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit ?? 50));
    const zone = req.query.zone as string | undefined;
    const type = req.query.type as string | undefined;
    const minImportance = Number(req.query.minImportance ?? 1);

    // Push all filters into SQL before applying limit for correct paging
    const query = db
      .select()
      .from(worldEventsTable)
      .where(
        sql`${worldEventsTable.importance} >= ${minImportance}${
          zone ? sql` AND ${worldEventsTable.zone} = ${zone}` : sql``
        }${
          type ? sql` AND ${worldEventsTable.type} = ${type}` : sql``
        }`
      )
      .orderBy(desc(worldEventsTable.createdAt))
      .limit(limit);

    const events = await query;
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/leaderboard — top 10 by level then kill_count (ghosts + real player) ──

router.get("/world/leaderboard", async (_req, res, next) => {
  try {
    const ghosts = await db
      .select({
        id:              worldPlayersTable.id,
        name:            worldPlayersTable.name,
        race:            worldPlayersTable.race,
        class:           worldPlayersTable.class,
        archetype:       worldPlayersTable.archetype,
        personality:     worldPlayersTable.personality,
        level:           worldPlayersTable.level,
        killCount:       worldPlayersTable.killCount,
        bossKills:       worldPlayersTable.bossKills,
        zone:            worldPlayersTable.zone,
        totalGoldEarned: worldPlayersTable.totalGoldEarned,
        totalGoldSpent:  worldPlayersTable.totalGoldSpent,
      })
      .from(worldPlayersTable);

    const [char] = await db.select().from(charactersTable).limit(1);

    const all: Array<{
      id: number; name: string; race: string; class: string;
      archetype: string; personality?: string; level: number; killCount: number;
      bossKills: number; zone: string; totalGoldEarned: number; totalGoldSpent?: number;
      isRealPlayer?: boolean;
    }> = [...ghosts];

    if (char) {
      all.push({
        id:              -1,
        name:            char.name,
        race:            char.race,
        class:           char.class,
        archetype:       char.archetype,
        level:           char.level,
        killCount:       char.killCount,
        bossKills:       0,
        zone:            char.zone,
        totalGoldEarned: char.totalGoldEarned,
        isRealPlayer:    true,
      });
    }

    // Sort by level desc, then kill_count desc
    all.sort((a, b) => b.level - a.level || b.killCount - a.killCount);
    const top10 = all.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));

    res.json(top10);
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/zones — player count per zone (ghosts + real player) ─────────

router.get("/world/zones", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        zone:  worldPlayersTable.zone,
        count: sql<number>`count(*)`,
      })
      .from(worldPlayersTable)
      .groupBy(worldPlayersTable.zone);

    const zoneCounts: Record<string, { ghostCount: number; realCount: number; total: number }> = {};

    for (const row of rows) {
      zoneCounts[row.zone] = {
        ghostCount: Number(row.count),
        realCount:  0,
        total:      Number(row.count),
      };
    }

    // Add real player to their zone
    const [char] = await db.select({ zone: charactersTable.zone }).from(charactersTable).limit(1);
    if (char) {
      if (!zoneCounts[char.zone]) {
        zoneCounts[char.zone] = { ghostCount: 0, realCount: 0, total: 0 };
      }
      zoneCounts[char.zone].realCount += 1;
      zoneCounts[char.zone].total += 1;
    }

    // Return array with zone metadata
    const zoneData = ZONE_LIST.map(z => ({
      id:         z.id,
      name:       z.name,
      levelRange: `${z.min}–${z.max}`,
      ghostCount: zoneCounts[z.name]?.ghostCount ?? 0,
      realCount:  zoneCounts[z.name]?.realCount ?? 0,
      total:      zoneCounts[z.name]?.total ?? 0,
    }));

    res.json(zoneData);
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/stats ─────────────────────────────────────────────────────────

router.get("/world/stats", async (_req, res, next) => {
  try {
    const [totals] = await db
      .select({
        totalPlayers: sql<number>`count(*)`,
        totalKills:   sql<number>`sum(${worldPlayersTable.killCount})`,
        totalBossKills: sql<number>`sum(${worldPlayersTable.bossKills})`,
        totalGold:    sql<number>`sum(${worldPlayersTable.totalGoldEarned})`,
        avgLevel:     sql<number>`avg(${worldPlayersTable.level})`,
        maxLevel:     sql<number>`max(${worldPlayersTable.level})`,
      })
      .from(worldPlayersTable);

    const [recentEvents] = await db
      .select({ count: sql<number>`count(*)` })
      .from(worldEventsTable);

    res.json({
      totalPlayers:    Number(totals?.totalPlayers ?? 0) + 1,
      totalKills:      Number(totals?.totalKills ?? 0),
      totalBossKills:  Number(totals?.totalBossKills ?? 0),
      totalGoldEarned: Number(totals?.totalGold ?? 0),
      avgLevel:        parseFloat(Number(totals?.avgLevel ?? 0).toFixed(1)),
      maxLevel:        Number(totals?.maxLevel ?? 0),
      totalEvents:     Number(recentEvents?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/player/:id/portrait ─────────────────────────────────────────
// Returns a cached AI-generated portrait for a ghost player (or generates one).

router.get("/world/player/:id/portrait", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) { res.status(400).json({ error: "Invalid player ID" }); return; }

    const [player] = await db.select().from(worldPlayersTable)
      .where(eq(worldPlayersTable.id, id)).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

    const cacheKey = ghostPortraitKey(player.name, player.race, player.class);

    const [cached] = await db.select().from(loreCacheTable)
      .where(eq(loreCacheTable.cacheKey, cacheKey)).limit(1);
    if (cached) {
      res.json({ portrait: cached.content, cached: true, cacheKey }); return;
    }

    const raceDesc  = GHOST_RACE_VISUALS[player.race] ?? `${player.race} NPC adventurer`;
    const poseDesc  = GHOST_CLASS_POSE[player.archetype] ?? "in an adventuring stance";
    const toneDesc  = GHOST_PERSONALITY_TONE[player.personality] ?? "determined adventurer expression";
    const alignTone = player.alignment === "Freeport" ? "slightly menacing dark tone" :
                      player.alignment === "Qeynos"   ? "noble heroic light tone" : "neutral adventurer tone";

    const prompt = [
      `A ${raceDesc}`,
      `${poseDesc}`,
      `${toneDesc}`,
      `EverQuest 2 painterly illustrated NPC portrait style`,
      `rich colors, dramatic fantasy lighting, detailed face and gear`,
      `level ${player.level} ${player.class} adventurer`,
      `heroic composition, shallow depth of field, dark atmospheric background`,
      `high quality fantasy RPG portrait painting, no text, no UI`,
      alignTone,
    ].join(", ");

    const imageBuffer = await generateImageBuffer(prompt, "1024x1024");
    const b64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    await db.insert(loreCacheTable)
      .values({ cacheKey, content: b64 })
      .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: b64 } });

    res.json({ portrait: b64, cached: false, cacheKey });
  } catch (err) {
    next(err);
  }
});

// ─── POST /world/player/:id/portrait/refresh ─────────────────────────────────
// Busts portrait cache and forces regeneration on next GET.

router.post("/world/player/:id/portrait/refresh", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) { res.status(400).json({ error: "Invalid player ID" }); return; }

    const [player] = await db.select().from(worldPlayersTable)
      .where(eq(worldPlayersTable.id, id)).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

    const cacheKey = ghostPortraitKey(player.name, player.race, player.class);
    await db.delete(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey));
    res.json({ success: true, message: `Portrait cache cleared for ${player.name}. Fetch GET portrait to regenerate.` });
  } catch (err) {
    next(err);
  }
});

// ─── GET /world/player/:id/chronicle ─────────────────────────────────────────
// Returns a cached AI-generated lore chronicle for a ghost player.
// ?refresh=1 busts cache and regenerates.
// Returns { chronicle: string } — a 2-3 sentence narrative summary.
// Also includes { detail } with the rich structured fields for the UI panel.

router.get("/world/player/:id/chronicle", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) { res.status(400).json({ error: "Invalid player ID" }); return; }

    const [player] = await db.select().from(worldPlayersTable)
      .where(eq(worldPlayersTable.id, id)).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

    const cacheKey = ghostChronicleKey(player.name);
    const forceRefresh = req.query.refresh === "1";

    if (!forceRefresh) {
      const [cached] = await db.select().from(loreCacheTable)
        .where(eq(loreCacheTable.cacheKey, cacheKey)).limit(1);
      if (cached) {
        let detail: Record<string, string>;
        try {
          detail = JSON.parse(cached.content) as Record<string, string>;
        } catch {
          // Malformed cache row — fall through to regenerate
          await db.delete(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey));
          detail = {};
        }
        if (Object.keys(detail).length > 0) {
          const chronicle = buildChronicleString(player.name, detail);
          res.json({ chronicle, detail, cached: true }); return;
        }
      }
    } else {
      // Bust cache
      await db.delete(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey));
    }

    const prompt = `You are the chronicler of Norrath for EverQuest 2. Write a short lore chronicle for the adventurer ${player.name}.

Character details:
- Race: ${player.race}
- Class: ${player.class}
- Level: ${player.level}
- Alignment: ${player.alignment}
- Personality: ${player.personality}
- Current zone: ${player.zone}
- Kill count: ${player.killCount}
- Boss kills: ${player.bossKills}
- Deaths: ${player.deathCount}
- Gold earned: ${Math.round(player.totalGoldEarned)}

Write a JSON object with these fields (no markdown, no code block):
{
  "epithet": "A short title or epithet for this adventurer (e.g. 'the Relentless', 'Dawnseeker')",
  "origin": "1-2 sentences on their backstory and where they came from",
  "deeds": "1-2 sentences describing their greatest deeds and accomplishments",
  "reputation": "1 sentence on how Norrath's denizens see them",
  "motto": "A short personal motto or creed (under 15 words)"
}`;

    const raw = await aiComplete([{ role: "user", content: prompt }], 400);
    let detail: Record<string, string>;
    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      detail = JSON.parse(cleaned);
    } catch {
      detail = {
        epithet: "the Unknown",
        origin: `${player.name} hails from the wilds of Norrath, their past shrouded in mystery.`,
        deeds: `With ${player.killCount} foes slain and ${player.bossKills} bosses defeated, their legend grows.`,
        reputation: "Few speak of them openly, but all know the name.",
        motto: "The road ahead matters more than the road behind.",
      };
    }

    await db.insert(loreCacheTable)
      .values({ cacheKey, content: JSON.stringify(detail) })
      .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: JSON.stringify(detail) } });

    const chronicle = buildChronicleString(player.name, detail);
    res.json({ chronicle, detail, cached: false });
  } catch (err) {
    next(err);
  }
});

function buildChronicleString(name: string, detail: Record<string, string>): string {
  const parts: string[] = [];
  if (detail.epithet) parts.push(`${name} ${detail.epithet}.`);
  if (detail.origin) parts.push(detail.origin.trim());
  if (detail.deeds) parts.push(detail.deeds.trim());
  return parts.slice(0, 3).join(" ");
}

// ─── GET /world/docs — Public World API documentation ──────────────────────────

router.get("/world/docs", (_req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "Melvor EQ2 — Public World API",
      version: "1.0.0",
      description: "Public endpoints for the Melvor EQ2 idle RPG world. No authentication required. Rate limited to 100 requests/minute per IP.",
    },
    servers: [{ url: "/api", description: "Current server" }],
    paths: {
      "/world/player/{id}": {
        get: {
          summary: "Single ghost player profile",
          description: "Returns the full profile for one player by numeric ID. Use id=-1 for the real player character.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Ghost player ID, or -1 for the real player" },
          ],
          responses: {
            "200": { description: "Player profile object", content: { "application/json": { schema: { "$ref": "#/components/schemas/WorldPlayer" } } } },
            "404": { description: "Player not found" },
          },
        },
      },
      "/world/players": {
        get: {
          summary: "List all world players (ghost + real)",
          description: "Returns all ghost players and the real player character, sorted by level descending.",
          parameters: [],
          responses: {
            "200": {
              description: "Array of player objects",
              content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/WorldPlayer" } } } },
            },
          },
        },
      },
      "/world/events": {
        get: {
          summary: "Recent world events",
          description: "Returns recent ghost activity events (kills, boss kills, travel, etc.).",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 }, description: "Max events to return" },
            { name: "zone", in: "query", schema: { type: "string" }, description: "Filter by zone name" },
            { name: "type", in: "query", schema: { type: "string" }, description: "Filter by event type (kill, travel, boss_kill, etc.)" },
          ],
          responses: { "200": { description: "Array of world events", content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/WorldEvent" } } } } } },
        },
      },
      "/world/leaderboard": {
        get: {
          summary: "Top 10 players by level and kills",
          description: "Returns the top 10 players ranked by level then kill count.",
          responses: { "200": { description: "Ranked player array" } },
        },
      },
      "/world/stats": {
        get: {
          summary: "World-wide aggregate statistics",
          description: "Returns total players, kills, boss kills, gold earned, average level, and total events.",
          responses: { "200": { description: "World stats object" } },
        },
      },
      "/world/zones": {
        get: {
          summary: "Player counts per zone",
          description: "Returns each zone with ghost count, real player count, and total.",
          responses: { "200": { description: "Zone player count array" } },
        },
      },
    },
    components: {
      schemas: {
        WorldPlayer: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            race: { type: "string" },
            class: { type: "string" },
            archetype: { type: "string" },
            level: { type: "integer" },
            killCount: { type: "integer" },
            bossKills: { type: "integer" },
            zone: { type: "string" },
            totalGoldEarned: { type: "integer" },
            isRealPlayer: { type: "boolean" },
          },
        },
        WorldEvent: {
          type: "object",
          properties: {
            id: { type: "integer" },
            playerId: { type: "integer" },
            playerName: { type: "string" },
            type: { type: "string", enum: ["kill", "boss_kill", "travel", "level_up", "craft", "loot", "rest", "faction_change", "ghost_spawn"] },
            zone: { type: "string" },
            description: { type: "string" },
            importance: { type: "integer", minimum: 1, maximum: 5 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  });
});

// ─── Admin: Reset ghost players ───────────────────────────────────────────────

const resetGhostsLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 3 });

router.post("/admin/reset-ghosts", resetGhostsLimiter, async (_req, res) => {
  try {
    await resetGhostPlayers();
    return res.json({ ok: true, message: "Ghost players reset successfully." });
  } catch (err) {
    console.error("[Admin] reset-ghosts error:", err);
    return res.status(500).json({ error: "Failed to reset ghost players." });
  }
});

export default router;
