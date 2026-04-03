import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    activeCharacterId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      characterId: number;
      userId: number;
    }
  }
}
