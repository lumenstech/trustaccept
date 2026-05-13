import type { RiskLevel, RiskRecord } from "./types";

export const DEMO_ORGANIZATION_ID = "demo-org";
export const DEMO_USER_ID = "demo-user";

export function deriveRiskScore(level: RiskLevel): number {
  switch (level) {
    case "low":
      return 25;
    case "medium":
      return 50;
    case "high":
      return 75;
    case "critical":
      return 95;
  }
}

const SEED_TIMESTAMP = "2026-05-13T08:00:00Z";

function withDefaults(record: RiskRecord): RiskRecord {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    riskScore: deriveRiskScore(record.riskLevel),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    createdById: DEMO_USER_ID,
    updatedById: DEMO_USER_ID,
    ...record,
  };
}

const RAW_RECORDS: RiskRecord[] = [
  {
    id: "ra-ai-001",
    module: "ai-action-gate",
    title: "AI agent wants to export 1,240 customer records",
    description:
      "Support copilot is attempting to export the full active customer table to a CSV in the shared analytics drive. The agent justifies the action with an internal request to refresh a churn dashboard.",
    sourceSystem: "AgentOps",
    sourceType: "agent.tool_call",
    riskLevel: "high",
    status: "pending",
    owner: "Priya Shah",
    department: "Customer Operations",
    dueDate: "2026-05-15",
    expirationDate: "2026-05-20",
    reviewDate: "2026-05-14",
    compensatingControls:
      "Export will be written to a vaulted bucket with 24-hour TTL, DLP scan required, and access limited to two named analysts.",
    evidenceSummary:
      "Agent intent log, requested SQL query, data classification, prior approvals for similar exports.",
    businessJustification:
      "Churn dashboard is referenced in the May board pack; refresh window closes May 14.",
    technicalContext:
      "Data set classified as Restricted (PII). 1,240 rows include email, plan tier, MRR, last login. Export target is approved analytics workspace.",
    frameworkTags: ["NIST AI RMF GOVERN 1.3", "NIST AI RMF MAP 4.1", "SOC 2 CC6.7"],
    sourceReferences: [
      { label: "Agent run agent-7741", system: "AgentOps", externalId: "agent-7741" },
      { label: "Data classification: Restricted", system: "Data Catalog" },
    ],
    auditTimeline: [
      {
        actor: "AgentOps",
        action: "intercepted",
        detail: "Support copilot tool call blocked pending approval.",
        occurredAt: "2026-05-13T09:14:00Z",
      },
      {
        actor: "TrustAccept",
        action: "routed",
        detail: "Decision routed to Customer Operations approver group.",
        occurredAt: "2026-05-13T09:14:11Z",
      },
    ],
  },
  {
    id: "ra-acc-001",
    module: "access-accept",
    title: "Admin requests break-glass access to production tenant",
    description:
      "Site reliability engineer is requesting temporary GlobalAdmin access to the production tenant to investigate a paging anomaly affecting the EU region.",
    sourceSystem: "Microsoft Entra",
    sourceType: "identity.priv_request",
    riskLevel: "critical",
    status: "pending",
    owner: "Marcus Lee",
    department: "Platform SRE",
    dueDate: "2026-05-13",
    expirationDate: "2026-05-13",
    reviewDate: "2026-05-13",
    compensatingControls:
      "Session recording enabled, scope limited to read-only investigation, automatic revoke after 4 hours, paired with on-call manager.",
    evidenceSummary:
      "PagerDuty incident, prior break-glass logs, conditional access policy snapshot, MFA challenge log.",
    businessJustification:
      "EU customers reporting elevated 5xx error rate; investigation requires elevated read access to KV and policy store.",
    technicalContext:
      "Requested role: GlobalAdmin. Tenant: prod-eu-1. JIT window requested: 4 hours. MFA satisfied; device compliance verified.",
    frameworkTags: ["NIST 800-53 AC-2(7)", "NIST 800-53 AC-5", "ISO 27001 A.9.2.3"],
    sourceReferences: [
      { label: "Incident INC-50219", system: "PagerDuty", externalId: "INC-50219" },
      { label: "Entra access request", system: "Microsoft Entra", externalId: "req-9981" },
    ],
    accessContext: {
      requestType: "break-glass-access",
      requester: "marcus.lee@lumens.io",
      identityProvider: "microsoft-entra",
      userOrServiceAccount: "marcus.lee@lumens.io",
      targetSystem: "prod-eu-1 tenant",
      privilegeLevel: "GlobalAdmin",
      requestedDuration: "4 hours",
      approvalOwner: "Alex Greene",
    },
    auditTimeline: [
      {
        actor: "Microsoft Entra",
        action: "raised",
        detail: "GlobalAdmin JIT request submitted by Marcus Lee.",
        occurredAt: "2026-05-13T07:42:00Z",
      },
      {
        actor: "TrustAccept",
        action: "routed",
        detail: "Routed to Platform SRE approver group with executive notify.",
        occurredAt: "2026-05-13T07:42:09Z",
      },
    ],
  },
  {
    id: "ra-acc-002",
    module: "access-accept",
    title: "Service account requests new API key",
    description:
      "Long-running billing-api service account is requesting a fresh API key. No expiration submitted with the request.",
    sourceSystem: "Auth0",
    sourceType: "identity.api_key_request",
    riskLevel: "medium",
    status: "pending",
    owner: "Dana Okafor",
    department: "Billing Engineering",
    dueDate: "2026-05-15",
    expirationDate: "2026-08-13",
    reviewDate: "2026-05-15",
    compensatingControls:
      "Key scoped to billing-api production, IP allow-list applied, 90-day expiration enforced, key usage telemetry on.",
    evidenceSummary:
      "Auth0 management API request, prior key rotation logs, service ownership record.",
    businessJustification:
      "Existing key approaching expiration; rotation needed to avoid May invoice run interruption.",
    technicalContext:
      "Auth0 tenant: lumens-prod. Service: billing-api. Requested scopes: read:invoices, write:invoices.",
    frameworkTags: ["NIST 800-53 IA-5", "NIST 800-53 AC-6", "SOC 2 CC6.1"],
    sourceReferences: [
      { label: "Auth0 management request", system: "Auth0", externalId: "req-AC-0451" },
      { label: "Service ownership: billing-platform", system: "CMDB" },
    ],
    accessContext: {
      requestType: "api-key-creation",
      requester: "platform-billing@lumens.io",
      identityProvider: "auth0",
      userOrServiceAccount: "svc-billing-api",
      targetSystem: "billing-api production",
      privilegeLevel: "API client (scoped)",
      requestedDuration: "90 days",
      approvalOwner: "Dana Okafor",
    },
    auditTimeline: [
      {
        actor: "Auth0",
        action: "raised",
        detail: "API key request raised for svc-billing-api.",
        occurredAt: "2026-05-12T16:12:00Z",
      },
    ],
  },
  {
    id: "ra-acc-003",
    module: "access-accept",
    title: "User requests MFA recovery after lost device",
    description:
      "Customer Operations lead reports a lost authenticator device. Recovery requires owner-level approval and an out-of-band identity check.",
    sourceSystem: "Duo",
    sourceType: "identity.mfa_recovery",
    riskLevel: "medium",
    status: "pending",
    owner: "Priya Shah",
    department: "Customer Operations",
    dueDate: "2026-05-14",
    expirationDate: "2026-05-21",
    reviewDate: "2026-05-14",
    compensatingControls:
      "Manager video confirmation, temporary Duo bypass code limited to 24 hours, full re-enrollment within 7 days.",
    evidenceSummary:
      "Duo recovery ticket, manager attestation, prior sign-in history, device lost report.",
    businessJustification:
      "User locked out of business systems; without recovery, May customer churn deck cannot ship.",
    technicalContext:
      "Duo policy: high-assurance group. Recovery method: temporary bypass + re-enroll on managed device.",
    frameworkTags: ["NIST 800-63B 5.2.5", "NIST 800-53 IA-2", "SOC 2 CC6.1"],
    sourceReferences: [
      { label: "Duo recovery ticket", system: "Duo", externalId: "DUO-RC-7741" },
      { label: "Manager attestation", system: "ServiceNow", externalId: "REQ-22501" },
    ],
    accessContext: {
      requestType: "mfa-recovery",
      requester: "priya.shah@lumens.io",
      identityProvider: "duo",
      userOrServiceAccount: "priya.shah@lumens.io",
      targetSystem: "Duo enrollment",
      privilegeLevel: "Standard user (MFA bypass)",
      requestedDuration: "24 hours",
      approvalOwner: "Priya Shah",
    },
    auditTimeline: [
      {
        actor: "Duo",
        action: "raised",
        detail: "MFA recovery request opened by user.",
        occurredAt: "2026-05-13T08:11:00Z",
      },
    ],
  },
  {
    id: "ra-acc-004",
    module: "access-accept",
    title: "Suspicious login requires escalation",
    description:
      "Okta ThreatInsight flagged a sign-in from an unfamiliar geography on a device that has never authenticated before. Session is held pending review.",
    sourceSystem: "Okta",
    sourceType: "identity.suspicious_login",
    riskLevel: "high",
    status: "pending",
    owner: "Marcus Lee",
    department: "Platform SRE",
    dueDate: "2026-05-13",
    expirationDate: "2026-05-14",
    reviewDate: "2026-05-13",
    compensatingControls:
      "Session held in step-up state, geo-velocity rule applied, manager attestation requested, audit log replay on hand.",
    evidenceSummary:
      "Okta sign-in event, geo-velocity rule snapshot, prior login history, manager call recording.",
    businessJustification:
      "User asserts legitimate travel; cannot proceed without owner review given prior incident IR-2025-77.",
    technicalContext:
      "User: marcus.lee@lumens.io. Source: Frankfurt. Device: previously unseen iOS. MFA challenge: satisfied.",
    frameworkTags: ["NIST 800-53 AU-6", "NIST 800-53 IA-2", "SOC 2 CC7.2"],
    sourceReferences: [
      { label: "Okta event 88291", system: "Okta", externalId: "88291" },
      { label: "Prior incident IR-2025-77", system: "TrustAccept" },
    ],
    accessContext: {
      requestType: "suspicious-login",
      requester: "marcus.lee@lumens.io",
      identityProvider: "okta",
      userOrServiceAccount: "marcus.lee@lumens.io",
      targetSystem: "prod-eu-1 tenant",
      privilegeLevel: "Standard user (held in step-up)",
      requestedDuration: "Single session",
      approvalOwner: "Alex Greene",
    },
    auditTimeline: [
      {
        actor: "Okta",
        action: "flagged",
        detail: "Sign-in placed in step-up state by ThreatInsight rule.",
        occurredAt: "2026-05-13T07:00:00Z",
      },
    ],
  },
  {
    id: "ra-acc-005",
    module: "access-accept",
    title: "Contractor requests temporary admin access",
    description:
      "Vendor engineer onboarding for the Atlanta data center security upgrade is requesting time-bound admin access to the build-tools group.",
    sourceSystem: "Okta",
    sourceType: "identity.contractor_onboard",
    riskLevel: "medium",
    status: "pending",
    owner: "Lena Petrova",
    department: "IT Operations",
    dueDate: "2026-05-15",
    expirationDate: "2026-06-15",
    reviewDate: "2026-05-15",
    compensatingControls:
      "Sponsor required for every session, scope limited to build-tools group, automatic revoke after 30 days, weekly access review.",
    evidenceSummary:
      "Vendor authorization letter, SoW reference, Okta group membership snapshot, sponsor record.",
    businessJustification:
      "Atlanta facility upgrade requires vendor admin access during install window through mid-June.",
    technicalContext:
      "Okta group: build-tools-admins. Sponsor: Lena Petrova. SoW: SOW-2026-014.",
    frameworkTags: ["NIST 800-53 AC-2", "NIST 800-53 PS-7", "ISO 27001 A.6.3"],
    sourceReferences: [
      { label: "SoW SOW-2026-014", system: "Contracts" },
      { label: "Okta onboarding REQ-77410", system: "Okta", externalId: "REQ-77410" },
    ],
    accessContext: {
      requestType: "contractor-temporary-access",
      requester: "external+contractor@vendorco.com",
      identityProvider: "okta",
      userOrServiceAccount: "external+contractor@vendorco.com",
      targetSystem: "build-tools-admins group",
      privilegeLevel: "Group admin (build-tools)",
      requestedDuration: "30 days",
      approvalOwner: "Lena Petrova",
    },
    auditTimeline: [
      {
        actor: "Okta",
        action: "raised",
        detail: "Contractor onboarding request submitted.",
        occurredAt: "2026-05-13T09:01:00Z",
      },
    ],
  },
  {
    id: "ra-acc-006",
    module: "access-accept",
    title: "Privileged role assignment requires owner approval",
    description:
      "Promotion to GitHub Organization Owner for the lumenstech org requires named owner approval and a 90-day review.",
    sourceSystem: "GitHub",
    sourceType: "identity.role_assignment",
    riskLevel: "high",
    status: "pending",
    owner: "Dana Okafor",
    department: "Engineering Productivity",
    dueDate: "2026-05-16",
    expirationDate: "2026-08-13",
    reviewDate: "2026-05-16",
    compensatingControls:
      "Two-person approval required, 90-day review window, audit log replay on assignment, SAML SSO and security-key MFA enforced.",
    evidenceSummary:
      "GitHub role assignment request, prior org owner roster, SAML SSO policy snapshot.",
    businessJustification:
      "Engineering productivity lead requires Org Owner role to administer required workflows for Q3 release plan.",
    technicalContext:
      "Org: lumenstech. Current role: Maintainer. Target role: Organization Owner.",
    frameworkTags: ["NIST 800-53 AC-5", "NIST 800-53 AC-6(2)", "SOC 2 CC6.1"],
    sourceReferences: [
      { label: "GitHub change PR-883", system: "GitHub", externalId: "PR-883" },
      { label: "Engineering Productivity charter", system: "Confluence" },
    ],
    accessContext: {
      requestType: "privileged-role-assignment",
      requester: "dana.okafor@lumens.io",
      identityProvider: "github",
      userOrServiceAccount: "dana.okafor",
      targetSystem: "lumenstech GitHub organization",
      privilegeLevel: "Organization Owner",
      requestedDuration: "90 days (with review)",
      approvalOwner: "Alex Greene",
    },
    auditTimeline: [
      {
        actor: "GitHub",
        action: "raised",
        detail: "Org Owner role assignment requested.",
        occurredAt: "2026-05-13T08:30:00Z",
      },
    ],
  },
  {
    id: "ra-acc-007",
    module: "access-accept",
    title: "API key creation request needs expiration date",
    description:
      "Internal IAM raised a new API key creation request for the analytics service account without an expiration. Approval requires an expiration date before issuing.",
    sourceSystem: "Internal IAM",
    sourceType: "identity.api_key_request",
    riskLevel: "medium",
    status: "pending",
    owner: "Jordan Pak",
    department: "Analytics Platform",
    dueDate: "2026-05-17",
    expirationDate: "2026-08-15",
    reviewDate: "2026-05-17",
    compensatingControls:
      "Expiration set to 90 days, scope limited to analytics read, secret rotated via vault, usage monitoring enabled.",
    evidenceSummary:
      "IAM request, scope justification, prior key rotation evidence, vault policy snapshot.",
    businessJustification:
      "Analytics platform requires a new key for the May refresh; existing key reaches end of life.",
    technicalContext:
      "Service: analytics-service. Scope: read:warehouse. Key TTL requested: 90 days.",
    frameworkTags: ["NIST 800-53 IA-5", "NIST 800-53 AC-6", "SOC 2 CC6.1"],
    sourceReferences: [
      { label: "IAM request IAM-9921", system: "Internal IAM", externalId: "IAM-9921" },
      { label: "Vault policy: analytics-read", system: "Vault" },
    ],
    accessContext: {
      requestType: "api-key-creation",
      requester: "jordan.pak@lumens.io",
      identityProvider: "internal-iam",
      userOrServiceAccount: "svc-analytics-service",
      targetSystem: "analytics warehouse",
      privilegeLevel: "API client (read)",
      requestedDuration: "90 days",
      approvalOwner: "Jordan Pak",
    },
    auditTimeline: [
      {
        actor: "Internal IAM",
        action: "raised",
        detail: "API key creation request submitted; expiration required.",
        occurredAt: "2026-05-12T13:45:00Z",
      },
    ],
  },
  {
    id: "ra-acc-008",
    module: "access-accept",
    title: "Entra admin consent request requires review",
    description:
      "Third-party Marketing SaaS application is requesting admin consent for Mail.Read and User.Read.All on the corporate Entra tenant.",
    sourceSystem: "Microsoft Entra",
    sourceType: "identity.admin_consent_request",
    riskLevel: "high",
    status: "pending",
    owner: "Sara Romero",
    department: "Office of the CISO",
    dueDate: "2026-05-18",
    expirationDate: "2026-11-13",
    reviewDate: "2026-08-13",
    compensatingControls:
      "Scopes downgraded to delegated where possible, consent capped at six months, vendor SIG-Lite on file, conditional access policy applied.",
    evidenceSummary:
      "Entra consent request, vendor SIG-Lite, data classification, prior admin consent precedent.",
    businessJustification:
      "Marketing team is rolling out a new campaign measurement tool that requires read access to specific groups.",
    technicalContext:
      "App ID: 7f3e-... Requested scopes: Mail.Read (app), User.Read.All (delegated).",
    frameworkTags: ["NIST 800-53 AC-3", "NIST 800-53 SA-9", "ISO 27001 A.5.19"],
    sourceReferences: [
      { label: "Entra consent request", system: "Microsoft Entra", externalId: "consent-4421" },
      { label: "Vendor SIG-Lite", system: "Vendor Risk" },
    ],
    accessContext: {
      requestType: "admin-consent-review",
      requester: "owner@lumens.io",
      identityProvider: "microsoft-entra",
      userOrServiceAccount: "marketing-saas-app",
      targetSystem: "corporate Entra tenant",
      privilegeLevel: "Admin consent (Mail.Read, User.Read.All)",
      requestedDuration: "6 months",
      approvalOwner: "Sara Romero",
    },
    auditTimeline: [
      {
        actor: "Microsoft Entra",
        action: "raised",
        detail: "Admin consent request submitted.",
        occurredAt: "2026-05-12T18:09:00Z",
      },
    ],
  },
  {
    id: "ra-vul-001",
    module: "vulnerability-accept",
    title: "Fortify critical finding requires release decision",
    description:
      "Fortify static scan identified a deserialization vulnerability in the legacy billing service. Engineering is requesting a 30-day risk acceptance while the affected library is replaced.",
    sourceSystem: "Fortify",
    sourceType: "vuln.fortify",
    riskLevel: "critical",
    status: "pending",
    owner: "Dana Okafor",
    department: "Billing Engineering",
    dueDate: "2026-05-19",
    expirationDate: "2026-06-12",
    reviewDate: "2026-05-19",
    compensatingControls:
      "Inbound traffic restricted via WAF rule, untrusted input pathway disabled at edge, runtime exploitation monitoring enabled.",
    evidenceSummary:
      "Fortify finding F-2026-441, exploitability analysis, WAF rule diff, runtime detection coverage.",
    businessJustification:
      "Library replacement requires a coordinated upgrade window; rushing the patch risks billing outage during May invoice run.",
    technicalContext:
      "CVE-equivalent severity Critical. Vulnerable code path requires authenticated internal call; not reachable from public surface after WAF rule R-882.",
    frameworkTags: ["NIST 800-53 RA-5", "NIST SSDF PW.7", "SOC 2 CC7.1"],
    sourceReferences: [
      { label: "Fortify F-2026-441", system: "Fortify", externalId: "F-2026-441" },
      { label: "WAF rule R-882", system: "Cloudflare", externalId: "R-882" },
    ],
    vulnerabilityContext: {
      source: "fortify",
      findingId: "F-2026-441",
      severity: "critical",
      affectedAsset: "billing-service / legacy deserializer",
      repositoryOrApplication: "billing-service",
      cwe: "CWE-502",
      businessImpact:
        "Disposition affects May invoice run timing; rushing the patch risks billing outage.",
      technicalImpact:
        "Authenticated internal call surface; unreachable from public after WAF rule R-882.",
      remediationPlan:
        "Replace vulnerable serializer library in coordinated upgrade window; full patch by June 12.",
      requestedDecision: "accept",
      releaseBlocking: true,
    },
    auditTimeline: [
      {
        actor: "Fortify",
        action: "ingested",
        detail: "Critical finding ingested into Vulnerability Accept module.",
        occurredAt: "2026-05-12T15:02:00Z",
      },
    ],
  },
  {
    id: "ra-vul-002",
    module: "vulnerability-accept",
    title: "Snyk dependency vulnerability needs temporary exception",
    description:
      "Snyk flagged a high-severity vulnerability in a transitive lodash dependency on the billing-service. Engineering needs a 30-day exception while the rebuild is coordinated.",
    sourceSystem: "Snyk",
    sourceType: "vuln.snyk",
    riskLevel: "high",
    status: "pending",
    owner: "Jordan Pak",
    department: "Application Security",
    dueDate: "2026-05-20",
    expirationDate: "2026-06-19",
    reviewDate: "2026-05-20",
    compensatingControls:
      "Affected code path behind authentication; runtime monitoring elevated; CI gate exception scoped to billing-service only.",
    evidenceSummary:
      "Snyk finding SNYK-JS-LODASH-7710, dependency graph, prior rebuild runbook.",
    businessJustification:
      "Library upgrade requires a coordinated rebuild across three services; rushing it risks May invoice cycle.",
    technicalContext:
      "Vulnerable function not reachable from public surface; authenticated paths only.",
    frameworkTags: ["NIST 800-53 RA-5", "NIST SSDF PW.6", "SOC 2 CC7.1"],
    sourceReferences: [
      { label: "Snyk SNYK-JS-LODASH-7710", system: "Snyk", externalId: "SNYK-JS-LODASH-7710" },
      { label: "CVE-2026-22014", system: "NVD" },
    ],
    vulnerabilityContext: {
      source: "snyk",
      findingId: "SNYK-JS-LODASH-7710",
      severity: "high",
      affectedAsset: "billing-service / node_modules/lodash",
      repositoryOrApplication: "billing-service",
      cve: "CVE-2026-22014",
      cwe: "CWE-1035",
      businessImpact:
        "Upgrading mid-May invoice cycle introduces deployment risk on a regulated cadence.",
      technicalImpact:
        "Vulnerable function reachable only from authenticated administrative endpoints.",
      remediationPlan:
        "Coordinated rebuild of billing-service, ledger-service, and reporting-service by June 19.",
      requestedDecision: "accept",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "Snyk",
        action: "ingested",
        detail: "Dependency finding raised; auto-routed to Vulnerability Accept.",
        occurredAt: "2026-05-12T19:11:00Z",
      },
    ],
  },
  {
    id: "ra-vul-003",
    module: "vulnerability-accept",
    title: "GitHub code scanning alert requires owner assignment",
    description:
      "GitHub Advanced Security flagged a secret-scanning alert in the integrations-ci repository. The alert is unassigned and needs an owner before disposition.",
    sourceSystem: "GitHub Advanced Security",
    sourceType: "vuln.github_advanced_security",
    riskLevel: "high",
    status: "pending",
    owner: "Sara Romero",
    department: "Application Security",
    dueDate: "2026-05-15",
    expirationDate: "2026-05-29",
    reviewDate: "2026-05-15",
    compensatingControls:
      "Rotation playbook executed for the exposed credential; commit history scrubbed; audit log review enabled.",
    evidenceSummary:
      "GHAS-SECRET-9921 alert payload, rotation log, repository setting snapshot.",
    businessJustification:
      "Unassigned high-severity alert blocks SOC 2 evidence; needs named owner to track remediation.",
    technicalContext:
      "Third-party API key surfaced in a CI workflow run; scope limited to that integration.",
    frameworkTags: ["NIST 800-53 SI-2", "NIST SSDF PW.7", "SOC 2 CC7.1"],
    sourceReferences: [
      {
        label: "GHAS alert GHAS-SECRET-9921",
        system: "GitHub Advanced Security",
        externalId: "GHAS-SECRET-9921",
      },
      { label: "Repo lumenstech/integrations-ci", system: "GitHub" },
    ],
    vulnerabilityContext: {
      source: "github-advanced-security",
      findingId: "GHAS-SECRET-9921",
      severity: "high",
      affectedAsset: "lumenstech/integrations-ci",
      repositoryOrApplication: "lumenstech/integrations-ci",
      businessImpact:
        "Owner-less alert undermines SOC 2 evidence for secret management controls.",
      technicalImpact:
        "Key surfaced in a CI run; rotated, but disposition record required for audit.",
      remediationPlan:
        "Owner assignment + retrospective; tighten secret push protection rule on the repo.",
      requestedDecision: "remediate",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "GitHub Advanced Security",
        action: "raised",
        detail: "Secret scanning alert raised; owner assignment pending.",
        occurredAt: "2026-05-12T20:05:00Z",
      },
    ],
  },
  {
    id: "ra-vul-004",
    module: "vulnerability-accept",
    title: "Wiz cloud exposure needs compensating control",
    description:
      "Wiz flagged a storage bucket on the data-platform project as exposed to the public internet. Disposition requires a compensating control or remediation.",
    sourceSystem: "Wiz",
    sourceType: "vuln.wiz",
    riskLevel: "critical",
    status: "pending",
    owner: "Marcus Lee",
    department: "Platform SRE",
    dueDate: "2026-05-14",
    expirationDate: "2026-05-28",
    reviewDate: "2026-05-14",
    compensatingControls:
      "Bucket policy tightened to VPC endpoint only; encryption rotation enforced; access log review scheduled.",
    evidenceSummary:
      "Wiz finding WIZ-EXP-4421, prior bucket policy snapshot, access log replay.",
    businessJustification:
      "Reporting consumers depend on the bucket through approved channels; full takedown impacts reporting SLA.",
    technicalContext:
      "S3-class bucket previously public via legacy policy; mis-scoped principal removed; new policy in place.",
    frameworkTags: ["NIST 800-53 SC-7", "CIS Cloud 2.1", "SOC 2 CC7.2"],
    sourceReferences: [
      { label: "Wiz WIZ-EXP-4421", system: "Wiz", externalId: "WIZ-EXP-4421" },
      { label: "Bucket policy diff", system: "AWS Config" },
    ],
    vulnerabilityContext: {
      source: "wiz",
      findingId: "WIZ-EXP-4421",
      severity: "critical",
      affectedAsset: "prod-eu-1 / s3-internal-reports",
      repositoryOrApplication: "data-platform",
      businessImpact:
        "Reporting SLA depends on continued access through approved consumers.",
      technicalImpact:
        "Public exposure remediated by VPC endpoint policy; legacy principal removed.",
      remediationPlan:
        "Bucket review every two weeks; convert to least-privilege per-consumer roles by May 28.",
      requestedDecision: "accept",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "Wiz",
        action: "flagged",
        detail: "Public exposure surfaced via cloud posture rule.",
        occurredAt: "2026-05-12T17:40:00Z",
      },
    ],
  },
  {
    id: "ra-vul-005",
    module: "vulnerability-accept",
    title: "Tenable critical CVE accepted until maintenance window",
    description:
      "Tenable identified a CISA KEV-listed CVE on three internet-facing edge gateways. Engineering proposes acceptance until the May maintenance window.",
    sourceSystem: "Tenable",
    sourceType: "vuln.tenable",
    riskLevel: "critical",
    status: "pending",
    owner: "Sara Romero",
    department: "Infrastructure Security",
    dueDate: "2026-05-22",
    expirationDate: "2026-05-29",
    reviewDate: "2026-05-22",
    compensatingControls:
      "Geo-fenced ingress, IPS signature for the exploit deployed, anomalous traffic alerting elevated.",
    evidenceSummary:
      "Tenable scan TENABLE-99182, CISA KEV listing, IPS signature deployment record.",
    businessJustification:
      "Patch requires coordinated maintenance window; partner integrations mid-cutover.",
    technicalContext:
      "Three edge gateways affected (edge-gw-01, 02, 03); exploit observed in the wild.",
    frameworkTags: ["CISA KEV", "NIST 800-53 SI-2", "NIST 800-53 RA-5"],
    sourceReferences: [
      { label: "Tenable scan TENABLE-99182", system: "Tenable", externalId: "TENABLE-99182" },
      { label: "CVE-2026-1455", system: "CISA KEV" },
    ],
    vulnerabilityContext: {
      source: "tenable",
      findingId: "TENABLE-99182",
      severity: "critical",
      affectedAsset: "edge-gw-{01,02,03}",
      repositoryOrApplication: "edge-gateway",
      cve: "CVE-2026-1455",
      businessImpact:
        "Partner integrations require uninterrupted gateway connectivity through May 22.",
      technicalImpact:
        "Exploit observed in the wild; IPS signature deployed; geo-fenced ingress applied.",
      remediationPlan:
        "Patch in the May 29 maintenance window; revoke acceptance once all three gateways are upgraded.",
      requestedDecision: "accept",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "Tenable",
        action: "ingested",
        detail: "Critical CVE finding routed to Vulnerability Accept.",
        occurredAt: "2026-05-12T16:30:00Z",
      },
    ],
  },
  {
    id: "ra-vul-006",
    module: "vulnerability-accept",
    title: "Pen test finding requires remediation plan",
    description:
      "Q2 pen test identified a privilege escalation path in the internal admin portal. Remediation plan must be filed before the finding can be dispositioned.",
    sourceSystem: "Pen test report",
    sourceType: "vuln.pen_test",
    riskLevel: "high",
    status: "pending",
    owner: "Dana Okafor",
    department: "Application Security",
    dueDate: "2026-05-21",
    expirationDate: "2026-06-21",
    reviewDate: "2026-05-21",
    compensatingControls:
      "Role check tightened at the affected endpoint; manual review of recent privileged actions in the portal.",
    evidenceSummary:
      "Pen test report Q2-07, recreate steps, log replay of affected user sessions.",
    businessJustification:
      "Internal admin portal is the runbook execution surface; remediation must coordinate with on-call rotation.",
    technicalContext:
      "Mis-scoped role check exposed a privilege escalation path; reproducible in staging.",
    frameworkTags: ["NIST 800-53 RA-5", "NIST SSDF PW.5", "OWASP ASVS V4"],
    sourceReferences: [
      { label: "Pen test PENTEST-2026-Q2-07", system: "Pen test", externalId: "PENTEST-2026-Q2-07" },
      { label: "Recreate runbook", system: "Confluence" },
    ],
    vulnerabilityContext: {
      source: "pen-test",
      findingId: "PENTEST-2026-Q2-07",
      severity: "high",
      affectedAsset: "internal-admin-portal / role middleware",
      repositoryOrApplication: "internal-admin-portal",
      cwe: "CWE-285",
      businessImpact:
        "Internal admin portal is the on-call runbook execution surface; remediation must coordinate with on-call.",
      technicalImpact:
        "Privilege escalation reproducible in staging; production paths gated by approved sessions.",
      remediationPlan:
        "Centralize role authorization in middleware; add property-based tests; ship by June 21.",
      requestedDecision: "remediate",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "Pen test",
        action: "filed",
        detail: "Q2 pen test finding filed; remediation plan owner pending.",
        occurredAt: "2026-05-12T22:00:00Z",
      },
    ],
  },
  {
    id: "ra-vul-007",
    module: "vulnerability-accept",
    title: "Container vulnerability accepted until next release",
    description:
      "Snyk Container flagged a critical CVE in the checkout-service base image. Engineering proposes acceptance until the next release cuts in two weeks.",
    sourceSystem: "Snyk Container",
    sourceType: "vuln.snyk_container",
    riskLevel: "critical",
    status: "pending",
    owner: "Jordan Pak",
    department: "Checkout Engineering",
    dueDate: "2026-05-22",
    expirationDate: "2026-05-27",
    reviewDate: "2026-05-22",
    compensatingControls:
      "Runtime policy denies privileged container syscalls; WAF rule deployed; canary at 5% traffic.",
    evidenceSummary:
      "Snyk Container SNYK-CTR-44120, base image diff, runtime policy snapshot.",
    businessJustification:
      "Disclosure update with a fixed effective date forces the next release to ship on schedule.",
    technicalContext:
      "Critical CVE in base image; reachable only after runtime exploit chain; mitigated by runtime policy.",
    frameworkTags: ["NIST 800-53 SI-2", "NIST SSDF PW.7", "CIS Containers"],
    sourceReferences: [
      { label: "Snyk Container SNYK-CTR-44120", system: "Snyk", externalId: "SNYK-CTR-44120" },
      { label: "CVE-2026-30912", system: "NVD" },
    ],
    vulnerabilityContext: {
      source: "snyk",
      findingId: "SNYK-CTR-44120",
      severity: "critical",
      affectedAsset: "checkout-service / container image",
      repositoryOrApplication: "checkout-service",
      cve: "CVE-2026-30912",
      businessImpact:
        "Regulatory disclosure update with fixed effective date depends on this release.",
      technicalImpact:
        "Exploit chain requires runtime privilege; mitigated by container runtime policy.",
      remediationPlan:
        "Rebuild on hardened base image in the May 27 release; revoke acceptance afterwards.",
      requestedDecision: "accept",
      releaseBlocking: true,
    },
    auditTimeline: [
      {
        actor: "Snyk Container",
        action: "ingested",
        detail: "Critical container image finding raised against checkout-service.",
        occurredAt: "2026-05-12T21:11:00Z",
      },
    ],
  },
  {
    id: "ra-vul-008",
    module: "vulnerability-accept",
    title: "High-severity SCA finding requires business owner approval",
    description:
      "Snyk SCA raised a high-severity transitive dependency finding on the analytics platform. Business owner sign-off is required before exception can be issued.",
    sourceSystem: "Snyk SCA",
    sourceType: "vuln.snyk_sca",
    riskLevel: "high",
    status: "pending",
    owner: "Alex Greene",
    department: "Office of the CISO",
    dueDate: "2026-05-23",
    expirationDate: "2026-08-22",
    reviewDate: "2026-08-22",
    compensatingControls:
      "Affected dependency wrapped in defensive shim; CI rebuild scheduled; alerting tightened on the analytics service.",
    evidenceSummary:
      "Snyk SCA SNYK-SCA-22019, dependency graph, prior business-owner approval precedent.",
    businessJustification:
      "Analytics platform powers the executive risk register; replacing the dependency in mid-quarter would disrupt reporting.",
    technicalContext:
      "High-severity SCA finding; vulnerable path used only by a defensive shim; replacement scheduled.",
    frameworkTags: ["NIST 800-53 RA-5", "NIST SSDF PW.6", "SOC 2 CC7.1"],
    sourceReferences: [
      { label: "Snyk SCA SNYK-SCA-22019", system: "Snyk", externalId: "SNYK-SCA-22019" },
      { label: "CVE-2026-15500", system: "NVD" },
    ],
    vulnerabilityContext: {
      source: "snyk",
      findingId: "SNYK-SCA-22019",
      severity: "high",
      affectedAsset: "analytics-platform / data-warehouse-client",
      repositoryOrApplication: "analytics-platform",
      cve: "CVE-2026-15500",
      cwe: "CWE-78",
      businessImpact:
        "Analytics platform powers the executive risk register; mid-quarter swap risks reporting outage.",
      technicalImpact:
        "Vulnerable path only reached via defensive shim; full replacement scheduled.",
      remediationPlan:
        "Replace transitive dependency in the next analytics platform release window in August.",
      requestedDecision: "accept",
      releaseBlocking: false,
    },
    auditTimeline: [
      {
        actor: "Snyk SCA",
        action: "ingested",
        detail: "High-severity SCA finding raised; business owner approval pending.",
        occurredAt: "2026-05-12T23:30:00Z",
      },
    ],
  },
  {
    id: "ra-kev-001",
    module: "kev-exposure-review",
    title: "Known exploited vulnerability exposure requires remediation decision",
    description:
      "CISA KEV-listed vulnerability CVE-2026-1455 detected on three internet-facing gateways. Owner must decide between immediate patching, isolation, or formal risk acceptance.",
    sourceSystem: "Tenable",
    sourceType: "vuln.kev_match",
    riskLevel: "critical",
    status: "pending",
    owner: "Sara Romero",
    department: "Infrastructure Security",
    dueDate: "2026-05-15",
    expirationDate: "2026-05-22",
    reviewDate: "2026-05-15",
    compensatingControls:
      "Geo-fenced ingress, signature-based IPS rule deployed, anomalous traffic alerting elevated.",
    evidenceSummary:
      "CISA KEV listing, Tenable host scan, IPS signature deployment, network segmentation diagram.",
    businessJustification:
      "Patch requires a maintenance window; partner integrations dependent on the gateways are mid-cutover.",
    technicalContext:
      "Affected asset class: edge gateway (3 hosts). KEV due date: May 22. Exploit observed in the wild; signature available.",
    frameworkTags: ["CISA KEV", "NIST 800-53 SI-2", "NIST 800-53 RA-5"],
    sourceReferences: [
      { label: "CVE-2026-1455", system: "CISA KEV", externalId: "CVE-2026-1455" },
      { label: "Tenable scan 99182", system: "Tenable", externalId: "99182" },
    ],
    auditTimeline: [
      {
        actor: "TrustAccept",
        action: "matched",
        detail: "KEV catalog match created Risk Record.",
        occurredAt: "2026-05-12T20:11:00Z",
      },
    ],
  },
  {
    id: "ra-rel-001",
    module: "secure-release-gate",
    title: "Production release contains unresolved high-severity SAST finding",
    description:
      "Release 2026.05.13 includes an unresolved high-severity Semgrep finding in the checkout service. Engineering proposes shipping with a runtime mitigation in place.",
    sourceSystem: "GitHub Actions",
    sourceType: "release.gate",
    riskLevel: "high",
    status: "pending",
    owner: "Jordan Pak",
    department: "Checkout Engineering",
    dueDate: "2026-05-13",
    expirationDate: "2026-05-27",
    reviewDate: "2026-05-13",
    compensatingControls:
      "Feature flag default off, runtime canary at 5% traffic, exception window expires May 27.",
    evidenceSummary:
      "Pipeline run, Semgrep report, runtime canary plan, owner sign-off.",
    businessJustification:
      "Release contains a regulatory disclosure update with a fixed effective date.",
    technicalContext:
      "Finding: SQL injection candidate in price quote endpoint. Endpoint behind feature flag and reachable only by internal callers in canary.",
    frameworkTags: ["NIST SSDF PW.8", "SOC 2 CC8.1"],
    sourceReferences: [
      { label: "Pipeline run #4421", system: "GitHub Actions", externalId: "4421" },
      { label: "Semgrep S-7710", system: "Semgrep", externalId: "S-7710" },
    ],
    auditTimeline: [
      {
        actor: "GitHub Actions",
        action: "blocked",
        detail: "Release pipeline blocked at TrustAccept gate.",
        occurredAt: "2026-05-13T06:01:00Z",
      },
    ],
  },
  {
    id: "ra-dev-001",
    module: "device-accept",
    title: "New contractor camera requests network access",
    description:
      "A contractor IP camera at the Atlanta data center is requesting access to the corporate management VLAN. Asset has no current ownership in the CMDB.",
    sourceSystem: "Cisco ISE",
    sourceType: "device.onboard",
    riskLevel: "medium",
    status: "pending",
    owner: "Lena Petrova",
    department: "IT Operations",
    dueDate: "2026-05-14",
    expirationDate: "2026-08-13",
    reviewDate: "2026-05-14",
    compensatingControls:
      "Quarantine VLAN, outbound DNS sinkhole, firmware scan required prior to promotion.",
    evidenceSummary:
      "Asset fingerprint, contractor authorization letter, firmware version, prior IoT onboarding precedent.",
    businessJustification:
      "Atlanta facility security upgrade requires temporary contractor camera coverage during install.",
    technicalContext:
      "Vendor: Axis. Firmware: 11.7.62. Authentication: 802.1X MAB. Network segment: contractor-iot-7.",
    frameworkTags: ["NIST 800-53 AC-3", "NIST 800-53 CM-8"],
    sourceReferences: [
      { label: "ISE auth log 88412", system: "Cisco ISE", externalId: "88412" },
      { label: "Asset fingerprint", system: "Armis" },
    ],
    auditTimeline: [
      {
        actor: "Cisco ISE",
        action: "quarantined",
        detail: "Unknown device quarantined and routed for decision.",
        occurredAt: "2026-05-13T11:30:00Z",
      },
    ],
  },
  {
    id: "ra-evd-001",
    module: "evidence-desk",
    title: "Monthly executive risk register ready for review",
    description:
      "May 2026 executive risk register compiled from accepted, rejected, and remediated decisions across all TrustAccept modules. Awaiting CISO acknowledgment.",
    sourceSystem: "TrustAccept",
    sourceType: "evidence.register",
    riskLevel: "medium",
    status: "pending",
    owner: "Alex Greene",
    department: "Office of the CISO",
    dueDate: "2026-05-20",
    expirationDate: "2026-06-30",
    reviewDate: "2026-05-20",
    compensatingControls:
      "Two-person review, immutable export, signed evidence packet attached.",
    evidenceSummary:
      "Aggregated decisions, framework coverage map, expirations due in 30 days, exception inventory.",
    businessJustification:
      "Required input to the quarterly board risk update and audit evidence binder.",
    technicalContext:
      "Register references 47 decisions across 7 modules. Includes 9 expirations due within 30 days.",
    frameworkTags: ["NIST 800-53 PM-9", "SOC 2 CC3.2"],
    sourceReferences: [
      { label: "Register batch 2026-05", system: "TrustAccept", externalId: "batch-2026-05" },
    ],
    auditTimeline: [
      {
        actor: "TrustAccept",
        action: "compiled",
        detail: "Monthly evidence packet compiled for CISO review.",
        occurredAt: "2026-05-12T23:00:00Z",
      },
    ],
  },
];

export const SEED_RECORDS: RiskRecord[] = RAW_RECORDS.map(withDefaults);

export function findRecord(id: string) {
  return SEED_RECORDS.find((r) => r.id === id);
}
