import { Prisma } from "@prisma/client";
import type {
  Agent as PrismaAgentRow,
  AgentDecision as PrismaAgentDecisionRow,
  AuditLog as PrismaAuditLogRow,
  EvidencePacket as PrismaEvidencePacketRow,
  Lead as PrismaLeadRow,
  Organization as PrismaOrganizationRow,
  RiskRecord as PrismaRiskRecordRow,
  User as PrismaUserRow,
} from "@prisma/client";
import type { AccessContext } from "@/lib/access";
import type { Agent, SpendCaps } from "@/lib/agents";
import type { CapCheckResult, DecisionEvent } from "@/lib/decisions";
import type {
  AuditLog,
  AuditTimelineEntry,
  Lead,
  Organization,
  RiskRecord,
  Role,
  SessionUser,
  SourceReference,
} from "@/lib/types";
import type { VulnerabilityContext } from "@/lib/vulnerability";
import type { EvidencePacketRecord } from "./store";
import {
  fromPrismaAgentDecisionStatus,
  fromPrismaAgentEnvironment,
  fromPrismaAgentRiskTier,
  fromPrismaAgentStatus,
  fromPrismaAuditEvent,
  fromPrismaDecision,
  fromPrismaLeadForm,
  fromPrismaLeadStatus,
  fromPrismaModule,
  fromPrismaRiskLevel,
  fromPrismaRiskStatus,
  toPrismaAgentDecisionStatus,
  toPrismaAgentEnvironment,
  toPrismaAgentRiskTier,
  toPrismaAgentStatus,
  toPrismaAuditEvent,
  toPrismaDecision,
  toPrismaLeadForm,
  toPrismaLeadStatus,
  toPrismaModule,
  toPrismaRiskLevel,
  toPrismaRiskStatus,
} from "./prismaEnums";

/**
 * Pure converters between Prisma row shapes (column names + enum
 * cases) and the runtime types used throughout the application. The
 * runtime types are the public contract; Prisma rows are an
 * implementation detail. Mappers go both directions so the store
 * adapter can hydrate Maps from rows and mirror Map writes back into
 * the database.
 */

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function asJsonValue(value: unknown): Prisma.InputJsonValue {
  // structuredClone keeps Prisma from holding onto a reference to the
  // caller's mutable Map entry.
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

// ---------------------------------------------------------------- Organization

export function organizationFromRow(row: PrismaOrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------- User

export function userFromRow(row: PrismaUserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    organizationId: row.organizationId,
  };
}

// ---------------------------------------------------------------- RiskRecord

export function riskRecordFromRow(row: PrismaRiskRecordRow): RiskRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    module: fromPrismaModule(row.module),
    title: row.title,
    description: row.description,
    sourceSystem: row.sourceSystem,
    sourceType: row.sourceType,
    riskLevel: fromPrismaRiskLevel(row.riskLevel),
    riskScore: row.riskScore,
    status: fromPrismaRiskStatus(row.status),
    owner: row.ownerLabel,
    department: row.department,
    dueDate: row.dueDate?.toISOString().slice(0, 10),
    expirationDate: row.expirationDate?.toISOString().slice(0, 10),
    reviewDate: row.reviewDate?.toISOString().slice(0, 10),
    decision: row.decision ? fromPrismaDecision(row.decision) : undefined,
    decisionBy: row.decisionByLabel ?? undefined,
    decisionAt: row.decisionAt?.toISOString(),
    decisionNote: row.decisionNote ?? undefined,
    compensatingControls: row.compensatingControls,
    evidenceSummary: row.evidenceSummary,
    businessJustification: row.businessJustification,
    technicalContext: row.technicalContext,
    frameworkTags: row.frameworkTags,
    sourceReferences: (row.sourceReferences as unknown as SourceReference[]) ?? [],
    auditTimeline: (row.auditTimeline as unknown as AuditTimelineEntry[]) ?? [],
    accessContext: (row.accessContext as unknown as AccessContext | null) ?? undefined,
    vulnerabilityContext:
      (row.vulnerabilityContext as unknown as VulnerabilityContext | null) ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById ?? undefined,
    updatedById: row.updatedById ?? undefined,
  };
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  // Accept "YYYY-MM-DD" or full ISO. Prisma DateTime always wants Date.
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

export function riskRecordCreateInput(
  record: RiskRecord,
): Prisma.RiskRecordUncheckedCreateInput {
  return {
    id: record.id,
    organizationId: record.organizationId ?? "demo-org",
    module: toPrismaModule(record.module),
    title: record.title,
    description: record.description,
    sourceSystem: record.sourceSystem,
    sourceType: record.sourceType,
    riskLevel: toPrismaRiskLevel(record.riskLevel),
    riskScore: record.riskScore ?? 50,
    status: toPrismaRiskStatus(record.status),
    ownerLabel: record.owner,
    department: record.department,
    dueDate: parseDateOnly(record.dueDate),
    expirationDate: parseDateOnly(record.expirationDate),
    reviewDate: parseDateOnly(record.reviewDate),
    decision: record.decision ? toPrismaDecision(record.decision) : null,
    decisionByLabel: record.decisionBy ?? null,
    decisionAt: record.decisionAt ? new Date(record.decisionAt) : null,
    decisionNote: record.decisionNote ?? null,
    compensatingControls: record.compensatingControls,
    evidenceSummary: record.evidenceSummary,
    businessJustification: record.businessJustification,
    technicalContext: record.technicalContext,
    frameworkTags: record.frameworkTags,
    sourceReferences: asJsonValue(record.sourceReferences),
    auditTimeline: asJsonValue(record.auditTimeline),
    accessContext: record.accessContext ? asJsonValue(record.accessContext) : Prisma.JsonNull,
    vulnerabilityContext: record.vulnerabilityContext
      ? asJsonValue(record.vulnerabilityContext)
      : Prisma.JsonNull,
    createdById: record.createdById ?? null,
    updatedById: record.updatedById ?? null,
    createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
  };
}

export function riskRecordUpdateInput(
  record: RiskRecord,
): Prisma.RiskRecordUncheckedUpdateInput {
  return {
    title: record.title,
    description: record.description,
    sourceSystem: record.sourceSystem,
    sourceType: record.sourceType,
    riskLevel: toPrismaRiskLevel(record.riskLevel),
    riskScore: record.riskScore ?? 50,
    status: toPrismaRiskStatus(record.status),
    ownerLabel: record.owner,
    department: record.department,
    dueDate: parseDateOnly(record.dueDate),
    expirationDate: parseDateOnly(record.expirationDate),
    reviewDate: parseDateOnly(record.reviewDate),
    decision: record.decision ? toPrismaDecision(record.decision) : null,
    decisionByLabel: record.decisionBy ?? null,
    decisionAt: record.decisionAt ? new Date(record.decisionAt) : null,
    decisionNote: record.decisionNote ?? null,
    compensatingControls: record.compensatingControls,
    evidenceSummary: record.evidenceSummary,
    businessJustification: record.businessJustification,
    technicalContext: record.technicalContext,
    frameworkTags: record.frameworkTags,
    sourceReferences: asJsonValue(record.sourceReferences),
    auditTimeline: asJsonValue(record.auditTimeline),
    accessContext: record.accessContext ? asJsonValue(record.accessContext) : Prisma.JsonNull,
    vulnerabilityContext: record.vulnerabilityContext
      ? asJsonValue(record.vulnerabilityContext)
      : Prisma.JsonNull,
    updatedById: record.updatedById ?? null,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
  };
}

// ---------------------------------------------------------------- AuditLog

export function auditLogFromRow(row: PrismaAuditLogRow): AuditLog {
  return {
    id: row.id,
    organizationId: row.organizationId,
    riskRecordId: row.riskRecordId ?? undefined,
    eventType: fromPrismaAuditEvent(row.eventType),
    actorId: row.actorId ?? undefined,
    actorName: row.actorName,
    previousStatus: row.previousStatus ? fromPrismaRiskStatus(row.previousStatus) : undefined,
    newStatus: row.newStatus ? fromPrismaRiskStatus(row.newStatus) : undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

export function auditLogCreateInput(
  log: AuditLog,
): Prisma.AuditLogUncheckedCreateInput {
  return {
    id: log.id,
    organizationId: log.organizationId,
    riskRecordId: log.riskRecordId ?? null,
    eventType: toPrismaAuditEvent(log.eventType),
    actorId: log.actorId ?? null,
    actorName: log.actorName,
    previousStatus: log.previousStatus ? toPrismaRiskStatus(log.previousStatus) : null,
    newStatus: log.newStatus ? toPrismaRiskStatus(log.newStatus) : null,
    metadata: asJsonValue(log.metadata),
    createdAt: new Date(log.createdAt),
  };
}

// ---------------------------------------------------------------- Lead

export function leadFromRow(row: PrismaLeadRow): Lead {
  return {
    id: row.id,
    formType: fromPrismaLeadForm(row.formType),
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone ?? undefined,
    riskArea: row.riskArea,
    urgency: row.urgency,
    description: row.description,
    status: fromPrismaLeadStatus(row.status),
    createdAt: row.createdAt.toISOString(),
  };
}

export function leadCreateInput(lead: Lead): Prisma.LeadUncheckedCreateInput {
  return {
    id: lead.id,
    formType: toPrismaLeadForm(lead.formType),
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone ?? null,
    riskArea: lead.riskArea,
    urgency: lead.urgency,
    description: lead.description,
    status: toPrismaLeadStatus(lead.status),
    createdAt: new Date(lead.createdAt),
  };
}

// ---------------------------------------------------------------- EvidencePacket

export function evidencePacketFromRow(
  row: PrismaEvidencePacketRow,
): EvidencePacketRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    riskRecordId: row.riskRecordId,
    summary: row.summary as unknown,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function evidencePacketCreateInput(
  packet: EvidencePacketRecord,
): Prisma.EvidencePacketUncheckedCreateInput {
  return {
    id: packet.id,
    organizationId: packet.organizationId,
    riskRecordId: packet.riskRecordId,
    summary: asJsonValue(packet.summary),
    generatedAt: new Date(packet.generatedAt),
  };
}

// ---------------------------------------------------------------- Agent

export function agentFromRow(row: PrismaAgentRow): Agent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    environment: fromPrismaAgentEnvironment(row.environment),
    riskTier: fromPrismaAgentRiskTier(row.riskTier),
    status: fromPrismaAgentStatus(row.status),
    allowedActions: row.allowedActions,
    spendCaps: row.spendCaps as unknown as SpendCaps,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString(),
  };
}

export function agentCreateInput(
  agent: Agent,
): Prisma.AgentUncheckedCreateInput {
  return {
    id: agent.id,
    tenantId: agent.tenantId,
    name: agent.name,
    environment: toPrismaAgentEnvironment(agent.environment),
    riskTier: toPrismaAgentRiskTier(agent.riskTier),
    status: toPrismaAgentStatus(agent.status),
    allowedActions: agent.allowedActions,
    spendCaps: asJsonValue(agent.spendCaps),
    createdAt: new Date(agent.createdAt),
    updatedAt: new Date(agent.updatedAt),
    revokedAt: agent.revokedAt ? new Date(agent.revokedAt) : null,
  };
}

export function agentUpdateInput(
  agent: Agent,
): Prisma.AgentUncheckedUpdateInput {
  return {
    name: agent.name,
    environment: toPrismaAgentEnvironment(agent.environment),
    riskTier: toPrismaAgentRiskTier(agent.riskTier),
    status: toPrismaAgentStatus(agent.status),
    allowedActions: agent.allowedActions,
    spendCaps: asJsonValue(agent.spendCaps),
    updatedAt: new Date(agent.updatedAt),
    revokedAt: agent.revokedAt ? new Date(agent.revokedAt) : null,
  };
}

// ---------------------------------------------------------------- AgentDecision

export function agentDecisionFromRow(
  row: PrismaAgentDecisionRow,
): DecisionEvent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    agentId: row.agentId,
    action: row.action,
    subject: row.subject,
    amountCents: row.amountCents ?? undefined,
    currency: row.currency ?? undefined,
    decisionStatus: fromPrismaAgentDecisionStatus(row.decisionStatus),
    policyVersion: row.policyVersion,
    evidencePayload: row.evidencePayload as Record<string, unknown>,
    evidenceSha256: row.evidenceSha256,
    receiptJws: row.receiptJws,
    capCheck: row.capCheck as unknown as CapCheckResult,
    createdAt: row.createdAt.toISOString(),
  };
}

export function agentDecisionCreateInput(
  d: DecisionEvent,
): Prisma.AgentDecisionUncheckedCreateInput {
  return {
    id: d.id,
    tenantId: d.tenantId,
    agentId: d.agentId,
    action: d.action,
    subject: d.subject,
    amountCents: d.amountCents ?? null,
    currency: d.currency ?? null,
    decisionStatus: toPrismaAgentDecisionStatus(d.decisionStatus),
    policyVersion: d.policyVersion,
    evidencePayload: asJsonValue(d.evidencePayload),
    evidenceSha256: d.evidenceSha256,
    receiptJws: d.receiptJws,
    capCheck: asJsonValue(d.capCheck),
    createdAt: new Date(d.createdAt),
  };
}
