-- Gathering system: sessions table + character stat counters + ghost inventory stash
-- gathering_sessions: one row per active gathering job per skill slot
CREATE TABLE IF NOT EXISTS "gathering_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "character_id" integer NOT NULL,
  "skill_id" text NOT NULL,
  "node_id" text NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "last_tick_at" timestamp DEFAULT now() NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "total_gathered" integer DEFAULT 0 NOT NULL
);

-- ghost_inventory: accumulated materials per ghost player before auction listing
-- ghostId = worldPlayersTable.id (text); materials accumulate here then drain to auction listings
CREATE TABLE IF NOT EXISTS "ghost_inventory" (
  "id" serial PRIMARY KEY NOT NULL,
  "ghost_id" text NOT NULL,
  "ghost_name" text NOT NULL,
  "item_id" text NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unique constraint so we can upsert per ghost+item
CREATE UNIQUE INDEX IF NOT EXISTS "ghost_inventory_ghost_item_idx" ON "ghost_inventory" ("ghost_id", "item_id");

-- Lookup index for gathering sessions per character+skill+active state
CREATE INDEX IF NOT EXISTS "gathering_sessions_character_skill_active_idx" ON "gathering_sessions" ("character_id", "skill_id", "is_active");

-- Partial unique index: enforce at most one active session per (character_id, skill_id)
-- Only applies to active=true rows, so historical (completed) sessions are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS "gathering_sessions_active_unique_idx"
  ON "gathering_sessions" ("character_id", "skill_id")
  WHERE "is_active" = true;

-- Gathering stat counters on characters
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "ores_gathered" integer DEFAULT 0 NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "logs_chopped" integer DEFAULT 0 NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "fish_caught" integer DEFAULT 0 NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "herbs_gathered" integer DEFAULT 0 NOT NULL;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "rares_gathered" integer DEFAULT 0 NOT NULL;
