import { createPublicKey, createSign } from "node:crypto";
import type { RiskRecord } from "@/lib/types";

/**
 * Signed receipt JWT for resolved approvals. Each receipt binds:
 *   - the approval id
 *   - the action hash (sha256 of the original action payload)
 *   - the policy id that decided (or gated) the request
 *   - the decider and decision actor type
 *
 * Generated ON DEMAND in GET /api/v1/approvals/[id] and in MCP
 * get_approval_status when the underlying record is resolved. Never
 * persisted — see src/server/receipts.md for the design rationale.
 *
 * Signing key: RS256, single key for the MVP, loaded from
 * TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM. When the env var is unset,
 * issueReceipt() returns null and the wrapper response carries
 * receipt_jwt: null. Tests provide a per-suite ephemeral key pair.
 */

export type ReceiptStatus =
  | "approved"
  | "denied"
  | "policy_allowed"
  | "policy_denied"
  | "remediation_required"
  | "expired";

export interface ReceiptClaims {
  approval_id: string;
  agent: string;
  action_hash: string | null;
  policy_id: string | null;
  status: ReceiptStatus;
  decided_by: string;
  decision_actor_type: "human" | "policy";
  decided_at: string;
  expires_at: string | null;
  tenant_id: string;
  audit_log_ref: string;
  iss: string;
  iat: number;
}

export const RECEIPT_KEY_ID = "trustaccept-receipt-rs256-1";
export const RECEIPT_ISSUER = "trustaccept";

const RESOLVED_STATUSES = new Set([
  "accepted",
  "rejected",
  "remediation_required",
  "expired",
]);

function loadPrivateKeyPem(): string | null {
  const raw = process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
  if (!raw) return null;
  // Allow callers to pass a single-line PEM with literal "\n" escapes
  // (common when threading PEMs through dotenv / docker env).
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

/**
 * Returns the public key in JWK form, with kid/alg/use set so the
 * /.well-known/jwks.json endpoint can serve it directly. Null when
 * no signing key is configured.
 */
export function loadPublicJwk(): Record<string, unknown> | null {
  const pem = loadPrivateKeyPem();
  if (!pem) return null;
  const pubKey = createPublicKey({ key: pem, format: "pem" });
  const jwk = pubKey.export({ format: "jwk" });
  return { ...jwk, kid: RECEIPT_KEY_ID, use: "sig", alg: "RS256" };
}

function findRef(record: RiskRecord, label: string): string | null {
  return record.sourceReferences.find((r) => r.label === label)?.externalId ?? null;
}

function computeReceiptStatus(
  status: string,
  actor: "human" | "policy",
): ReceiptStatus {
  if (status === "accepted") return actor === "policy" ? "policy_allowed" : "approved";
  if (status === "rejected") return actor === "policy" ? "policy_denied" : "denied";
  if (status === "remediation_required") return "remediation_required";
  return "expired";
}

export function buildReceiptClaims(record: RiskRecord): ReceiptClaims | null {
  if (!record.decisionBy || !record.decisionAt) return null;
  const actor: "human" | "policy" = record.decisionBy.startsWith("policy:")
    ? "policy"
    : "human";
  return {
    approval_id: record.id,
    agent: findRef(record, "Agent") ?? "unknown",
    action_hash: findRef(record, "Action hash"),
    policy_id: findRef(record, "Policy"),
    status: computeReceiptStatus(record.status, actor),
    decided_by: record.decisionBy,
    decision_actor_type: actor,
    decided_at: record.decisionAt,
    expires_at: record.expirationDate ?? null,
    tenant_id: record.organizationId ?? "",
    audit_log_ref: `${record.id}:${record.decisionAt}`,
    iss: RECEIPT_ISSUER,
    iat: Math.floor(Date.now() / 1000),
  };
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Issue a signed RS256 JWT for a resolved approval. Returns null when:
 *   - the record is not in a resolved status (no receipt yet)
 *   - no decision has been recorded (race window during decision write)
 *   - the signing key env var is not configured
 *
 * Callers don't need to special-case these; they just pass through the
 * null and the locked output shape carries receipt_jwt: null.
 */
export function issueReceipt(record: RiskRecord): string | null {
  if (!RESOLVED_STATUSES.has(record.status)) return null;
  const privateKeyPem = loadPrivateKeyPem();
  if (!privateKeyPem) return null;
  const claims = buildReceiptClaims(record);
  if (!claims) return null;

  const header = { alg: "RS256", typ: "JWT", kid: RECEIPT_KEY_ID };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const claimsB64 = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: privateKeyPem });
  return `${signingInput}.${base64UrlEncode(signature)}`;
}
