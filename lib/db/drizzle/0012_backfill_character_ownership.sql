-- Backfill: assign orphaned characters to a default seed account
-- This preserves game data for characters created before the multi-user system
--
-- NOTE on seed account: the INSERT below only runs when there are NO users yet
-- (i.e. a fresh deploy with no prior registrations). On databases that already
-- have registered users, this INSERT is skipped entirely and orphaned characters
-- are assigned to the earliest registered user instead.
--
-- If the seed account IS created (fresh deploy scenario), admins should
-- immediately register a proper account via /register and then delete the seed
-- row, or update its password_hash to a bcrypt hash of a known credential.

-- Create a seed account if no users exist yet (handles fresh deploys)
INSERT INTO "users" ("username", "password_hash", "created_at", "updated_at")
SELECT 'admin', '$2a$10$placeholder.hash.for.seed.account.only', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "users" LIMIT 1);

-- Assign all characters with no user_id to the earliest created user (seed account)
UPDATE "characters"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1)
WHERE "user_id" IS NULL;
