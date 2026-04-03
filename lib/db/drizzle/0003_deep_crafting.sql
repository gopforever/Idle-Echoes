CREATE TABLE IF NOT EXISTS "known_recipes" (
  "id" serial PRIMARY KEY NOT NULL,
  "character_id" integer NOT NULL,
  "recipe_id" text NOT NULL,
  "learned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ghost_known_recipes" (
  "id" serial PRIMARY KEY NOT NULL,
  "ghost_id" integer NOT NULL,
  "recipe_id" text NOT NULL,
  "learned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "one_of_a_kind_crafted" (
  "recipe_id" text PRIMARY KEY NOT NULL,
  "crafted_by" text NOT NULL,
  "crafted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "known_recipes_char_recipe_idx" ON "known_recipes" ("character_id","recipe_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "known_recipes_char_idx" ON "known_recipes" ("character_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ghost_known_recipes_ghost_recipe_idx" ON "ghost_known_recipes" ("ghost_id","recipe_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ghost_known_recipes_ghost_idx" ON "ghost_known_recipes" ("ghost_id");
