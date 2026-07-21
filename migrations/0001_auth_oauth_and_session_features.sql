-- RentFlow schema migration for production Postgres (e.g. Supabase), where
-- DB_SYNCHRONIZE must be OFF. Run this once against your Supabase database
-- (SQL Editor, or `psql "$DATABASE_URL" -f migrations/0001_...sql`).
--
-- Identifiers are quoted to preserve TypeORM's camelCase column names.
-- All statements are idempotent (IF NOT EXISTS) so re-running is safe.

-- ── users: profile picture + paid-plan expiry ─────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl"  varchar(300);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "planEndsAt" timestamptz;

-- ── oauth_accounts: linked social identities (one user → many providers) ───
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id"             serial PRIMARY KEY,
  "userId"         integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider"       varchar(20)  NOT NULL,
  "providerUserId" varchar(191) NOT NULL,
  "email"          varchar(180),
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_oauth_provider_user" UNIQUE ("provider", "providerUserId")
);
CREATE INDEX IF NOT EXISTS "IDX_oauth_accounts_userId" ON "oauth_accounts" ("userId");

-- ── password_reset_tokens: single-use, hashed, time-limited reset tokens ───
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id"        serial PRIMARY KEY,
  "userId"    integer NOT NULL,
  "tokenHash" varchar(64) NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "used"      boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_prt_userId"    ON "password_reset_tokens" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_prt_tokenHash" ON "password_reset_tokens" ("tokenHash");

-- ── notifications: real-time bell (added earlier this project) ─────────────
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"        serial PRIMARY KEY,
  "userId"    integer NOT NULL,
  "type"      varchar(40)  NOT NULL,
  "title"     varchar(160) NOT NULL,
  "body"      varchar(300) NOT NULL,
  "link"      varchar(200),
  "read"      boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications" ("userId");

-- ── activity_logs: owner activity feed (added earlier this project) ────────
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"          serial PRIMARY KEY,
  "userId"      integer NOT NULL,
  "category"    varchar(20) NOT NULL,
  "action"      varchar(30) NOT NULL,
  "title"       varchar(160) NOT NULL,
  "description" varchar(300),
  "entityName"  varchar(160),
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_userId" ON "activity_logs" ("userId");
