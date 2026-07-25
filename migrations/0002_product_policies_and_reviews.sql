-- RentFlow migration 0002: per-product rental rules & cancellation policy,
-- plus a customer product-reviews table (1–5 stars + optional comment).
--
-- Run once against production Postgres where DB_SYNCHRONIZE is OFF:
--   psql "$DATABASE_URL" -f migrations/0002_product_policies_and_reviews.sql
--
-- Identifiers are quoted to preserve TypeORM's camelCase column names.
-- All statements are idempotent (IF NOT EXISTS) so re-running is safe.

-- ── products: rental rules + cancellation policy ──────────────────────────
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rentalRules"        text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cancellationPolicy" text;

-- ── reviews: one star rating + optional comment per customer per product ──
CREATE TABLE IF NOT EXISTS "reviews" (
  "id"         serial PRIMARY KEY,
  "productId"  integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "customerId" integer NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
  "rating"     integer NOT NULL,
  "comment"    text,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);

-- One review per customer per product (posting again updates the existing row).
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_review_product_customer"
  ON "reviews" ("productId", "customerId");
