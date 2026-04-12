-- Achievement Kill Tracking: per mob-type kill counters

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS humanoid_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beast_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elemental_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS construct_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planar_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fae_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gnoll_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goblin_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orc_kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS giant_kills integer NOT NULL DEFAULT 0;
