-- Additive migration: Agent governance + AgentDecision events.
-- No existing tables, columns, indexes, enums, or constraints are
-- modified or dropped. All new objects are namespaced.

-- CreateEnum
CREATE TYPE "AgentEnvironment" AS ENUM ('SANDBOX', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AgentRiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AgentDecisionStatus" AS ENUM ('ALLOWED', 'BLOCKED', 'PENDING_REVIEW');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" "AgentEnvironment" NOT NULL,
    "riskTier" "AgentRiskTier" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "allowedActions" TEXT[],
    "spendCaps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT,
    "decisionStatus" "AgentDecisionStatus" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "evidencePayload" JSONB NOT NULL,
    "evidenceSha256" TEXT NOT NULL,
    "receiptJws" TEXT NOT NULL,
    "capCheck" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_tenantId_name_key" ON "Agent"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Agent_tenantId_idx" ON "Agent"("tenantId");

-- CreateIndex
CREATE INDEX "Agent_tenantId_status_idx" ON "Agent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AgentDecision_tenantId_createdAt_idx" ON "AgentDecision"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentDecision_tenantId_agentId_createdAt_idx" ON "AgentDecision"("tenantId", "agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentDecision_evidenceSha256_idx" ON "AgentDecision"("evidenceSha256");

-- AddForeignKey
ALTER TABLE "AgentDecision"
    ADD CONSTRAINT "AgentDecision_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
