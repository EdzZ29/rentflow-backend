-- Rentivo migration 0003: business owners can reply to product reviews.
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0003_review_owner_reply.sql
--
-- Idempotent (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "ownerReply" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "repliedAt" timestamptz;
