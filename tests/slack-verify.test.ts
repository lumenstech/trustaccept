import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySlackRequest } from "@/src/server/slack/verify";

const SECRET = "test_signing_secret";

function sign(timestamp: string, body: string, secret = SECRET): string {
  return (
    "v0=" +
    createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")
  );
}

describe("verifySlackRequest", () => {
  const baseTs = 1715000000;
  const now = () => baseTs * 1000;
  const body = "payload=%7B%22type%22%3A%22block_actions%22%7D";
  const timestamp = String(baseTs);

  it("accepts a valid signature within tolerance", () => {
    const signature = sign(timestamp, body);
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature,
      timestamp,
      rawBody: body,
      now,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a stale timestamp", () => {
    const oldTs = String(baseTs - 60 * 60);
    const signature = sign(oldTs, body);
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature,
      timestamp: oldTs,
      rawBody: body,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stale_timestamp");
  });

  it("rejects when signed with the wrong secret", () => {
    const signature = sign(timestamp, body, "wrong_secret");
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature,
      timestamp,
      rawBody: body,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects when the body has been tampered with", () => {
    const signature = sign(timestamp, body);
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature,
      timestamp,
      rawBody: body + "&tamper=1",
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects when headers are missing", () => {
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature: null,
      timestamp,
      rawBody: body,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_headers");
  });

  it("rejects a malformed signature", () => {
    const result = verifySlackRequest({
      signingSecret: SECRET,
      signature: "v0=not-hex",
      timestamp,
      rawBody: body,
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });
});
