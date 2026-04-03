-- Zone kills tracking: per-zone enemy kill counts stored as JSONB on characters
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "zone_kills" jsonb DEFAULT '{}'::jsonb NOT NULL;
