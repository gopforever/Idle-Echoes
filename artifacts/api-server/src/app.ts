import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import "./types/session.js";

const app: Express = express();

// Trust the first proxy hop (Replit / Vercel / Railway etc.) so that
// express-rate-limit can read the real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

// ─── CORS — explicit allowlist only, no wildcards while credentials: true ────
// Extend by setting FRONTEND_URL (single URL) or CORS_ORIGINS (comma-separated)
// in your deployment environment.
const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:8080",
]);

if (process.env["FRONTEND_URL"]) {
  allowedOrigins.add(process.env["FRONTEND_URL"].trim());
}
if (process.env["CORS_ORIGINS"]) {
  for (const o of process.env["CORS_ORIGINS"].split(",")) {
    const trimmed = o.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  }
}

const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

// Accept *.replit.dev and *.repl.co dynamically in non-production environments
// so the Replit preview frame can call the API during development.
// In production, only the explicit allowlist above is trusted.
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // server-to-server (no Origin header)
  if (allowedOrigins.has(origin)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // *.replit.app is the production deployment domain for this project
  if (/\.replit\.app$/.test(origin)) return true;
  if (!IS_PRODUCTION) {
    // Replit preview domains — dev only
    if (/\.replit\.dev$/.test(origin)) return true;
    if (/\.repl\.co$/.test(origin)) return true;
  }
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      // Reject unknown origins — do NOT silently allow (callback(null, false)
      // suppresses the header, which equals a CORS block without an error log)
      logger.warn({ origin }, "CORS: rejected unknown origin");
      return callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session middleware ────────────────────────────────────────────────────────
const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-secret-change-me";
app.use(
  session({
    name: "sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: IS_PRODUCTION ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
);

app.use("/api", router);

export default app;
