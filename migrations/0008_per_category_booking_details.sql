-- Rentivo migration 0008: per-category booking details.
--
-- Every category asks the renter for different things, so each gets its own
-- one-to-one table keyed by reservationId. A booking has a row in exactly one
-- of them, chosen by its product's business category. Shared fields (dates,
-- contact, purpose, handover, valid ID) stay on "reservations".
--
-- This also MOVES the vehicle fields off "reservations":
--   driverOption, licenseIdUrl  →  reservation_vehicle_details
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0008_per_category_booking_details.sql
--
-- Idempotent (IF NOT EXISTS / guarded backfill) so re-running is safe.

-- ── Vehicles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_vehicle_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "driverOption"  varchar(20),
  "licenseIdUrl"  varchar(255)
);

-- ── Events & Party ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_event_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "eventType"   varchar(60),
  "venue"       varchar(200),
  "guestCount"  int,
  "quantity"    int,
  "setupNeeded" boolean,
  "setupTime"   varchar(5),
  "isOutdoor"   boolean
);

-- ── Audio & Video ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_audio_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "venue"          varchar(200),
  "audienceSize"   int,
  "powerSource"    varchar(20),
  "operatorNeeded" boolean,
  "isOutdoor"      boolean,
  "setupTime"      varchar(5)
);

-- ── Photography ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_photo_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "shootType"       varchar(60),
  "shootLocation"   varchar(200),
  "experienceLevel" varchar(30),
  "accessories"     text
);

-- ── Tools & Equipment ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_tool_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "siteAddress"       varchar(200),
  "jobDescription"    text,
  "operatorNeeded"    boolean,
  "powerSource"       varchar(20),
  "shiftHoursPerDay"  int
);

-- ── Sports & Outdoor ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_sport_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "activity"          varchar(60),
  "destination"       varchar(200),
  "participantCount"  int,
  "sizeNotes"         varchar(200),
  "experienceLevel"   varchar(30)
);

-- ── Property & Spaces ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_space_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "useType"       varchar(60),
  "occupantCount" int,
  "checkInTime"   varchar(5),
  "checkOutTime"  varchar(5),
  "overnightStay" boolean
);

-- ── Other ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reservation_other_details" (
  "reservationId" int PRIMARY KEY
    REFERENCES "reservations"("id") ON DELETE CASCADE,
  "useDescription" text,
  "quantity"       int,
  "headcount"      int
);

-- ── Move existing vehicle answers into the new table ───
-- Guarded so this whole block is skipped once the old columns are gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reservations' AND column_name = 'driverOption'
  ) THEN
    INSERT INTO "reservation_vehicle_details" ("reservationId", "driverOption", "licenseIdUrl")
    SELECT r."id", r."driverOption", r."licenseIdUrl"
      FROM "reservations" r
     WHERE r."driverOption" IS NOT NULL OR r."licenseIdUrl" IS NOT NULL
    ON CONFLICT ("reservationId") DO UPDATE
      SET "driverOption" = COALESCE(EXCLUDED."driverOption", "reservation_vehicle_details"."driverOption"),
          "licenseIdUrl" = COALESCE(EXCLUDED."licenseIdUrl", "reservation_vehicle_details"."licenseIdUrl");
  END IF;
END $$;

-- Backfill a detail row for every remaining booking, so each one has exactly
-- one row in the table matching its category.
INSERT INTO "reservation_vehicle_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Vehicles'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_event_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Events & Party'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_audio_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Audio & Video'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_photo_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Photography'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_tool_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Tools & Equipment'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_sport_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Sports & Outdoor'
ON CONFLICT DO NOTHING;

INSERT INTO "reservation_space_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" = 'Property & Spaces'
ON CONFLICT DO NOTHING;

-- Anything with an unrecognised category falls back to "other".
INSERT INTO "reservation_other_details" ("reservationId")
SELECT r."id" FROM "reservations" r
  JOIN "products" p ON p."id" = r."productId"
  JOIN "businesses" b ON b."id" = p."businessId"
 WHERE b."category" NOT IN (
   'Vehicles', 'Events & Party', 'Audio & Video', 'Photography',
   'Tools & Equipment', 'Sports & Outdoor', 'Property & Spaces'
 ) OR b."category" IS NULL
ON CONFLICT DO NOTHING;

-- Finally drop the moved columns. Run only after verifying the copy above.
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "driverOption";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "licenseIdUrl";
