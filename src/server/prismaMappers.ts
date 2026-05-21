import type {
  AuditLog,
  AuditEventType as AppAuditEventType,
  Decision as AppDecision,
  ProductModuleKey,
  RiskLevel as AppRiskLevel,
  RiskRecord,
  RiskStatus as AppRiskStatus,
  SourceReference,
} from "@/lib/types";
import type {
  AuditEventType,
  Decision,
  ProductModule,
  RiskLevel,
  RiskStatus,
} from "@prisma/client";

type PrismaRiskRecord = {
  id: string;
  organizationId: string;
  module: ProductModule;
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  riskScore: number;
  status: RiskStatus;
  ownerLabel: string;
  department: string;
  dueDate: Date | null;
  expirationDate: Date | null;
  reviewDate: Date | null;
  decision: Decision | null;
  decisionByLabel: string | null;
  decisionAt: Date | null;
  decisionNote: string | null;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: unknown;
  accessContext?: unknown;
  vulnerabilityContext?: unknown;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
};

type PrismaAuditLog = {
  id: string;
  organizationId: string;
  riskRecordId: string | null;
  eventType: AuditEventType;
  actorId: string | null;
  actorName: string;
  previousStatus: RiskStatus | null;
  newStatus: RiskStatus | null;
  metadata: unknown;
  createdAt: Date;
};

const MODULE_TO_PRISMA: Record<ProductModuleKey, ProductModule> = {
  "ai-action-gate": "AI_ACTION_GATE",
  "access-accept": "ACCESS_ACCEPT",
  "vulnerability-accept": "VULNERABILITY_ACCEPT",
  "kev-exposure-review": "KEV_EXPOSURE_REVIEW",
  "secure-release-gate": "SECURE_RELEASE_GATE",
  "device-accept": "DEVICE_ACCEPT",
  "evidence-desk": "EVIDENCE_DESK",
};

const MODULE_FROM_PRISMA: Record<ProductModule, ProductModuleKey> = {
  AI_ACTION_GATE: "ai-action-gate",
  ACCESS_ACCEPT: "access-accept",
  VULNERABILITY_ACCEPT: "vulnerability-accept",
  KEV_EXPOSURE_REVIEW: "kev-exposure-review",
  SECURE_RELEASE_GATE: "secure-release-gate",
  DEVICE_ACCEPT: "device-accept",
  EVIDENCE_DESK: "evidence-desk",
};

const RISK_TO_PRISMA: Record<AppRiskLevel, RiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

const RISK_FROM_PRISMA: Record<RiskLevel, AppRiskLevel> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

const STATUS_TO_PRISMA: Record<AppRiskStatus, RiskStatus> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  remediation_required: "REMEDIATION_REQUIRED",
  expired: "EXPIRED",
};

const STATUS_FROM_PRISMA: Record<RiskStatus, AppRiskStatus> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  REMEDIATION_REQUIRED: "remediation_required",
  EXPIRED: "expired",
};

const DECISION_TO_PRISMA: Record<AppDecision, Decision> = {
  accept: "ACCEPT",
  reject: "REJECT",
  remediate: "REMEDIATE",
};

const DECISION_FROM_PRISMA: Record<Decision, AppDecision> = {
  ACCEPT: "accept",
  REJECT: "reject",
  REMEDIATE: "remediate",
};

const AUDIT_TO_PRISMA: Record<AppAuditEventType, AuditEventType> = {
  "risk_record.created": "RISK_RECORD_CREATED",
  "risk_record.updated": "RISK_RECORD_UPDATED",
  "decision.accepted": "DECISION_ACCEPTED",
  "decision.rejected": "DECISION_REJECTED",
  "decision.remediation_required": "DECISION_REMEDIATION_REQUIRED",
  "evidence_packet.generated": "EVIDENCE_PACKET_GENERATED",
  "approval_page.viewed": "APPROVAL_PAGE_VIEWED",
  "lead_form.submitted": "LEAD_FORM_SUBMITTED",
};

const AUDIT_FROM_PRISMA: Record<AuditEventType, AppAuditEventType> = {
  RISK_RECORD_CREATED: "risk_record.created",
  RISK_RECORD_UPDATED: "risk_record.updated",
  DECISION_ACCEPTED: "decision.accepted",
  DECISION_REJECTED: "decision.rejected",
  DECISION_REMEDIATION_REQUIRED: "decision.remediation_required",
  EVIDENCE_PACKET_GENERATED: "evidence_packet.generated",
  APPROVAL_PAGE_VIEWED: "approval_page.viewed",
  LEAD_FORM_SUBMITTED: "lead_form.submitted",
};

function iso(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

function sourceReferences(value: unknown): SourceReference[] {
  return Array.isArray(value) ? (value as SourceReference[]) : [];
}

export function productModuleToPrisma(value: ProductModuleKey): ProductModule {
  return MODULE_TO_PRISMA[value];
}

export function riskLevelToPrisma(value: AppRiskLevel): RiskLevel {
  return RISK_TO_PRISMA[value];
}

export function riskStatusToPrisma(value: AppRiskStatus): RiskStatus {
  return STATUS_TO_PRISMA[value];
}

export function decisionToPrisma(value: AppDecision): Decision {
  return DECISION_TO_PRISMA[value];
}

export function auditEventToPrisma(value: AppAuditEventType): AuditEventType {
  return AUDIT_TO_PRISMA[value];
}

export function riskRecordFromPrisma(row: PrismaRiskRecord): RiskRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    module: MODULE_FROM_PRISMA[row.module],
    title: row.title,
    description: row.description,
    sourceSystem: row.sourceSystem,
    sourceType: row.sourceType,
    riskLevel: RISK_FROM_PRISMA[row.riskLevel],
    riskScore: row.riskScore,
    status: STATUS_FROM_PRISMA[row.status],
    owner: row.ownerLabel,
    department: row.department,
    dueDate: iso(row.dueDate),
    expirationDate: iso(row.expirationDate),
    reviewDate: iso(row.reviewDate),
    decision: row.decision ? DECISION_FROM_PRISMA[row.decision] : undefined,
    decisionBy: row.decisionByLabel ?? undefined,
    decisionAt: iso(row.decisionAt),
    decisionNote: row.decisionNote ?? undefined,
    compensatingControls: row.compensatingControls,
    evidenceSummary: row.evidenceSummary,
    businessJustification: row.businessJustification,
    technicalContext: row.technicalContext,
    frameworkTags: row.frameworkTags,
    sourceReferences: sourceReferences(row.sourceReferences),
    auditTimeline: [],
    accessContext: row.accessContext as RiskRecord["accessContext"],
    vulnerabilityContext: row.vulnerabilityContext as RiskRecord["vulnerabilityContext"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
  };
}

export function auditLogFromPrisma(row: PrismaAuditLog): AuditLog {
  return {
    id: row.id,
    organizationId: row.organizationId,
    riskRecordId: row.riskRecordId ?? undefined,
    eventType: AUDIT_FROM_PRISMA[row.eventType],
    actorId: row.actorId ?? undefined,
    actorName: row.actorName,
    previousStatus: row.previousStatus
      ? STATUS_FROM_PRISMA[row.previousStatus]
      : undefined,
    newStatus: row.newStatus ? STATUS_FROM_PRISMA[row.newStatus] : undefined,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}
