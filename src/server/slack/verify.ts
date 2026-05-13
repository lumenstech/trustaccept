import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifySlackRequestInput {
  signingSecret: string;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  rawBody: string;
  now?: () => number;
  toleranceSeconds?: number;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing_headers" | "stale_timestamp" | "bad_signature" };

const DEFAULT_TOLERANCE_SECONDS = 60 * 5;

/**
 * Verifies a Slack request signature per
 * https://api.slack.com/authentication/verifying-requests-from-slack.
 *
 * Fails closed on any unexpected error. Callers should treat any non-ok
 * result as an authentication failure and respond with HTTP 401.
 */
export function verifySlackRequest(input: VerifySlackRequestInput): VerifyResult {
  const { signingSecret, signature, timestamp, rawBody } = input;
  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = input.now ? input.now() : Date.now();

  if (!signature || !timestamp) return { ok: false, reason: "missing_headers" };
  if (!/^v0=[a-f0-9]{64}$/i.test(signature)) {
    return { ok: false, reason: "bad_signature" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "stale_timestamp" };
  const nowSeconds = Math.floor(now / 1000);
  if (Math.abs(nowSeconds - ts) > tolerance) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + createHmac("sha256", signingSecret).update(base).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    if (!timingSafeEqual(expectedBuf, providedBuf)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
