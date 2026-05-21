import { describe, expect, it } from "vitest";
import { canonicalize, hashAction } from "@/src/server/action-hash";

describe("hashAction", () => {
  it("returns sha256:<64 hex chars>", () => {
    const h = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234" },
    });
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const action = {
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234", service: "checkout-api" },
    };
    expect(hashAction(action)).toBe(hashAction(action));
  });

  it("ignores object key ordering in the payload", () => {
    const a = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234", service: "checkout-api" },
    });
    const b = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { service: "checkout-api", commit: "abc1234" },
    });
    expect(a).toBe(b);
  });

  it("ignores nested object key ordering", () => {
    const a = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { meta: { region: "us-east-1", tier: "prod" } },
    });
    const b = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { meta: { tier: "prod", region: "us-east-1" } },
    });
    expect(a).toBe(b);
  });

  it("preserves array order (arrays are semantically ordered)", () => {
    const a = hashAction({
      type: "batch_run",
      summary: "Run jobs in order",
      payload: { jobs: ["a", "b", "c"] },
    });
    const b = hashAction({
      type: "batch_run",
      summary: "Run jobs in order",
      payload: { jobs: ["c", "b", "a"] },
    });
    expect(a).not.toBe(b);
  });

  it("changes when the type changes", () => {
    const base = { summary: "x x x x", payload: { k: 1 } };
    const a = hashAction({ type: "production_deploy", ...base });
    const b = hashAction({ type: "customer_data_export", ...base });
    expect(a).not.toBe(b);
  });

  it("changes when the summary changes", () => {
    const a = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234" },
    });
    const b = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.1",
      payload: { commit: "abc1234" },
    });
    expect(a).not.toBe(b);
  });

  it("changes when the payload differs", () => {
    const a = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234" },
    });
    const b = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "def5678" },
    });
    expect(a).not.toBe(b);
  });

  it("treats missing payload as equivalent to empty payload", () => {
    const a = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
    });
    const b = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: {},
    });
    expect(a).toBe(b);
  });

  it("stays under the 120-char externalId cap", () => {
    const h = hashAction({
      type: "production_deploy",
      summary: "Deploy v1.0.0",
      payload: { commit: "abc1234" },
    });
    expect(h.length).toBeLessThanOrEqual(120);
    expect(h.length).toBe(71); // "sha256:" (7) + 64 hex chars
  });
});

describe("canonicalize", () => {
  it("sorts object keys alphabetically at every depth", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ outer: { z: 1, a: 2 } })).toBe('{"outer":{"a":2,"z":1}}');
  });

  it("drops undefined values from objects", () => {
    expect(canonicalize({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("serializes primitives as JSON", () => {
    expect(canonicalize("hi")).toBe('"hi"');
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(null)).toBe("null");
  });
});
