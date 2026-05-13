import { describe, expect, it } from "vitest";
import { DecisionCreateInput } from "@/src/server/decisions/validation";

const VALID = {
  source: "stripe_agent",
  action_type: "refund_customer",
  title: "Approve customer refund",
  description: "AI agent wants to refund customer $3,750.",
  risk_level: "high",
  requester: "agent@company.com",
  subject: "cus_123",
  amount: 3750,
  currency: "USD",
};

describe("DecisionCreateInput", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = DecisionCreateInput.parse({
      source: "agent",
      action_type: "act",
      title: "t",
      description: "d",
      risk_level: "low",
      requester: "r",
      subject: "s",
    });
    expect(parsed.risk_level).toBe("low");
  });

  it("accepts a full payload with optional fields", () => {
    const parsed = DecisionCreateInput.parse({
      ...VALID,
      evidence_url: "https://example.com/evidence",
      metadata: { reason: "policy" },
      slack_team_id: "T123",
      approval_channel_id: "C123",
      external_id: "ext-1",
    });
    expect(parsed.amount).toBe(3750);
    expect(parsed.metadata?.reason).toBe("policy");
  });

  it("rejects an unknown risk_level", () => {
    expect(() =>
      DecisionCreateInput.parse({ ...VALID, risk_level: "extreme" }),
    ).toThrow();
  });

  it("rejects a malformed currency", () => {
    expect(() =>
      DecisionCreateInput.parse({ ...VALID, currency: "dollars" }),
    ).toThrow();
  });

  it("rejects a non-URL evidence_url", () => {
    expect(() =>
      DecisionCreateInput.parse({ ...VALID, evidence_url: "not-a-url" }),
    ).toThrow();
  });
});
