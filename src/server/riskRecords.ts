import type { AccessContext } from "@/lib/access";
import { deriveRiskScore } from "@/lib/seed-data";
import type {
  AuditTimelineEntry,
  Decision,
  ProductModuleKey,
  RiskLevel,
  RiskRecord,
  RiskStatus,
  SessionUser,
  SourceReference,
} from "@/lib/types";
import { recordAuditEvent } from "./auditLogs";
import { assertCanAccessOrganizationRecord } from "./auth";
import { getStore } from "./store";

let recordCounter = 0;
function generateRecordId(): string {
  recordCounter += 1;
  return `ra-${Date.now().toString(36)}-${recordCounter.toString(36)}`;
}

export interface RiskRecordCreateData {
  module: ProductModuleKey;
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  owner: string;
  department: string;
  dueDate?: string;
  expirationDate?: string;
  reviewDate?: string;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  accessContext?: AccessContext;
}

export interface RiskRecordUpdateData
  extends Partial<Omit<RiskRecordCreateData, "module">> {
  status?: RiskStatus;
}

export interface DecisionInput {
  action: "accept" | "reject" | "remediate";
  decisionNote?: string;
  compensatingControlsNote?: string;
  reviewDate?: string;
}

const ACTION_TO_STATUS: Record<DecisionInput["action"], RiskStatus> = {
  accept: "accepted",
  reject: "rejected",
  remediate: "remediation_required",
};

const ACTION_TO_DECISION: Record<DecisionInput["action"], Decision> = {
  accept: "accept",
  reject: "reject",
  remediate: "remediate",
};

const ACTION_TO_AUDIT_EVENT = {
  accept: "decision.accepted",
  reject: "decision.rejected",
  remediate: "decision.remediation_required",
} as const;

function ensureOwnedByOrg(
  user: SessionUser,
  record: RiskRecord | undefined,
): RiskRecord {
  assertCanAccessOrganizationRecord(user, record ?? null);
  return record as RiskRecord;
}

/**
 * Public read by ID, used by the hosted /approve/[id] route which
 * is reachable without authentication. The link itself is the
 * capability in this build; production would carry a signed token.
 */
export function getRiskRecordPublic(id: string): RiskRecord | null {
  return getStore().riskRecords.get(id) ?? null;
}

export function listRiskRecordsForOrganization(user: SessionUser): RiskRecord[] {
  const store = getStore();
  return Array.from(store.riskRecords.values())
    .filter((r) => (r.organizationId ?? user.organizationId) === user.organizationId)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export function getRiskRecordForOrganization(
  user: SessionUser,
  id: string,
): RiskRecord {
  return ensureOwnedByOrg(user, getStore().riskRecords.get(id));
}

export function listPendingRiskRecords(user: SessionUser): RiskRecord[] {
  return listRiskRecordsForOrganization(user).filter((r) => r.status === "pending");
}

export function listExpiringRiskRecords(user: SessionUser, withinDays = 30): RiskRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return listRiskRecordsForOrganization(user).filter((r) => {
    if (!r.expirationDate) return false;
    const exp = new Date(r.expirationDate);
    return exp <= cutoff;
  });
}

export function listRiskRecordsByModule(
  user: SessionUser,
  module: ProductModuleKey,
): RiskRecord[] {
  return listRiskRecordsForOrganization(user).filter((r) => r.module === module);
}

export function listRiskRecordsByStatus(
  user: SessionUser,
  status: RiskStatus,
): RiskRecord[] {
  return listRiskRecordsForOrganization(user).filter((r) => r.status === status);
}

export function createRiskRecord(
  user: SessionUser,
  data: RiskRecordCreateData,
): RiskRecord {
  const now = new Date().toISOString();
  const initialEntry: AuditTimelineEntry = {
    actor: user.name,
    action: "created",
    detail: "Risk record created via TrustAccept dashboard.",
    occurredAt: now,
  };
  const record: RiskRecord = {
    id: generateRecordId(),
    organizationId: user.organizationId,
    module: data.module,
    title: data.title,
    description: data.description,
    sourceSystem: data.sourceSystem,
    sourceType: data.sourceType,
    riskLevel: data.riskLevel,
    riskScore: data.riskScore ?? deriveRiskScore(data.riskLevel),
    status: "pending",
    owner: data.owner,
    department: data.department,
    dueDate: data.dueDate,
    expirationDate: data.expirationDate,
    reviewDate: data.reviewDate,
    compensatingControls: data.compensatingControls,
    evidenceSummary: data.evidenceSummary,
    businessJustification: data.businessJustification,
    technicalContext: data.technicalContext,
    frameworkTags: data.frameworkTags,
    sourceReferences: data.sourceReferences,
    accessContext: data.accessContext,
    auditTimeline: [initialEntry],
    createdAt: now,
    updatedAt: now,
    createdById: user.id,
    updatedById: user.id,
  };

  getStore().riskRecords.set(record.id, record);

  recordAuditEvent({
    eventType: "risk_record.created",
    actor: user,
    organizationId: user.organizationId,
    riskRecordId: record.id,
    newStatus: "pending",
    metadata: { module: record.module, riskLevel: record.riskLevel },
  });

  return record;
}

export function updateRiskRecord(
  user: SessionUser,
  id: string,
  patch: RiskRecordUpdateData,
): RiskRecord {
  const existing = ensureOwnedByOrg(user, getStore().riskRecords.get(id));
  const updated: RiskRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedById: user.id,
  };
  getStore().riskRecords.set(id, updated);

  recordAuditEvent({
    eventType: "risk_record.updated",
    actor: user,
    organizationId: user.organizationId,
    riskRecordId: id,
    previousStatus: existing.status,
    newStatus: updated.status,
    metadata: { fields: Object.keys(patch) },
  });

  return updated;
}

export function updateRiskRecordDecision(
  user: SessionUser,
  id: string,
  input: DecisionInput,
): RiskRecord {
  const existing = ensureOwnedByOrg(user, getStore().riskRecords.get(id));
  const now = new Date().toISOString();
  const newStatus = ACTION_TO_STATUS[input.action];
  const decision = ACTION_TO_DECISION[input.action];

  const timelineEntry: AuditTimelineEntry = {
    actor: user.name,
    action: `decided.${input.action}`,
    detail:
      input.decisionNote && input.decisionNote.length > 0
        ? input.decisionNote
        : `Decision recorded: ${input.action}.`,
    occurredAt: now,
  };

  const updated: RiskRecord = {
    ...existing,
    status: newStatus,
    decision,
    decisionBy: user.name,
    decisionAt: now,
    decisionNote: input.decisionNote,
    reviewDate: input.reviewDate ?? existing.reviewDate,
    compensatingControls: input.compensatingControlsNote
      ? `${existing.compensatingControls}\n\nDecision note (${now}): ${input.compensatingControlsNote}`
      : existing.compensatingControls,
    auditTimeline: [...existing.auditTimeline, timelineEntry],
    updatedAt: now,
    updatedById: user.id,
  };

  getStore().riskRecords.set(id, updated);

  recordAuditEvent({
    eventType: ACTION_TO_AUDIT_EVENT[input.action],
    actor: user,
    organizationId: user.organizationId,
    riskRecordId: id,
    previousStatus: existing.status,
    newStatus,
    metadata: {
      decision,
      decisionNote: input.decisionNote,
      compensatingControlsNote: input.compensatingControlsNote,
      reviewDate: input.reviewDate,
    },
  });

  return updated;
}
