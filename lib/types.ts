export type ProductModuleKey =
  | "ai-action-gate"
  | "access-accept"
  | "vulnerability-accept"
  | "kev-exposure-review"
  | "secure-release-gate"
  | "device-accept"
  | "evidence-desk";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "remediation_required"
  | "expired";

export type Decision = "accept" | "reject" | "remediate";

export interface AuditTimelineEntry {
  actor: string;
  action: string;
  detail: string;
  occurredAt: string;
}

export interface SourceReference {
  label: string;
  system: string;
  url?: string;
  externalId?: string;
}

export interface RiskRecord {
  id: string;
  organizationId?: string;
  module: ProductModuleKey;
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  status: RiskStatus;
  owner: string;
  department: string;
  dueDate?: string;
  expirationDate?: string;
  reviewDate?: string;
  decision?: Decision;
  decisionBy?: string;
  decisionAt?: string;
  decisionNote?: string;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  auditTimeline: AuditTimelineEntry[];
  accessContext?: import("./access").AccessContext;
  vulnerabilityContext?: import("./vulnerability").VulnerabilityContext;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  updatedById?: string;
}

export type Role = "OWNER" | "ADMIN" | "APPROVER" | "VIEWER";

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}

export type AuditEventType =
  | "risk_record.created"
  | "risk_record.updated"
  | "decision.accepted"
  | "decision.rejected"
  | "decision.remediation_required"
  | "evidence_packet.generated"
  | "approval_page.viewed"
  | "lead_form.submitted";

export interface AuditLog {
  id: string;
  organizationId: string;
  riskRecordId?: string;
  eventType: AuditEventType;
  actorId?: string;
  actorName: string;
  previousStatus?: RiskStatus;
  newStatus?: RiskStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type LeadFormType =
  | "book-risk-review"
  | "start-pilot"
  | "request-evidence-desk"
  | "contact";

export type LeadStatus = "new" | "in_review" | "contacted" | "closed";

export interface Lead {
  id: string;
  formType: LeadFormType;
  name: string;
  company: string;
  email: string;
  phone?: string;
  riskArea: string;
  urgency: string;
  description: string;
  status: LeadStatus;
  createdAt: string;
}

export interface ProductModuleMeta {
  key: ProductModuleKey;
  name: string;
  shortName: string;
  route: string;
  marketingRoute: string;
  tagline: string;
  description: string;
  acceptLabel: string;
  rejectLabel: string;
  remediateLabel: string;
}
