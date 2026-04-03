-- Add DPS tracking columns to combat_state
-- total_player_damage: cumulative solo-player damage in the current fight (reset to 0 when combat ends)
-- combat_start_ms: epoch ms (bigint) when the fight started (null when not in active combat)
ALTER TABLE combat_state ADD COLUMN IF NOT EXISTS total_player_damage real NOT NULL DEFAULT 0;
ALTER TABLE combat_state ADD COLUMN IF NOT EXISTS combat_start_ms bigint;
-- If the column was previously added as real, convert it to bigint for full epoch-ms precision
ALTER TABLE combat_state ALTER COLUMN combat_start_ms TYPE bigint USING combat_start_ms::bigint;
