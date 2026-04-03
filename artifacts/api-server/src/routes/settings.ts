import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /settings ────────────────────────────────────────────────────────────
router.get("/settings", async (req, res) => {
  const userId: number = req.userId;
  const settings = await getOrCreateSettings(userId);
  return res.json(formatSettings(settings));
});

// ─── PUT /settings ────────────────────────────────────────────────────────────
router.put("/settings", async (req, res) => {
  const userId: number = req.userId;
  const existing = await getOrCreateSettings(userId);

  const allowed = [
    "combatSpeed", "autoSell", "autoSellRarity", "showDamageNumbers",
    "showWorldEvents", "compactMode", "soundEnabled", "musicEnabled",
    "notificationsEnabled", "theme",
  ] as const;

  const patch: Partial<typeof settingsTable.$inferInsert> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in req.body) {
      (patch as Record<string, unknown>)[key] = req.body[key];
    }
  }

  const [updated] = await db
    .update(settingsTable)
    .set(patch)
    .where(eq(settingsTable.id, existing.id))
    .returning();

  return res.json(formatSettings(updated));
});

// ─── POST /settings/reset ─────────────────────────────────────────────────────
router.post("/settings/reset", async (req, res) => {
  const userId: number = req.userId;
  const existing = await getOrCreateSettings(userId);

  const [reset] = await db
    .update(settingsTable)
    .set({
      combatSpeed: "normal",
      autoSell: false,
      autoSellRarity: "common",
      showDamageNumbers: true,
      showWorldEvents: true,
      compactMode: false,
      soundEnabled: true,
      musicEnabled: true,
      notificationsEnabled: true,
      theme: "dark",
      updatedAt: new Date(),
    })
    .where(eq(settingsTable.id, existing.id))
    .returning();

  return res.json(formatSettings(reset));
});

export default router;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateSettings(userId: number) {
  const [existing] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(settingsTable)
    .values({ userId })
    .returning();

  return created;
}

function formatSettings(s: typeof settingsTable.$inferSelect) {
  return {
    combatSpeed: s.combatSpeed,
    autoSell: s.autoSell,
    autoSellRarity: s.autoSellRarity,
    showDamageNumbers: s.showDamageNumbers,
    showWorldEvents: s.showWorldEvents,
    compactMode: s.compactMode,
    soundEnabled: s.soundEnabled,
    musicEnabled: s.musicEnabled,
    notificationsEnabled: s.notificationsEnabled,
    theme: s.theme,
  };
}
