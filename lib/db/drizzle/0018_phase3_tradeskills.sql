-- Phase 3: Master & OoaK Tradeskill System

-- Add claimedBy column to recipes (for OoaK binding)
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "claimed_by" text;

-- Index for OoaK unclaimed queries (filtered by is_ooak = true and claimed_by IS NULL)
CREATE INDEX IF NOT EXISTS "recipes_ooak_claimed_idx" ON "recipes" ("is_ooak", "claimed_by");

-- Ghost legacy events table
CREATE TABLE IF NOT EXISTS "ghost_legacy" (
  "id" serial PRIMARY KEY NOT NULL,
  "ghost_id" integer NOT NULL,
  "ghost_name" text NOT NULL,
  "drop_type" text NOT NULL,
  "drop_name" text NOT NULL,
  "drop_reference" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
