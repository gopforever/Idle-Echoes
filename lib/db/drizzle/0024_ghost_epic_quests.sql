-- Ghost Epic Quest Progress table
-- Mirrors epic_quest_progress but keyed by ghost_id (world_players.id).
-- Populated automatically by the ghost simulator.
CREATE TABLE IF NOT EXISTS ghost_epic_quest_progress (
  id serial PRIMARY KEY,
  ghost_id integer NOT NULL,
  class_id text NOT NULL,
  fabled_weapon_id text NOT NULL,
  mythical_awarded boolean NOT NULL DEFAULT false,
  mythical_weapon_id text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- One record per ghost
CREATE UNIQUE INDEX IF NOT EXISTS ghost_epic_quest_progress_ghost_id_idx
  ON ghost_epic_quest_progress (ghost_id);
