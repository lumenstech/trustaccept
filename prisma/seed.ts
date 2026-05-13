import { PrismaClient, ProductModule, RiskLevel, RiskStatus } from "@prisma/client";
import { SEED_RECORDS } from "../lib/seed-data";

const prisma = new PrismaClient();

const MODULE_TO_ENUM: Record<string, ProductModule> = {
  "ai-action-gate": "AI_ACTION_GATE",
  "access-accept": "ACCESS_ACCEPT",
  "vulnerability-accept": "VULNERABILITY_ACCEPT",
  "kev-exposure-review": "KEV_EXPOSURE_REVIEW",
  "secure-release-gate": "SECURE_RELEASE_GATE",
  "device-accept": "DEVICE_ACCEPT",
  "evidence-desk": "EVIDENCE_DESK",
};

const RISK_TO_ENUM: Record<string, RiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

const STATUS_TO_ENUM: Record<string, RiskStatus> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  remediation_required: "REMEDIATION_REQUIRED",
  expired: "EXPIRED",
};

async function main() {
  const approver = await prisma.user.upsert({
    where: { email: "approver@trustaccept.dev" },
    update: {},
    create: {
      email: "approver@trustaccept.dev",
      name: "Alex Greene",
      role: "approver",
    },
  });

  for (const record of SEED_RECORDS) {
    await prisma.riskRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        id: record.id,
        module: MODULE_TO_ENUM[record.module],
        title: record.title,
        description: record.description,
        sourceSystem: record.sourceSystem,
        sourceType: record.sourceType,
        riskLevel: RISK_TO_ENUM[record.riskLevel],
        status: STATUS_TO_ENUM[record.status],
        ownerId: approver.id,
        department: record.department,
        dueDate: record.dueDate ? new Date(record.dueDate) : null,
        expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
        reviewDate: record.reviewDate ? new Date(record.reviewDate) : null,
        compensatingControls: record.compensatingControls,
        evidenceSummary: record.evidenceSummary,
        businessJustification: record.businessJustification,
        technicalContext: record.technicalContext,
        frameworkTags: record.frameworkTags,
        sourceReferences: record.sourceReferences as object,
        auditTimeline: {
          create: record.auditTimeline.map((entry) => ({
            actorLabel: entry.actor,
            action: entry.action,
            detail: entry.detail,
            occurredAt: new Date(entry.occurredAt),
          })),
        },
      },
    });
  }

  console.log(`Seeded ${SEED_RECORDS.length} risk records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
