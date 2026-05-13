-- Baseline migration for TrustAccept's original Risk Record surface.
-- Captures the schema as it stood before the Agent governance work
-- (which is added by 20260514000000_add_agents_and_decisions) and
-- before the three runtime fields on RiskRecord were aligned
-- (added by 20260514120000_riskrecord_runtime_fields).

-- CreateEnum
CREATE TYPE "ProductModule" AS ENUM ('AI_ACTION_GATE', 'ACCESS_ACCEPT', 'VULNERABILITY_ACCEPT', 'KEV_EXPOSURE_REVIEW', 'SECURE_RELEASE_GATE', 'DEVICE_ACCEPT', 'EVIDENCE_DESK');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REMEDIATION_REQUIRED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('ACCEPT', 'REJECT', 'REMEDIATE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'APPROVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('RISK_RECORD_CREATED', 'RISK_RECORD_UPDATED', 'DECISION_ACCEPTED', 'DECISION_REJECTED', 'DECISION_REMEDIATION_REQUIRED', 'EVIDENCE_PACKET_GENERATED', 'APPROVAL_PAGE_VIEWED', 'LEAD_FORM_SUBMITTED');

-- CreateEnum
CREATE TYPE "LeadFormType" AS ENUM ('BOOK_RISK_REVIEW', 'START_PILOT', 'REQUEST_EVIDENCE_DESK', 'CONTACT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "module" "ProductModule" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "status" "RiskStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT,
    "ownerLabel" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "decision" "Decision",
    "decisionById" TEXT,
    "decisionByLabel" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "compensatingControls" TEXT NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "businessJustification" TEXT NOT NULL,
    "technicalContext" TEXT NOT NULL,
    "frameworkTags" TEXT[],
    "sourceReferences" JSONB NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskRecordId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "previousStatus" "RiskStatus",
    "newStatus" "RiskStatus",
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidencePacket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskRecordId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidencePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "formType" "LeadFormType" NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "riskArea" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RiskRecord_organizationId_idx" ON "RiskRecord"("organizationId");

-- CreateIndex
CREATE INDEX "RiskRecord_organizationId_status_idx" ON "RiskRecord"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RiskRecord_organizationId_module_idx" ON "RiskRecord"("organizationId", "module");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_riskRecordId_createdAt_idx" ON "AuditLog"("riskRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidencePacket_organizationId_idx" ON "EvidencePacket"("organizationId");

-- CreateIndex
CREATE INDEX "EvidencePacket_riskRecordId_idx" ON "EvidencePacket"("riskRecordId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRecord" ADD CONSTRAINT "RiskRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRecord" ADD CONSTRAINT "RiskRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRecord" ADD CONSTRAINT "RiskRecord_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRecord" ADD CONSTRAINT "RiskRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRecord" ADD CONSTRAINT "RiskRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_riskRecordId_fkey" FOREIGN KEY ("riskRecordId") REFERENCES "RiskRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePacket" ADD CONSTRAINT "EvidencePacket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePacket" ADD CONSTRAINT "EvidencePacket_riskRecordId_fkey" FOREIGN KEY ("riskRecordId") REFERENCES "RiskRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
