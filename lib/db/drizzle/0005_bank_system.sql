-- Add bank system: bank_items table and bank_gold column
CREATE TABLE IF NOT EXISTS bank_items (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_data JSONB NOT NULL DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS bank_gold REAL NOT NULL DEFAULT 0;
