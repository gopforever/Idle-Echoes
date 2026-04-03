import app from "./app";
import { logger } from "./lib/logger";
import { startGhostSimulation } from "./lib/ghostSimulator.js";
import { setupRealtimeReplication } from "./lib/realtimeSetup.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind to 0.0.0.0 so the server accepts connections on all interfaces,
// which is required in container/PaaS environments (Replit, Railway, Render…).
app.listen(port, "0.0.0.0", (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, host: "0.0.0.0" }, "Server listening");
  startGhostSimulation();

  // Set REPLICA IDENTITY FULL on tables used by Supabase Realtime so that
  // all column values are available in change events. This is idempotent and
  // safe to run on every startup.
  setupRealtimeReplication().catch((err) =>
    logger.warn({ err }, "Realtime replication setup skipped"),
  );
});
