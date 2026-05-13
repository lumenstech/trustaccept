import { createHmac, timingSafeEqual } from "node:crypto";

const REPLAY_WINDOW_SECONDS = 5 * 60;
const SLACK_SIGNATURE_VERSION = "v0";

/**
 * Verify the signature on a Slack request. The body argument MUST be the
 * raw request body string exactly as Slack sent it — do NOT pass through
 * req.json() and JSON.stringify() first, because that re-serialization
 * collapses whitespace and the HMAC is computed over the raw bytes.
 *
 * Returns false on any mismatch, malformed input, missing header, or
 * stale timestamp. Never throws.
 */
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string,
  options: { nowSeconds?: () => number } = {},
): boolean {
  if (typeof body !== "string") return false;
  if (typeof timestamp !== "string" || timestamp.length === 0) return false;
  if (typeof signature !== "string" || !signature.startsWith(`${SLACK_SIGNATURE_VERSION}=`)) {
    return false;
  }
  if (typeof signingSecret !== "string" || signingSecret.length === 0) return false;

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;

  const now = options.nowSeconds ? options.nowSeconds() : Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > REPLAY_WINDOW_SECONDS) return false;

  const base = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${body}`;
  const expected = `${SLACK_SIGNATURE_VERSION}=${createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex")}`;

  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
