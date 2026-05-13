-- Milestone 2: Agent registry. Additive — net-new table, no dependencies on
-- existing data. The decisions.agent_id FK is wired in here so the column
-- from migration 20260513000002 gains referential integrity.

CREATE TABLE IF NOT EXISTS "agents" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id"       UUID NOT NULL,
    "name"            TEXT NOT NULL,
    "owner_email"     TEXT NOT NULL,
    "department"      TEXT NULL,
    "environment"     TEXT NOT NULL,
    "risk_tier"       TEXT NOT NULL,
    "allowed_actions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "spend_caps"      JSONB NOT NULL DEFAULT '{}'::jsonb,
    "status"          TEXT NOT NULL DEFAULT 'active',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "agents_environment_check"
        CHECK ("environment" IN ('dev','staging','prod')),
    CONSTRAINT "agents_risk_tier_check"
        CHECK ("risk_tier" IN ('low','medium','high','critical')),
    CONSTRAINT "agents_status_check"
        CHECK ("status" IN ('active','paused','revoked')),
    CONSTRAINT "agents_tenant_name_unique"
        UNIQUE ("tenant_id", "name")
);

CREATE INDEX IF NOT EXISTS "idx_agents_tenant_status"
    ON "agents" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_agents_tenant_environment"
    ON "agents" ("tenant_id", "environment");
CREATE INDEX IF NOT EXISTS "idx_agents_tenant_risk_tier"
    ON "agents" ("tenant_id", "risk_tier");

-- FK on decisions.agent_id → agents.id (set null on delete so historical
-- decisions remain queryable after an agent is removed).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'decisions_agent_id_fkey'
    ) THEN
        ALTER TABLE "decisions"
            ADD CONSTRAINT "decisions_agent_id_fkey"
            FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
            ON DELETE SET NULL;
    END IF;
END $$;
