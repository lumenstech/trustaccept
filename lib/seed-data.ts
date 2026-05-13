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
    sourceSystem: "Entra ID",
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
      { label: "Entra access request", system: "Entra ID", externalId: "req-9981" },
    ],
    auditTimeline: [
      {
        actor: "Entra ID",
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
    id: "ra-vul-001",
    module: "vulnerability-accept",
    title: "Fortify critical finding requires release decision",
    description:
      "Fortify static scan identified a deserialization vulnerability in the legacy billing service. Engineering is requesting a 30-day risk acceptance while the affected library is replaced.",
    sourceSystem: "Fortify",
    sourceType: "vuln.finding",
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
