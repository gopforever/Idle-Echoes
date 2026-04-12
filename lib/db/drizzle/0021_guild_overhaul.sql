-- Guild System MMO Overhaul: Phase 1 (weekly contributions) + Phase 2 (bank/challenges/recruitment) + Phase 3 (rank snapshots)

-- ─── Phase 1: Weekly activity tracking columns on guild_members ───────────────
ALTER TABLE guild_members
  ADD COLUMN IF NOT EXISTS weekly_contribution_points real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_reset_at timestamp,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp;

-- ─── Phase 1: Per-week per-member contribution breakdown ──────────────────────
CREATE TABLE IF NOT EXISTS guild_contribution_breakdown (
  id serial PRIMARY KEY NOT NULL,
  guild_id integer NOT NULL,
  character_id integer,
  ghost_id integer,
  week_start timestamp NOT NULL,
  combat_kills integer NOT NULL DEFAULT 0,
  boss_kills integer NOT NULL DEFAULT 0,
  dungeon_clears integer NOT NULL DEFAULT 0,
  crafted_items integer NOT NULL DEFAULT 0,
  gold_donated real NOT NULL DEFAULT 0,
  total_points real NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS gcb_char_week_idx
  ON guild_contribution_breakdown (guild_id, character_id, week_start)
  WHERE character_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gcb_ghost_week_idx
  ON guild_contribution_breakdown (guild_id, ghost_id, week_start)
  WHERE ghost_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS gcb_guild_week_idx
  ON guild_contribution_breakdown (guild_id, week_start);

-- ─── Phase 2: Lifetime gold deposited tracking on guilds ─────────────────────
ALTER TABLE guilds
  ADD COLUMN IF NOT EXISTS total_gold_deposited real NOT NULL DEFAULT 0;

-- ─── Phase 2: Recruitment & settings columns on guilds ───────────────────────
ALTER TABLE guilds
  ADD COLUMN IF NOT EXISTS is_recruiting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recruit_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS officer_daily_withdraw_limit real NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS member_daily_withdraw_limit real NOT NULL DEFAULT 0;

-- ─── Phase 2: Bank withdrawal tracking columns on guild_members ───────────────
ALTER TABLE guild_members
  ADD COLUMN IF NOT EXISTS daily_withdrawn real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withdraw_reset_at timestamp;

-- ─── Phase 2: Bank transaction log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_bank_transactions (
  id serial PRIMARY KEY NOT NULL,
  guild_id integer NOT NULL,
  character_id integer,
  ghost_id integer,
  transaction_type text NOT NULL,
  amount real NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS gbt_guild_idx
  ON guild_bank_transactions (guild_id, created_at DESC);

-- ─── Phase 2: Guild weekly challenges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_challenges (
  id serial PRIMARY KEY NOT NULL,
  guild_id integer NOT NULL,
  week_start timestamp NOT NULL,
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_xp_bonus integer NOT NULL DEFAULT 0,
  completed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS guild_challenges_week_type_idx
  ON guild_challenges (guild_id, week_start, challenge_type);

CREATE INDEX IF NOT EXISTS guild_challenges_guild_week_idx
  ON guild_challenges (guild_id, week_start);

-- ─── Phase 2: Guild applications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_applications (
  id serial PRIMARY KEY NOT NULL,
  guild_id integer NOT NULL,
  character_id integer NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by integer,
  applied_at timestamp DEFAULT now() NOT NULL,
  reviewed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS guild_applications_guild_char_idx
  ON guild_applications (guild_id, character_id);

-- ─── Phase 3: Weekly rank snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_rank_snapshots (
  id serial PRIMARY KEY NOT NULL,
  guild_id integer NOT NULL,
  week_start timestamp NOT NULL,
  rank integer NOT NULL,
  score integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS guild_rank_snapshots_guild_week_idx
  ON guild_rank_snapshots (guild_id, week_start);
