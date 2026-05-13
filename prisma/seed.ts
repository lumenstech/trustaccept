import {
  AuditEventType,
  PrismaClient,
  ProductModule,
  RiskLevel,
  RiskStatus,
  Role,
} from "@prisma/client";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID, SEED_RECORDS, deriveRiskScore } from "../lib/seed-data";

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
  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORGANIZATION_ID },
    update: {},
    create: { id: DEMO_ORGANIZATION_ID, name: "Lumens Internal" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "alex@trustaccept.dev" },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: "alex@trustaccept.dev",
      name: "Alex Greene",
      role: Role.OWNER,
      organizationId: org.id,
    },
  });

  for (const record of SEED_RECORDS) {
    await prisma.riskRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        id: record.id,
        organizationId: org.id,
        module: MODULE_TO_ENUM[record.module],
        title: record.title,
        description: record.description,
        sourceSystem: record.sourceSystem,
        sourceType: record.sourceType,
        riskLevel: RISK_TO_ENUM[record.riskLevel],
        riskScore: record.riskScore ?? deriveRiskScore(record.riskLevel),
        status: STATUS_TO_ENUM[record.status],
        ownerId: owner.id,
        ownerLabel: record.owner,
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
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    for (const entry of record.auditTimeline) {
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          riskRecordId: record.id,
          eventType: AuditEventType.RISK_RECORD_CREATED,
          actorName: entry.actor,
          metadata: {
            action: entry.action,
            detail: entry.detail,
          },
          createdAt: new Date(entry.occurredAt),
        },
      });
    }
  }

  console.log(`Seeded ${SEED_RECORDS.length} risk records in org ${org.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
