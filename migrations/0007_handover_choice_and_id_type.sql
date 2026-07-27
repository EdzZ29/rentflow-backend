-- Rentivo migration 0007: the renter's handover choice + which ID they present.
--   • handoverMode — 'pickup' (renter collects) or 'dropoff' (owner delivers).
--     Only the matching location column is filled in.
--   • validIdType  — which ID the renter chose to present as proof
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0007_handover_choice_and_id_type.sql
--
-- Idempotent (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "handoverMode" varchar(10);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "validIdType"  varchar(60);

-- Existing bookings were all collected by the renter, so label them as pick-up
-- wherever a pick-up location was recorded.
UPDATE "reservations"
   SET "handoverMode" = 'pickup'
 WHERE "handoverMode" IS NULL
   AND "pickupLocation" IS NOT NULL;
