import { describe, expect, it } from "vitest";
import {
  AgentCreateInput,
  AgentPatchInput,
  DecisionCreateInput,
  EvidenceExportInput,
  SpendCapsInput,
} from "@/src/lib/validation";

describe("AgentCreateInput", () => {
  it("accepts a well-formed agent payload", () => {
    const parsed = AgentCreateInput.parse({
      name: "Wire Agent",
      environment: "production",
      riskTier: "critical",
      allowedActions: ["wire", "refund"],
      spendCaps: { perDecisionCents: 5000, currency: "USD" },
    });
    expect(parsed.spendCaps.currency).toBe("USD");
    expect(parsed.allowedActions).toEqual(["wire", "refund"]);
  });

  it("rejects lowercase currency", () => {
    expect(() =>
      AgentCreateInput.parse({
        name: "Wire Agent",
        environment: "production",
        riskTier: "low",
        allowedActions: ["x"],
        spendCaps: { currency: "usd" },
      }),
    ).toThrow();
  });

  it("rejects bad characters in name", () => {
    expect(() =>
      AgentCreateInput.parse({
        name: "<script>",
        environment: "production",
        riskTier: "low",
        allowedActions: ["x"],
        spendCaps: { currency: "USD" },
      }),
    ).toThrow();
  });

  it("rejects empty allowedActions", () => {
    expect(() =>
      AgentCreateInput.parse({
        name: "valid name",
        environment: "sandbox",
        riskTier: "low",
        allowedActions: [],
        spendCaps: { currency: "USD" },
      }),
    ).toThrow();
  });

  it("rejects unknown environment", () => {
    expect(() =>
      AgentCreateInput.parse({
        name: "valid",
        environment: "prod",
        riskTier: "low",
        allowedActions: ["x"],
        spendCaps: { currency: "USD" },
      }),
    ).toThrow();
  });
});

describe("AgentPatchInput", () => {
  it("accepts a partial patch", () => {
    const parsed = AgentPatchInput.parse({ riskTier: "high" });
    expect(parsed.riskTier).toBe("high");
    expect(parsed.name).toBeUndefined();
  });
});

describe("SpendCapsInput", () => {
  it("defaults currency to USD", () => {
    const parsed = SpendCapsInput.parse({});
    expect(parsed.currency).toBe("USD");
  });
  it("rejects negative values", () => {
    expect(() => SpendCapsInput.parse({ perDayCents: -1, currency: "USD" })).toThrow();
  });
});

describe("DecisionCreateInput", () => {
  it("accepts decision with no agentId (backward compat)", () => {
    const parsed = DecisionCreateInput.parse({
      action: "wire",
      subject: "vendor:abc",
    });
    expect(parsed.policyVersion).toBe("v1");
    expect(parsed.evidencePayload).toEqual({});
  });

  it("rejects bad action characters", () => {
    expect(() =>
      DecisionCreateInput.parse({ action: "wire money!", subject: "x" }),
    ).toThrow();
  });
});

describe("EvidenceExportInput", () => {
  it("requires YYYY-MM-DD dates", () => {
    expect(() =>
      EvidenceExportInput.parse({ from: "yesterday", to: "today" }),
    ).toThrow();
  });
  it("defaults format to json", () => {
    const parsed = EvidenceExportInput.parse({ from: "2026-05-01", to: "2026-05-13" });
    expect(parsed.format).toBe("json");
  });
});
