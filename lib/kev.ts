import type { RiskLevel, RiskRecord, SourceReference } from "./types";

export type KevStatus = "known-exploited" | "suspected-exploited" | "under-review";

export interface KevStatusMeta {
  value: KevStatus;
  label: string;
}

export const KEV_STATUSES: KevStatusMeta[] = [
  { value: "known-exploited", label: "Known exploited" },
  { value: "suspected-exploited", label: "Suspected exploited" },
  { value: "under-review", label: "Under review" },
];

export type KevSource =
  | "cisa-kev-reference"
  | "tenable"
  | "wiz"
  | "qualys"
  | "rapid7"
  | "github"
  | "fortify"
  | "manual"
  | "other";

export interface KevSourceMeta {
  value: KevSource;
  label: string;
  shortLabel: string;
  defaultSourceSystem: string;
}

export const KEV_SOURCES: KevSourceMeta[] = [
  {
    value: "cisa-kev-reference",
    label: "CISA KEV reference",
    shortLabel: "CISA KEV",
    defaultSourceSystem: "CISA KEV reference",
  },
  { value: "tenable", label: "Tenable", shortLabel: "Tenable", defaultSourceSystem: "Tenable" },
  { value: "wiz", label: "Wiz", shortLabel: "Wiz", defaultSourceSystem: "Wiz" },
  { value: "qualys", label: "Qualys", shortLabel: "Qualys", defaultSourceSystem: "Qualys" },
  { value: "rapid7", label: "Rapid7", shortLabel: "Rapid7", defaultSourceSystem: "Rapid7" },
  { value: "github", label: "GitHub", shortLabel: "GitHub", defaultSourceSystem: "GitHub Advanced Security" },
  { value: "fortify", label: "Fortify", shortLabel: "Fortify", defaultSourceSystem: "Fortify" },
  { value: "manual", label: "Manual entry", shortLabel: "Manual", defaultSourceSystem: "Manual" },
  { value: "other", label: "Other", shortLabel: "Other", defaultSourceSystem: "Other" },
];

export type KevAssetType =
  | "internet-facing-server"
  | "internal-server"
  | "endpoint"
  | "cloud-resource"
  | "network-appliance"
  | "application"
  | "container"
  | "other";

export interface KevAssetTypeMeta {
  value: KevAssetType;
  label: string;
}

export const KEV_ASSET_TYPES: KevAssetTypeMeta[] = [
  { value: "internet-facing-server", label: "Internet-facing server" },
  { value: "internal-server", label: "Internal server" },
  { value: "endpoint", label: "Endpoint" },
  { value: "cloud-resource", label: "Cloud resource" },
  { value: "network-appliance", label: "Network appliance" },
  { value: "application", label: "Application" },
  { value: "container", label: "Container" },
  { value: "other", label: "Other" },
];

export type KevExposureStatus =
  | "exposed"
  | "partially-mitigated"
  | "not-externally-exposed"
  | "unknown";

export interface KevExposureStatusMeta {
  value: KevExposureStatus;
  label: string;
}

export const KEV_EXPOSURE_STATUSES: KevExposureStatusMeta[] = [
  { value: "exposed", label: "Exposed" },
  { value: "partially-mitigated", label: "Partially mitigated" },
  { value: "not-externally-exposed", label: "Not externally exposed" },
  { value: "unknown", label: "Unknown" },
];

export type KevPatchAvailability =
  | "patch-available"
  | "patch-not-available"
  | "vendor-workaround"
  | "compensating-control-only";

export interface KevPatchAvailabilityMeta {
  value: KevPatchAvailability;
  label: string;
}

export const KEV_PATCH_AVAILABILITIES: KevPatchAvailabilityMeta[] = [
  { value: "patch-available", label: "Patch available" },
  { value: "patch-not-available", label: "Patch not available" },
  { value: "vendor-workaround", label: "Vendor workaround" },
  { value: "compensating-control-only", label: "Compensating control only" },
];

export interface KevContext {
  cve: string;
  kevStatus: KevStatus;
  source: KevSource;
  affectedAsset: string;
  assetType: KevAssetType;
  exposureStatus: KevExposureStatus;
  patchAvailability: KevPatchAvailability;
  remediationOwner: string;
  businessReasonForDelay: string;
  executiveSummaryNote?: string;
  emergency?: boolean;
}

export function getKevSourceMeta(value: KevSource): KevSourceMeta {
  const meta = KEV_SOURCES.find((s) => s.value === value);
  if (!meta) throw new Error(`Unknown KEV source: ${value}`);
  return meta;
}

export function getKevStatusLabel(value: KevStatus): string {
  return KEV_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function getKevAssetTypeLabel(value: KevAssetType): string {
  return KEV_ASSET_TYPES.find((a) => a.value === value)?.label ?? value;
}

export function getKevExposureStatusLabel(value: KevExposureStatus): string {
  return KEV_EXPOSURE_STATUSES.find((e) => e.value === value)?.label ?? value;
}

export function getKevPatchAvailabilityLabel(value: KevPatchAvailability): string {
  return KEV_PATCH_AVAILABILITIES.find((p) => p.value === value)?.label ?? value;
}

export interface KevFinding {
  id: string;
  cve: string;
  source: KevSource;
  sourceSystem: string;
  title: string;
  asset: string;
  assetType: KevAssetType;
  exposureStatus: KevExposureStatus;
  patchAvailability: KevPatchAvailability;
  riskLevel: RiskLevel;
  timestamp: string;
  recommendedAction: string;
  detail: string;
  emergency?: boolean;
  kevStatus: KevStatus;
}

export const KEV_FINDINGS: KevFinding[] = [
  {
    id: "kev-find-1",
    cve: "CVE-2024-3094",
    source: "tenable",
    sourceSystem: "Tenable",
    title: "Internet-facing appliance has known exploited CVE",
    asset: "edge-gw-01.lumens.io",
    assetType: "network-appliance",
    exposureStatus: "exposed",
    patchAvailability: "patch-available",
    riskLevel: "critical",
    timestamp: "2026-05-13T08:01:00Z",
    recommendedAction: "Open KEV Exposure Review",
    detail:
      "CISA KEV-listed CVE detected on three internet-facing gateways. Patch available; maintenance window pending.",
    emergency: true,
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-2",
    cve: "CVE-2025-21010",
    source: "wiz",
    sourceSystem: "Wiz",
    title: "Server patch delayed due to production dependency",
    asset: "ledger-prod-app-02",
    assetType: "internal-server",
    exposureStatus: "partially-mitigated",
    patchAvailability: "patch-available",
    riskLevel: "high",
    timestamp: "2026-05-13T08:30:00Z",
    recommendedAction: "Decide acceptance with compensating controls",
    detail:
      "Known exploited vulnerability on a server with a coordinated production dependency; patch window blocked by month-end close.",
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-3",
    cve: "CVE-2026-11290",
    source: "wiz",
    sourceSystem: "Wiz",
    title: "Cloud workload exposed with temporary firewall mitigation",
    asset: "prod-eu-1 / api-edge",
    assetType: "cloud-resource",
    exposureStatus: "partially-mitigated",
    patchAvailability: "compensating-control-only",
    riskLevel: "critical",
    timestamp: "2026-05-13T08:45:00Z",
    recommendedAction: "Approve compensating firewall control until patch ships",
    detail:
      "Cloud workload exposure mitigated by a temporary firewall rule; vendor patch ETA two weeks.",
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-4",
    cve: "CVE-2025-44440",
    source: "rapid7",
    sourceSystem: "Rapid7",
    title: "Vendor patch unavailable; workaround required",
    asset: "vendor-mailgw",
    assetType: "network-appliance",
    exposureStatus: "exposed",
    patchAvailability: "vendor-workaround",
    riskLevel: "high",
    timestamp: "2026-05-13T09:01:00Z",
    recommendedAction: "Accept exposure with vendor workaround applied",
    detail:
      "Vendor confirms patch is not yet available; workaround documented in advisory KB-7710.",
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-5",
    cve: "CVE-2023-98010",
    source: "qualys",
    sourceSystem: "Qualys",
    title: "Legacy system requires executive risk acceptance",
    asset: "legacy-erp-001",
    assetType: "application",
    exposureStatus: "not-externally-exposed",
    patchAvailability: "patch-not-available",
    riskLevel: "high",
    timestamp: "2026-05-13T09:18:00Z",
    recommendedAction: "Route to executive owner for documented risk acceptance",
    detail:
      "Legacy ERP cannot be patched without vendor recertification; not internet-facing; risk acceptance required at executive level.",
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-6",
    cve: "CVE-2026-22120",
    source: "rapid7",
    sourceSystem: "Rapid7",
    title: "Rapid7 finding maps to known exploited vulnerability",
    asset: "ci-runner-pool-2",
    assetType: "internal-server",
    exposureStatus: "not-externally-exposed",
    patchAvailability: "patch-available",
    riskLevel: "high",
    timestamp: "2026-05-13T09:42:00Z",
    recommendedAction: "Require remediation within standard SLA",
    detail:
      "Rapid7 InsightVM finding maps to the CISA KEV catalog; patch available for CI runner pool.",
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-7",
    cve: "CVE-2024-58811",
    source: "tenable",
    sourceSystem: "Tenable",
    title: "Tenable finding requires emergency remediation",
    asset: "external-portal-prod",
    assetType: "internet-facing-server",
    exposureStatus: "exposed",
    patchAvailability: "patch-available",
    riskLevel: "critical",
    timestamp: "2026-05-13T10:00:00Z",
    recommendedAction: "Emergency escalation; remediate within 24 hours",
    detail:
      "Tenable identified an internet-facing portal exposed to an actively exploited CVE; emergency remediation required.",
    emergency: true,
    kevStatus: "known-exploited",
  },
  {
    id: "kev-find-8",
    cve: "CVE-2025-66021",
    source: "wiz",
    sourceSystem: "Wiz",
    title: "Wiz exposure needs compensating control approval",
    asset: "prod-eu-1 / data-broker",
    assetType: "cloud-resource",
    exposureStatus: "exposed",
    patchAvailability: "compensating-control-only",
    riskLevel: "critical",
    timestamp: "2026-05-13T10:18:00Z",
    recommendedAction: "Approve compensating controls and set expiration",
    detail:
      "Wiz flagged a known exploited vulnerability on a cloud data broker; compensating control is the only available mitigation today.",
    kevStatus: "known-exploited",
  },
];

export interface KevFindingMappedRecord {
  module: "kev-exposure-review";
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  owner: string;
  department: string;
  compensatingControls: string;
  evidenceSummary: string;
  businessJustification: string;
  technicalContext: string;
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  kevContext: KevContext;
}

export function mapKevFindingToRiskRecordDraft(
  finding: KevFinding,
): KevFindingMappedRecord {
  const sourceMeta = getKevSourceMeta(finding.source);
  return {
    module: "kev-exposure-review",
    title: finding.title,
    description: finding.detail,
    sourceSystem: finding.sourceSystem,
    sourceType: `kev.${finding.source.replace(/-/g, "_")}`,
    riskLevel: finding.riskLevel,
    owner: "",
    department: "Infrastructure Security",
    compensatingControls: "",
    evidenceSummary: `Source finding ${finding.id} on ${sourceMeta.label} flagged ${finding.cve} (KEV-aware).`,
    businessJustification: "",
    technicalContext: finding.detail,
    frameworkTags: ["CISA KEV", "NIST 800-53 SI-2", "NIST 800-53 RA-5"],
    sourceReferences: [
      {
        label: `Finding ${finding.id}`,
        system: sourceMeta.label,
        externalId: finding.id,
      },
      { label: finding.cve, system: "CISA KEV reference" },
    ],
    kevContext: {
      cve: finding.cve,
      kevStatus: finding.kevStatus,
      source: finding.source,
      affectedAsset: finding.asset,
      assetType: finding.assetType,
      exposureStatus: finding.exposureStatus,
      patchAvailability: finding.patchAvailability,
      remediationOwner: "",
      businessReasonForDelay: "",
      emergency: finding.emergency ?? false,
    },
  };
}

export function buildKevIntakeQuery(finding: KevFinding): string {
  const params = new URLSearchParams({
    cve: finding.cve,
    source: finding.source,
    asset: finding.asset,
    assetType: finding.assetType,
    exposureStatus: finding.exposureStatus,
    patchAvailability: finding.patchAvailability,
    riskLevel: finding.riskLevel,
    kevStatus: finding.kevStatus,
    findingId: finding.id,
    title: finding.title,
  });
  if (finding.emergency) params.set("emergency", "1");
  return params.toString();
}

const EXPOSURE_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(hour|day|week|month)s?\s*$/i;
const EXPOSURE_TO_MS: Record<string, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function parseExposureAcceptanceWindow(
  input: string | undefined | null,
): number | null {
  if (!input) return null;
  const match = input.match(EXPOSURE_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = EXPOSURE_TO_MS[unit];
  if (!ms || !Number.isFinite(value)) return null;
  return Math.round(value * ms);
}

export function computeExposureExpiration(
  base: Date,
  window: string | undefined | null,
): string | null {
  const ms = parseExposureAcceptanceWindow(window);
  if (ms == null) return null;
  return new Date(base.getTime() + ms).toISOString();
}
