-- Baseline decisions table. Records each agent-attributable decision event.
-- Append-only by application convention. Separate from RiskRecord.decision
-- (the human approval decision on a risk-acceptance record).
CREATE TABLE IF NOT EXISTS "decisions" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id"    TEXT NOT NULL,
    "action"       TEXT NOT NULL,
    "decision"     TEXT NOT NULL,
    "amount"       NUMERIC(18, 4) NULL,
    "approver_id"  TEXT NULL,
    "request_body" JSONB NULL,
    "context"      JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_decisions_tenant_created_at"
    ON "decisions" ("tenant_id", "created_at");
