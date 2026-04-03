CREATE TABLE IF NOT EXISTS "boss_encounters" (
        "id" serial PRIMARY KEY NOT NULL,
        "player_id" integer NOT NULL,
        "boss_id" text NOT NULL,
        "player_kills" integer DEFAULT 0 NOT NULL,
        "boss_kills" integer DEFAULT 0 NOT NULL,
        "last_killing_ability" text,
        "grudge_level" integer DEFAULT 0 NOT NULL,
        "last_encountered_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "boss_encounters_player_boss_unique" ON "boss_encounters" ("player_id","boss_id");
