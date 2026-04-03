CREATE TABLE IF NOT EXISTS "auction_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"seller_name" text NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"item_data" jsonb NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"buyout_price" real NOT NULL,
	"category" text DEFAULT 'misc' NOT NULL,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"sold" boolean DEFAULT false NOT NULL,
	"cancelled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auction_listings_active_idx" ON "auction_listings" ("sold","cancelled","expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auction_listings_seller_idx" ON "auction_listings" ("seller_id");
