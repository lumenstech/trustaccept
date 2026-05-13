-- Milestone 1: additive evidence + policy + agent attribution columns on decisions.
-- All ADD COLUMN statements are guarded with IF NOT EXISTS so the migration is
-- idempotent and safe to re-run. No drops, no renames.

ALTER TABLE "decisions"
    ADD COLUMN IF NOT EXISTS "policy_version" TEXT NOT NULL DEFAULT 'v0';

ALTER TABLE "decisions"
    ADD COLUMN IF NOT EXISTS "agent_id" UUID NULL;

ALTER TABLE "decisions"
    ADD COLUMN IF NOT EXISTS "evidence_hash" TEXT NULL;

ALTER TABLE "decisions"
    ADD COLUMN IF NOT EXISTS "signed_receipt" TEXT NULL;

-- Backfill policy_version for any pre-existing rows (default already covers
-- new inserts; this guarantees historical rows have the literal 'v0').
UPDATE "decisions" SET "policy_version" = 'v0' WHERE "policy_version" IS NULL;

-- Backfill evidence_hash from stored request_body where available.
-- sha256 of the canonical JSON serialization. We use Postgres pgcrypto's
-- digest() so the migration does not depend on application code.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

UPDATE "decisions"
SET "evidence_hash" = encode(digest("request_body"::text, 'sha256'), 'hex')
WHERE "evidence_hash" IS NULL AND "request_body" IS NOT NULL;

-- signed_receipt remains NULL for historical rows; receipts are issued only
-- for decisions created after the signing key is in place.

CREATE INDEX IF NOT EXISTS "idx_decisions_agent_id"
    ON "decisions" ("agent_id");

CREATE INDEX IF NOT EXISTS "idx_decisions_created_at"
    ON "decisions" ("created_at" DESC);
