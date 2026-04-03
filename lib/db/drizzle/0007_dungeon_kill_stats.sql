CREATE TABLE IF NOT EXISTS "dungeon_kill_stats" (
  "id" serial PRIMARY KEY NOT NULL,
  "character_id" integer NOT NULL,
  "dungeon_or_raid_id" text NOT NULL,
  "is_raid" boolean NOT NULL DEFAULT false,
  "normal_kills" integer NOT NULL DEFAULT 0,
  "mini_boss_kills" integer NOT NULL DEFAULT 0,
  "main_boss_kills" integer NOT NULL DEFAULT 0,
  "completions" integer NOT NULL DEFAULT 0,
  "first_clear_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "dungeon_kill_stats_character_dungeon_unique" UNIQUE("character_id", "dungeon_or_raid_id")
);
