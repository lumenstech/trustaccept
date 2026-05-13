import type { Decision, DecisionCapCheck, DecisionRecord } from "./types";

export function decisionOutcomeTone(decision: Decision): "success" | "danger" | "info" {
  if (decision === "accept") return "success";
  if (decision === "reject") return "danger";
  return "info";
}

export function decisionOutcomeLabel(decision: Decision): string {
  if (decision === "accept") return "Accepted";
  if (decision === "reject") return "Rejected";
  return "Remediate";
}

/**
 * Short, table-friendly summary of the cap-check block. Returns a
 * literal em-dash when no cap check was attached (e.g. when no amount
 * was passed on the decision). Otherwise shows the daily usage and a
 * boolean exceeded indicator.
 */
export function formatCapCheckSummary(check: DecisionCapCheck | undefined): string {
  if (!check) return "—";
  const exceeded = check.exceeded ? "exceeded" : "within";
  return `day $${check.daily_used} · ${exceeded}`;
}

export function capCheckTone(
  check: DecisionCapCheck | undefined,
): "neutral" | "success" | "danger" {
  if (!check) return "neutral";
  return check.exceeded ? "danger" : "success";
}

export interface ReceiptIndicator {
  signed: boolean;
  label: string;
  short: string;
}

/**
 * Compact receipt-presence indicator for the decisions table. The
 * "short" form is the last 8 chars of the signature segment, useful
 * for visual diffing and copy-paste auditing.
 */
export function receiptIndicator(record: DecisionRecord): ReceiptIndicator {
  if (!record.signedReceipt) {
    return { signed: false, label: "No receipt", short: "—" };
  }
  const segments = record.signedReceipt.split(".");
  const sig = segments[2] ?? "";
  const tail = sig.slice(-8) || "—";
  return { signed: true, label: "Signed (RS256)", short: tail };
}

/**
 * Short evidence-hash display: first 12 chars suffix-truncated. Empty
 * input returns the em-dash placeholder so the column width stays
 * stable across rows.
 */
export function formatEvidenceHash(hash: string | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 12)}…`;
}
