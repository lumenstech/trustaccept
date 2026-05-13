import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifySlackSignature } from "@/src/lib/security/slack-signature";

const SIGNING_SECRET = "slack_signing_secret_test";

function buildValid(body: string, atSeconds: number): { signature: string; timestamp: string } {
  const timestamp = String(atSeconds);
  const base = `v0:${timestamp}:${body}`;
  const signature = `v0=${createHmac("sha256", SIGNING_SECRET).update(base).digest("hex")}`;
  return { signature, timestamp };
}

describe("verifySlackSignature", () => {
  const now = 1_700_000_000;
  const nowFn = () => now;

  it("accepts a freshly signed request with a current timestamp", () => {
    const body = "payload=%7B%22type%22%3A%22block_actions%22%7D";
    const { signature, timestamp } = buildValid(body, now);
    expect(verifySlackSignature(body, timestamp, signature, SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      true,
    );
  });

  it("rejects a timestamp older than the 5-minute replay window", () => {
    const body = "payload=test";
    const { signature, timestamp } = buildValid(body, now - 6 * 60);
    expect(verifySlackSignature(body, timestamp, signature, SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      false,
    );
  });

  it("rejects a timestamp from far in the future (clock skew abuse)", () => {
    const body = "payload=test";
    const { signature, timestamp } = buildValid(body, now + 10 * 60);
    expect(verifySlackSignature(body, timestamp, signature, SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      false,
    );
  });

  it("rejects a tampered body", () => {
    const body = "payload=original";
    const { signature, timestamp } = buildValid(body, now);
    expect(
      verifySlackSignature("payload=tampered", timestamp, signature, SIGNING_SECRET, {
        nowSeconds: nowFn,
      }),
    ).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const body = "payload=test";
    const { signature, timestamp } = buildValid(body, now);
    // flip the last character
    const flipped =
      signature.slice(0, -1) + (signature.slice(-1) === "a" ? "b" : "a");
    expect(
      verifySlackSignature(body, timestamp, flipped, SIGNING_SECRET, { nowSeconds: nowFn }),
    ).toBe(false);
  });

  it("rejects when the signing secret differs", () => {
    const body = "payload=test";
    const { signature, timestamp } = buildValid(body, now);
    expect(
      verifySlackSignature(body, timestamp, signature, "wrong-secret", { nowSeconds: nowFn }),
    ).toBe(false);
  });

  it("rejects malformed inputs without throwing", () => {
    expect(
      verifySlackSignature("body", "not-a-number", "v0=deadbeef", SIGNING_SECRET, {
        nowSeconds: nowFn,
      }),
    ).toBe(false);
    expect(verifySlackSignature("body", "", "v0=deadbeef", SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      false,
    );
    expect(verifySlackSignature("body", String(now), "", SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      false,
    );
    expect(
      verifySlackSignature("body", String(now), "v1=deadbeef", SIGNING_SECRET, { nowSeconds: nowFn }),
    ).toBe(false);
    expect(verifySlackSignature("body", String(now), "v0=deadbeef", "", { nowSeconds: nowFn })).toBe(
      false,
    );
  });

  it("verifies bodies with mixed whitespace exactly as-sent (raw bytes, no reparse)", () => {
    const body = "payload={\n  \"x\": 1\n}";
    const { signature, timestamp } = buildValid(body, now);
    expect(verifySlackSignature(body, timestamp, signature, SIGNING_SECRET, { nowSeconds: nowFn })).toBe(
      true,
    );
    // A reparse-then-restringify shifts the whitespace; verification must fail.
    const reparsed = JSON.stringify(JSON.parse(body.replace(/^payload=/, "")));
    expect(
      verifySlackSignature(`payload=${reparsed}`, timestamp, signature, SIGNING_SECRET, {
        nowSeconds: nowFn,
      }),
    ).toBe(false);
  });
});
