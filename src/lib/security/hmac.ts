import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

/**
 * Deterministic JSON serialization. Two callers that pass logically
 * identical payloads must produce byte-identical canonical strings, even
 * if their object keys were inserted in different orders.
 *
 * Rules:
 *  - Objects: keys sorted lexicographically, recursively.
 *  - Arrays: order preserved (arrays are ordered, ordering carries semantics).
 *  - Primitives: serialized by JSON.stringify. Numbers and strings remain
 *    distinct: 1 -> "1", "1" -> "\"1\"". Numeric-vs-string distinctness is
 *    a load-bearing property; do not coerce.
 *  - undefined values inside objects are dropped (standard JSON.stringify
 *    behaviour); undefined as the top-level value yields "undefined" which
 *    is intentional — sign() will reject it via the JSON.stringify result.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeys(source[key]);
    }
    return sorted;
  }
  return value;
}

export function signPayload(payload: unknown, secret: string): string {
  if (!secret) {
    throw new Error("signPayload: secret is required");
  }
  const canonical = canonicalize(payload);
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

/**
 * Constant-time signature verification. Accepts either a bare hex digest or
 * the "sha256=<hex>" header format. Returns false on any mismatch — never
 * throws on tampered input.
 */
export function verifyPayloadSignature(
  payload: unknown,
  signature: string,
  secret: string,
): boolean {
  if (!secret) return false;
  if (typeof signature !== "string" || signature.length === 0) return false;
  const presented = signature.startsWith(SIGNATURE_PREFIX)
    ? signature.slice(SIGNATURE_PREFIX.length)
    : signature;
  const expected = signPayload(payload, secret);
  if (presented.length !== expected.length) return false;
  let presentedBytes: Buffer;
  let expectedBytes: Buffer;
  try {
    presentedBytes = Buffer.from(presented, "hex");
    expectedBytes = Buffer.from(expected, "hex");
  } catch {
    return false;
  }
  if (presentedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(presentedBytes, expectedBytes);
}

export function formatSignatureHeader(hex: string): string {
  return `${SIGNATURE_PREFIX}${hex}`;
}
