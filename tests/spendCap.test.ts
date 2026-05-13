import { beforeEach, describe, expect, it } from "vitest";
import { evaluateCapCheck } from "@/src/server/spendCap";
import type { Agent } from "@/lib/agents";
import { __resetStoreForTests, getStore } from "@/src/server/store";
import type { DecisionEvent } from "@/lib/decisions";

beforeEach(() => {
  __resetStoreForTests();
});

function fakeAgent(partial: Partial<Agent> = {}): Agent {
  return {
    id: "agt-test",
    tenantId: "demo-org",
    name: "Test Agent",
    environment: "production",
    riskTier: "high",
    status: "active",
    allowedActions: ["wire"],
    spendCaps: { currency: "USD" },
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
    ...partial,
  };
}

function pushDecision(over: Partial<DecisionEvent>): void {
  const base: DecisionEvent = {
    id: `dec-${getStore().agentDecisions.length + 1}`,
    tenantId: "demo-org",
    agentId: "agt-test",
    action: "wire",
    subject: "vendor",
    amountCents: 0,
    currency: "USD",
    decisionStatus: "allowed",
    policyVersion: "v1",
    evidencePayload: {},
    evidenceSha256: "x",
    receiptJws: "x",
    capCheck: { ok: true, evaluatedAt: "2026-01-01T00:00:00Z" },
    createdAt: "2026-05-13T00:00:00Z",
  };
  getStore().agentDecisions.push({ ...base, ...over });
}

describe("evaluateCapCheck", () => {
  it("passes when no caps are set", () => {
    const result = evaluateCapCheck({ agent: fakeAgent(), amountCents: 1_000_000 });
    expect(result.ok).toBe(true);
  });

  it("blocks per-decision cap when amount exceeds limit", () => {
    const result = evaluateCapCheck({
      agent: fakeAgent({ spendCaps: { perDecisionCents: 500, currency: "USD" } }),
      amountCents: 600,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("per_decision_cap_exceeded");
    expect(result.perDecision?.ok).toBe(false);
  });

  it("sums prior decisions in the day window", () => {
    const now = new Date("2026-05-13T12:00:00Z");
    pushDecision({
      amountCents: 400,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    });
    pushDecision({
      amountCents: 400,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    });
    const result = evaluateCapCheck({
      agent: fakeAgent({ spendCaps: { perDayCents: 1000, currency: "USD" } }),
      amountCents: 300,
      now,
    });
    expect(result.perDay?.observedCents).toBe(1100);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("per_day_cap_exceeded");
  });

  it("ignores blocked decisions when summing", () => {
    pushDecision({ amountCents: 999, decisionStatus: "blocked" });
    const result = evaluateCapCheck({
      agent: fakeAgent({ spendCaps: { perDayCents: 100, currency: "USD" } }),
      amountCents: 50,
    });
    expect(result.ok).toBe(true);
  });

  it("isolates by tenant", () => {
    pushDecision({ tenantId: "other-org", amountCents: 5000 });
    const result = evaluateCapCheck({
      agent: fakeAgent({ spendCaps: { perDayCents: 1000, currency: "USD" } }),
      amountCents: 100,
    });
    expect(result.ok).toBe(true);
  });
});
