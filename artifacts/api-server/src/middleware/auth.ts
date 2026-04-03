import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.activeCharacterId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = req.session.userId;
  req.characterId = req.session.activeCharacterId;
  return next();
}
