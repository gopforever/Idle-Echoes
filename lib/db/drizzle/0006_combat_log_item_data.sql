-- Add item_data column to combat_log for tooltip support
ALTER TABLE combat_log ADD COLUMN IF NOT EXISTS item_data jsonb;
