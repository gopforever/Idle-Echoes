-- Migration: Add active_hours_start / active_hours_end to world_players
-- Ghost players now have a defined login window (UTC hours).
-- Default 0–23 keeps existing ghosts always-active (no behaviour change).

ALTER TABLE "world_players"
  ADD COLUMN IF NOT EXISTS "active_hours_start" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active_hours_end"   integer NOT NULL DEFAULT 23;
