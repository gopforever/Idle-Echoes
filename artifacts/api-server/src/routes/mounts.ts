import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mountsTable, charactersTable } from "@workspace/db/schema";
import { MOUNTS } from "../lib/eq2Data.js";
import { getOrCreateCharacter } from "./character.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/mounts", async (req, res) => {
  try {
    const characterId = req.characterId;
    const dbMounts = await db.select().from(mountsTable).where(eq(mountsTable.characterId, characterId));
    const ownedMap = new Map(dbMounts.map(m => [m.mountId, m]));

    const result = MOUNTS.map(mount => ({
      id: mount.id, name: mount.name, description: mount.description,
      type: mount.type, speedBonus: mount.speedBonus, buyPrice: mount.buyPrice,
      source: mount.source, spriteId: mount.spriteId, level: mount.level,
      owned: ownedMap.get(mount.id)?.owned ?? false,
      equipped: ownedMap.get(mount.id)?.equipped ?? false,
    }));

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting mounts");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/mounts/:mountId/equip", async (req, res) => {
  try {
    const characterId = req.characterId;
    const { mountId } = req.params;
    const mount = MOUNTS.find(m => m.id === mountId);
    if (!mount) return res.status(404).json({ success: false, message: "Mount not found" });

    const [dbMount] = await db.select().from(mountsTable).where(
      and(eq(mountsTable.characterId, characterId), eq(mountsTable.mountId, mountId))
    );
    if (!dbMount?.owned) return res.json({ success: false, message: "You don't own this mount" });

    await db.update(mountsTable).set({ equipped: false }).where(eq(mountsTable.characterId, characterId));
    await db.update(mountsTable).set({ equipped: true }).where(
      and(eq(mountsTable.characterId, characterId), eq(mountsTable.mountId, mountId))
    );

    const character = await getOrCreateCharacter(req.characterId);
    await db.update(charactersTable).set({ activeMount: mountId, updatedAt: new Date() }).where(eq(charactersTable.id, character.id));

    return res.json({
      success: true,
      message: `${mount.name} equipped! Movement speed +${mount.speedBonus}%`,
      mount: { ...mount, owned: true, equipped: true },
    });
  } catch (err) {
    req.log.error({ err }, "Error equipping mount");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
