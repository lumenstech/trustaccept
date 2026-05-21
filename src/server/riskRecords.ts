import type { AccessContext } from "@/lib/access";
import type { VulnerabilityContext } from "@/lib/vulnerability";
import { deriveRiskScore } from "@/lib/seed-data";
import type { Prisma } from "@prisma/client";
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
import { recordAuditEvent, recordAuditEventAsync } from "./auditLogs";
import { assertCanAccessOrganizationRecord } from "./auth";
import {
  decisionToPrisma,
  productModuleToPrisma,
  riskLevelToPrisma,
  riskRecordFromPrisma,
  riskStatusToPrisma,
} from "./prismaMappers";
import { prisma } from "./prisma";
import { isPrismaStorage } from "./storageBackend";
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
  vulnerabilityContext?: VulnerabilityContext;
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

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

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

export async function getRiskRecordPublicAsync(id: string): Promise<RiskRecord | null> {
  if (!isPrismaStorage()) return getRiskRecordPublic(id);

  const row = await prisma.riskRecord.findUnique({ where: { id } });
  return row ? riskRecordFromPrisma(row) : null;
}

export function listRiskRecordsForOrganization(user: SessionUser): RiskRecord[] {
  const store = getStore();
  return Array.from(store.riskRecords.values())
    .filter((r) => (r.organizationId ?? user.organizationId) === user.organizationId)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function listRiskRecordsForOrganizationAsync(
  user: SessionUser,
): Promise<RiskRecord[]> {
  if (!isPrismaStorage()) return listRiskRecordsForOrganization(user);

  const rows = await prisma.riskRecord.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(riskRecordFromPrisma);
}

export function getRiskRecordForOrganization(
  user: SessionUser,
  id: string,
): RiskRecord {
  return ensureOwnedByOrg(user, getStore().riskRecords.get(id));
}

export async function getRiskRecordForOrganizationAsync(
  user: SessionUser,
  id: string,
): Promise<RiskRecord> {
  if (!isPrismaStorage()) return getRiskRecordForOrganization(user, id);

  const row = await prisma.riskRecord.findUnique({ where: { id } });
  const record = row ? riskRecordFromPrisma(row) : undefined;
  return ensureOwnedByOrg(user, record);
}

export function listPendingRiskRecords(user: SessionUser): RiskRecord[] {
  return listRiskRecordsForOrganization(user).filter((r) => r.status === "pending");
}

export async function listPendingRiskRecordsAsync(user: SessionUser): Promise<RiskRecord[]> {
  const records = await listRiskRecordsForOrganizationAsync(user);
  return records.filter((r) => r.status === "pending");
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

export async function listExpiringRiskRecordsAsync(
  user: SessionUser,
  withinDays = 30,
): Promise<RiskRecord[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const records = await listRiskRecordsForOrganizationAsync(user);
  return records.filter((r) => {
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

export async function listRiskRecordsByModuleAsync(
  user: SessionUser,
  module: ProductModuleKey,
): Promise<RiskRecord[]> {
  if (!isPrismaStorage()) return listRiskRecordsByModule(user, module);

  const rows = await prisma.riskRecord.findMany({
    where: {
      organizationId: user.organizationId,
      module: productModuleToPrisma(module),
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(riskRecordFromPrisma);
}

export function listRiskRecordsByStatus(
  user: SessionUser,
  status: RiskStatus,
): RiskRecord[] {
  return listRiskRecordsForOrganization(user).filter((r) => r.status === status);
}

export async function listRiskRecordsByStatusAsync(
  user: SessionUser,
  status: RiskStatus,
): Promise<RiskRecord[]> {
  if (!isPrismaStorage()) return listRiskRecordsByStatus(user, status);

  const rows = await prisma.riskRecord.findMany({
    where: {
      organizationId: user.organizationId,
      status: riskStatusToPrisma(status),
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(riskRecordFromPrisma);
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
    vulnerabilityContext: data.vulnerabilityContext,
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

export async function createRiskRecordAsync(
  user: SessionUser,
  data: RiskRecordCreateData,
): Promise<RiskRecord> {
  if (!isPrismaStorage()) return createRiskRecord(user, data);

  const row = await prisma.riskRecord.create({
    data: {
      organizationId: user.organizationId,
      module: productModuleToPrisma(data.module),
      title: data.title,
      description: data.description,
      sourceSystem: data.sourceSystem,
      sourceType: data.sourceType,
      riskLevel: riskLevelToPrisma(data.riskLevel),
      riskScore: data.riskScore ?? deriveRiskScore(data.riskLevel),
      status: "PENDING",
      ownerLabel: data.owner,
      department: data.department,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      reviewDate: data.reviewDate ? new Date(data.reviewDate) : undefined,
      compensatingControls: data.compensatingControls,
      evidenceSummary: data.evidenceSummary,
      businessJustification: data.businessJustification,
      technicalContext: data.technicalContext,
      frameworkTags: data.frameworkTags,
      sourceReferences: data.sourceReferences as unknown as Prisma.InputJsonValue,
      accessContext: jsonValue(data.accessContext),
      vulnerabilityContext: jsonValue(data.vulnerabilityContext),
      createdById: user.id,
      updatedById: user.id.startsWith("policy:") ? undefined : user.id,
    },
  });

  const record = riskRecordFromPrisma(row);
  await recordAuditEventAsync({
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

export async function updateRiskRecordAsync(
  user: SessionUser,
  id: string,
  patch: RiskRecordUpdateData,
): Promise<RiskRecord> {
  if (!isPrismaStorage()) return updateRiskRecord(user, id, patch);

  const existing = await getRiskRecordForOrganizationAsync(user, id);
  const row = await prisma.riskRecord.update({
    where: { id },
    data: {
      title: patch.title,
      description: patch.description,
      sourceSystem: patch.sourceSystem,
      sourceType: patch.sourceType,
      riskLevel: patch.riskLevel ? riskLevelToPrisma(patch.riskLevel) : undefined,
      riskScore: patch.riskScore,
      status: patch.status ? riskStatusToPrisma(patch.status) : undefined,
      ownerLabel: patch.owner,
      department: patch.department,
      dueDate: patch.dueDate ? new Date(patch.dueDate) : undefined,
      expirationDate: patch.expirationDate ? new Date(patch.expirationDate) : undefined,
      reviewDate: patch.reviewDate ? new Date(patch.reviewDate) : undefined,
      compensatingControls: patch.compensatingControls,
      evidenceSummary: patch.evidenceSummary,
      businessJustification: patch.businessJustification,
      technicalContext: patch.technicalContext,
      frameworkTags: patch.frameworkTags,
      sourceReferences: jsonValue(patch.sourceReferences),
      accessContext: jsonValue(patch.accessContext),
      vulnerabilityContext: jsonValue(patch.vulnerabilityContext),
      updatedById: user.id.startsWith("policy:") ? undefined : user.id,
    },
  });
  const updated = riskRecordFromPrisma(row);

  await recordAuditEventAsync({
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

export async function updateRiskRecordDecisionAsync(
  user: SessionUser,
  id: string,
  input: DecisionInput,
): Promise<RiskRecord> {
  if (!isPrismaStorage()) return updateRiskRecordDecision(user, id, input);

  const existing = await getRiskRecordForOrganizationAsync(user, id);
  const now = new Date().toISOString();
  const newStatus = ACTION_TO_STATUS[input.action];
  const decision = ACTION_TO_DECISION[input.action];
  const compensatingControls = input.compensatingControlsNote
    ? `${existing.compensatingControls}\n\nDecision note (${now}): ${input.compensatingControlsNote}`
    : existing.compensatingControls;

  const row = await prisma.riskRecord.update({
    where: { id },
    data: {
      status: riskStatusToPrisma(newStatus),
      decision: decisionToPrisma(decision),
      decisionById: user.id.startsWith("policy:") ? undefined : user.id,
      decisionByLabel: user.name,
      decisionAt: new Date(now),
      decisionNote: input.decisionNote,
      reviewDate: input.reviewDate ? new Date(input.reviewDate) : undefined,
      compensatingControls,
      updatedById: user.id.startsWith("policy:") ? undefined : user.id,
    },
  });

  const updated = riskRecordFromPrisma(row);
  await recordAuditEventAsync({
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
