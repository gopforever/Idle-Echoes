-- Ghost deep systems: gear, generation lineage, dungeon/raid progression
ALTER TABLE "world_players" ADD COLUMN IF NOT EXISTS "gear" jsonb DEFAULT '{}';
ALTER TABLE "world_players" ADD COLUMN IF NOT EXISTS "generation" integer NOT NULL DEFAULT 1;
ALTER TABLE "world_players" ADD COLUMN IF NOT EXISTS "parent_id" integer;
ALTER TABLE "world_players" ADD COLUMN IF NOT EXISTS "inherited_traits" jsonb DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "ghost_dungeon_clears" (
  "id" serial PRIMARY KEY NOT NULL,
  "ghost_id" integer NOT NULL,
  "dungeon_id" text NOT NULL,
  "clear_count" integer NOT NULL DEFAULT 1,
  "best_difficulty" text NOT NULL DEFAULT 'normal',
  "last_cleared_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ghost_dungeon_clears_ghost_dungeon_idx"
  ON "ghost_dungeon_clears" ("ghost_id", "dungeon_id");

CREATE TABLE IF NOT EXISTS "ghost_raid_clears" (
  "id" serial PRIMARY KEY NOT NULL,
  "ghost_id" integer NOT NULL,
  "raid_id" text NOT NULL,
  "clear_count" integer NOT NULL DEFAULT 1,
  "max_phase" integer NOT NULL DEFAULT 1,
  "last_cleared_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ghost_raid_clears_ghost_raid_idx"
  ON "ghost_raid_clears" ("ghost_id", "raid_id");
