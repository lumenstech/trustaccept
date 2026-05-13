-- Align RiskRecord with runtime shape (additive).
-- The runtime RiskRecord type (lib/types.ts) carries three fields that
-- the original migration did not include:
--   - auditTimeline (per-record JSON timeline; distinct from the AuditLog table)
--   - accessContext (Access Accept module payload)
--   - vulnerabilityContext (Vulnerability Accept module payload)
-- All three are additive — no existing column is modified or dropped.

ALTER TABLE "RiskRecord"
    ADD COLUMN "auditTimeline" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "RiskRecord"
    ADD COLUMN "accessContext" JSONB;

ALTER TABLE "RiskRecord"
    ADD COLUMN "vulnerabilityContext" JSONB;
