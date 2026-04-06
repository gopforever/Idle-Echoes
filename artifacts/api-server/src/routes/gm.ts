/**
 * LLM Game Master Routes
 * AI-driven quest generation, NPC dialogue, lore, and boss narration
 * Uses gpt-5.2 for all content (quests, dialogue, lore, boss taunts, ghost quotes)
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questsTable, charactersTable, factionsTable, loreCacheTable, inventoryTable, bossEncountersTable } from "@workspace/db/schema";
import type { QuestObjective } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getOrCreateCharacter } from "./character.js";
import { progressTalkObjectives } from "../lib/questProgress.js";
import { rollItem } from "../lib/proceduralItems.js";
import { getEnemyById } from "../lib/gameData.js";

const router: IRouter = Router();

// ─── In-memory caches (non-persistent, fast access) ───────────────────────────
// Per-player-per-boss caches; key = `${playerId}_${bossId}_${phase}`
const bossNarrationCache = new Map<string, string>();
const bossClosingLineCache = new Map<string, string>();
const ghostQuoteCache = new Map<string, string>();
// Note: loreCache is DB-backed (loreCacheTable). No in-memory map needed.

// ─── Helper: safe OpenAI call with fallback ─────────────────────────────────
async function aiComplete(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string = "gpt-4o-mini",
  maxTokens: number = 300,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Quest Difficulty Scaling ─────────────────────────────────────────────────
function getDifficultyConfig(level: number) {
  if (level < 10) return { difficulty: "easy",   xpReward: level * 50,  goldReward: level * 15 };
  if (level < 20) return { difficulty: "normal", xpReward: level * 80,  goldReward: level * 25 };
  if (level < 35) return { difficulty: "hard",   xpReward: level * 120, goldReward: level * 40 };
  return              { difficulty: "epic",   xpReward: level * 200, goldReward: level * 70 };
}

// ─── Internal: generate and save a batch of quests ───────────────────────────
export async function generateQuestBatch(characterId: number, count: number = 3): Promise<typeof questsTable.$inferSelect[]> {
  const character = await getOrCreateCharacter(characterId);
  const { difficulty: difficultyConfig, xpReward, goldReward } = getDifficultyConfig(character.level);

  // Gather faction standings for context
  const STANDING_TITLES = ["Hated", "Threatening", "Apprehensive", "Dubious", "Indifferent", "Amiable", "Kindly", "Warmly", "Ally"];
  const standingToTitle = (s: number) => STANDING_TITLES[Math.min(8, Math.max(0, Math.floor((s + 2000) / (42000 / 8))))];
  const factions = await db.select({ factionId: factionsTable.factionId, standing: factionsTable.standing })
    .from(factionsTable).where(eq(factionsTable.characterId, characterId)).limit(4);
  const factionContext = factions.map(f => `${f.factionId}: ${standingToTitle(f.standing)} (${f.standing > 0 ? "+" : ""}${f.standing})`).join(", ");

  const prompt = `You are the Game Master of Norrath, world of EverQuest 2.
Generate exactly ${count} unique lore-rich quests for a level ${character.level} ${character.race} ${character.class} named ${character.name}.
Context:
- Current zone: ${character.zone}
- Total kills: ${character.killCount ?? 0}
- Alignment: ${character.alignment ?? "Neutral"}
- Faction standings: ${factionContext || "none yet"}
- Difficulty tier: ${difficultyConfig}

Respond with ONLY a valid JSON array (no markdown, no code block):
[
  {
    "title": "Quest title (max 8 words)",
    "description": "2-3 sentence quest description with EQ2 lore flavor",
    "objectives": [
      { "text": "Kill 5 Rabid Wolves", "type": "kill", "target": "Rabid Wolf", "total": 5, "progress": 0, "completed": false },
      { "text": "Collect Mystic Herb from the ruins", "type": "collect", "target": "Mystic Herb", "total": 3, "progress": 0, "completed": false },
      { "text": "Reach Amiable standing with the Far Seas Trading Company", "type": "faction", "target": "Far Seas Trading Company", "total": 1, "progress": 0, "completed": false }
    ],
    "rewards": { "xp": 500, "gold": 25, "item": "Worn Soldier's Blade", "aaXp": 50 },
    "lore": "1-2 sentence backstory with EQ2 zone lore",
    "zone": "${character.zone}",
    "difficulty": "${difficultyConfig}"
  }
]

Each quest must have 2-4 objectives mixing types from: kill (with enemy name + count), collect (item name + count), explore (zone name), talk (NPC name), faction (faction name + standing target).
Include at least one faction objective per quest that references a faction from the player's current standings.
Rewards must include realistic xp (100–2000), gold (5–200), a specific item name (EQ2 gear/consumable), and aaXp (10–200).
Make objectives specific to the zone and class. Vary quest themes — do not repeat same enemy type across quests.`;

  const raw = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", Math.min(4000, count * 900));

  let parsed: Array<{
    title: string; description: string;
    objectives: QuestObjective[];
    rewards?: { xp?: number; gold?: number; item?: string; aaXp?: number };
    lore: string; zone: string; difficulty: string;
  }>;

  try {
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) parsed = [parsed];
  } catch {
    throw new Error(`Failed to parse AI response: ${raw.slice(0, 200)}`);
  }

  const inserted = await db.insert(questsTable).values(
    parsed.map((q) => ({
      characterId,
      title: q.title,
      description: q.description,
      objectives: q.objectives.map(obj => ({
        text: obj.text,
        completed: false,
        progress: 0,
        total: obj.total ?? 1,
        type: obj.type ?? "kill",
        target: obj.target,
      } as QuestObjective)),
      rewards: {
        xp: q.rewards?.xp ?? xpReward,
        gold: q.rewards?.gold ?? goldReward,
        item: q.rewards?.item,
        aaXp: q.rewards?.aaXp ?? Math.floor(xpReward * 0.1),
      },
      zone: q.zone ?? character.zone,
      difficulty: q.difficulty ?? difficultyConfig,
      lore: q.lore,
      completed: false,
    }))
  ).returning();

  return inserted;
}

// ─── POST /quests/generate ────────────────────────────────────────────────────
router.post("/quests/generate", async (req, res) => {
  try {
    // Generate 3–5 new quests per call (random in range)
    const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const quests = await generateQuestBatch(req.characterId, count);
    res.json(quests);
  } catch (err) {
    req.log.error({ err }, "Error generating quests");
    res.status(500).json({ error: "Failed to generate quests" });
  }
});

// ─── GET /quests ──────────────────────────────────────────────────────────────
router.get("/quests", async (req, res) => {
  try {
    const quests = await db.select().from(questsTable)
      .where(eq(questsTable.characterId, req.characterId))
      .orderBy(desc(questsTable.createdAt)).limit(20);
    res.json(quests);
  } catch (err) {
    req.log.error({ err }, "Error getting quests");
    res.status(500).json({ error: "Failed to get quests" });
  }
});

// ─── PATCH /quests/:id/complete ───────────────────────────────────────────────
router.patch("/quests/:id/complete", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid quest ID" }); return; }

    const [quest] = await db.select().from(questsTable)
      .where(and(eq(questsTable.id, id), eq(questsTable.characterId, req.characterId))).limit(1);
    if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }
    if (quest.completed) { res.json({ quest, message: "Already completed", reward: null }); return; }

    // Enforce objective gating — reject if any objective is incomplete
    const objectives = quest.objectives as import("@workspace/db/schema").QuestObjective[];
    const allDone = objectives.length === 0 || objectives.every(o => o.completed);
    if (!allDone) {
      res.status(400).json({
        error: "Quest objectives not yet complete",
        remaining: objectives.filter(o => !o.completed).map(o => o.text),
      }); return;
    }

    const [updated] = await db.update(questsTable)
      .set({ completed: true, completedAt: new Date() })
      .where(and(eq(questsTable.id, id), eq(questsTable.characterId, req.characterId)))
      .returning();

    // Award XP, gold, AA XP, and item
    const rewards = quest.rewards as { xp?: number; gold?: number; item?: string; aaXp?: number };
    const character = await getOrCreateCharacter(req.characterId);
    const newGold = character.gold + (rewards.gold ?? 0);
    const newXp = character.xp + (rewards.xp ?? 0);
    const newAaPoints = character.aaPoints + Math.floor((rewards.aaXp ?? 0) / 10);
    await db.update(charactersTable)
      .set({ gold: newGold, xp: newXp, aaPoints: newAaPoints, updatedAt: new Date() })
      .where(eq(charactersTable.id, character.id));

    // Grant reward item to inventory if specified
    if (rewards.item) {
      const itemId = rewards.item.toLowerCase().replace(/\s+/g, "_");
      const itemData: Record<string, unknown> = { id: itemId, name: rewards.item, type: "quest_reward", rarity: "uncommon", level: character.level, stats: {}, sellPrice: 10 };
      const [existing] = await db.select().from(inventoryTable).where(and(eq(inventoryTable.characterId, character.id), eq(inventoryTable.itemId, itemId)));
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + 1 }).where(eq(inventoryTable.id, existing.id));
      } else {
        await db.insert(inventoryTable).values({ characterId: character.id, itemId, itemData, quantity: 1 });
      }
    }

    // Auto-generate replacement quest batch (fire-and-forget)
    generateQuestBatch(req.characterId, 1).catch(() => {});

    const parts = [`${rewards.xp ?? 0} XP`, `${rewards.gold ?? 0}g`, `${rewards.aaXp ?? 0} AA XP`];
    if (rewards.item) parts.push(rewards.item);
    res.json({ quest: updated, reward: rewards, message: `Quest complete! Earned ${parts.join(", ")}` });
  } catch (err) {
    req.log.error({ err }, "Error completing quest");
    res.status(500).json({ error: "Failed to complete quest" });
  }
});

// ─── POST /quests/:id/progress ────────────────────────────────────────────────
// Called internally by combat to advance kill/collect objectives
router.post("/quests/:id/progress", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { objectiveIndex, increment } = req.body as { objectiveIndex: number; increment?: number };

    const [quest] = await db.select().from(questsTable)
      .where(and(eq(questsTable.id, id), eq(questsTable.characterId, req.characterId))).limit(1);
    if (!quest || quest.completed) { res.status(404).json({ error: "Quest not found or completed" }); return; }

    const objectives = (quest.objectives as QuestObjective[]).map((obj, i) => {
      if (i !== objectiveIndex || obj.completed) return obj;
      const newProgress = Math.min(obj.total, obj.progress + (increment ?? 1));
      return { ...obj, progress: newProgress, completed: newProgress >= obj.total };
    });

    const allDone = objectives.every(o => o.completed);
    const [updated] = await db.update(questsTable)
      .set({
        objectives,
        ...(allDone ? { completed: true, completedAt: new Date() } : {}),
      })
      .where(and(eq(questsTable.id, id), eq(questsTable.characterId, req.characterId)))
      .returning();

    if (allDone) {
      // Award rewards automatically
      const rewards = quest.rewards as { xp?: number; gold?: number };
      const character = await getOrCreateCharacter(req.characterId);
      await db.update(charactersTable)
        .set({ gold: character.gold + (rewards.gold ?? 0), xp: character.xp + (rewards.xp ?? 0), updatedAt: new Date() })
        .where(eq(charactersTable.id, character.id));
      // Auto-replace with new quest
      generateQuestBatch(req.characterId, 1).catch(() => {});
    }

    res.json({ quest: updated, allCompleted: allDone });
  } catch (err) {
    req.log.error({ err }, "Error progressing quest objective");
    res.status(500).json({ error: "Failed to progress objective" });
  }
});

// ─── POST /npc/dialogue ───────────────────────────────────────────────────────
router.post("/npc/dialogue", async (req, res) => {
  try {
    const { npcName, npcRole, playerMessage, context } = req.body as {
      npcName: string;
      npcRole?: string;
      playerMessage: string;
      context?: string;
    };

    if (!npcName || !playerMessage) {
      res.status(400).json({ error: "npcName and playerMessage are required" }); return;
    }

    const character = await getOrCreateCharacter(req.characterId);
    const role = npcRole ?? "merchant";

    const systemPrompt = `You are ${npcName}, a ${role} in the world of Norrath (EverQuest 2 setting).
You speak in character — gruff, friendly, mysterious, or scheming depending on your role.
The player is a ${character.level} ${character.race} ${character.class} named ${character.name}, currently in ${character.zone}.
${context ? `Context: ${context}` : ""}
Keep responses to 2-4 sentences. Be immersive and lore-appropriate. Use EQ2 lore and place names naturally.`;

    const reply = await aiComplete([
      { role: "system", content: systemPrompt },
      { role: "user", content: playerMessage },
    ], "gpt-4o-mini", 200);

    // Advance any "talk to NPC" quest objectives for this NPC (fire-and-forget)
    progressTalkObjectives(npcName).catch(() => {});

    res.json({ npcName, reply, role });
  } catch (err) {
    req.log.error({ err }, "Error generating NPC dialogue");
    res.status(500).json({ error: "Failed to generate dialogue" });
  }
});

// ─── GET /character/lore ──────────────────────────────────────────────────────
router.get("/character/lore", async (req, res) => {
  try {
    const character = await getOrCreateCharacter(req.characterId);
    const cacheKey = `lore_${character.id}_${character.race}_${character.class}_lv${character.level}`;

    // DB-backed cache check
    const [cached] = await db.select().from(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey)).limit(1);
    if (cached) {
      res.json({ lore: cached.content, cached: true }); return;
    }

    const prompt = `You are the chronicler of Norrath's heroes. Write a three-paragraph personal biography for this adventurer in EverQuest 2 lore style:
- Name: ${character.name}
- Race: ${character.race}
- Class: ${character.class}
- Level: ${character.level}
- Alignment: ${character.alignment ?? "Neutral"}
- Current Zone: ${character.zone}
- Kills: ${character.killCount ?? 0}
- Gold earned: ${character.totalGoldEarned ?? 0}

Paragraph 1 — Origins: Describe the character's race homeland, birth circumstances, and early life. Reference EQ2 racial lore (e.g. Qeynos, Freeport, Kelethin, Neriak, Gorowyn).
Paragraph 2 — Calling: Describe how they discovered and trained in their class path, their early adventures, and defining moments that shaped their fighting style and outlook.
Paragraph 3 — Current Legend: Describe their current deeds, reputation in ${character.zone}, and the legend forming around their name among Norrath's denizens.

Write in third-person chronicle voice — evocative, heroic, mythic. Separate paragraphs with a blank line. No headers or bullet points.`;

    const lore = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", 700);

    // Persist to DB cache
    await db.insert(loreCacheTable).values({ cacheKey, content: lore })
      .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: lore } });

    res.json({ lore, cached: false });
  } catch (err) {
    req.log.error({ err }, "Error generating character lore");
    res.status(500).json({ error: "Failed to generate lore" });
  }
});

// ─── GET /world/player/by-name/:name/quote ────────────────────────────────────
router.get("/world/player/by-name/:name/quote", async (req, res) => {
  try {
    const playerName = req.params.name;
    const cacheKey = `name_${playerName}`;
    if (ghostQuoteCache.has(cacheKey)) {
      res.json({ quote: ghostQuoteCache.get(cacheKey), cached: true }); return;
    }

    const { worldPlayersTable } = await import("@workspace/db/schema");
    const players = await db.select().from(worldPlayersTable).limit(50);
    const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());

    if (!player) {
      // Still generate a quote with just the name
      const prompt = `Generate a short, in-character quote (1-2 sentences) for an adventurer named ${playerName} exploring Norrath. No quotation marks.`;
      const quote = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", 80);
      if (quote) ghostQuoteCache.set(cacheKey, quote);
      res.json({ quote, cached: false }); return;
    }

    const prompt = `Generate a short, in-character quote (1-2 sentences) for a ${player.level} ${player.race} ${player.class} adventurer named ${player.name} who has ${player.killCount} kills and is exploring ${player.zone} in Norrath. No quotation marks.`;
    const quote = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", 100);
    if (quote) ghostQuoteCache.set(cacheKey, quote);
    res.json({ quote, cached: false });
  } catch (err) {
    req.log.error({ err }, "Error generating player quote by name");
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

// ─── GET /world/player/:id/quote ──────────────────────────────────────────────
router.get("/world/player/:id/quote", async (req, res) => {
  try {
    const playerId = req.params.id;
    if (ghostQuoteCache.has(playerId)) {
      res.json({ quote: ghostQuoteCache.get(playerId), cached: true }); return;
    }

    const { worldPlayersTable } = await import("@workspace/db/schema");
    const [player] = await db.select().from(worldPlayersTable).where(eq(worldPlayersTable.id, parseInt(playerId, 10))).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

    const prompt = `Generate a short, in-character quote (1-2 sentences) for a ${player.level} ${player.race} ${player.class} adventurer named ${player.name} who has ${player.killCount} kills and is exploring ${player.zone} in Norrath.
Make it feel authentic to their race/class archetype. No quotation marks around the text.`;

    const quote = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", 100);
    if (quote) {
      ghostQuoteCache.set(playerId, quote);
    }

    res.json({ quote, cached: false });
  } catch (err) {
    req.log.error({ err }, "Error generating player quote");
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

// ─── GET /combat/boss-narration/:bossId ───────────────────────────────────────
export const BOSS_LORE: Record<string, { name: string; type: string; zone: string }> = {
  commonlands_boss:    { name: "Gnoll Warchief",         type: "beast warlord",           zone: "the Commonlands" },
  antonica_boss:       { name: "Bloodskull Champion",    type: "orcish champion",          zone: "Antonica" },
  steppes_boss:        { name: "Stonemite Elder",        type: "ancient stone elemental",  zone: "Thundering Steppes" },
  nektulos_boss:       { name: "Noctivagant Overlord",   type: "undead horror",            zone: "Nektulos Forest" },
  enchanted_boss:      { name: "Darkfae Queen",          type: "corrupted fae spirit",     zone: "the Enchanted Lands" },
  zek_boss:            { name: "Rallosian Demi-god",     type: "divine warrior of Rallos", zone: "Zek, the Orcish Wastes" },
  everfrost_boss:      { name: "Permafrost Guardian",    type: "frost elemental titan",    zone: "Everfrost Peaks" },
  lavastorm_boss:      { name: "Nagafen's Chosen",       type: "dragon-blooded champion",  zone: "Lavastorm Mountains" },
  lesser_faydark_boss: { name: "Faerie Dragon",          type: "corrupted dragon",         zone: "Lesser Faydark" },
  feerrott_boss:       { name: "Temple Guardian",        type: "ancient construct",        zone: "the Feerrott" },
  bb_gnoll_overseer:     { name: "Overseer Grarg",          type: "gnoll floor overseer",     zone: "Blackburrow" },
  bb_gnoll_battlemaster: { name: "Battlemaster Krix",       type: "gnoll battlemaster",       zone: "Blackburrow" },
  bb_gnoll_high_shaman:  { name: "High Shaman Vrix",        type: "gnoll high shaman",        zone: "Blackburrow" },
  bb_gnoll_general:      { name: "General Kraggoth",        type: "gnoll general",            zone: "Blackburrow" },
  bb_gnoll_throne_guardian:{ name: "Throne Guardian Vargoth", type: "gnoll throne guardian",   zone: "Blackburrow" },
  bb_gnoll_warlord_prime:{ name: "Warlord Prime Skraag",    type: "gnoll warlord",            zone: "Blackburrow" },
  bb_overlord_narlock:   { name: "Overlord Narlock",        type: "supreme gnoll overlord",   zone: "Blackburrow" },
};

/** Invalidate cached boss narration/closing lines for a specific player+boss combo.
 *  Call this whenever encounter records change so the next fight gets fresh history-aware dialogue. */
export function invalidateBossNarrationCache(playerId: number, bossId: string): void {
  for (const phase of ["intro", "death"] as const) {
    bossNarrationCache.delete(`${playerId}_${bossId}_${phase}`);
    bossNarrationCache.delete(`${bossId}_${phase}`); // legacy key
  }
  for (const outcome of ["playerWon", "bossWon"] as const) {
    bossClosingLineCache.delete(`close_${playerId}_${bossId}_${outcome}`);
    bossClosingLineCache.delete(`close_${bossId}_${outcome}`); // legacy key
  }
}

export interface BossEncounterContext {
  playerKills: number;
  bossKills: number;
  grudgeLevel: number;
  lastKillingAbility?: string | null;
  personality?: string;
}

function personalityTone(personality?: string): string {
  switch (personality) {
    case "arrogant": return "arrogant, contemptuous, and supremely self-assured";
    case "cold": return "cold, calculating, and utterly emotionless";
    case "ancient": return "ancient, weary, and speaking from millennia of experience";
    case "feral": return "savage, animalistic, and driven by primal fury";
    case "cunning": return "sly, manipulative, and always playing a deeper game";
    default: return "menacing and lore-appropriate";
  }
}

export async function generateBossNarration(
  bossId: string,
  phase: "intro" | "death",
  character: { name: string; race: string; class: string; level: number; zone: string },
  encounterCtx?: BossEncounterContext,
  playerId?: number,
): Promise<string> {
  // Per-player-per-boss caching so each player gets their own history-aware dialogue
  const cacheKey = playerId ? `${playerId}_${bossId}_${phase}` : `${bossId}_${phase}`;
  if (bossNarrationCache.has(cacheKey)) return bossNarrationCache.get(cacheKey)!;

  const boss = BOSS_LORE[bossId] ?? { name: bossId, type: "fearsome boss", zone: character.zone };
  const tone = personalityTone(encounterCtx?.personality);

  let historyContext = "";
  if (encounterCtx) {
    const { playerKills, bossKills, grudgeLevel, lastKillingAbility } = encounterCtx;
    if (phase === "intro") {
      if (playerKills === 0 && bossKills === 0) {
        historyContext = "This is the first time they have faced each other.";
      } else if (playerKills > 0 && bossKills === 0) {
        historyContext = `The adventurer has killed this boss ${playerKills} time(s) before — the boss seethes with wounded pride and grudge (grudge level ${grudgeLevel}).`;
      } else if (bossKills > 0 && playerKills === 0) {
        historyContext = `The boss has killed this adventurer ${bossKills} time(s) before.${lastKillingAbility ? ` Last time, ${lastKillingAbility} delivered the killing blow.` : ""}`;
      } else {
        historyContext = `They have fought many times. The adventurer has won ${playerKills} time(s); the boss has won ${bossKills} time(s).${grudgeLevel >= 3 ? " The boss is ENRAGED — this grudge has festered too long." : ""}`;
      }
    } else {
      if (playerKills >= 1) {
        historyContext = `This is the ${playerKills + 1}th time the adventurer has defeated this boss. Acknowledge defeat with bitter acknowledgment of their shared history.`;
      } else {
        historyContext = `The boss falls in defeat. This was their first encounter.`;
      }
    }
  }

  const userContent = phase === "death"
    ? `Write the dramatic death speech of ${boss.name}, a ${boss.type} in ${boss.zone}, as they are defeated by ${character.name} the ${character.race} ${character.class}. ${historyContext} Tone: ${tone}. 1-2 sentences. No quotes, no stage directions.`
    : `Write the battle cry/opening taunt of ${boss.name}, a ${boss.type} in ${boss.zone}, confronting ${character.name} the level ${character.level} ${character.race} ${character.class}. ${historyContext} Tone: ${tone}. 1-2 sentences. No quotes, no stage directions.`;

  const narration = await aiComplete([
    { role: "system", content: "You are a dungeon narrator for an EverQuest 2 idle RPG. Respond only with the requested boss speech — no quotation marks, no stage directions, no meta-commentary." },
    { role: "user", content: userContent },
  ], "gpt-4o-mini", 150);
  if (narration) bossNarrationCache.set(cacheKey, narration);
  return narration;
}

export async function generateBossClosingLine(
  bossId: string,
  outcome: "playerWon" | "bossWon",
  character: { name: string; race: string; class: string; level: number },
  encounterCtx?: BossEncounterContext,
  playerId?: number,
): Promise<string> {
  const cacheKey = playerId ? `close_${playerId}_${bossId}_${outcome}` : `close_${bossId}_${outcome}`;
  if (bossClosingLineCache.has(cacheKey)) return bossClosingLineCache.get(cacheKey)!;

  const boss = BOSS_LORE[bossId] ?? { name: bossId, type: "fearsome boss", zone: "Norrath" };
  const tone = personalityTone(encounterCtx?.personality);

  const historyLine = encounterCtx
    ? (outcome === "playerWon"
      ? `The adventurer has now defeated this boss ${encounterCtx.playerKills || 1} time(s) in total.`
      : `The boss has now slain this adventurer ${encounterCtx.bossKills || 1} time(s) in total.`)
    : "";

  const prompt = outcome === "playerWon"
    ? `Write a single closing line from ${boss.name} as they are defeated by ${character.name} the ${character.race} ${character.class}. ${historyLine} Tone: ${tone}. 1 sentence. Bitter, ominous, or defiant. No quotes.`
    : `Write a single closing line from ${boss.name} after they kill ${character.name} the ${character.race} ${character.class}. ${historyLine} Tone: ${tone}. 1 sentence. Contemptuous or cold. No quotes.`;

  const line = await aiComplete([
    { role: "system", content: "You are a boss villain in EverQuest 2. Speak only the closing line — no quotation marks, no stage directions." },
    { role: "user", content: prompt },
  ], "gpt-4o-mini", 100);
  if (line) bossClosingLineCache.set(cacheKey, line);
  return line;
}

router.get("/combat/boss-narration/:bossId", async (req, res) => {
  try {
    const { bossId } = req.params;
    const { phase } = req.query as { phase?: string };
    const resolvedPhase: "intro" | "death" = phase === "death" ? "death" : "intro";
    const character = await getOrCreateCharacter(req.characterId);

    // Load encounter history for this character + boss
    const [encounter] = await db.select().from(bossEncountersTable)
      .where(and(eq(bossEncountersTable.playerId, character.id), eq(bossEncountersTable.bossId, bossId)))
      .limit(1);

    const enemyData = getEnemyById(bossId);
    const personality = (enemyData as { personality?: string } | undefined)?.personality;

    const encounterCtx: BossEncounterContext | undefined = encounter ? {
      playerKills: encounter.playerKills,
      bossKills: encounter.bossKills,
      grudgeLevel: encounter.grudgeLevel,
      lastKillingAbility: encounter.lastKillingAbility,
      personality,
    } : (personality ? { playerKills: 0, bossKills: 0, grudgeLevel: 0, personality } : undefined);

    const cacheKey = `${character.id}_${bossId}_${resolvedPhase}`;
    const wasCached = bossNarrationCache.has(cacheKey);
    const narration = await generateBossNarration(bossId, resolvedPhase, character, encounterCtx, character.id);
    res.json({ narration, bossId, phase: resolvedPhase, cached: wasCached });
  } catch (err) {
    req.log.error({ err }, "Error generating boss narration");
    res.status(500).json({ error: "Failed to generate narration" });
  }
});

// ─── Named Unique Item Generation (boss drops) ────────────────────────────────

/**
 * Generate a named unique item for a boss drop with AI-crafted name, lore,
 * and scaled stats. Maintains a stable pool of 3-5 named items per boss, cached
 * in loreCacheTable as boss_drop_{bossId}. Each boss kill samples from this pool.
 */
export async function generateNamedItem(
  bossId: string,
  zone: string,
  level: number,
  character: { name: string; race: string; class: string },
): Promise<{ item: import("../lib/proceduralItems.js").ProceduralItem; lore: string } | null> {
  try {
    const cacheKey = `boss_drop_${bossId}`;
    const [cached] = await db.select().from(loreCacheTable).where(eq(loreCacheTable.cacheKey, cacheKey)).limit(1);

    type PoolEntry = import("../lib/proceduralItems.js").ProceduralItem & { lore: string };

    // Cache hit: sample a random item from the existing pool
    if (cached) {
      const pool = JSON.parse(cached.content) as PoolEntry[];
      if (pool.length > 0) {
        const entry = pool[Math.floor(Math.random() * pool.length)];
        const { lore, ...item } = entry;
        return { item: item as import("../lib/proceduralItems.js").ProceduralItem, lore };
      }
    }

    const bossLore = BOSS_LORE[bossId];
    const bossName = bossLore?.name ?? bossId;

    // First kill: generate a pool of 3–5 stable named items for this boss
    const poolSize = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const rarities = ["legendary", "legendary", "fabled"] as const;

    const prompt = `You are the item lore writer for an EverQuest 2 idle RPG.
${bossName} is a boss in ${zone} (character level ~${level}).
Generate exactly ${poolSize} unique named items that ${bossName} could drop.

Respond with ONLY valid JSON array (no markdown):
[
  {
    "name": "Short item name (3-5 words, e.g. 'Gnoll Warchief's Cleaver')",
    "lore": "1-2 sentence item lore tied to ${bossName} and ${zone}. Atmospheric, EQ2-style."
  }
]`;

    const raw = await aiComplete([{ role: "user", content: prompt }], "gpt-4o-mini", 600);
    let nameLorePairs: { name: string; lore: string }[] = [];
    try {
      const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        nameLorePairs = parsed.filter(e => e && typeof e.name === "string" && typeof e.lore === "string");
      }
    } catch {
      // Fallback: create one entry with no AI name
    }

    // Build pool entries — one base item per name/lore pair
    const pool: PoolEntry[] = nameLorePairs.map(({ name, lore }) => {
      const forceRarity = rarities[Math.floor(Math.random() * rarities.length)];
      const base = rollItem(zone, level, forceRarity);
      return { ...base, name, description: lore, lore };
    });

    // Fallback: guarantee at least one item if AI generation failed
    if (pool.length === 0) {
      const forceRarity = rarities[Math.floor(Math.random() * rarities.length)];
      const base = rollItem(zone, level, forceRarity);
      pool.push({ ...base, lore: base.description });
    }

    // Persist the full pool — future kills sample from this stable set
    const cacheContent = JSON.stringify(pool);
    await db.insert(loreCacheTable).values({ cacheKey, content: cacheContent })
      .onConflictDoUpdate({ target: loreCacheTable.cacheKey, set: { content: cacheContent } });

    const entry = pool[Math.floor(Math.random() * pool.length)];
    const { lore, ...item } = entry;
    return { item: item as import("../lib/proceduralItems.js").ProceduralItem, lore };
  } catch {
    return null;
  }
}

export default router;
