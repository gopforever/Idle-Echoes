-- Add auto_potions toggle to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS auto_potions BOOLEAN NOT NULL DEFAULT FALSE;
