import { getModule } from "@/lib/modules";
import type { RiskRecord } from "@/lib/types";

/**
 * Escape a single CSV value. Forces quoting whenever the value
 * contains a comma, quote, CR, LF, or leading/trailing whitespace.
 * Doubles embedded quotes per RFC 4180.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  const needsQuotes =
    /[",\r\n]/.test(raw) || raw.length === 0 || /^\s|\s$/.test(raw);
  const escaped = raw.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export const RISK_RECORDS_CSV_HEADERS = [
  "id",
  "module",
  "title",
  "sourceSystem",
  "sourceType",
  "riskLevel",
  "riskScore",
  "status",
  "owner",
  "department",
  "dueDate",
  "expirationDate",
  "reviewDate",
  "decision",
  "decisionBy",
  "decisionAt",
  "frameworkTags",
  "createdAt",
  "updatedAt",
] as const;

export function riskRecordToCsvRow(record: RiskRecord): string[] {
  const module = getModule(record.module);
  return [
    record.id,
    module.name,
    record.title,
    record.sourceSystem,
    record.sourceType,
    record.riskLevel,
    record.riskScore ?? "",
    record.status,
    record.owner,
    record.department,
    record.dueDate ?? "",
    record.expirationDate ?? "",
    record.reviewDate ?? "",
    record.decision ?? "",
    record.decisionBy ?? "",
    record.decisionAt ?? "",
    record.frameworkTags.join("; "),
    record.createdAt ?? "",
    record.updatedAt ?? "",
  ].map((v) => String(v ?? ""));
}

export function buildRiskRecordsCsv(records: RiskRecord[]): string {
  const headers = RISK_RECORDS_CSV_HEADERS.map(escapeCsvValue).join(",");
  const lines = records.map((r) =>
    riskRecordToCsvRow(r).map(escapeCsvValue).join(","),
  );
  return [headers, ...lines].join("\r\n") + "\r\n";
}
