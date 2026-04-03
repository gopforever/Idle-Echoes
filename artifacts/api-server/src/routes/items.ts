import { Router, type IRouter } from "express";
import { ITEMS, ENEMIES, CRAFTING_RECIPES, getItemById } from "../lib/gameData.js";

const router: IRouter = Router();

router.get("/items", (req, res) => {
  try {
    let items = [...ITEMS];
    const { type, slot, minLevel, maxLevel } = req.query;
    
    if (type) items = items.filter(i => i.type === type);
    if (slot) items = items.filter(i => i.slot === slot);
    if (minLevel) items = items.filter(i => i.level >= Number(minLevel));
    if (maxLevel) items = items.filter(i => i.level <= Number(maxLevel));
    
    return res.json(items.map(i => ({
      ...i,
      description: i.description || "",
      buyPrice: i.buyPrice,
      quantity: i.quantity || 1,
      stackable: i.stackable || false,
    })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/items/:itemId", (req, res) => {
  try {
    const item = getItemById(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json({
      ...item,
      description: item.description || "",
      buyPrice: item.buyPrice,
      quantity: item.quantity || 1,
      stackable: item.stackable || false,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/enemies", (req, res) => {
  try {
    let enemies = [...ENEMIES];
    const { zone, minLevel, maxLevel } = req.query;
    
    if (zone) enemies = enemies.filter(e => e.zone === zone);
    if (minLevel) enemies = enemies.filter(e => e.level >= Number(minLevel));
    if (maxLevel) enemies = enemies.filter(e => e.level <= Number(maxLevel));
    
    return res.json(enemies);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crafting/recipes", (req, res) => {
  try {
    return res.json(CRAFTING_RECIPES);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
