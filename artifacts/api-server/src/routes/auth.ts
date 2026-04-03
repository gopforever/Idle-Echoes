import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, charactersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (username.length < 3 || username.length > 24) {
      return res.status(400).json({ error: "Username must be 3–24 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return res.status(400).json({ error: "Username may only contain letters, numbers, and underscores" });
    }

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, trimmed)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      username: trimmed,
      passwordHash,
    }).returning({ id: usersTable.id, username: usersTable.username });

    req.session.userId = user.id;
    delete req.session.activeCharacterId;

    return res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    req.log.error({ err }, "Error registering user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const trimmed = username.trim().toLowerCase();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, trimmed)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.userId = user.id;
    delete req.session.activeCharacterId;

    return res.json({ id: user.id, username: user.username });
  } catch (err) {
    req.log.error({ err }, "Error logging in");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Error destroying session");
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.clearCookie("sid");
    return res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const [user] = await db.select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      username: user.username,
      activeCharacterId: req.session.activeCharacterId ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching current user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/characters", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const characters = await db
      .select({
        id: charactersTable.id,
        name: charactersTable.name,
        race: charactersTable.race,
        class: charactersTable.class,
        archetype: charactersTable.archetype,
        alignment: charactersTable.alignment,
        level: charactersTable.level,
        zone: charactersTable.zone,
        createdAt: charactersTable.createdAt,
      })
      .from(charactersTable)
      .where(eq(charactersTable.userId, req.session.userId));
    return res.json(characters);
  } catch (err) {
    req.log.error({ err }, "Error fetching characters");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/select-character/:id", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const charId = parseInt(req.params.id, 10);
    if (isNaN(charId)) return res.status(400).json({ error: "Invalid character id" });

    const [char] = await db
      .select({ id: charactersTable.id })
      .from(charactersTable)
      .where(and(eq(charactersTable.id, charId), eq(charactersTable.userId, req.session.userId)))
      .limit(1);

    if (!char) return res.status(404).json({ error: "Character not found or does not belong to you" });

    req.session.activeCharacterId = char.id;
    return res.json({ ok: true, activeCharacterId: char.id });
  } catch (err) {
    req.log.error({ err }, "Error selecting character");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
