-- Epic Quest Progress table
CREATE TABLE IF NOT EXISTS epic_quest_progress (
  id serial PRIMARY KEY,
  character_id integer NOT NULL,
  class_id text NOT NULL,
  current_step integer NOT NULL DEFAULT 1,
  step_data jsonb NOT NULL DEFAULT '{"step1Done":false,"step2Done":false,"step3Done":false,"step4Done":false,"step5Done":false}'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  fabled_weapon_id text,
  mythical_awarded boolean NOT NULL DEFAULT false,
  mythical_weapon_id text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- One quest chain per character
CREATE UNIQUE INDEX IF NOT EXISTS epic_quest_progress_character_id_idx ON epic_quest_progress (character_id);
