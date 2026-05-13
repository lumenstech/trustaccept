import { describe, expect, it } from "vitest";

import {
  canonicalize,
  formatSignatureHeader,
  signPayload,
  verifyPayloadSignature,
} from "@/src/lib/security/hmac";

const SECRET = "whsec_test_aaaaaaaaaaaaaaaaaaaaaaaa";

describe("canonicalize", () => {
  it("is deterministic across key insertion order", () => {
    const a = canonicalize({ b: 1, a: 2 });
    const b = canonicalize({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("sorts nested object keys recursively", () => {
    const a = canonicalize({ outer: { z: 1, a: 2 }, list: [1, 2] });
    const b = canonicalize({ list: [1, 2], outer: { a: 2, z: 1 } });
    expect(a).toBe(b);
  });

  it("preserves array order (arrays carry semantic order)", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalize([3, 1, 2])).not.toBe(canonicalize([1, 2, 3]));
  });

  it("keeps numeric and string values distinct", () => {
    const numeric = canonicalize({ amount: 1 });
    const stringy = canonicalize({ amount: "1" });
    expect(numeric).not.toBe(stringy);
    expect(numeric).toContain('"amount":1');
    expect(stringy).toContain('"amount":"1"');
  });

  it("preserves null distinctly from omission", () => {
    expect(canonicalize({ x: null })).toBe('{"x":null}');
    expect(canonicalize({})).toBe("{}");
  });

  it("handles deeply nested mixed structures deterministically", () => {
    const sample = {
      decision: "manual_review",
      record: {
        title: "Wire transfer",
        score: 78,
        signals: ["new_device", "impossible_travel"],
      },
      metadata: { source: "api", trace: { span: 42, parent: null } },
    };
    const shuffled = {
      metadata: { trace: { parent: null, span: 42 }, source: "api" },
      record: {
        signals: ["new_device", "impossible_travel"],
        score: 78,
        title: "Wire transfer",
      },
      decision: "manual_review",
    };
    expect(canonicalize(sample)).toBe(canonicalize(shuffled));
  });
});

describe("signPayload + verifyPayloadSignature", () => {
  it("round-trips a signed payload", () => {
    const payload = { event: "decision.accepted", id: "ra-1" };
    const sig = signPayload(payload, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyPayloadSignature(payload, sig, SECRET)).toBe(true);
  });

  it("accepts the sha256= prefixed header form", () => {
    const payload = { event: "decision.accepted" };
    const sig = signPayload(payload, SECRET);
    expect(verifyPayloadSignature(payload, formatSignatureHeader(sig), SECRET)).toBe(true);
  });

  it("produces the same signature regardless of key insertion order", () => {
    const a = signPayload({ b: 1, a: 2 }, SECRET);
    const b = signPayload({ a: 2, b: 1 }, SECRET);
    expect(a).toBe(b);
  });

  it("rejects tampered payload", () => {
    const payload = { event: "decision.accepted", id: "ra-1" };
    const sig = signPayload(payload, SECRET);
    const tampered = { event: "decision.accepted", id: "ra-2" };
    expect(verifyPayloadSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects when the secret differs", () => {
    const payload = { event: "decision.accepted" };
    const sig = signPayload(payload, SECRET);
    expect(verifyPayloadSignature(payload, sig, "different-secret")).toBe(false);
  });

  it("rejects an empty or malformed signature without throwing", () => {
    const payload = { event: "decision.accepted" };
    expect(verifyPayloadSignature(payload, "", SECRET)).toBe(false);
    expect(verifyPayloadSignature(payload, "not-hex-data!!", SECRET)).toBe(false);
  });

  it("rejects when secret is empty", () => {
    const payload = { event: "decision.accepted" };
    const sig = signPayload(payload, SECRET);
    expect(verifyPayloadSignature(payload, sig, "")).toBe(false);
  });

  it("treats numeric-vs-string field substitutions as tampering", () => {
    const numeric = { amount: 1000 };
    const stringy = { amount: "1000" };
    const sig = signPayload(numeric, SECRET);
    expect(verifyPayloadSignature(stringy, sig, SECRET)).toBe(false);
  });
});
