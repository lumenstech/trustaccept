import type { DecisionRecord, SessionUser } from "@/lib/types";
import {
  listDecisionsForExport,
  serializeDecisionForExport,
} from "./decisions";
import { getSigningKeyId } from "./signing";
import { buildZip, sha256Hex } from "./zip";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export class EvidenceExportError extends Error {
  status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = "EvidenceExportError";
  }
}

export interface EvidenceExportQuery {
  from: string;
  to: string;
  format: "json" | "csv" | "zip";
  agentId?: string;
}

export function validateWindow(from: string, to: string): { fromMs: number; toMs: number } {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new EvidenceExportError("from/to must be valid ISO8601 timestamps");
  }
  if (fromMs > toMs) {
    throw new EvidenceExportError("from must be <= to");
  }
  if (toMs - fromMs > NINETY_DAYS_MS) {
    throw new EvidenceExportError("window exceeds 90-day maximum");
  }
  return { fromMs, toMs };
}

const EXPORT_HEADERS = [
  "id",
  "agent_id",
  "action",
  "decision",
  "policy_version",
  "evidence_hash",
  "signed_receipt",
  "approver_id",
  "created_at",
] as const;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const needsQuotes =
    /[",\r\n]/.test(raw) || raw.length === 0 || /^\s|\s$/.test(raw);
  return needsQuotes ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function buildDecisionsCsv(records: DecisionRecord[]): string {
  const header = EXPORT_HEADERS.join(",");
  const rows = records.map((d) => {
    const serialized = serializeDecisionForExport(d);
    return EXPORT_HEADERS.map((h) => escapeCsv(serialized[h])).join(",");
  });
  return [header, ...rows].join("\r\n") + "\r\n";
}

export function buildDecisionsJson(records: DecisionRecord[]): string {
  return JSON.stringify(records.map(serializeDecisionForExport));
}

export interface ManifestInput {
  tenantId: string;
  from: string;
  to: string;
  decisionsJson: string;
}

export function buildManifest(input: ManifestInput): {
  manifest: Record<string, unknown>;
  manifestJson: string;
} {
  const parsedCount = JSON.parse(input.decisionsJson).length as number;
  const manifest = {
    tenant_id: input.tenantId,
    generated_at: new Date().toISOString(),
    count: parsedCount,
    from: input.from,
    to: input.to,
    decisions_sha256: sha256Hex(input.decisionsJson),
    signing_key_id: getSigningKeyId(),
  };
  return { manifest, manifestJson: JSON.stringify(manifest, null, 2) };
}

const README = `TrustAccept Evidence Bundle
============================

This archive contains:

  decisions.json  — the full set of decision records for the requested
                    window and (optional) agent filter. Each record
                    contains: id, agent_id, action, decision,
                    policy_version, evidence_hash, signed_receipt,
                    approver_id, created_at.

  manifest.json   — bundle metadata. Includes the sha256 of
                    decisions.json (as exported in this archive),
                    the signing key id used to sign receipts, the
                    tenant id, generation timestamp, and the
                    requested time window.

Verifying a receipt
-------------------

Each decision in decisions.json carries a "signed_receipt" field, a
compact JWS (RS256). To verify:

  1. Fetch the public JWK for the key id in manifest.signing_key_id
     from the TrustAccept JWKS endpoint.
  2. Split the receipt on "." to get header, payload, and signature.
  3. Verify the signature with the public key over
     base64url(header) + "." + base64url(payload).

A successful verification proves the decision was emitted by
TrustAccept and has not been tampered with since.

Verifying bundle integrity
--------------------------

  sha256sum decisions.json
  jq -r .decisions_sha256 manifest.json

The two values must match.
`;

export function buildZipBundle(
  records: DecisionRecord[],
  tenantId: string,
  from: string,
  to: string,
): Buffer {
  const decisionsJson = buildDecisionsJson(records);
  const { manifestJson } = buildManifest({ tenantId, from, to, decisionsJson });
  return buildZip([
    { name: "decisions.json", data: Buffer.from(decisionsJson, "utf8") },
    { name: "manifest.json", data: Buffer.from(manifestJson, "utf8") },
    { name: "README.txt", data: Buffer.from(README, "utf8") },
  ]);
}

export function buildJsonStream(
  records: DecisionRecord[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("["));
      records.forEach((d, i) => {
        if (i > 0) controller.enqueue(encoder.encode(","));
        controller.enqueue(
          encoder.encode(JSON.stringify(serializeDecisionForExport(d))),
        );
      });
      controller.enqueue(encoder.encode("]"));
      controller.close();
    },
  });
}

export function buildCsvStream(
  records: DecisionRecord[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(EXPORT_HEADERS.join(",") + "\r\n"));
      for (const d of records) {
        const serialized = serializeDecisionForExport(d);
        controller.enqueue(
          encoder.encode(
            EXPORT_HEADERS.map((h) => escapeCsv(serialized[h])).join(",") + "\r\n",
          ),
        );
      }
      controller.close();
    },
  });
}

export function exportDecisions(
  user: SessionUser,
  query: EvidenceExportQuery,
): DecisionRecord[] {
  validateWindow(query.from, query.to);
  return listDecisionsForExport(user, {
    from: query.from,
    to: query.to,
    agentId: query.agentId,
  });
}
