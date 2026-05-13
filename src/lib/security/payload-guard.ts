/**
 * Tripwire payload inspection. TrustAccept is the cyber-risk decision
 * layer; it must never become a payment-data path. This module rejects
 * payloads that look like they carry card numbers, CVV / CVC codes, or
 * bank-routing / ABA numbers, so callers cannot accidentally (or
 * deliberately) stash card data inside an Agent Action Receipts request.
 *
 * The rules are intentionally narrow to keep false positives low:
 *  - Card numbers: any 13–19 digit sequence (with optional spaces/dashes)
 *    that passes the Luhn checksum, anywhere in a string value.
 *  - CVV/CVC: only triggered when the *key* matches /cvv|cvc/i and the
 *    value is a 3–4 digit string or integer. Bare 3-digit numbers are
 *    far too common to flag on their own.
 *  - Routing/ABA: only triggered when the key matches /routing|aba/i and
 *    the value is a 9-digit string or integer.
 *
 * Sensitive values are never echoed back; the thrown error carries a
 * field-path hint but no payload contents.
 */

export class PayloadGuardError extends Error {
  readonly code = "payload_unsafe" as const;
  readonly reason: PayloadGuardReason;
  readonly fieldPath: string;

  constructor(reason: PayloadGuardReason, fieldPath: string) {
    super(`payload rejected: ${reason} at ${fieldPath}`);
    this.name = "PayloadGuardError";
    this.reason = reason;
    this.fieldPath = fieldPath;
  }
}

export type PayloadGuardReason =
  | "card_number_detected"
  | "cvv_field_detected"
  | "routing_number_detected";

const CVV_KEY = /cvv|cvc/i;
const ROUTING_KEY = /routing|aba/i;
const DIGIT_RUN = /\d[\d\s-]{11,21}\d/g;

export function rejectIfUnsafe(payload: unknown): void {
  walk(payload, "$");
}

function walk(value: unknown, path: string): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, `${path}[${idx}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (CVV_KEY.test(key) && looksLikeCvv(child)) {
        throw new PayloadGuardError("cvv_field_detected", childPath);
      }
      if (ROUTING_KEY.test(key) && looksLikeRoutingNumber(child)) {
        throw new PayloadGuardError("routing_number_detected", childPath);
      }
      walk(child, childPath);
    }
    return;
  }
  if (typeof value === "string" && containsCardNumber(value)) {
    throw new PayloadGuardError("card_number_detected", path);
  }
}

function looksLikeCvv(value: unknown): boolean {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 0 && value.toString().length >= 3 && value.toString().length <= 4;
  }
  if (typeof value === "string") {
    return /^\d{3,4}$/.test(value.trim());
  }
  return false;
}

function looksLikeRoutingNumber(value: unknown): boolean {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value.toString().length === 9;
  }
  if (typeof value === "string") {
    return /^\d{9}$/.test(value.trim());
  }
  return false;
}

function containsCardNumber(value: string): boolean {
  const matches = value.match(DIGIT_RUN);
  if (!matches) return false;
  for (const candidate of matches) {
    const digits = candidate.replace(/[\s-]/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    if (luhnValid(digits)) return true;
  }
  return false;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const ch = digits.charCodeAt(i) - 48;
    if (ch < 0 || ch > 9) return false;
    let n = ch;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum > 0 && sum % 10 === 0;
}

/**
 * Returns a structurally equivalent copy of the payload with anything
 * the guard would flag replaced by the literal string "[REDACTED]".
 * Use before writing payloads to logs or audit metadata.
 */
export function sanitizeForLogging(payload: unknown): unknown {
  return sanitize(payload, false);
}

function sanitize(value: unknown, parentKeyTriggers: false | PayloadGuardReason): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, false));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      let trigger: false | PayloadGuardReason = false;
      if (CVV_KEY.test(key) && looksLikeCvv(child)) trigger = "cvv_field_detected";
      else if (ROUTING_KEY.test(key) && looksLikeRoutingNumber(child))
        trigger = "routing_number_detected";
      out[key] = sanitize(child, trigger);
    }
    return out;
  }
  if (parentKeyTriggers) return "[REDACTED]";
  if (typeof value === "string" && containsCardNumber(value)) {
    return value.replace(DIGIT_RUN, (match) => {
      const digits = match.replace(/[\s-]/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhnValid(digits)
        ? "[REDACTED]"
        : match;
    });
  }
  return value;
}
