-- Auction Hall: add soldAt and sellerPersonality columns

ALTER TABLE "auction_listings" ADD COLUMN IF NOT EXISTS "sold_at" timestamp;
ALTER TABLE "auction_listings" ADD COLUMN IF NOT EXISTS "seller_personality" text;

-- Index for efficient recent-sales queries
CREATE INDEX IF NOT EXISTS "auction_listings_sold_at_idx" ON "auction_listings" ("sold_at" DESC NULLS LAST) WHERE "sold" = true;
