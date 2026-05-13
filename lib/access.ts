import { MODULES } from "./modules";
import type { RiskLevel, RiskRecord, SourceReference } from "./types";

export type AccessRequestType =
  | "break-glass-access"
  | "api-key-creation"
  | "mfa-recovery"
  | "privileged-role-assignment"
  | "suspicious-login"
  | "contractor-temporary-access"
  | "service-account-privilege-escalation"
  | "admin-consent-review";

export interface AccessRequestTypeMeta {
  value: AccessRequestType;
  label: string;
  shortLabel: string;
}

export const ACCESS_REQUEST_TYPES: AccessRequestTypeMeta[] = [
  { value: "break-glass-access", label: "Break-glass access", shortLabel: "Break-glass" },
  { value: "api-key-creation", label: "API key creation", shortLabel: "API key" },
  { value: "mfa-recovery", label: "MFA recovery", shortLabel: "MFA recovery" },
  {
    value: "privileged-role-assignment",
    label: "Privileged role assignment",
    shortLabel: "Privileged role",
  },
  {
    value: "suspicious-login",
    label: "Suspicious login review",
    shortLabel: "Suspicious login",
  },
  {
    value: "contractor-temporary-access",
    label: "Contractor temporary access",
    shortLabel: "Contractor access",
  },
  {
    value: "service-account-privilege-escalation",
    label: "Service account privilege escalation",
    shortLabel: "Service acct priv esc",
  },
  {
    value: "admin-consent-review",
    label: "Admin consent review",
    shortLabel: "Admin consent",
  },
];

export type IdentityProvider =
  | "auth0"
  | "okta"
  | "microsoft-entra"
  | "duo"
  | "google-workspace"
  | "github"
  | "internal-iam"
  | "other";

export interface IdentityProviderMeta {
  value: IdentityProvider;
  label: string;
  sourceSystem: string;
}

export const IDENTITY_PROVIDERS: IdentityProviderMeta[] = [
  { value: "auth0", label: "Auth0", sourceSystem: "Auth0" },
  { value: "okta", label: "Okta", sourceSystem: "Okta" },
  { value: "microsoft-entra", label: "Microsoft Entra", sourceSystem: "Microsoft Entra" },
  { value: "duo", label: "Duo", sourceSystem: "Duo" },
  { value: "google-workspace", label: "Google Workspace", sourceSystem: "Google Workspace" },
  { value: "github", label: "GitHub", sourceSystem: "GitHub" },
  { value: "internal-iam", label: "Internal IAM", sourceSystem: "Internal IAM" },
  { value: "other", label: "Other identity source", sourceSystem: "Other" },
];

export interface AccessContext {
  requestType: AccessRequestType;
  requester: string;
  identityProvider: IdentityProvider;
  userOrServiceAccount: string;
  targetSystem: string;
  privilegeLevel: string;
  requestedDuration?: string;
  approvalOwner?: string;
}

export interface ApprovalLabels {
  accept: string;
  reject: string;
  remediate: string;
}

const DEFAULT_ACCESS_LABELS: ApprovalLabels = {
  accept: "Approve Access",
  reject: "Reject Access",
  remediate: "Require More Evidence",
};

const SUSPICIOUS_LOGIN_LABELS: ApprovalLabels = {
  accept: "Accept Login Risk",
  reject: "Reject / Block",
  remediate: "Escalate Login",
};

const DEFAULT_VULNERABILITY_LABELS: ApprovalLabels = {
  accept: "Accept Finding Risk",
  reject: "Reject Acceptance",
  remediate: "Require Remediation",
};

const RELEASE_BLOCKING_VULNERABILITY_LABELS: ApprovalLabels = {
  accept: "Accept for Release",
  reject: "Block Release",
  remediate: "Require Fix",
};

/**
 * Resolve approval labels for a record. Access Accept and Vulnerability
 * Accept swap to module-specific labels; suspicious login and
 * release-blocking findings swap further. Every other module falls
 * back to its declared module labels.
 */
export function getApprovalLabels(record: RiskRecord): ApprovalLabels {
  if (record.module === "access-accept") {
    if (record.accessContext?.requestType === "suspicious-login") {
      return SUSPICIOUS_LOGIN_LABELS;
    }
    return DEFAULT_ACCESS_LABELS;
  }
  if (record.module === "vulnerability-accept") {
    if (record.vulnerabilityContext?.releaseBlocking) {
      return RELEASE_BLOCKING_VULNERABILITY_LABELS;
    }
    return DEFAULT_VULNERABILITY_LABELS;
  }
  const m = MODULES.find((meta) => meta.key === record.module);
  if (!m) throw new Error(`Unknown module: ${record.module}`);
  return { accept: m.acceptLabel, reject: m.rejectLabel, remediate: m.remediateLabel };
}

export function getAccessRequestMeta(
  value: AccessRequestType,
): AccessRequestTypeMeta {
  const found = ACCESS_REQUEST_TYPES.find((r) => r.value === value);
  if (!found) throw new Error(`Unknown access request type: ${value}`);
  return found;
}

export function getIdentityProviderMeta(value: IdentityProvider): IdentityProviderMeta {
  const found = IDENTITY_PROVIDERS.find((p) => p.value === value);
  if (!found) throw new Error(`Unknown identity provider: ${value}`);
  return found;
}

const DURATION_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(minute|hour|day|week|month)s?\s*$/i;
const DURATION_TO_MS: Record<string, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Parse a human duration ("4 hours", "30 days", "2 weeks") into ms.
 * Returns null when the input is unrecognized so callers can fall back
 * to an explicit expirationDate.
 */
export function parseRequestedDuration(input: string | undefined | null): number | null {
  if (!input) return null;
  const match = input.match(DURATION_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = DURATION_TO_MS[unit];
  if (!ms || !Number.isFinite(value)) return null;
  return Math.round(value * ms);
}

/**
 * Compute a temporary-access expiration ISO date from a base date and
 * a requested duration. Returns null when the duration cannot be parsed.
 */
export function computeTemporaryAccessExpiration(
  base: Date,
  duration: string | undefined | null,
): string | null {
  const ms = parseRequestedDuration(duration);
  if (ms == null) return null;
  return new Date(base.getTime() + ms).toISOString();
}

export interface IdentityEvent {
  id: string;
  source: string;
  user: string;
  eventType: string;
  riskLevel: RiskLevel;
  timestamp: string;
  recommendedAction: string;
  requestType: AccessRequestType;
  identityProvider: IdentityProvider;
  targetSystem: string;
  detail: string;
}

export const IDENTITY_EVENTS: IdentityEvent[] = [
  {
    id: "evt-login-1",
    source: "Okta",
    user: "marcus.lee@lumens.io",
    eventType: "suspicious_login",
    riskLevel: "high",
    timestamp: "2026-05-13T11:14:00Z",
    recommendedAction: "Open suspicious login review",
    requestType: "suspicious-login",
    identityProvider: "okta",
    targetSystem: "prod-eu-1 tenant",
    detail: "Sign-in from new geography flagged by Okta ThreatInsight; MFA challenge satisfied but device unfamiliar.",
  },
  {
    id: "evt-mfa-1",
    source: "Duo",
    user: "priya.shah@lumens.io",
    eventType: "mfa_recovery_request",
    riskLevel: "medium",
    timestamp: "2026-05-13T10:42:00Z",
    recommendedAction: "Create MFA recovery record",
    requestType: "mfa-recovery",
    identityProvider: "duo",
    targetSystem: "Duo enrollment",
    detail: "User reports lost device; standard recovery path requires owner-level approval.",
  },
  {
    id: "evt-role-1",
    source: "Microsoft Entra",
    user: "jordan.pak@lumens.io",
    eventType: "admin_role_assignment",
    riskLevel: "high",
    timestamp: "2026-05-13T10:05:00Z",
    recommendedAction: "Open privileged role review",
    requestType: "privileged-role-assignment",
    identityProvider: "microsoft-entra",
    targetSystem: "Entra tenant prod",
    detail: "Privileged Authentication Administrator role pending assignment to platform-sre group.",
  },
  {
    id: "evt-svc-1",
    source: "Auth0",
    user: "svc-billing-api",
    eventType: "service_account_api_key_request",
    riskLevel: "medium",
    timestamp: "2026-05-13T09:58:00Z",
    recommendedAction: "Open API key creation review",
    requestType: "api-key-creation",
    identityProvider: "auth0",
    targetSystem: "billing-api production",
    detail: "Service account requests a new long-lived API key; no expiration submitted.",
  },
  {
    id: "evt-bg-1",
    source: "Microsoft Entra",
    user: "alex.greene@lumens.io",
    eventType: "break_glass_request",
    riskLevel: "critical",
    timestamp: "2026-05-13T09:30:00Z",
    recommendedAction: "Open break-glass review",
    requestType: "break-glass-access",
    identityProvider: "microsoft-entra",
    targetSystem: "prod-us tenant",
    detail: "GlobalAdmin JIT requested in response to PagerDuty INC-50219; on-call manager paired.",
  },
  {
    id: "evt-ctr-1",
    source: "Okta",
    user: "external+contractor@vendorco.com",
    eventType: "contractor_temporary_access_request",
    riskLevel: "medium",
    timestamp: "2026-05-13T09:15:00Z",
    recommendedAction: "Open contractor access review",
    requestType: "contractor-temporary-access",
    identityProvider: "okta",
    targetSystem: "build-tools group",
    detail: "Vendor onboarding for security upgrade engagement; sponsor and SoW attached.",
  },
  {
    id: "evt-consent-1",
    source: "Microsoft Entra",
    user: "owner@lumens.io",
    eventType: "admin_consent_request",
    riskLevel: "high",
    timestamp: "2026-05-13T08:55:00Z",
    recommendedAction: "Open admin consent review",
    requestType: "admin-consent-review",
    identityProvider: "microsoft-entra",
    targetSystem: "Marketing SaaS app",
    detail: "Third-party Marketing tool requests Mail.Read + User.Read.All admin consent.",
  },
  {
    id: "evt-gh-1",
    source: "GitHub",
    user: "dana.okafor@lumens.io",
    eventType: "organization_owner_role_assignment",
    riskLevel: "high",
    timestamp: "2026-05-13T08:30:00Z",
    recommendedAction: "Open privileged role review",
    requestType: "privileged-role-assignment",
    identityProvider: "github",
    targetSystem: "lumenstech organization",
    detail: "Promotion from Maintainer to Organization Owner pending owner-level approval.",
  },
];

export interface IdentityEventMappedRecord {
  module: "access-accept";
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  owner: string;
  department: string;
  expirationDate?: string;
  reviewDate?: string;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  accessContext: AccessContext;
}

/**
 * Translate an inbound identity event into the create-payload shape
 * the risk record API expects. Returns a structured draft so callers
 * can adjust fields before posting.
 */
export function mapIdentityEventToRiskRecordDraft(
  event: IdentityEvent,
): IdentityEventMappedRecord {
  const requestMeta = getAccessRequestMeta(event.requestType);
  return {
    module: "access-accept",
    title: `${requestMeta.label} — ${event.user}`,
    description: event.detail,
    sourceSystem: event.source,
    sourceType: event.eventType,
    riskLevel: event.riskLevel,
    owner: "",
    department: "Identity & Access Operations",
    compensatingControls: "",
    evidenceSummary: `Source event ${event.id} on ${event.source} flagged ${event.eventType}.`,
    businessJustification: "",
    technicalContext: event.detail,
    frameworkTags: ["NIST 800-53 AC-2", "NIST 800-53 AC-5"],
    sourceReferences: [
      { label: `Event ${event.id}`, system: event.source, externalId: event.id },
    ],
    accessContext: {
      requestType: event.requestType,
      requester: event.user,
      identityProvider: event.identityProvider,
      userOrServiceAccount: event.user,
      targetSystem: event.targetSystem,
      privilegeLevel: "to-be-confirmed",
    },
  };
}

export function buildAccessIntakeQuery(event: IdentityEvent): string {
  const params = new URLSearchParams({
    requestType: event.requestType,
    source: event.identityProvider,
    user: event.user,
    riskLevel: event.riskLevel,
    targetSystem: event.targetSystem,
    eventId: event.id,
  });
  return params.toString();
}
