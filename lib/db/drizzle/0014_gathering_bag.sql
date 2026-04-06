-- Gathering Bag: unlimited item storage for gathering yields.
-- Crafting can consume from inventory first, then this bag.
-- Unique constraint on (character_id, item_id) allows atomic increment upserts.
CREATE TABLE IF NOT EXISTS "gathering_bag_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "character_id" integer NOT NULL,
  "item_id" text NOT NULL,
  "item_data" jsonb NOT NULL DEFAULT '{}',
  "quantity" integer NOT NULL DEFAULT 1,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "gathering_bag_items_character_item_idx"
  ON "gathering_bag_items" ("character_id", "item_id");
