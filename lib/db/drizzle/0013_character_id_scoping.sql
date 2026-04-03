-- Task #35: Multi-User Accounts — per-character game state scoping
-- Applied via drizzle-kit push (project uses schema-sync, not migrate).
-- This file documents the columns added to scope all game state per character.

-- ─── Add character_id to all legacy game tables ───────────────────────────────

ALTER TABLE "inventory"           ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "skills"              ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "combat_state"        ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "combat_log"          ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "achievements"        ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "factions"            ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "aa_points"           ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "adornments"          ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "collections"         ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "mounts"              ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "heroic_state"        ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "ability_cooldowns"   ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "bank_items"          ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "dungeon_kill_stats"  ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "dungeon_runs"        ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "gathering_sessions"  ADD COLUMN IF NOT EXISTS "character_id" integer;
ALTER TABLE "raid_runs"           ADD COLUMN IF NOT EXISTS "character_id" integer;

-- ─── Add character_id to auction_listings (nullable; NULL = ghost seller) ─────

ALTER TABLE "auction_listings" ADD COLUMN IF NOT EXISTS "character_id" integer;

-- ─── Add character_id to quests ───────────────────────────────────────────────

ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "character_id" integer;

-- ─── Add unique index on skills (character_id, skill_id) ─────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "skills_character_skill_unique"
  ON "skills" ("character_id", "skill_id");

-- ─── Backfill: assign existing rows to the first character ───────────────────
-- Preserves all pre-multi-user game progress by associating orphaned rows with
-- the first character in the database (character_id = 1, seeded by migration 0012).

DO $$
DECLARE v_char_id integer;
BEGIN
  SELECT id INTO v_char_id FROM "characters" ORDER BY id ASC LIMIT 1;
  IF v_char_id IS NOT NULL THEN
    UPDATE "inventory"          SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "skills"             SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "combat_state"       SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "combat_log"         SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "achievements"       SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "factions"           SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "aa_points"          SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "adornments"         SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "collections"        SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "mounts"             SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "heroic_state"       SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "ability_cooldowns"  SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "bank_items"         SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "dungeon_kill_stats" SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "dungeon_runs"       SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "gathering_sessions" SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "raid_runs"          SET "character_id" = v_char_id WHERE "character_id" IS NULL;
    UPDATE "quests"             SET "character_id" = v_char_id WHERE "character_id" IS NULL;
  END IF;
END $$;
