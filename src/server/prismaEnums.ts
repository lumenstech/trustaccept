import {
  AgentDecisionStatus as PrismaAgentDecisionStatus,
  AgentEnvironment as PrismaAgentEnvironment,
  AgentRiskTier as PrismaAgentRiskTier,
  AgentStatus as PrismaAgentStatus,
  AuditEventType as PrismaAuditEventType,
  Decision as PrismaDecision,
  LeadFormType as PrismaLeadFormType,
  LeadStatus as PrismaLeadStatus,
  ProductModule as PrismaProductModule,
  RiskLevel as PrismaRiskLevel,
  RiskStatus as PrismaRiskStatus,
} from "@prisma/client";
import type {
  AgentEnvironment,
  AgentRiskTier,
  AgentStatus,
} from "@/lib/agents";
import type { DecisionStatus } from "@/lib/decisions";
import type {
  AuditEventType,
  Decision,
  LeadFormType,
  LeadStatus,
  ProductModuleKey,
  RiskLevel,
  RiskStatus,
} from "@/lib/types";

/**
 * Two-way enum case mapping between runtime values (lowercase, hyphen
 * or dot-separated) and Prisma values (SCREAMING_SNAKE_CASE). Pure;
 * no IO. Throws on unknown inputs so callers find translation gaps
 * fast instead of silently writing wrong data.
 */

const MODULE_TO_PRISMA: Record<ProductModuleKey, PrismaProductModule> = {
  "ai-action-gate": "AI_ACTION_GATE",
  "access-accept": "ACCESS_ACCEPT",
  "vulnerability-accept": "VULNERABILITY_ACCEPT",
  "kev-exposure-review": "KEV_EXPOSURE_REVIEW",
  "secure-release-gate": "SECURE_RELEASE_GATE",
  "device-accept": "DEVICE_ACCEPT",
  "evidence-desk": "EVIDENCE_DESK",
};
const MODULE_FROM_PRISMA = invert(MODULE_TO_PRISMA);

const RISK_LEVEL_TO_PRISMA: Record<RiskLevel, PrismaRiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};
const RISK_LEVEL_FROM_PRISMA = invert(RISK_LEVEL_TO_PRISMA);

const RISK_STATUS_TO_PRISMA: Record<RiskStatus, PrismaRiskStatus> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  remediation_required: "REMEDIATION_REQUIRED",
  expired: "EXPIRED",
};
const RISK_STATUS_FROM_PRISMA = invert(RISK_STATUS_TO_PRISMA);

const DECISION_TO_PRISMA: Record<Decision, PrismaDecision> = {
  accept: "ACCEPT",
  reject: "REJECT",
  remediate: "REMEDIATE",
};
const DECISION_FROM_PRISMA = invert(DECISION_TO_PRISMA);

const AUDIT_EVENT_TO_PRISMA: Record<AuditEventType, PrismaAuditEventType> = {
  "risk_record.created": "RISK_RECORD_CREATED",
  "risk_record.updated": "RISK_RECORD_UPDATED",
  "decision.accepted": "DECISION_ACCEPTED",
  "decision.rejected": "DECISION_REJECTED",
  "decision.remediation_required": "DECISION_REMEDIATION_REQUIRED",
  "evidence_packet.generated": "EVIDENCE_PACKET_GENERATED",
  "approval_page.viewed": "APPROVAL_PAGE_VIEWED",
  "lead_form.submitted": "LEAD_FORM_SUBMITTED",
};
const AUDIT_EVENT_FROM_PRISMA = invert(AUDIT_EVENT_TO_PRISMA);

const LEAD_FORM_TO_PRISMA: Record<LeadFormType, PrismaLeadFormType> = {
  "book-risk-review": "BOOK_RISK_REVIEW",
  "start-pilot": "START_PILOT",
  "request-evidence-desk": "REQUEST_EVIDENCE_DESK",
  contact: "CONTACT",
};
const LEAD_FORM_FROM_PRISMA = invert(LEAD_FORM_TO_PRISMA);

const LEAD_STATUS_TO_PRISMA: Record<LeadStatus, PrismaLeadStatus> = {
  new: "NEW",
  in_review: "IN_REVIEW",
  contacted: "CONTACTED",
  closed: "CLOSED",
};
const LEAD_STATUS_FROM_PRISMA = invert(LEAD_STATUS_TO_PRISMA);

const AGENT_ENV_TO_PRISMA: Record<AgentEnvironment, PrismaAgentEnvironment> = {
  sandbox: "SANDBOX",
  staging: "STAGING",
  production: "PRODUCTION",
};
const AGENT_ENV_FROM_PRISMA = invert(AGENT_ENV_TO_PRISMA);

const AGENT_TIER_TO_PRISMA: Record<AgentRiskTier, PrismaAgentRiskTier> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};
const AGENT_TIER_FROM_PRISMA = invert(AGENT_TIER_TO_PRISMA);

const AGENT_STATUS_TO_PRISMA: Record<AgentStatus, PrismaAgentStatus> = {
  active: "ACTIVE",
  paused: "PAUSED",
  revoked: "REVOKED",
};
const AGENT_STATUS_FROM_PRISMA = invert(AGENT_STATUS_TO_PRISMA);

const AGENT_DECISION_TO_PRISMA: Record<DecisionStatus, PrismaAgentDecisionStatus> = {
  allowed: "ALLOWED",
  blocked: "BLOCKED",
  pending_review: "PENDING_REVIEW",
};
const AGENT_DECISION_FROM_PRISMA = invert(AGENT_DECISION_TO_PRISMA);

function invert<K extends string, V extends string>(
  m: Record<K, V>,
): Record<V, K> {
  const out = {} as Record<V, K>;
  for (const k of Object.keys(m) as K[]) out[m[k]] = k;
  return out;
}

function pick<K extends string, V extends string>(
  m: Record<K, V>,
  k: K,
  label: string,
): V {
  const v = m[k];
  if (!v) throw new Error(`prismaEnums: unknown ${label} value ${k}`);
  return v;
}

export const toPrismaModule = (k: ProductModuleKey) =>
  pick(MODULE_TO_PRISMA, k, "module");
export const fromPrismaModule = (k: PrismaProductModule) =>
  pick(MODULE_FROM_PRISMA, k, "module");

export const toPrismaRiskLevel = (k: RiskLevel) =>
  pick(RISK_LEVEL_TO_PRISMA, k, "riskLevel");
export const fromPrismaRiskLevel = (k: PrismaRiskLevel) =>
  pick(RISK_LEVEL_FROM_PRISMA, k, "riskLevel");

export const toPrismaRiskStatus = (k: RiskStatus) =>
  pick(RISK_STATUS_TO_PRISMA, k, "riskStatus");
export const fromPrismaRiskStatus = (k: PrismaRiskStatus) =>
  pick(RISK_STATUS_FROM_PRISMA, k, "riskStatus");

export const toPrismaDecision = (k: Decision) =>
  pick(DECISION_TO_PRISMA, k, "decision");
export const fromPrismaDecision = (k: PrismaDecision) =>
  pick(DECISION_FROM_PRISMA, k, "decision");

export const toPrismaAuditEvent = (k: AuditEventType) =>
  pick(AUDIT_EVENT_TO_PRISMA, k, "auditEvent");
export const fromPrismaAuditEvent = (k: PrismaAuditEventType) =>
  pick(AUDIT_EVENT_FROM_PRISMA, k, "auditEvent");

export const toPrismaLeadForm = (k: LeadFormType) =>
  pick(LEAD_FORM_TO_PRISMA, k, "leadForm");
export const fromPrismaLeadForm = (k: PrismaLeadFormType) =>
  pick(LEAD_FORM_FROM_PRISMA, k, "leadForm");

export const toPrismaLeadStatus = (k: LeadStatus) =>
  pick(LEAD_STATUS_TO_PRISMA, k, "leadStatus");
export const fromPrismaLeadStatus = (k: PrismaLeadStatus) =>
  pick(LEAD_STATUS_FROM_PRISMA, k, "leadStatus");

export const toPrismaAgentEnvironment = (k: AgentEnvironment) =>
  pick(AGENT_ENV_TO_PRISMA, k, "agentEnvironment");
export const fromPrismaAgentEnvironment = (k: PrismaAgentEnvironment) =>
  pick(AGENT_ENV_FROM_PRISMA, k, "agentEnvironment");

export const toPrismaAgentRiskTier = (k: AgentRiskTier) =>
  pick(AGENT_TIER_TO_PRISMA, k, "agentRiskTier");
export const fromPrismaAgentRiskTier = (k: PrismaAgentRiskTier) =>
  pick(AGENT_TIER_FROM_PRISMA, k, "agentRiskTier");

export const toPrismaAgentStatus = (k: AgentStatus) =>
  pick(AGENT_STATUS_TO_PRISMA, k, "agentStatus");
export const fromPrismaAgentStatus = (k: PrismaAgentStatus) =>
  pick(AGENT_STATUS_FROM_PRISMA, k, "agentStatus");

export const toPrismaAgentDecisionStatus = (k: DecisionStatus) =>
  pick(AGENT_DECISION_TO_PRISMA, k, "agentDecisionStatus");
export const fromPrismaAgentDecisionStatus = (k: PrismaAgentDecisionStatus) =>
  pick(AGENT_DECISION_FROM_PRISMA, k, "agentDecisionStatus");
