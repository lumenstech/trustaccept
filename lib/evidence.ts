import { getAccessRequestMeta, getIdentityProviderMeta } from "./access";
import {
  getKevAssetTypeLabel,
  getKevExposureStatusLabel,
  getKevPatchAvailabilityLabel,
  getKevSourceMeta,
  getKevStatusLabel,
} from "./kev";
import { getModule } from "./modules";
import type { RiskRecord } from "./types";
import { getVulnerabilitySourceMeta } from "./vulnerability";

export interface AccessPacketFields {
  requestType: string;
  requester: string;
  identityProvider: string;
  userOrServiceAccount: string;
  targetSystem: string;
  privilegeLevel: string;
  requestedDuration: string;
  approvalOwner: string;
}

export interface VulnerabilityPacketFields {
  scannerSource: string;
  findingId: string;
  severity: string;
  affectedAsset: string;
  repositoryOrApplication: string;
  cve: string;
  cwe: string;
  businessImpact: string;
  technicalImpact: string;
  remediationPlan: string;
  requestedDecision: string;
  releaseBlocking: boolean;
}

export interface KevPacketFields {
  cve: string;
  kevStatus: string;
  source: string;
  affectedAsset: string;
  assetType: string;
  exposureStatus: string;
  patchAvailability: string;
  remediationOwner: string;
  businessReasonForDelay: string;
  executiveSummaryNote: string;
  emergency: boolean;
}

export interface EvidencePacketSummary {
  decisionId: string;
  module: string;
  riskLevel: string;
  sourceSystem: string;
  owner: string;
  outcome: string;
  expirationDate: string;
  reviewDate: string;
  frameworkTags: string[];
  executiveSummary: string;
  accessFields?: AccessPacketFields;
  vulnerabilityFields?: VulnerabilityPacketFields;
  kevFields?: KevPacketFields;
}

function decisionOutcomeLabel(record: RiskRecord): string {
  if (!record.decision) {
    return `Pending decision (status: ${record.status}).`;
  }
  switch (record.decision) {
    case "accept":
      return "Risk accepted with compensating controls and expiration on file.";
    case "reject":
      return "Risk rejected. Underlying action is not approved to proceed.";
    case "remediate":
      return "Remediation required. Decision is parked until conditions are met.";
  }
}

export function summarizeRecordForEvidence(record: RiskRecord): EvidencePacketSummary {
  const module = getModule(record.module);
  const summary: EvidencePacketSummary = {
    decisionId: record.id,
    module: module.name,
    riskLevel: record.riskLevel.toUpperCase(),
    sourceSystem: record.sourceSystem,
    owner: record.owner,
    outcome: decisionOutcomeLabel(record),
    expirationDate: record.expirationDate ?? record.dueDate ?? "Not set",
    reviewDate: record.reviewDate ?? "Not set",
    frameworkTags: record.frameworkTags,
    executiveSummary: buildExecutiveSummary(record),
  };

  if (record.module === "access-accept" && record.accessContext) {
    const ctx = record.accessContext;
    summary.accessFields = {
      requestType: getAccessRequestMeta(ctx.requestType).label,
      requester: ctx.requester,
      identityProvider: getIdentityProviderMeta(ctx.identityProvider).label,
      userOrServiceAccount: ctx.userOrServiceAccount,
      targetSystem: ctx.targetSystem,
      privilegeLevel: ctx.privilegeLevel,
      requestedDuration: ctx.requestedDuration ?? "Not specified",
      approvalOwner: ctx.approvalOwner ?? record.owner,
    };
  }

  if (record.module === "vulnerability-accept" && record.vulnerabilityContext) {
    const ctx = record.vulnerabilityContext;
    summary.vulnerabilityFields = {
      scannerSource: getVulnerabilitySourceMeta(ctx.source).label,
      findingId: ctx.findingId,
      severity: ctx.severity.toUpperCase(),
      affectedAsset: ctx.affectedAsset,
      repositoryOrApplication: ctx.repositoryOrApplication,
      cve: ctx.cve ?? "—",
      cwe: ctx.cwe ?? "—",
      businessImpact: ctx.businessImpact,
      technicalImpact: ctx.technicalImpact,
      remediationPlan: ctx.remediationPlan,
      requestedDecision: ctx.requestedDecision,
      releaseBlocking: ctx.releaseBlocking ?? false,
    };
  }

  if (record.module === "kev-exposure-review" && record.kevContext) {
    const ctx = record.kevContext;
    summary.kevFields = {
      cve: ctx.cve,
      kevStatus: getKevStatusLabel(ctx.kevStatus),
      source: getKevSourceMeta(ctx.source).label,
      affectedAsset: ctx.affectedAsset,
      assetType: getKevAssetTypeLabel(ctx.assetType),
      exposureStatus: getKevExposureStatusLabel(ctx.exposureStatus),
      patchAvailability: getKevPatchAvailabilityLabel(ctx.patchAvailability),
      remediationOwner: ctx.remediationOwner,
      businessReasonForDelay: ctx.businessReasonForDelay,
      executiveSummaryNote: ctx.executiveSummaryNote ?? "",
      emergency: ctx.emergency ?? false,
    };
  }

  return summary;
}

export function buildExecutiveSummary(record: RiskRecord): string {
  if (record.module === "access-accept" && record.accessContext) {
    return buildAccessExecutiveSummary(record);
  }
  if (record.module === "vulnerability-accept" && record.vulnerabilityContext) {
    return buildVulnerabilityExecutiveSummary(record);
  }
  if (record.module === "kev-exposure-review" && record.kevContext) {
    return buildKevExecutiveSummary(record);
  }

  const module = getModule(record.module);
  const lifecycle = record.decision
    ? `Decision recorded: ${record.decision}.`
    : "Decision pending.";
  const expires = record.expirationDate
    ? ` Expiration set for ${record.expirationDate}.`
    : "";
  const review = record.reviewDate ? ` Review scheduled ${record.reviewDate}.` : "";

  return [
    `${module.name} record ${record.id} — ${record.title}.`,
    `Risk level ${record.riskLevel.toUpperCase()} originated from ${record.sourceSystem} (${record.sourceType}).`,
    `Owner ${record.owner} (${record.department}).`,
    lifecycle + expires + review,
    "This record is NIST-aligned, CISA KEV-aware, and designed to support audit evidence.",
  ].join(" ");
}

export function buildAccessExecutiveSummary(record: RiskRecord): string {
  const ctx = record.accessContext;
  if (!ctx) {
    return buildExecutiveSummary({ ...record, module: "access-accept" });
  }

  const requestLabel = getAccessRequestMeta(ctx.requestType).label;
  const providerLabel = getIdentityProviderMeta(ctx.identityProvider).label;
  const expires = record.expirationDate
    ? ` Expiration set for ${record.expirationDate}.`
    : "";
  const review = record.reviewDate ? ` Review scheduled ${record.reviewDate}.` : "";
  const lifecycle = record.decision
    ? `Decision recorded: ${record.decision}.`
    : "Decision pending.";
  const duration = ctx.requestedDuration ? ` Requested duration ${ctx.requestedDuration}.` : "";

  return [
    `This Access Accept record documents a high-risk identity or access decision, including requester, target system, requested privilege, expiration, compensating controls, and review timeline.`,
    `Record ${record.id} — ${requestLabel} for ${ctx.requester} via ${providerLabel}.`,
    `Target ${ctx.targetSystem} at privilege level ${ctx.privilegeLevel}.${duration}`,
    `Owner ${record.owner} (${record.department}).`,
    lifecycle + expires + review,
    "This record is NIST-aligned, CISA KEV-aware, and designed to support audit evidence.",
  ].join(" ");
}

export function buildVulnerabilityExecutiveSummary(record: RiskRecord): string {
  const ctx = record.vulnerabilityContext;
  if (!ctx) {
    return buildExecutiveSummary({ ...record, module: "vulnerability-accept" });
  }

  const sourceLabel = getVulnerabilitySourceMeta(ctx.source).label;
  const expires = record.expirationDate
    ? ` Expiration set for ${record.expirationDate}.`
    : "";
  const review = record.reviewDate ? ` Review scheduled ${record.reviewDate}.` : "";
  const lifecycle = record.decision
    ? `Decision recorded: ${record.decision}.`
    : "Decision pending.";
  const cveOrCwe = ctx.cve
    ? ` CVE ${ctx.cve}.`
    : ctx.cwe
      ? ` CWE ${ctx.cwe}.`
      : "";
  const blocking = ctx.releaseBlocking ? " Release-blocking." : "";

  return [
    `This Vulnerability Accept record documents the disposition of a scanner or assessment finding, including severity, affected asset, owner, compensating controls, expiration date, and remediation timeline.`,
    `Record ${record.id} — ${sourceLabel} finding ${ctx.findingId} (severity ${ctx.severity.toUpperCase()}) on ${ctx.affectedAsset} in ${ctx.repositoryOrApplication}.${cveOrCwe}${blocking}`,
    `Owner ${record.owner} (${record.department}).`,
    lifecycle + expires + review,
    "This record is NIST-aligned, CISA KEV-aware, and designed to support audit evidence.",
  ].join(" ");
}

export function buildKevExecutiveSummary(record: RiskRecord): string {
  const ctx = record.kevContext;
  if (!ctx) {
    return buildExecutiveSummary({ ...record, module: "kev-exposure-review" });
  }
  const sourceLabel = getKevSourceMeta(ctx.source).label;
  const expires = record.expirationDate
    ? ` Expiration set for ${record.expirationDate}.`
    : "";
  const review = record.reviewDate ? ` Review scheduled ${record.reviewDate}.` : "";
  const lifecycle = record.decision
    ? `Decision recorded: ${record.decision}.`
    : "Decision pending.";
  const emergency = ctx.emergency ? " Emergency exposure." : "";
  const owner = ctx.remediationOwner ? ` Remediation owner ${ctx.remediationOwner}.` : "";

  return [
    `This KEV Exposure Review record documents a CISA KEV-aware exposure decision, including affected asset, exposure status, patch availability, remediation owner, compensating controls, expiration date, and review timeline.`,
    `Record ${record.id} — ${ctx.cve} (${getKevStatusLabel(ctx.kevStatus)}) flagged by ${sourceLabel} on ${ctx.affectedAsset} (${getKevAssetTypeLabel(ctx.assetType)}).`,
    `Exposure status ${getKevExposureStatusLabel(ctx.exposureStatus)}; patch availability ${getKevPatchAvailabilityLabel(ctx.patchAvailability)}.${emergency}${owner}`,
    `Owner of record ${record.owner} (${record.department}).`,
    lifecycle + expires + review,
    "This record is CISA KEV-aware, NIST-aligned, framework-informed, and designed to support audit evidence.",
  ].join(" ");
}
