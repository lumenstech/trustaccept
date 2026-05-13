import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";

/**
 * Compact JWS (RS256) signer for decision receipts. Uses a process-local
 * RSA-2048 keypair when no key is configured via environment. In production
 * the key would be loaded from a managed secrets store; here we generate
 * on first use so receipts can be signed and verified in tests.
 */

interface SigningContext {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
}

let cached: SigningContext | null = null;

function loadFromEnv(): SigningContext | null {
  const pem = process.env.TRUSTACCEPT_JWS_PRIVATE_KEY;
  const kid = process.env.TRUSTACCEPT_JWS_KEY_ID;
  if (!pem) return null;
  const privateKey = createPrivateKey(pem);
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey, keyId: kid ?? defaultKid(publicKey) };
}

function defaultKid(publicKey: KeyObject): string {
  const der = publicKey.export({ format: "der", type: "spki" });
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

function getContext(): SigningContext {
  if (cached) return cached;
  const fromEnv = loadFromEnv();
  if (fromEnv) {
    cached = fromEnv;
    return cached;
  }
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  cached = {
    privateKey,
    publicKey,
    keyId: defaultKid(publicKey),
  };
  return cached;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/u, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function getSigningKeyId(): string {
  return getContext().keyId;
}

export interface DecisionReceiptPayload {
  iss: string;
  decision_id: string;
  tenant_id: string;
  action: string;
  decision: string;
  agent_id?: string;
  evidence_hash?: string;
  policy_version: string;
  iat: number;
}

/**
 * Sign a decision receipt as a compact JWS (RS256). Returns the
 * three-part header.payload.signature string.
 */
export function signDecisionReceipt(payload: DecisionReceiptPayload): string {
  const { privateKey, keyId } = getContext();
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: keyId,
  };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header), "utf8"));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  return `${signingInput}.${signature}`;
}

export interface VerifyResult {
  valid: boolean;
  header?: Record<string, unknown>;
  payload?: DecisionReceiptPayload;
}

/**
 * Verify a compact JWS against the active signing key. Returns
 * `{ valid: true, header, payload }` on success.
 */
export function verifyDecisionReceipt(jws: string): VerifyResult {
  const parts = jws.split(".");
  if (parts.length !== 3) return { valid: false };
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header: Record<string, unknown>;
  let payload: DecisionReceiptPayload;
  try {
    header = JSON.parse(base64urlDecode(encodedHeader).toString("utf8"));
    payload = JSON.parse(
      base64urlDecode(encodedPayload).toString("utf8"),
    ) as DecisionReceiptPayload;
  } catch {
    return { valid: false };
  }
  if (header.alg !== "RS256") return { valid: false };
  const { publicKey } = getContext();
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const signatureBuf = base64urlDecode(encodedSignature);
  const valid = verifier.verify(publicKey, signatureBuf);
  return valid ? { valid, header, payload } : { valid: false };
}

/**
 * Canonical sha256 of a JSON-serializable payload. Sorts object keys
 * so that semantically-equal payloads hash equally regardless of key
 * insertion order. Arrays preserve order.
 */
export function canonicalHash(payload: unknown): string {
  return createHash("sha256").update(canonicalStringify(payload)).digest("hex");
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`)
    .join(",")}}`;
}
