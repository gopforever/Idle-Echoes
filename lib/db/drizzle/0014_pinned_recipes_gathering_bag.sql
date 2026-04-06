-- Task: Server-side Pinned Recipes + Gathering Bag
-- Adds pinnedRecipes column to characters and creates gathering_bag_items table.

-- ─── Add pinnedRecipes to characters ─────────────────────────────────────────
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "pinned_recipes" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ─── Create gathering_bag_items table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gathering_bag_items" (
  "id" serial PRIMARY KEY,
  "character_id" integer NOT NULL,
  "item_id" text NOT NULL,
  "item_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "quantity" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "gathering_bag_char_item_idx" ON "gathering_bag_items" ("character_id", "item_id");
