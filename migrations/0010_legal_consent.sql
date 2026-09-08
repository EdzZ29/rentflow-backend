-- Rentivo migration 0010: record legal consent on user accounts.
--
-- The sign-up forms now carry a consent checkbox for the Terms and Conditions
-- and the Privacy Policy. Rather than storing a bare boolean, we record WHEN
-- consent was given and WHICH revision of the documents it applied to, so that
-- after a policy change it is clear who has accepted the current version.
--
-- Both columns are nullable: accounts created before this migration have no
-- recorded consent, and that is a meaningful state (unknown), not false.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "termsVersion" varchar(20);

COMMENT ON COLUMN users."termsAcceptedAt" IS
  'When the account holder accepted the Terms and Privacy Policy. NULL = never recorded.';
COMMENT ON COLUMN users."termsVersion" IS
  'LEGAL_VERSION of the documents accepted (see src/legal/legal.content.ts).';
