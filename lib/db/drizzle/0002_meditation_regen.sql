ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "is_meditating" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "last_regen_at" timestamp;
