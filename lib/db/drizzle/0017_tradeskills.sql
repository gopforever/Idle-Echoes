CREATE TABLE IF NOT EXISTS recipes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  tradeskill_class text NOT NULL,
  tier text NOT NULL DEFAULT 'apprentice',
  min_skill integer NOT NULL DEFAULT 1,
  min_level integer NOT NULL DEFAULT 1,
  craft_time_seconds integer NOT NULL DEFAULT 60,
  ingredients jsonb NOT NULL DEFAULT '[]',
  output jsonb NOT NULL DEFAULT '{}',
  acquisition_type text NOT NULL DEFAULT 'vendor',
  vendor_cost integer,
  is_ooak boolean NOT NULL DEFAULT false,
  sprite_id text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS craft_queue (
  id serial PRIMARY KEY,
  character_id integer NOT NULL,
  recipe_id integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  quantity_completed integer NOT NULL DEFAULT 0,
  started_at timestamp NOT NULL DEFAULT now(),
  next_completes_at timestamp NOT NULL,
  status text NOT NULL DEFAULT 'crafting'
);

ALTER TABLE characters ADD COLUMN IF NOT EXISTS tradeskill_class text;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS tradeskills jsonb NOT NULL DEFAULT '{"weaponsmith":0,"armorer":0,"tailor":0,"jeweler":0,"alchemist":0}';
