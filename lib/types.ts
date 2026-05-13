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
  module: ProductModuleKey;
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  status: RiskStatus;
  owner: string;
  department: string;
  dueDate?: string;
  expirationDate?: string;
  reviewDate?: string;
  decision?: Decision;
  decisionBy?: string;
  decisionAt?: string;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  auditTimeline: AuditTimelineEntry[];
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
