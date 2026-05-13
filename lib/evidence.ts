import { getModule } from "./modules";
import type { RiskRecord } from "./types";

export interface EvidencePacketSummary {
  decisionId: string;
  module: string;
  riskLevel: string;
  sourceSystem: string;
  owner: string;
  outcome: string;
  expirationDate: string;
  frameworkTags: string[];
  executiveSummary: string;
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
  return {
    decisionId: record.id,
    module: module.name,
    riskLevel: record.riskLevel.toUpperCase(),
    sourceSystem: record.sourceSystem,
    owner: record.owner,
    outcome: decisionOutcomeLabel(record),
    expirationDate: record.expirationDate ?? record.dueDate ?? "Not set",
    frameworkTags: record.frameworkTags,
    executiveSummary: buildExecutiveSummary(record),
  };
}

export function buildExecutiveSummary(record: RiskRecord): string {
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
