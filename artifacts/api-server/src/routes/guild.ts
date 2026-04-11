import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  guildsTable,
  guildMembersTable,
  charactersTable,
  worldPlayersTable,
} from "@workspace/db/schema";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

// ─── Contribution score formula ───────────────────────────────────────────────

function computeContribution(char: {
  level: number;
  killCount: number;
  bossKills: number;
  heroicCompleted: number;
}): number {
  return (
    char.level * 100 +
    Math.floor(char.killCount * 0.5) +
    char.bossKills * 10 +
    char.heroicCompleted * 100
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidGuildName(name: string): boolean {
  return /^[A-Za-z0-9 ']{3,30}$/.test(name.trim());
}

function isValidTag(tag: string): boolean {
  return /^[A-Z0-9]{2,5}$/.test(tag.trim());
}

// ─── GET /guild — my guild ────────────────────────────────────────────────────

router.get("/guild", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) {
      return res.json(null);
    }

    const [guild] = await db
      .select()
      .from(guildsTable)
      .where(eq(guildsTable.id, membership.guildId))
      .limit(1);

    if (!guild) {
      return res.json(null);
    }

    const members = await buildGuildMembers(guild.id);
    return res.json({ guild, membership, members });
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/leaderboard ───────────────────────────────────────────────────

router.get("/guild/leaderboard", requireAuth, async (req, res, next) => {
  try {
    // Aggregate member contribution_points per guild
    const scores = await db
      .select({
        guildId: guildMembersTable.guildId,
        totalScore: sql<number>`cast(sum(${guildMembersTable.contributionPoints}) as float)`,
        memberCount: sql<number>`cast(count(*) as int)`,
      })
      .from(guildMembersTable)
      .groupBy(guildMembersTable.guildId);

    const scoreMap = new Map(scores.map(s => [s.guildId, s]));

    const allGuilds = await db
      .select()
      .from(guildsTable)
      .orderBy(guildsTable.name);

    const ranked = allGuilds
      .map(guild => {
        const agg = scoreMap.get(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          tag: guild.tag,
          alignment: guild.alignment,
          description: guild.description,
          motto: guild.motto,
          isGhost: guild.isGhost,
          score: Math.round(agg?.totalScore ?? 0),
          memberCount: agg?.memberCount ?? 0,
          bankGold: guild.bankGold,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((g, i) => ({ ...g, rank: i + 1 }));

    return res.json(ranked);
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/:id — any guild by id ────────────────────────────────────────

router.get("/guild/:id", requireAuth, async (req, res, next) => {
  try {
    const guildId = parseInt(req.params.id, 10);
    if (isNaN(guildId)) return res.status(400).json({ error: "Invalid guild ID" });

    const [guild] = await db
      .select()
      .from(guildsTable)
      .where(eq(guildsTable.id, guildId))
      .limit(1);

    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const members = await buildGuildMembers(guild.id);
    return res.json({ guild, members });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/create ───────────────────────────────────────────────────────

router.post("/guild/create", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { name, tag, description = "", alignment = "Neutral", motto = "" } = req.body;

    if (!name || !tag) {
      return res.status(400).json({ error: "name and tag are required" });
    }

    const trimmedName = String(name).trim();
    const trimmedTag  = String(tag).trim().toUpperCase();

    if (!isValidGuildName(trimmedName)) {
      return res.status(400).json({ error: "Guild name must be 3–30 characters (letters, numbers, spaces, apostrophes)" });
    }
    if (!isValidTag(trimmedTag)) {
      return res.status(400).json({ error: "Tag must be 2–5 uppercase letters/numbers (e.g. IRON)" });
    }
    if (!["Qeynos", "Freeport", "Neutral"].includes(alignment)) {
      return res.status(400).json({ error: "alignment must be Qeynos, Freeport, or Neutral" });
    }

    // Ensure not already in a guild
    const [existingMembership] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (existingMembership) {
      return res.status(409).json({ error: "You are already in a guild. Leave it before creating a new one." });
    }

    // Name / tag uniqueness
    const [nameConflict] = await db
      .select({ id: guildsTable.id })
      .from(guildsTable)
      .where(eq(guildsTable.name, trimmedName))
      .limit(1);
    if (nameConflict) return res.status(409).json({ error: "A guild with that name already exists" });

    const [tagConflict] = await db
      .select({ id: guildsTable.id })
      .from(guildsTable)
      .where(eq(guildsTable.tag, trimmedTag))
      .limit(1);
    if (tagConflict) return res.status(409).json({ error: "A guild with that tag already exists" });

    // Fetch character for contribution calculation
    const [char] = await db
      .select({ level: charactersTable.level, killCount: charactersTable.killCount, bossKills: charactersTable.bossKills, heroicCompleted: charactersTable.heroicCompleted })
      .from(charactersTable)
      .where(eq(charactersTable.id, characterId))
      .limit(1);

    if (!char) return res.status(404).json({ error: "Character not found" });

    const [guild] = await db.transaction(async (tx) => {
      const [newGuild] = await tx
        .insert(guildsTable)
        .values({
          name: trimmedName,
          tag: trimmedTag,
          description: String(description).slice(0, 200),
          motto: String(motto).slice(0, 80),
          alignment,
          leaderId: characterId,
          isGhost: false,
          bankGold: 0,
        })
        .returning();

      await tx.insert(guildMembersTable).values({
        guildId: newGuild.id,
        characterId,
        rank: "leader",
        contributionPoints: computeContribution(char),
      });

      return [newGuild];
    });

    const members = await buildGuildMembers(guild.id);
    return res.status(201).json({ guild, members });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "A guild with that name or tag already exists" });
    }
    next(err);
  }
});

// ─── PATCH /guild — update guild info (leader/officer) ────────────────────────

router.patch("/guild", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can edit guild info" });
    }

    const { description, motto } = req.body;
    const updates: Partial<typeof guildsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (description !== undefined) updates.description = String(description).slice(0, 200);
    if (motto !== undefined)       updates.motto       = String(motto).slice(0, 80);

    const [updated] = await db
      .update(guildsTable)
      .set(updates)
      .where(eq(guildsTable.id, membership.guildId))
      .returning();

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/invite — invite by character name ────────────────────────────

router.post("/guild/invite", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { characterName } = req.body;

    if (!characterName) return res.status(400).json({ error: "characterName is required" });

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can invite members" });
    }

    // Look up target character by name (case-insensitive)
    const [target] = await db
      .select({ id: charactersTable.id, name: charactersTable.name, level: charactersTable.level, killCount: charactersTable.killCount, bossKills: charactersTable.bossKills, heroicCompleted: charactersTable.heroicCompleted })
      .from(charactersTable)
      .where(sql`lower(${charactersTable.name}) = lower(${characterName})`)
      .limit(1);

    if (!target) return res.status(404).json({ error: "Character not found" });
    if (target.id === characterId) return res.status(400).json({ error: "You cannot invite yourself" });

    // Check target not already in a guild
    const [targetMembership] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, target.id))
      .limit(1);

    if (targetMembership) {
      return res.status(409).json({ error: `${target.name} is already in a guild` });
    }

    await db.insert(guildMembersTable).values({
      guildId: membership.guildId,
      characterId: target.id,
      rank: "member",
      contributionPoints: computeContribution(target),
    });

    return res.json({ ok: true, characterName: target.name });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/kick — kick a member ────────────────────────────────────────

router.post("/guild/kick", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { targetCharacterId } = req.body;

    if (!targetCharacterId) return res.status(400).json({ error: "targetCharacterId is required" });
    const targetId = Number(targetCharacterId);

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can kick members" });
    }

    const [targetMembership] = await db
      .select()
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.characterId, targetId),
        eq(guildMembersTable.guildId, membership.guildId),
      ))
      .limit(1);

    if (!targetMembership) return res.status(404).json({ error: "Member not found in your guild" });
    if (targetMembership.rank === "leader") {
      return res.status(403).json({ error: "Cannot kick the guild leader" });
    }
    if (membership.rank === "officer" && targetMembership.rank === "officer") {
      return res.status(403).json({ error: "Officers cannot kick other officers" });
    }

    await db.delete(guildMembersTable).where(eq(guildMembersTable.id, targetMembership.id));
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/promote — promote member to officer (leader only) ────────────

router.post("/guild/promote", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { targetCharacterId } = req.body;

    if (!targetCharacterId) return res.status(400).json({ error: "targetCharacterId is required" });
    const targetId = Number(targetCharacterId);

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership || membership.rank !== "leader") {
      return res.status(403).json({ error: "Only the guild leader can promote members" });
    }

    const [targetMembership] = await db
      .select()
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.characterId, targetId),
        eq(guildMembersTable.guildId, membership.guildId),
      ))
      .limit(1);

    if (!targetMembership) return res.status(404).json({ error: "Member not found" });
    if (targetMembership.rank !== "member") {
      return res.status(400).json({ error: "Only members can be promoted to officer" });
    }

    await db.update(guildMembersTable)
      .set({ rank: "officer" })
      .where(eq(guildMembersTable.id, targetMembership.id));

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/demote — demote officer to member (leader only) ──────────────

router.post("/guild/demote", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { targetCharacterId } = req.body;

    if (!targetCharacterId) return res.status(400).json({ error: "targetCharacterId is required" });
    const targetId = Number(targetCharacterId);

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership || membership.rank !== "leader") {
      return res.status(403).json({ error: "Only the guild leader can demote members" });
    }

    const [targetMembership] = await db
      .select()
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.characterId, targetId),
        eq(guildMembersTable.guildId, membership.guildId),
      ))
      .limit(1);

    if (!targetMembership) return res.status(404).json({ error: "Member not found" });
    if (targetMembership.rank !== "officer") {
      return res.status(400).json({ error: "Only officers can be demoted" });
    }

    await db.update(guildMembersTable)
      .set({ rank: "member" })
      .where(eq(guildMembersTable.id, targetMembership.id));

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/transfer — transfer leadership (leader only) ─────────────────

router.post("/guild/transfer", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { targetCharacterId } = req.body;

    if (!targetCharacterId) return res.status(400).json({ error: "targetCharacterId is required" });
    const targetId = Number(targetCharacterId);

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership || membership.rank !== "leader") {
      return res.status(403).json({ error: "Only the guild leader can transfer leadership" });
    }

    const [targetMembership] = await db
      .select()
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.characterId, targetId),
        eq(guildMembersTable.guildId, membership.guildId),
      ))
      .limit(1);

    if (!targetMembership) return res.status(404).json({ error: "Member not found in your guild" });
    if (targetId === characterId) return res.status(400).json({ error: "Cannot transfer leadership to yourself" });

    // Transfer: new leader becomes leader, old leader becomes officer
    await db.update(guildMembersTable)
      .set({ rank: "leader" })
      .where(eq(guildMembersTable.id, targetMembership.id));

    await db.update(guildMembersTable)
      .set({ rank: "officer" })
      .where(eq(guildMembersTable.id, membership.id));

    await db.update(guildsTable)
      .set({ leaderId: targetId, updatedAt: new Date() })
      .where(eq(guildsTable.id, membership.guildId));

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/leave ────────────────────────────────────────────────────────

router.post("/guild/leave", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });

    if (membership.rank === "leader") {
      // Check if there are other members
      const otherMembers = await db
        .select({ id: guildMembersTable.id })
        .from(guildMembersTable)
        .where(and(
          eq(guildMembersTable.guildId, membership.guildId),
          sql`${guildMembersTable.characterId} != ${characterId}`,
          isNotNull(guildMembersTable.characterId),
        ));

      if (otherMembers.length > 0) {
        return res.status(400).json({ error: "Transfer leadership or disband the guild before leaving" });
      }

      // Last real member — disband the guild
      await disbandGuild(membership.guildId);
    } else {
      await db.delete(guildMembersTable).where(eq(guildMembersTable.id, membership.id));
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/disband — disband guild (leader only) ────────────────────────

router.post("/guild/disband", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader") {
      return res.status(403).json({ error: "Only the guild leader can disband the guild" });
    }

    await disbandGuild(membership.guildId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function disbandGuild(guildId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(guildMembersTable).where(eq(guildMembersTable.guildId, guildId));
    await tx.delete(guildsTable).where(and(eq(guildsTable.id, guildId), eq(guildsTable.isGhost, false)));
  });
}

async function buildGuildMembers(guildId: number) {
  const memberRows = await db
    .select()
    .from(guildMembersTable)
    .where(eq(guildMembersTable.guildId, guildId));

  const realIds   = memberRows.filter(m => m.characterId !== null && m.characterId !== undefined).map(m => m.characterId as number);
  const ghostIds  = memberRows.filter(m => m.ghostId !== null && m.ghostId !== undefined).map(m => m.ghostId as number);

  const chars   = realIds.length > 0
    ? await db.select({ id: charactersTable.id, name: charactersTable.name, race: charactersTable.race, class: charactersTable.class, archetype: charactersTable.archetype, level: charactersTable.level, zone: charactersTable.zone, killCount: charactersTable.killCount, bossKills: charactersTable.bossKills, heroicCompleted: charactersTable.heroicCompleted })
        .from(charactersTable)
        .where(sql`${charactersTable.id} = any(${realIds})`)
    : [];

  const ghosts  = ghostIds.length > 0
    ? await db.select({ id: worldPlayersTable.id, name: worldPlayersTable.name, race: worldPlayersTable.race, class: worldPlayersTable.class, archetype: worldPlayersTable.archetype, level: worldPlayersTable.level, zone: worldPlayersTable.zone, killCount: worldPlayersTable.killCount, bossKills: worldPlayersTable.bossKills })
        .from(worldPlayersTable)
        .where(sql`${worldPlayersTable.id} = any(${ghostIds})`)
    : [];

  const charMap  = new Map(chars.map(c => [c.id, c]));
  const ghostMap = new Map(ghosts.map(g => [g.id, g]));

  return memberRows.map(m => {
    if (m.characterId !== null && m.characterId !== undefined) {
      const c = charMap.get(m.characterId);
      return { ...m, isGhost: false, name: c?.name ?? "Unknown", race: c?.race ?? "", class: c?.class ?? "", archetype: c?.archetype ?? "", level: c?.level ?? 1, zone: c?.zone ?? "", killCount: c?.killCount ?? 0, bossKills: c?.bossKills ?? 0 };
    } else {
      const g = ghostMap.get(m.ghostId!);
      return { ...m, isGhost: true, name: g?.name ?? "Unknown", race: g?.race ?? "", class: g?.class ?? "", archetype: g?.archetype ?? "", level: g?.level ?? 1, zone: g?.zone ?? "", killCount: g?.killCount ?? 0, bossKills: g?.bossKills ?? 0 };
    }
  }).sort((a, b) => {
    const rankOrder: Record<string, number> = { leader: 0, officer: 1, member: 2 };
    const rankDiff = (rankOrder[a.rank] ?? 2) - (rankOrder[b.rank] ?? 2);
    if (rankDiff !== 0) return rankDiff;
    return b.level - a.level;
  });
}

export default router;
