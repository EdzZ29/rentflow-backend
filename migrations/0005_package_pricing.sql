-- RentFlow migration 0005: richer package pricing presentations.
--   • itemValues — per-item standalone prices (shows the bundle saving)
--   • options    — named option tiers (Option A / Option B)
--   • tiers      — discount ladder, each with the client's exchange
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0005_package_pricing.sql
--
-- Idempotent (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "itemValues" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "options"    jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "tiers"      jsonb NOT NULL DEFAULT '[]';
