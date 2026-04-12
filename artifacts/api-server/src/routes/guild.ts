import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  guildsTable,
  guildMembersTable,
  guildContributionBreakdownTable,
  guildBankTransactionsTable,
  guildChallengesTable,
  guildApplicationsTable,
  guildRankSnapshotsTable,
  charactersTable,
  worldPlayersTable,
  dungeonKillStatsTable,
} from "@workspace/db/schema";
import { eq, and, isNull, isNotNull, desc, sql, inArray, lt, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import {
  computeGuildLevel,
  guildLevelPerks,
  GUILD_LEVEL_THRESHOLDS,
  GUILD_PERK_DESCRIPTIONS,
} from "../lib/guildPerks.js";
import { computeGearScore } from "../lib/eq2Formulas.js";

const router: IRouter = Router();

// ─── Week helpers ─────────────────────────────────────────────────────────────

/** Returns the most recent Sunday 00:00:00 UTC as a Date */
function getThisSundayMidnightUTC(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Returns the Sunday before `weekStart` */
function getPrevWeekStart(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

/** Returns a Date `n` weeks before the given Sunday start */
function nWeeksAgo(weekStart: Date, n: number): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() - n * 7);
  return d;
}

// ─── Contribution score formula ───────────────────────────────────────────────

function computeContribution(char: {
  level: number;
  killCount: number;
  bossKills: number;
  heroicCompleted: number;
  itemsCrafted: number;
  dungeonClears?: number;
}): number {
  return (
    char.level * 100 +
    Math.floor(char.killCount * 0.5) +
    char.bossKills * 10 +
    char.heroicCompleted * 100 +
    char.itemsCrafted * 5 +
    (char.dungeonClears ?? 0) * 50
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidGuildName(name: string): boolean {
  return /^[A-Za-z0-9 ']{3,30}$/.test(name.trim());
}

function isValidTag(tag: string): boolean {
  return /^[A-Z0-9]{2,5}$/.test(tag.trim());
}

// ─── Challenge generation ─────────────────────────────────────────────────────

interface ChallengeSpec {
  type: "kills" | "boss_kills" | "dungeons" | "crafts" | "gold_deposited";
  label: string;
  baseTarget: number;
  scaleFactor: number;
}

const CHALLENGE_SPECS: ChallengeSpec[] = [
  { type: "kills",          label: "Total Kills",        baseTarget: 200,  scaleFactor: 1.5 },
  { type: "boss_kills",     label: "Boss Kills",         baseTarget: 10,   scaleFactor: 1.4 },
  { type: "dungeons",       label: "Dungeon Clears",     baseTarget: 5,    scaleFactor: 1.3 },
  { type: "crafts",         label: "Items Crafted",      baseTarget: 25,   scaleFactor: 1.3 },
  { type: "gold_deposited", label: "Gold Deposited",     baseTarget: 1000, scaleFactor: 2.0 },
];

/** Pick 3 challenge types for the week (deterministic per guildId+weekStart seed) */
function pickChallengesForWeek(guildId: number, weekStart: Date, guildLevel: number): Array<{
  challengeType: string;
  targetValue: number;
  rewardXpBonus: number;
}> {
  // Pseudo-random but deterministic selection based on guildId + week
  const seed = guildId * 1000 + Math.floor(weekStart.getTime() / (7 * 24 * 3600 * 1000));
  const shuffled = [...CHALLENGE_SPECS].sort((a, b) => {
    const ha = Math.sin(seed + a.type.charCodeAt(0)) * 10000;
    const hb = Math.sin(seed + b.type.charCodeAt(0)) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });
  return shuffled.slice(0, 3).map(spec => ({
    challengeType: spec.type,
    targetValue: Math.round(spec.baseTarget * Math.pow(spec.scaleFactor, Math.max(0, guildLevel - 1))),
    rewardXpBonus: Math.round(500 * guildLevel),
  }));
}

/** Ensure current-week challenges exist for a guild; create them lazily if not */
async function ensureWeeklyChallenges(guildId: number, weekStart: Date, guildLevel: number): Promise<void> {
  const existing = await db
    .select({ id: guildChallengesTable.id })
    .from(guildChallengesTable)
    .where(and(
      eq(guildChallengesTable.guildId, guildId),
      eq(guildChallengesTable.weekStart, weekStart),
    ))
    .limit(1);

  if (existing.length > 0) return;

  const specs = pickChallengesForWeek(guildId, weekStart, guildLevel);
  for (const spec of specs) {
    await db.insert(guildChallengesTable).values({
      guildId,
      weekStart,
      challengeType: spec.challengeType,
      targetValue: spec.targetValue,
      rewardXpBonus: spec.rewardXpBonus,
    }).onConflictDoNothing().catch(() => {});
  }
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

    // Refresh real member contribution points from live character stats
    await refreshRealMemberContributions(guild.id);

    const members = await buildGuildMembers(guild.id);

    // Compute guild level and perks from the refreshed totals
    const currentScore = members.reduce((s, m) => s + m.contributionPoints, 0);
    const guildLevel = computeGuildLevel(currentScore);
    const perks = guildLevelPerks(guildLevel);
    const maxLevel = GUILD_LEVEL_THRESHOLDS.length;
    const nextLevelScore = guildLevel < maxLevel ? GUILD_LEVEL_THRESHOLDS[guildLevel] : null;

    return res.json({
      guild,
      membership,
      members,
      guildLevel,
      perks,
      perkDescriptions: GUILD_PERK_DESCRIPTIONS,
      currentScore: Math.round(currentScore),
      nextLevelScore,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/stats — rich dashboard stats ──────────────────────────────────

router.get("/guild/stats", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });

    const guildId = membership.guildId;

    // Refresh first so stats are current
    await refreshRealMemberContributions(guildId);

    // Guild-wide aggregated character stats
    const allMembers = await db
      .select({
        id: guildMembersTable.id,
        characterId: guildMembersTable.characterId,
        ghostId: guildMembersTable.ghostId,
        contributionPoints: guildMembersTable.contributionPoints,
        weeklyContributionPoints: guildMembersTable.weeklyContributionPoints,
        lastActiveAt: guildMembersTable.lastActiveAt,
        rank: guildMembersTable.rank,
      })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.guildId, guildId));

    // Fetch real member character stats
    const realIds = allMembers
      .filter(m => m.characterId !== null)
      .map(m => m.characterId as number);

    const charStats = realIds.length > 0
      ? await db
          .select({
            id: charactersTable.id,
            killCount: charactersTable.killCount,
            bossKills: charactersTable.bossKills,
            totalGoldEarned: charactersTable.totalGoldEarned,
          })
          .from(charactersTable)
          .where(inArray(charactersTable.id, realIds))
      : [];

    // Sum dungeon clears across all real members
    const dungeonStats = realIds.length > 0
      ? await db
          .select({
            characterId: dungeonKillStatsTable.characterId,
            completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)`,
          })
          .from(dungeonKillStatsTable)
          .where(inArray(dungeonKillStatsTable.characterId, realIds))
          .groupBy(dungeonKillStatsTable.characterId)
      : [];

    const dungeonClearsMap = new Map(dungeonStats.map(d => [d.characterId, d.completions]));

    // Aggregate guild-wide totals from real members
    const totalKills = charStats.reduce((s, c) => s + (c.killCount ?? 0), 0);
    const totalBossKills = charStats.reduce((s, c) => s + (c.bossKills ?? 0), 0);
    const totalGoldEarned = charStats.reduce((s, c) => s + (c.totalGoldEarned ?? 0), 0);
    const totalDungeonClears = [...dungeonClearsMap.values()].reduce((s, v) => s + v, 0);

    const currentScore = Math.round(allMembers.reduce((s, m) => s + m.contributionPoints, 0));
    const guildLevel = computeGuildLevel(currentScore);
    const maxLevel = GUILD_LEVEL_THRESHOLDS.length;
    const nextLevelScore = guildLevel < maxLevel ? GUILD_LEVEL_THRESHOLDS[guildLevel] : null;
    const perks = guildLevelPerks(guildLevel);

    // Weekly top-5 contributors
    const weeklyTop = [...allMembers]
      .sort((a, b) => (b.weeklyContributionPoints ?? 0) - (a.weeklyContributionPoints ?? 0))
      .slice(0, 5);

    // Resolve names for top contributors
    const topRealIds = weeklyTop.filter(m => m.characterId !== null).map(m => m.characterId as number);
    const topGhostIds = weeklyTop.filter(m => m.ghostId !== null).map(m => m.ghostId as number);

    const topChars = topRealIds.length > 0
      ? await db.select({ id: charactersTable.id, name: charactersTable.name, class: charactersTable.class, level: charactersTable.level })
          .from(charactersTable).where(inArray(charactersTable.id, topRealIds))
      : [];
    const topGhosts = topGhostIds.length > 0
      ? await db.select({ id: worldPlayersTable.id, name: worldPlayersTable.name, class: worldPlayersTable.class, level: worldPlayersTable.level })
          .from(worldPlayersTable).where(inArray(worldPlayersTable.id, topGhostIds))
      : [];

    const topCharMap = new Map(topChars.map(c => [c.id, c]));
    const topGhostMap = new Map(topGhosts.map(g => [g.id, g]));

    const weeklyTopResolved = weeklyTop.map(m => {
      const info = m.characterId
        ? topCharMap.get(m.characterId)
        : topGhostMap.get(m.ghostId!);
      return {
        memberId: m.id,
        characterId: m.characterId,
        name: info?.name ?? "Unknown",
        class: info?.class ?? "",
        level: info?.level ?? 1,
        weeklyPoints: Math.round(m.weeklyContributionPoints ?? 0),
        rank: m.rank,
        isGhost: m.ghostId !== null,
      };
    });

    const [guild] = await db
      .select({ bankGold: guildsTable.bankGold })
      .from(guildsTable)
      .where(eq(guildsTable.id, guildId))
      .limit(1);

    return res.json({
      guildId,
      totalKills,
      totalBossKills,
      totalGoldEarned: Math.round(totalGoldEarned),
      totalDungeonClears,
      bankGold: guild?.bankGold ?? 0,
      memberCount: allMembers.length,
      currentScore,
      nextLevelScore,
      guildLevel,
      perks,
      perkDescriptions: GUILD_PERK_DESCRIPTIONS,
      weeklyTopContributors: weeklyTopResolved,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/contribution-history — 4-week breakdown ──────────────────────

router.get("/guild/contribution-history", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });

    const weekStart = getThisSundayMidnightUTC();
    const fourWeeksAgo = nWeeksAgo(weekStart, 4);

    // Prune rows older than 4 weeks (lazy)
    await db.delete(guildContributionBreakdownTable)
      .where(and(
        eq(guildContributionBreakdownTable.guildId, membership.guildId),
        lt(guildContributionBreakdownTable.weekStart, fourWeeksAgo),
      ))
      .catch(() => {});

    const rows = await db
      .select()
      .from(guildContributionBreakdownTable)
      .where(and(
        eq(guildContributionBreakdownTable.guildId, membership.guildId),
        gte(guildContributionBreakdownTable.weekStart, fourWeeksAgo),
      ))
      .orderBy(desc(guildContributionBreakdownTable.weekStart));

    // Resolve character names
    const charIds = [...new Set(rows.filter(r => r.characterId).map(r => r.characterId as number))];
    const ghostIds = [...new Set(rows.filter(r => r.ghostId).map(r => r.ghostId as number))];

    const chars = charIds.length > 0
      ? await db.select({ id: charactersTable.id, name: charactersTable.name })
          .from(charactersTable).where(inArray(charactersTable.id, charIds))
      : [];
    const ghosts = ghostIds.length > 0
      ? await db.select({ id: worldPlayersTable.id, name: worldPlayersTable.name })
          .from(worldPlayersTable).where(inArray(worldPlayersTable.id, ghostIds))
      : [];

    const charNameMap = new Map(chars.map(c => [c.id, c.name]));
    const ghostNameMap = new Map(ghosts.map(g => [g.id, g.name]));

    // Group by weekStart
    const weekMap = new Map<string, Array<typeof rows[0] & { name: string }>>();
    for (const row of rows) {
      const key = row.weekStart.toISOString();
      if (!weekMap.has(key)) weekMap.set(key, []);
      const name = row.characterId
        ? (charNameMap.get(row.characterId) ?? "Unknown")
        : (ghostNameMap.get(row.ghostId!) ?? "Unknown");
      weekMap.get(key)!.push({ ...row, name });
    }

    const history = [...weekMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStartIso, members]) => ({
        weekStart: weekStartIso,
        isCurrentWeek: weekStartIso === weekStart.toISOString(),
        members: members
          .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
          .map(m => ({
            name: m.name,
            characterId: m.characterId,
            combatKills: m.combatKills,
            bossKills: m.bossKills,
            dungeonClears: m.dungeonClears,
            craftedItems: m.craftedItems,
            goldDonated: m.goldDonated,
            totalPoints: Math.round(m.totalPoints),
          })),
      }));

    return res.json(history);
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/members/detailed — enriched member list ──────────────────────

router.get("/guild/members/detailed", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const sort = (req.query.sort as string) ?? "contribution";

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });

    await refreshRealMemberContributions(membership.guildId);

    const memberRows = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.guildId, membership.guildId));

    const realIds = memberRows.filter(m => m.characterId).map(m => m.characterId as number);
    const ghostIds = memberRows.filter(m => m.ghostId).map(m => m.ghostId as number);

    const chars = realIds.length > 0
      ? await db.select({
          id: charactersTable.id,
          name: charactersTable.name,
          race: charactersTable.race,
          class: charactersTable.class,
          archetype: charactersTable.archetype,
          level: charactersTable.level,
          zone: charactersTable.zone,
          killCount: charactersTable.killCount,
          bossKills: charactersTable.bossKills,
          heroicCompleted: charactersTable.heroicCompleted,
          gear: charactersTable.gear,
          zoneKills: charactersTable.zoneKills,
          itemsCrafted: charactersTable.itemsCrafted,
        })
        .from(charactersTable)
        .where(inArray(charactersTable.id, realIds))
      : [];

    const ghosts = ghostIds.length > 0
      ? await db.select({
          id: worldPlayersTable.id,
          name: worldPlayersTable.name,
          race: worldPlayersTable.race,
          class: worldPlayersTable.class,
          archetype: worldPlayersTable.archetype,
          level: worldPlayersTable.level,
          zone: worldPlayersTable.zone,
          killCount: worldPlayersTable.killCount,
          bossKills: worldPlayersTable.bossKills,
        })
        .from(worldPlayersTable)
        .where(inArray(worldPlayersTable.id, ghostIds))
      : [];

    // Dungeon clears per real member
    const dungeonStats = realIds.length > 0
      ? await db
          .select({
            characterId: dungeonKillStatsTable.characterId,
            completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)`,
          })
          .from(dungeonKillStatsTable)
          .where(inArray(dungeonKillStatsTable.characterId, realIds))
          .groupBy(dungeonKillStatsTable.characterId)
      : [];
    const dungeonClearsMap = new Map(dungeonStats.map(d => [d.characterId, d.completions]));

    // Top weekly contributor for badge
    const weeklyMax = memberRows.reduce(
      (max, m) => Math.max(max, m.weeklyContributionPoints ?? 0), 0,
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const charMap = new Map(chars.map(c => [c.id, c]));
    const ghostMap = new Map(ghosts.map(g => [g.id, g]));

    const result = memberRows.map(m => {
      if (m.characterId !== null && m.characterId !== undefined) {
        const c = charMap.get(m.characterId);
        const gearScore = c?.gear ? computeGearScore(c.gear as Record<string, string>) : 0;
        const dungeonClears = dungeonClearsMap.get(m.characterId) ?? 0;
        return {
          ...m,
          isGhost: false,
          name: c?.name ?? "Unknown",
          race: c?.race ?? "",
          class: c?.class ?? "",
          archetype: c?.archetype ?? "",
          level: c?.level ?? 1,
          zone: c?.zone ?? "",
          killCount: c?.killCount ?? 0,
          bossKills: c?.bossKills ?? 0,
          heroicCompleted: c?.heroicCompleted ?? 0,
          itemsCrafted: c?.itemsCrafted ?? 0,
          dungeonClears,
          gearScore,
          weeklyContributionPoints: Math.round(m.weeklyContributionPoints ?? 0),
          isTopContributor: (m.weeklyContributionPoints ?? 0) >= weeklyMax && weeklyMax > 0,
          isInactive: m.lastActiveAt ? m.lastActiveAt < sevenDaysAgo : false,
          daysSinceActive: m.lastActiveAt
            ? Math.floor((now.getTime() - m.lastActiveAt.getTime()) / (24 * 3600 * 1000))
            : null,
        };
      } else {
        const g = ghostMap.get(m.ghostId!);
        return {
          ...m,
          isGhost: true,
          name: g?.name ?? "Unknown",
          race: g?.race ?? "",
          class: g?.class ?? "",
          archetype: g?.archetype ?? "",
          level: g?.level ?? 1,
          zone: g?.zone ?? "",
          killCount: g?.killCount ?? 0,
          bossKills: g?.bossKills ?? 0,
          heroicCompleted: 0,
          itemsCrafted: 0,
          dungeonClears: 0,
          gearScore: 0,
          weeklyContributionPoints: Math.round(m.weeklyContributionPoints ?? 0),
          isTopContributor: false,
          isInactive: false,
          daysSinceActive: null,
        };
      }
    });

    // Sort
    result.sort((a, b) => {
      const rankOrder: Record<string, number> = { leader: 0, officer: 1, member: 2 };
      if (sort === "contribution") {
        const diff = b.contributionPoints - a.contributionPoints;
        if (diff !== 0) return diff;
      } else if (sort === "level") {
        const diff = b.level - a.level;
        if (diff !== 0) return diff;
      } else if (sort === "gearScore") {
        const diff = b.gearScore - a.gearScore;
        if (diff !== 0) return diff;
      } else if (sort === "lastActive") {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        const diff = bTime - aTime;
        if (diff !== 0) return diff;
      } else if (sort === "weekly") {
        const diff = b.weeklyContributionPoints - a.weeklyContributionPoints;
        if (diff !== 0) return diff;
      }
      const rankDiff = (rankOrder[a.rank] ?? 2) - (rankOrder[b.rank] ?? 2);
      if (rankDiff !== 0) return rankDiff;
      return b.level - a.level;
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/leaderboard ───────────────────────────────────────────────────

router.get("/guild/leaderboard", requireAuth, async (req, res, next) => {
  try {
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

    // Build ranked list
    const ranked = allGuilds
      .map(guild => {
        const agg = scoreMap.get(guild.id);
        const score = Math.round(agg?.totalScore ?? 0);
        return {
          id: guild.id,
          name: guild.name,
          tag: guild.tag,
          alignment: guild.alignment,
          description: guild.description,
          motto: guild.motto,
          isGhost: guild.isGhost,
          isRecruiting: guild.isRecruiting,
          score,
          memberCount: agg?.memberCount ?? 0,
          bankGold: guild.bankGold,
          guildLevel: computeGuildLevel(score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((g, i) => ({ ...g, rank: i + 1 }));

    // Snapshot current ranks for weekly delta tracking (lazy — only once per week)
    const weekStart = getThisSundayMidnightUTC();
    const alreadySnapshotted = await db
      .select({ id: guildRankSnapshotsTable.id })
      .from(guildRankSnapshotsTable)
      .where(eq(guildRankSnapshotsTable.weekStart, weekStart))
      .limit(1);

    if (alreadySnapshotted.length === 0) {
      for (const g of ranked) {
        await db.insert(guildRankSnapshotsTable).values({
          guildId: g.id,
          weekStart,
          rank: g.rank,
          score: g.score,
        }).onConflictDoNothing().catch(() => {});
      }
    }

    // Fetch previous week's ranks for deltas
    const prevWeekStart = getPrevWeekStart(weekStart);
    const prevSnapshots = await db
      .select({ guildId: guildRankSnapshotsTable.guildId, rank: guildRankSnapshotsTable.rank })
      .from(guildRankSnapshotsTable)
      .where(eq(guildRankSnapshotsTable.weekStart, prevWeekStart));
    const prevRankMap = new Map(prevSnapshots.map(s => [s.guildId, s.rank]));

    // Fetch top-3 members per guild for display
    const allMemberRows = await db
      .select({
        guildId: guildMembersTable.guildId,
        characterId: guildMembersTable.characterId,
        ghostId: guildMembersTable.ghostId,
        contributionPoints: guildMembersTable.contributionPoints,
      })
      .from(guildMembersTable)
      .orderBy(desc(guildMembersTable.contributionPoints));

    // Group and pick top 3 per guild
    const topMembersMap = new Map<number, typeof allMemberRows>();
    for (const row of allMemberRows) {
      const existing = topMembersMap.get(row.guildId) ?? [];
      if (existing.length < 3) {
        existing.push(row);
        topMembersMap.set(row.guildId, existing);
      }
    }

    // Resolve names for all top-3 members
    const top3CharIds = [...topMembersMap.values()].flat()
      .filter(m => m.characterId).map(m => m.characterId as number);
    const top3GhostIds = [...topMembersMap.values()].flat()
      .filter(m => m.ghostId).map(m => m.ghostId as number);

    const top3Chars = top3CharIds.length > 0
      ? await db.select({ id: charactersTable.id, name: charactersTable.name, level: charactersTable.level })
          .from(charactersTable).where(inArray(charactersTable.id, top3CharIds))
      : [];
    const top3Ghosts = top3GhostIds.length > 0
      ? await db.select({ id: worldPlayersTable.id, name: worldPlayersTable.name, level: worldPlayersTable.level })
          .from(worldPlayersTable).where(inArray(worldPlayersTable.id, top3GhostIds))
      : [];

    const top3CharMap = new Map(top3Chars.map(c => [c.id, c]));
    const top3GhostMap = new Map(top3Ghosts.map(g => [g.id, g]));

    const result = ranked.map(g => {
      const topMembers = (topMembersMap.get(g.id) ?? []).map(m => {
        const info = m.characterId
          ? top3CharMap.get(m.characterId)
          : top3GhostMap.get(m.ghostId!);
        return {
          name: info?.name ?? "Unknown",
          level: info?.level ?? 1,
          isGhost: m.ghostId !== null,
        };
      });

      const prevRank = prevRankMap.get(g.id);
      const weeklyDelta = prevRank != null ? prevRank - g.rank : null;

      return { ...g, topMembers, weeklyDelta };
    });

    return res.json(result);
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

    const [existingMembership] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (existingMembership) {
      return res.status(409).json({ error: "You are already in a guild. Leave it before creating a new one." });
    }

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

    const [char] = await db
      .select({
        level: charactersTable.level,
        killCount: charactersTable.killCount,
        bossKills: charactersTable.bossKills,
        heroicCompleted: charactersTable.heroicCompleted,
        itemsCrafted: charactersTable.itemsCrafted,
      })
      .from(charactersTable)
      .where(eq(charactersTable.id, characterId))
      .limit(1);

    if (!char) return res.status(404).json({ error: "Character not found" });
    if (char.level < 5) {
      return res.status(403).json({ error: "You must be at least level 5 to found a guild" });
    }

    const [dungeonAgg] = await db
      .select({ completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)` })
      .from(dungeonKillStatsTable)
      .where(eq(dungeonKillStatsTable.characterId, characterId));
    const dungeonClears = dungeonAgg?.completions ?? 0;

    const contribution = computeContribution({ ...char, dungeonClears });

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

      const weekStart = getThisSundayMidnightUTC();
      await tx.insert(guildMembersTable).values({
        guildId: newGuild.id,
        characterId,
        rank: "leader",
        contributionPoints: contribution,
        weeklyContributionPoints: contribution,
        weeklyResetAt: weekStart,
        lastActiveAt: new Date(),
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

// ─── PATCH /guild/recruitment — update recruiting settings ────────────────────

router.patch("/guild/recruitment", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can update recruitment settings" });
    }

    const { isRecruiting, recruitDescription, maxMembers } = req.body;
    const updates: Partial<typeof guildsTable.$inferInsert> = { updatedAt: new Date() };

    if (isRecruiting !== undefined) updates.isRecruiting = Boolean(isRecruiting);
    if (recruitDescription !== undefined) updates.recruitDescription = String(recruitDescription).slice(0, 300);
    if (maxMembers !== undefined) {
      const max = Number(maxMembers);
      if (isFinite(max) && max >= 5 && max <= 100) updates.maxMembers = max;
    }

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

// ─── GET /guild/recruiting — public list of recruiting guilds ─────────────────

router.get("/guild/recruiting", requireAuth, async (req, res, next) => {
  try {
    const recruitingGuilds = await db
      .select({
        id: guildsTable.id,
        name: guildsTable.name,
        tag: guildsTable.tag,
        alignment: guildsTable.alignment,
        motto: guildsTable.motto,
        recruitDescription: guildsTable.recruitDescription,
        maxMembers: guildsTable.maxMembers,
        bankGold: guildsTable.bankGold,
      })
      .from(guildsTable)
      .where(and(eq(guildsTable.isRecruiting, true), eq(guildsTable.isGhost, false)));

    const guildIds = recruitingGuilds.map(g => g.id);
    const memberCounts = guildIds.length > 0
      ? await db
          .select({
            guildId: guildMembersTable.guildId,
            count: sql<number>`cast(count(*) as int)`,
            totalScore: sql<number>`cast(sum(${guildMembersTable.contributionPoints}) as float)`,
          })
          .from(guildMembersTable)
          .where(inArray(guildMembersTable.guildId, guildIds))
          .groupBy(guildMembersTable.guildId)
      : [];

    const memberCountMap = new Map(memberCounts.map(m => [m.guildId, m]));

    const result = recruitingGuilds.map(g => {
      const agg = memberCountMap.get(g.id);
      const score = Math.round(agg?.totalScore ?? 0);
      return {
        ...g,
        memberCount: agg?.count ?? 0,
        score,
        guildLevel: computeGuildLevel(score),
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/apply — apply to a guild ────────────────────────────────────

router.post("/guild/apply", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { guildId: rawGuildId, message = "" } = req.body;
    const guildId = Number(rawGuildId);

    if (!isFinite(guildId)) return res.status(400).json({ error: "guildId is required" });

    // Check not already in a guild
    const [existingMembership] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);
    if (existingMembership) return res.status(409).json({ error: "You are already in a guild" });

    const [guild] = await db
      .select({ isRecruiting: guildsTable.isRecruiting, isGhost: guildsTable.isGhost, maxMembers: guildsTable.maxMembers })
      .from(guildsTable)
      .where(eq(guildsTable.id, guildId))
      .limit(1);

    if (!guild) return res.status(404).json({ error: "Guild not found" });
    if (guild.isGhost) return res.status(400).json({ error: "Cannot apply to an AI guild" });
    if (!guild.isRecruiting) return res.status(400).json({ error: "This guild is not currently recruiting" });

    // Check for existing pending application
    const [existingApp] = await db
      .select({ id: guildApplicationsTable.id })
      .from(guildApplicationsTable)
      .where(and(
        eq(guildApplicationsTable.guildId, guildId),
        eq(guildApplicationsTable.characterId, characterId),
        eq(guildApplicationsTable.status, "pending"),
      ))
      .limit(1);
    if (existingApp) return res.status(409).json({ error: "You already have a pending application to this guild" });

    await db.insert(guildApplicationsTable).values({
      guildId,
      characterId,
      message: String(message).slice(0, 300),
      status: "pending",
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/applications — officer+ sees pending applications ─────────────

router.get("/guild/applications", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can view applications" });
    }

    const apps = await db
      .select()
      .from(guildApplicationsTable)
      .where(and(
        eq(guildApplicationsTable.guildId, membership.guildId),
        eq(guildApplicationsTable.status, "pending"),
      ))
      .orderBy(desc(guildApplicationsTable.appliedAt));

    // Resolve character names
    const charIds = apps.map(a => a.characterId);
    const chars = charIds.length > 0
      ? await db.select({ id: charactersTable.id, name: charactersTable.name, level: charactersTable.level, class: charactersTable.class })
          .from(charactersTable).where(inArray(charactersTable.id, charIds))
      : [];
    const charMap = new Map(chars.map(c => [c.id, c]));

    const result = apps.map(a => ({
      ...a,
      characterName: charMap.get(a.characterId)?.name ?? "Unknown",
      characterLevel: charMap.get(a.characterId)?.level ?? 1,
      characterClass: charMap.get(a.characterId)?.class ?? "",
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/applications/:id/approve ────────────────────────────────────

router.post("/guild/applications/:id/approve", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can approve applications" });
    }

    const [app] = await db
      .select()
      .from(guildApplicationsTable)
      .where(and(
        eq(guildApplicationsTable.id, appId),
        eq(guildApplicationsTable.guildId, membership.guildId),
        eq(guildApplicationsTable.status, "pending"),
      ))
      .limit(1);

    if (!app) return res.status(404).json({ error: "Application not found" });

    // Check target not already in a guild
    const [alreadyMember] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, app.characterId))
      .limit(1);
    if (alreadyMember) {
      await db.update(guildApplicationsTable)
        .set({ status: "denied", reviewedBy: characterId, reviewedAt: new Date() })
        .where(eq(guildApplicationsTable.id, appId));
      return res.status(409).json({ error: "Applicant is already in another guild" });
    }

    // Check member cap
    const [guild] = await db
      .select({ maxMembers: guildsTable.maxMembers })
      .from(guildsTable)
      .where(eq(guildsTable.id, membership.guildId))
      .limit(1);
    const [memberCountRow] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(guildMembersTable)
      .where(and(eq(guildMembersTable.guildId, membership.guildId), isNotNull(guildMembersTable.characterId)));
    if (guild && (memberCountRow?.count ?? 0) >= guild.maxMembers) {
      return res.status(400).json({ error: "Guild is at maximum member capacity" });
    }

    const [char] = await db
      .select({
        level: charactersTable.level,
        killCount: charactersTable.killCount,
        bossKills: charactersTable.bossKills,
        heroicCompleted: charactersTable.heroicCompleted,
        itemsCrafted: charactersTable.itemsCrafted,
      })
      .from(charactersTable)
      .where(eq(charactersTable.id, app.characterId))
      .limit(1);

    if (!char || char.level < 5) {
      return res.status(400).json({ error: "Character must be at least level 5" });
    }

    const [dungeonAgg] = await db
      .select({ completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)` })
      .from(dungeonKillStatsTable)
      .where(eq(dungeonKillStatsTable.characterId, app.characterId));
    const dungeonClears = dungeonAgg?.completions ?? 0;

    await db.transaction(async (tx) => {
      await tx.insert(guildMembersTable).values({
        guildId: membership.guildId,
        characterId: app.characterId,
        rank: "member",
        contributionPoints: computeContribution({ ...char, dungeonClears }),
        weeklyResetAt: getThisSundayMidnightUTC(),
        lastActiveAt: new Date(),
      });

      await tx.update(guildApplicationsTable)
        .set({ status: "approved", reviewedBy: characterId, reviewedAt: new Date() })
        .where(eq(guildApplicationsTable.id, appId));
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/applications/:id/deny ───────────────────────────────────────

router.post("/guild/applications/:id/deny", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can deny applications" });
    }

    const updated = await db.update(guildApplicationsTable)
      .set({ status: "denied", reviewedBy: characterId, reviewedAt: new Date() })
      .where(and(
        eq(guildApplicationsTable.id, appId),
        eq(guildApplicationsTable.guildId, membership.guildId),
        eq(guildApplicationsTable.status, "pending"),
      ))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: "Application not found" });
    return res.json({ ok: true });
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

    const [target] = await db
      .select({
        id: charactersTable.id,
        name: charactersTable.name,
        level: charactersTable.level,
        killCount: charactersTable.killCount,
        bossKills: charactersTable.bossKills,
        heroicCompleted: charactersTable.heroicCompleted,
        itemsCrafted: charactersTable.itemsCrafted,
      })
      .from(charactersTable)
      .where(sql`lower(${charactersTable.name}) = lower(${characterName})`)
      .limit(1);

    if (!target) return res.status(404).json({ error: "Character not found" });
    if (target.id === characterId) return res.status(400).json({ error: "You cannot invite yourself" });

    if (target.level < 5) {
      return res.status(403).json({ error: `${target.name} must be at least level 5 to join a guild` });
    }

    const [targetMembership] = await db
      .select({ id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, target.id))
      .limit(1);

    if (targetMembership) {
      return res.status(409).json({ error: `${target.name} is already in a guild` });
    }

    // Check member cap
    const [guild] = await db
      .select({ maxMembers: guildsTable.maxMembers })
      .from(guildsTable)
      .where(eq(guildsTable.id, membership.guildId))
      .limit(1);
    const [memberCountRow] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(guildMembersTable)
      .where(and(eq(guildMembersTable.guildId, membership.guildId), isNotNull(guildMembersTable.characterId)));
    if (guild && (memberCountRow?.count ?? 0) >= guild.maxMembers) {
      return res.status(400).json({ error: "Guild is at maximum member capacity" });
    }

    const [dungeonAgg] = await db
      .select({ completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)` })
      .from(dungeonKillStatsTable)
      .where(eq(dungeonKillStatsTable.characterId, target.id));
    const dungeonClears = dungeonAgg?.completions ?? 0;

    await db.insert(guildMembersTable).values({
      guildId: membership.guildId,
      characterId: target.id,
      rank: "member",
      contributionPoints: computeContribution({ ...target, dungeonClears }),
      weeklyResetAt: getThisSundayMidnightUTC(),
      lastActiveAt: new Date(),
    });

    return res.json({ ok: true, characterName: target.name });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/kick ─────────────────────────────────────────────────────────

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

// ─── POST /guild/promote ──────────────────────────────────────────────────────

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

// ─── POST /guild/demote ───────────────────────────────────────────────────────

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

// ─── POST /guild/transfer ─────────────────────────────────────────────────────

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

    if (targetId === characterId) return res.status(400).json({ error: "Cannot transfer leadership to yourself" });

    const [targetMembership] = await db
      .select()
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.characterId, targetId),
        eq(guildMembersTable.guildId, membership.guildId),
      ))
      .limit(1);

    if (!targetMembership) return res.status(404).json({ error: "Member not found in your guild" });

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

      await disbandGuild(membership.guildId);
    } else {
      await db.delete(guildMembersTable).where(eq(guildMembersTable.id, membership.id));
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/disband ──────────────────────────────────────────────────────

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

// ─── POST /guild/bank/deposit ─────────────────────────────────────────────────

router.post("/guild/bank/deposit", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { amount } = req.body;

    const depositAmount = Number(amount);
    if (!isFinite(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId, id: guildMembersTable.id })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });

    const [char] = await db
      .select({ gold: charactersTable.gold })
      .from(charactersTable)
      .where(eq(charactersTable.id, characterId))
      .limit(1);

    if (!char) return res.status(404).json({ error: "Character not found" });

    const actualDeposit = Math.min(Math.floor(depositAmount), Math.floor(char.gold));
    if (actualDeposit <= 0) {
      return res.status(400).json({ error: "Not enough gold" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(charactersTable)
        .set({ gold: char.gold - actualDeposit, updatedAt: new Date() })
        .where(eq(charactersTable.id, characterId));

      await tx
        .update(guildsTable)
        .set({
          bankGold: sql`${guildsTable.bankGold} + ${actualDeposit}`,
          totalGoldDeposited: sql`${guildsTable.totalGoldDeposited} + ${actualDeposit}`,
          updatedAt: new Date(),
        })
        .where(eq(guildsTable.id, membership.guildId));

      // Log the transaction
      await tx.insert(guildBankTransactionsTable).values({
        guildId: membership.guildId,
        characterId,
        transactionType: "deposit",
        amount: actualDeposit,
      });
    });

    // Track gold donated in contribution breakdown
    const weekStart = getThisSundayMidnightUTC();
    await upsertContributionBreakdown(membership.guildId, characterId, null, weekStart, {
      goldDonated: actualDeposit,
      totalPoints: 0,
    });

    return res.json({ ok: true, deposited: actualDeposit });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/bank/withdraw ────────────────────────────────────────────────

router.post("/guild/bank/withdraw", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { amount, note = "" } = req.body;

    const withdrawAmount = Number(amount);
    if (!isFinite(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "You are not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can withdraw from the guild bank" });
    }

    const [guild] = await db
      .select({ bankGold: guildsTable.bankGold, officerDailyWithdrawLimit: guildsTable.officerDailyWithdrawLimit })
      .from(guildsTable)
      .where(eq(guildsTable.id, membership.guildId))
      .limit(1);

    if (!guild) return res.status(404).json({ error: "Guild not found" });
    if (guild.bankGold < withdrawAmount) {
      return res.status(400).json({ error: "Insufficient guild bank funds" });
    }

    // Check daily withdrawal limit (lazy 24h reset)
    const dailyLimit = membership.rank === "leader" ? guild.officerDailyWithdrawLimit * 2 : guild.officerDailyWithdrawLimit;
    const now = new Date();
    const resetCutoff = new Date(now.getTime() - 24 * 3600 * 1000);
    const alreadyWithdrawn = membership.withdrawResetAt && membership.withdrawResetAt > resetCutoff
      ? (membership.dailyWithdrawn ?? 0)
      : 0;

    if (alreadyWithdrawn + withdrawAmount > dailyLimit) {
      return res.status(400).json({
        error: `Daily withdrawal limit of ${dailyLimit}g reached`,
        dailyLimit,
        alreadyWithdrawn: Math.round(alreadyWithdrawn),
        remaining: Math.max(0, Math.round(dailyLimit - alreadyWithdrawn)),
      });
    }

    const [char] = await db
      .select({ gold: charactersTable.gold })
      .from(charactersTable)
      .where(eq(charactersTable.id, characterId))
      .limit(1);

    if (!char) return res.status(404).json({ error: "Character not found" });

    await db.transaction(async (tx) => {
      await tx.update(guildsTable)
        .set({ bankGold: sql`${guildsTable.bankGold} - ${withdrawAmount}`, updatedAt: new Date() })
        .where(eq(guildsTable.id, membership.guildId));

      await tx.update(charactersTable)
        .set({ gold: char.gold + withdrawAmount, updatedAt: new Date() })
        .where(eq(charactersTable.id, characterId));

      // Update daily tracking (reset if stale)
      const newDailyWithdrawn = alreadyWithdrawn + withdrawAmount;
      await tx.update(guildMembersTable)
        .set({
          dailyWithdrawn: newDailyWithdrawn,
          withdrawResetAt: membership.withdrawResetAt && membership.withdrawResetAt > resetCutoff
            ? membership.withdrawResetAt
            : now,
        })
        .where(eq(guildMembersTable.id, membership.id));

      await tx.insert(guildBankTransactionsTable).values({
        guildId: membership.guildId,
        characterId,
        transactionType: "withdraw",
        amount: withdrawAmount,
        note: String(note).slice(0, 100),
      });
    });

    return res.json({ ok: true, withdrawn: withdrawAmount });
  } catch (err) {
    next(err);
  }
});

// ─── POST /guild/bank/payout — distribute gold to members ────────────────────

router.post("/guild/bank/payout", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;
    const { memberIds, amountEach, note = "" } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "memberIds must be a non-empty array" });
    }
    const payoutAmount = Number(amountEach);
    if (!isFinite(payoutAmount) || payoutAmount <= 0) {
      return res.status(400).json({ error: "amountEach must be a positive number" });
    }

    const [membership] = await db
      .select()
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });
    if (membership.rank !== "leader" && membership.rank !== "officer") {
      return res.status(403).json({ error: "Only officers and leaders can pay out from the guild bank" });
    }

    const recipientIds = (memberIds as number[]).map(Number).filter(isFinite);
    const totalPayout = payoutAmount * recipientIds.length;

    const [guild] = await db
      .select({ bankGold: guildsTable.bankGold })
      .from(guildsTable)
      .where(eq(guildsTable.id, membership.guildId))
      .limit(1);

    if (!guild || guild.bankGold < totalPayout) {
      return res.status(400).json({ error: "Insufficient guild bank funds for this payout" });
    }

    // Verify all recipients are guild members
    const recipientMembers = await db
      .select({ id: guildMembersTable.id, characterId: guildMembersTable.characterId })
      .from(guildMembersTable)
      .where(and(
        eq(guildMembersTable.guildId, membership.guildId),
        inArray(guildMembersTable.characterId, recipientIds),
      ));

    if (recipientMembers.length === 0) {
      return res.status(400).json({ error: "No valid guild members found in recipient list" });
    }

    const actualRecipientIds = recipientMembers
      .map(m => m.characterId)
      .filter((id): id is number => id !== null);

    const actualTotal = payoutAmount * actualRecipientIds.length;

    await db.transaction(async (tx) => {
      await tx.update(guildsTable)
        .set({ bankGold: sql`${guildsTable.bankGold} - ${actualTotal}`, updatedAt: new Date() })
        .where(eq(guildsTable.id, membership.guildId));

      for (const recipientId of actualRecipientIds) {
        await tx.update(charactersTable)
          .set({ gold: sql`${charactersTable.gold} + ${payoutAmount}`, updatedAt: new Date() })
          .where(eq(charactersTable.id, recipientId));

        await tx.insert(guildBankTransactionsTable).values({
          guildId: membership.guildId,
          characterId: recipientId,
          transactionType: "payout",
          amount: payoutAmount,
          note: String(note).slice(0, 100),
        });
      }
    });

    return res.json({ ok: true, paidOut: actualTotal, recipients: actualRecipientIds.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/bank/log ──────────────────────────────────────────────────────

router.get("/guild/bank/log", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });

    const logs = await db
      .select()
      .from(guildBankTransactionsTable)
      .where(eq(guildBankTransactionsTable.guildId, membership.guildId))
      .orderBy(desc(guildBankTransactionsTable.createdAt))
      .limit(50);

    // Resolve character names
    const charIds = [...new Set(logs.filter(l => l.characterId).map(l => l.characterId as number))];
    const chars = charIds.length > 0
      ? await db.select({ id: charactersTable.id, name: charactersTable.name })
          .from(charactersTable).where(inArray(charactersTable.id, charIds))
      : [];
    const charNameMap = new Map(chars.map(c => [c.id, c.name]));

    const result = logs.map(l => ({
      ...l,
      characterName: l.characterId ? (charNameMap.get(l.characterId) ?? "Unknown") : "System",
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /guild/challenges — current week's challenges ───────────────────────

router.get("/guild/challenges", requireAuth, async (req, res, next) => {
  try {
    const characterId = req.characterId!;

    const [membership] = await db
      .select({ guildId: guildMembersTable.guildId })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.characterId, characterId))
      .limit(1);

    if (!membership) return res.status(404).json({ error: "Not in a guild" });

    const guildId = membership.guildId;
    const weekStart = getThisSundayMidnightUTC();

    // Get guild level for challenge scaling
    const [scoreRow] = await db
      .select({ totalScore: sql<number>`cast(sum(${guildMembersTable.contributionPoints}) as float)` })
      .from(guildMembersTable)
      .where(eq(guildMembersTable.guildId, guildId));
    const guildLevel = computeGuildLevel(scoreRow?.totalScore ?? 0);

    await ensureWeeklyChallenges(guildId, weekStart, guildLevel);

    const challenges = await db
      .select()
      .from(guildChallengesTable)
      .where(and(
        eq(guildChallengesTable.guildId, guildId),
        eq(guildChallengesTable.weekStart, weekStart),
      ));

    return res.json(challenges);
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function disbandGuild(guildId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(guildContributionBreakdownTable).where(eq(guildContributionBreakdownTable.guildId, guildId)).catch(() => {});
    await tx.delete(guildBankTransactionsTable).where(eq(guildBankTransactionsTable.guildId, guildId)).catch(() => {});
    await tx.delete(guildChallengesTable).where(eq(guildChallengesTable.guildId, guildId)).catch(() => {});
    await tx.delete(guildApplicationsTable).where(eq(guildApplicationsTable.guildId, guildId)).catch(() => {});
    await tx.delete(guildMembersTable).where(eq(guildMembersTable.guildId, guildId));
    await tx.delete(guildsTable).where(and(eq(guildsTable.id, guildId), eq(guildsTable.isGhost, false)));
  });
}

/**
 * Upsert a contribution breakdown row for a member/week, incrementing deltas.
 */
async function upsertContributionBreakdown(
  guildId: number,
  characterId: number | null,
  ghostId: number | null,
  weekStart: Date,
  delta: {
    combatKills?: number;
    bossKills?: number;
    dungeonClears?: number;
    craftedItems?: number;
    goldDonated?: number;
    totalPoints?: number;
  },
): Promise<void> {
  // Try to find existing row
  const whereClause = characterId !== null
    ? and(
        eq(guildContributionBreakdownTable.guildId, guildId),
        eq(guildContributionBreakdownTable.characterId, characterId),
        eq(guildContributionBreakdownTable.weekStart, weekStart),
      )
    : and(
        eq(guildContributionBreakdownTable.guildId, guildId),
        eq(guildContributionBreakdownTable.ghostId, ghostId!),
        eq(guildContributionBreakdownTable.weekStart, weekStart),
      );

  const [existing] = await db
    .select({ id: guildContributionBreakdownTable.id })
    .from(guildContributionBreakdownTable)
    .where(whereClause)
    .limit(1);

  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (delta.combatKills)   updates.combatKills   = sql`${guildContributionBreakdownTable.combatKills} + ${delta.combatKills}`;
    if (delta.bossKills)     updates.bossKills     = sql`${guildContributionBreakdownTable.bossKills} + ${delta.bossKills}`;
    if (delta.dungeonClears) updates.dungeonClears = sql`${guildContributionBreakdownTable.dungeonClears} + ${delta.dungeonClears}`;
    if (delta.craftedItems)  updates.craftedItems  = sql`${guildContributionBreakdownTable.craftedItems} + ${delta.craftedItems}`;
    if (delta.goldDonated)   updates.goldDonated   = sql`${guildContributionBreakdownTable.goldDonated} + ${delta.goldDonated}`;
    if (delta.totalPoints)   updates.totalPoints   = sql`${guildContributionBreakdownTable.totalPoints} + ${delta.totalPoints}`;

    await db.update(guildContributionBreakdownTable)
      .set(updates as Parameters<typeof db.update>[0])
      .where(eq(guildContributionBreakdownTable.id, existing.id))
      .catch(() => {});
  } else {
    await db.insert(guildContributionBreakdownTable).values({
      guildId,
      characterId,
      ghostId,
      weekStart,
      combatKills:   delta.combatKills   ?? 0,
      bossKills:     delta.bossKills     ?? 0,
      dungeonClears: delta.dungeonClears ?? 0,
      craftedItems:  delta.craftedItems  ?? 0,
      goldDonated:   delta.goldDonated   ?? 0,
      totalPoints:   delta.totalPoints   ?? 0,
    }).onConflictDoNothing().catch(() => {});
  }
}

/**
 * Recomputes and persists contribution_points for all real (non-ghost) members
 * of a guild from their live character stats. Also tracks weekly deltas.
 */
async function refreshRealMemberContributions(guildId: number): Promise<void> {
  const realRows = await db
    .select({
      id: guildMembersTable.id,
      characterId: guildMembersTable.characterId,
      contributionPoints: guildMembersTable.contributionPoints,
      weeklyContributionPoints: guildMembersTable.weeklyContributionPoints,
      weeklyResetAt: guildMembersTable.weeklyResetAt,
    })
    .from(guildMembersTable)
    .where(and(eq(guildMembersTable.guildId, guildId), isNotNull(guildMembersTable.characterId)));

  if (realRows.length === 0) return;

  const charIds = realRows.map(r => r.characterId as number);
  const chars = await db
    .select({
      id: charactersTable.id,
      level: charactersTable.level,
      killCount: charactersTable.killCount,
      bossKills: charactersTable.bossKills,
      heroicCompleted: charactersTable.heroicCompleted,
      itemsCrafted: charactersTable.itemsCrafted,
    })
    .from(charactersTable)
    .where(inArray(charactersTable.id, charIds));

  // Fetch dungeon clears for all members in batch
  const dungeonStats = await db
    .select({
      characterId: dungeonKillStatsTable.characterId,
      completions: sql<number>`cast(sum(${dungeonKillStatsTable.completions}) as int)`,
    })
    .from(dungeonKillStatsTable)
    .where(inArray(dungeonKillStatsTable.characterId, charIds))
    .groupBy(dungeonKillStatsTable.characterId);
  const dungeonClearsMap = new Map(dungeonStats.map(d => [d.characterId, d.completions]));

  const charMap = new Map(chars.map(c => [c.id, c]));
  const weekStart = getThisSundayMidnightUTC();

  for (const row of realRows) {
    const c = charMap.get(row.characterId!);
    if (!c) continue;

    const dungeonClears = dungeonClearsMap.get(row.characterId!) ?? 0;
    const newTotal = computeContribution({ ...c, dungeonClears });
    const prevTotal = row.contributionPoints ?? 0;
    const delta = Math.max(0, newTotal - prevTotal);

    // Determine current weekly points (lazy Sunday reset)
    const needsReset = !row.weeklyResetAt || row.weeklyResetAt < weekStart;
    const currentWeekly = needsReset ? 0 : (row.weeklyContributionPoints ?? 0);
    const newWeekly = currentWeekly + delta;

    await db.update(guildMembersTable)
      .set({
        contributionPoints: newTotal,
        weeklyContributionPoints: newWeekly,
        weeklyResetAt: needsReset ? weekStart : row.weeklyResetAt,
        lastActiveAt: delta > 0 ? new Date() : undefined,
      })
      .where(eq(guildMembersTable.id, row.id))
      .catch(() => {});

    // Update weekly breakdown if there's a delta
    if (delta > 0) {
      // Estimate category deltas proportionally from total delta
      // (We don't have per-category delta easily; use a best-effort split)
      const totalBase = c.level * 100 + Math.floor(c.killCount * 0.5) + c.bossKills * 10 + c.heroicCompleted * 100 + c.itemsCrafted * 5 + dungeonClears * 50;
      const ratio = totalBase > 0 ? delta / newTotal : 0;

      await upsertContributionBreakdown(guildId, row.characterId!, null, weekStart, {
        combatKills:   Math.round(Math.floor(c.killCount * 0.5) * ratio),
        bossKills:     Math.round(c.bossKills * 10 * ratio),
        dungeonClears: Math.round(dungeonClears * 50 * ratio),
        craftedItems:  Math.round(c.itemsCrafted * 5 * ratio),
        totalPoints:   Math.round(delta),
      });

      // Update challenge progress
      await updateChallengeProgress(guildId, weekStart, {
        kills: Math.round(c.killCount * ratio),
        boss_kills: Math.round(c.bossKills * ratio),
        dungeons: Math.round(dungeonClears * ratio),
        crafts: Math.round(c.itemsCrafted * ratio),
      });
    }
  }
}

/**
 * Increment challenge progress for the guild's current week.
 */
async function updateChallengeProgress(
  guildId: number,
  weekStart: Date,
  deltas: { kills?: number; boss_kills?: number; dungeons?: number; crafts?: number; gold_deposited?: number },
): Promise<void> {
  const challenges = await db
    .select()
    .from(guildChallengesTable)
    .where(and(
      eq(guildChallengesTable.guildId, guildId),
      eq(guildChallengesTable.weekStart, weekStart),
      eq(guildChallengesTable.completed, false),
    ));

  for (const challenge of challenges) {
    const type = challenge.challengeType as keyof typeof deltas;
    const d = deltas[type] ?? 0;
    if (d <= 0) continue;

    const newValue = Math.min(challenge.currentValue + d, challenge.targetValue);
    const completed = newValue >= challenge.targetValue;

    await db.update(guildChallengesTable)
      .set({
        currentValue: newValue,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .where(eq(guildChallengesTable.id, challenge.id))
      .catch(() => {});
  }
}

async function buildGuildMembers(guildId: number) {
  const memberRows = await db
    .select()
    .from(guildMembersTable)
    .where(eq(guildMembersTable.guildId, guildId));

  const realIds   = memberRows.filter(m => m.characterId !== null && m.characterId !== undefined).map(m => m.characterId as number);
  const ghostIds  = memberRows.filter(m => m.ghostId !== null && m.ghostId !== undefined).map(m => m.ghostId as number);

  const chars   = realIds.length > 0
    ? await db.select({
        id: charactersTable.id,
        name: charactersTable.name,
        race: charactersTable.race,
        class: charactersTable.class,
        archetype: charactersTable.archetype,
        level: charactersTable.level,
        zone: charactersTable.zone,
        killCount: charactersTable.killCount,
        bossKills: charactersTable.bossKills,
        heroicCompleted: charactersTable.heroicCompleted,
      })
      .from(charactersTable)
      .where(sql`${charactersTable.id} = any(${realIds})`)
    : [];

  const ghosts  = ghostIds.length > 0
    ? await db.select({
        id: worldPlayersTable.id,
        name: worldPlayersTable.name,
        race: worldPlayersTable.race,
        class: worldPlayersTable.class,
        archetype: worldPlayersTable.archetype,
        level: worldPlayersTable.level,
        zone: worldPlayersTable.zone,
        killCount: worldPlayersTable.killCount,
        bossKills: worldPlayersTable.bossKills,
      })
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
