-- Rentivo migration 0006: step-by-step booking details + handover QR.
--   • purpose                      — what the renter needs the item for
--   • driverOption                 — vehicles only: self_drive | with_driver
--   • pickup/dropoff location+time — agreed handover details
--   • validIdUrl / licenseIdUrl    — uploaded requirement documents
--   • verifyToken                  — random code behind the booking QR
--   • validatedAt                  — set when the owner scans and confirms
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0006_booking_details_and_qr.sql
--
-- Idempotent (IF NOT EXISTS) so re-running is safe.

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "purpose"         text;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "driverOption"    varchar(20);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "pickupLocation"  varchar(200);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "dropoffLocation" varchar(200);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "pickupTime"      varchar(5);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "dropoffTime"     varchar(5);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "validIdUrl"      varchar(255);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "licenseIdUrl"    varchar(255);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "verifyToken"     varchar(64);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "validatedAt"     timestamptz;

-- One booking per QR code. Partial index so the many pre-existing NULL rows
-- don't collide (Postgres allows multiple NULLs in a UNIQUE index anyway, but
-- being explicit keeps the intent clear).
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reservation_verify_token"
  ON "reservations" ("verifyToken")
  WHERE "verifyToken" IS NOT NULL;

-- Backfill codes for bookings made before this migration so every existing
-- booking also gets a scannable QR.
UPDATE "reservations"
   SET "verifyToken" = encode(gen_random_bytes(24), 'hex')
 WHERE "verifyToken" IS NULL;
