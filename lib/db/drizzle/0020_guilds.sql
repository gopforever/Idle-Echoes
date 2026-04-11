-- Guild system: guilds and guild_members tables

CREATE TABLE IF NOT EXISTS "guilds" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "tag" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "motto" text NOT NULL DEFAULT '',
  "alignment" text NOT NULL DEFAULT 'Neutral',
  "leader_id" integer,
  "is_ghost" boolean NOT NULL DEFAULT false,
  "bank_gold" real NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "guilds_name_unique" ON "guilds" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "guilds_tag_unique" ON "guilds" ("tag");

CREATE TABLE IF NOT EXISTS "guild_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "guild_id" integer NOT NULL,
  "character_id" integer,
  "ghost_id" integer,
  "rank" text NOT NULL DEFAULT 'member',
  "contribution_points" real NOT NULL DEFAULT 0,
  "joined_at" timestamp DEFAULT now() NOT NULL
);

-- A real character can only belong to one guild at a time.
-- PostgreSQL unique indexes allow multiple NULLs, so ghost rows (character_id IS NULL) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "guild_members_character_unique"
  ON "guild_members" ("character_id")
  WHERE "character_id" IS NOT NULL;
