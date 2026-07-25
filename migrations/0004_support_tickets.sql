-- RentFlow migration 0004: customer/owner support tickets with an admin chat.
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0004_support_tickets.sql
--
-- Idempotent (IF NOT EXISTS) so re-running is safe.

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"            serial PRIMARY KEY,
  "userId"        integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject"       varchar(160) NOT NULL,
  "category"      varchar(20) NOT NULL DEFAULT 'inquiry',
  "status"        varchar(20) NOT NULL DEFAULT 'open',
  "lastMessageAt" timestamptz,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_support_tickets_userId" ON "support_tickets" ("userId");

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id"        serial PRIMARY KEY,
  "ticketId"  integer NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "senderId"  integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fromAdmin" boolean NOT NULL DEFAULT false,
  "body"      text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_support_messages_ticketId" ON "support_messages" ("ticketId");
