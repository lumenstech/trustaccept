import { createHash } from "node:crypto";

/**
 * Deterministic SHA-256 of an agent action. Hashing the FULL action
 * object (type, summary, payload) means any change — different action
 * type, different summary, different payload — produces a different
 * hash and invalidates any receipt bound to the original action.
 *
 * The hash uses a canonical JSON serialization (sorted keys at every
 * depth, arrays preserved in order, undefined keys dropped). Equivalent
 * payloads with reordered keys produce the same hash.
 *
 * Format: `sha256:<64 hex chars>` (71 chars total, well within the
 * 120-char externalId cap documented in FIELD_MAPPING.md).
 */

export interface HashableAction {
  type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

export function hashAction(action: HashableAction): string {
  const normalized = {
    type: action.type,
    summary: action.summary,
    payload: action.payload ?? {},
  };
  const json = canonicalize(normalized);
  const digest = createHash("sha256").update(json, "utf8").digest("hex");
  return `sha256:${digest}`;
}

/**
 * Canonical JSON: sorts object keys at every depth, preserves array
 * order, drops undefined values (mirroring JSON.stringify's behavior).
 * Exported for tests and for callers that need to recompute a hash
 * deterministically.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") +
    "}"
  );
}
