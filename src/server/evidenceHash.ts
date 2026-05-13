import { createHash } from "node:crypto";

/**
 * Canonical JSON serialization (a deliberately small subset of
 * RFC 8785 JCS that's sufficient for evidence hashing):
 *  - Object keys sorted lexicographically
 *  - No insignificant whitespace
 *  - JSON.stringify-compatible primitives (string, number, bool, null)
 *  - undefined values dropped, like JSON.stringify
 *  - Functions/symbols rejected (would silently disappear otherwise)
 *
 * The output is a stable byte sequence for any equivalent input,
 * which is what `evidenceSha256` needs in order to make decisions
 * tamper-evident across re-serialization.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) {
    throw new Error("canonicalize: undefined is not representable");
  }
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalize: non-finite numbers are not allowed");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(`canonicalize: unsupported value type ${typeof value}`);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const body = keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
      .join(",");
    return "{" + body + "}";
  }

  throw new Error(`canonicalize: unsupported value type ${typeof value}`);
}

export function evidenceSha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}
