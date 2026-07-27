-- Rentivo migration 0009: release & return handover codes.
--
-- Replaces the single verifyToken/validatedAt pair with two single-purpose QR
-- codes and a recorded method for each handover:
--   releaseToken  → scanning it releases the unit to the renter
--   returnToken   → scanning it closes out the return (minted AT release, so it
--                   cannot be captured or scanned before the unit is out)
--   releasedAt / releaseMethod  ('qr' | 'manual')
--   returnedAt  / returnMethod  ('qr' | 'manual')
--
-- Also adds the 'released' booking status (pending → confirmed → released →
-- completed). Status is a varchar, so no enum change is needed.
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0009_release_and_return_qr.sql
--
-- Idempotent (IF NOT EXISTS / guarded backfill) so re-running is safe.

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "releaseToken"  varchar(64);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "returnToken"   varchar(64);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "releasedAt"    timestamptz;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "releaseMethod" varchar(10);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "returnedAt"    timestamptz;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "returnMethod"  varchar(10);

-- Carry over the old single code and its validation timestamp. Anything that
-- was already "validated" was in fact a release, recorded by QR.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reservations' AND column_name = 'verifyToken'
  ) THEN
    UPDATE "reservations"
       SET "releaseToken" = COALESCE("releaseToken", "verifyToken");
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reservations' AND column_name = 'validatedAt'
  ) THEN
    UPDATE "reservations"
       SET "releasedAt"    = COALESCE("releasedAt", "validatedAt"),
           "releaseMethod" = COALESCE("releaseMethod",
                                      CASE WHEN "validatedAt" IS NOT NULL
                                           THEN 'qr' END),
           "status"        = CASE
                               WHEN "validatedAt" IS NOT NULL
                                AND "status" = 'confirmed' THEN 'released'
                               ELSE "status"
                             END;
  END IF;
END $$;

-- Any booking still without a release code gets one, so every booking has a
-- scannable QR.
UPDATE "reservations"
   SET "releaseToken" = encode(gen_random_bytes(24), 'hex')
 WHERE "releaseToken" IS NULL;

-- Already-released bookings need a return code so they can be closed out.
UPDATE "reservations"
   SET "returnToken" = encode(gen_random_bytes(24), 'hex')
 WHERE "releasedAt" IS NOT NULL
   AND "returnToken" IS NULL;

-- One booking per code, in both directions. Partial indexes so the NULLs on
-- not-yet-released bookings don't participate.
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reservation_release_token"
  ON "reservations" ("releaseToken") WHERE "releaseToken" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reservation_return_token"
  ON "reservations" ("returnToken") WHERE "returnToken" IS NOT NULL;

-- Drop the superseded column + index. Run only after verifying the copy above.
DROP INDEX IF EXISTS "UQ_reservation_verify_token";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "verifyToken";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "validatedAt";
