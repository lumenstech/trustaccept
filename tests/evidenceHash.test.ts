import { describe, expect, it } from "vitest";
import { canonicalize, evidenceSha256 } from "@/src/server/evidenceHash";

describe("canonicalize", () => {
  it("is stable across key order", () => {
    const a = canonicalize({ b: 1, a: 2 });
    const b = canonicalize({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1}');
  });

  it("recursively sorts nested objects", () => {
    const out = canonicalize({ z: { y: 1, x: 2 }, a: [3, 1, 2] });
    expect(out).toBe('{"a":[3,1,2],"z":{"x":2,"y":1}}');
  });

  it("drops undefined object values", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalize({ x: Number.NaN })).toThrow();
    expect(() => canonicalize({ x: Number.POSITIVE_INFINITY })).toThrow();
  });

  it("rejects functions and symbols", () => {
    expect(() => canonicalize({ x: () => 1 })).toThrow();
    expect(() => canonicalize({ x: Symbol("y") })).toThrow();
  });
});

describe("evidenceSha256", () => {
  it("returns the same hex digest for equivalent inputs", () => {
    const h1 = evidenceSha256({ a: 1, b: [2, { c: 3, d: 4 }] });
    const h2 = evidenceSha256({ b: [2, { d: 4, c: 3 }], a: 1 });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any field changes (tamper detection)", () => {
    const base = { id: "dec-1", action: "wire", amount: 1000 };
    const before = evidenceSha256(base);
    const tampered = evidenceSha256({ ...base, amount: 1001 });
    expect(before).not.toBe(tampered);
  });
});
