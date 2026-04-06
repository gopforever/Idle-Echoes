-- Task: Server-side Pinned Recipes
-- Adds pinnedRecipes column to characters table.

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "pinned_recipes" jsonb NOT NULL DEFAULT '[]'::jsonb;
