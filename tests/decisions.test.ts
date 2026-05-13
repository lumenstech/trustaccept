import { beforeEach, describe, expect, it } from "vitest";
import {
  createDecisionRequest,
  getDecisionRequest,
  listDecisionAuditEvents,
  recordSlackDecision,
} from "@/src/server/decisions/service";
import { __resetStoreForTests } from "@/src/server/store";

beforeEach(() => {
  __resetStoreForTests();
});

const VALID = {
  source: "AI Agent",
  actionType: "refund_customer",
  title: "Approve refund",
  description: "Refund for $3,750 exceeds policy threshold.",
  riskLevel: "high" as const,
  requester: "ai-agent@trustaccept.com",
  subject: "Customer cus_demo_123",
  amount: 3750,
  currency: "USD",
};

describe("createDecisionRequest", () => {
  it("creates a pending decision and writes a decision.created audit event", () => {
    const decision = createDecisionRequest(VALID);
    expect(decision.id).toMatch(/^td-/);
    expect(decision.status).toBe("pending");
    expect(decision.amount).toBe(3750);
    expect(decision.currency).toBe("USD");
    const events = listDecisionAuditEvents(decision.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("decision.created");
    expect(events[0]?.actorType).toBe("api");
  });
});

describe("recordSlackDecision", () => {
  it("transitions a pending decision to approved", () => {
    const decision = createDecisionRequest(VALID);
    const result = recordSlackDecision({
      decisionId: decision.id,
      action: "approve",
      slackUserId: "U123",
      slackUserName: "alex",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.decision.status).toBe("approved");
    expect(result.decision.decidedBySlackUserId).toBe("U123");
    expect(result.decision.decidedByName).toBe("alex");
    expect(result.decision.decidedAt).toBeTruthy();
    const events = listDecisionAuditEvents(decision.id);
    expect(events.map((e) => e.eventType)).toEqual([
      "decision.created",
      "decision.approved",
    ]);
  });

  it("transitions a pending decision to rejected with reason", () => {
    const decision = createDecisionRequest(VALID);
    const result = recordSlackDecision({
      decisionId: decision.id,
      action: "reject",
      slackUserId: "U999",
      slackUserName: "priya",
      reason: "Not enough evidence",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.decision.status).toBe("rejected");
    expect(result.decision.decisionReason).toBe("Not enough evidence");
    const events = listDecisionAuditEvents(decision.id);
    expect(events.at(-1)?.eventType).toBe("decision.rejected");
  });

  it("returns not_found when the decision does not exist", () => {
    const result = recordSlackDecision({
      decisionId: "missing",
      action: "approve",
      slackUserId: "U123",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("not_found");
  });

  it("prevents double approval and does not mutate the decision", () => {
    const decision = createDecisionRequest(VALID);
    const first = recordSlackDecision({
      decisionId: decision.id,
      action: "approve",
      slackUserId: "U1",
      slackUserName: "alex",
    });
    expect(first.ok).toBe(true);

    const second = recordSlackDecision({
      decisionId: decision.id,
      action: "reject",
      slackUserId: "U2",
      slackUserName: "priya",
    });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("expected failure");
    expect(second.reason).toBe("already_final");
    expect(second.decision?.status).toBe("approved");

    const stored = getDecisionRequest(decision.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.decidedBySlackUserId).toBe("U1");

    // Only one terminal audit event should exist.
    const events = listDecisionAuditEvents(decision.id);
    const terminal = events.filter(
      (e) =>
        e.eventType === "decision.approved" || e.eventType === "decision.rejected",
    );
    expect(terminal).toHaveLength(1);
  });

  it("records an escalation without changing status", () => {
    const decision = createDecisionRequest(VALID);
    const result = recordSlackDecision({
      decisionId: decision.id,
      action: "escalate",
      slackUserId: "U7",
      slackUserName: "riley",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.decision.status).toBe("pending");
    const events = listDecisionAuditEvents(decision.id);
    expect(events.at(-1)?.eventType).toBe("decision.escalated");
  });
});
