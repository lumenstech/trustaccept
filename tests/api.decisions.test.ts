import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listDecisions, POST as createDecision } from "@/app/api/v1/decisions/route";
import { POST as createAgent } from "@/app/api/v1/agents/route";
import { POST as pauseAgent } from "@/app/api/v1/agents/[id]/pause/route";
import { __resetStoreForTests } from "@/src/server/store";
import { verifyCompactJws } from "@/src/server/receipts";

beforeEach(() => {
  __resetStoreForTests();
});

interface JsonInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

function jsonRequest(url: string, init: JsonInit = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: init.method,
    body: init.body,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

async function createSupportAgent(spendPerDecisionCents = 100_000) {
  const res = await createAgent(
    jsonRequest("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify({
        name: "Support Refund Agent",
        environment: "production",
        riskTier: "high",
        allowedActions: ["refund.issue"],
        spendCaps: { perDecisionCents: spendPerDecisionCents, currency: "USD" },
      }),
    }),
  );
  return (await res.json()).agent;
}

describe("POST /api/v1/decisions", () => {
  it("creates an agent-attributable decision with signed receipt", async () => {
    const agent = await createSupportAgent();
    const res = await createDecision(
      jsonRequest("/api/v1/decisions", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          action: "refund.issue",
          subject: "order:ord-42",
          amountCents: 7500,
          currency: "USD",
          evidencePayload: {
            customer_id: "cus-1",
            refund_amount: 75,
            reason: "duplicate charge",
            order_id: "ord-42",
            requested_by_agent: agent.name,
            risk_level: "low",
          },
        }),
      }),
    );
    expect(res.status).toBe(201);
    const { decision } = await res.json();
    expect(decision.agentId).toBe(agent.id);
    expect(decision.decisionStatus).toBe("allowed");
    expect(decision.capCheck.ok).toBe(true);
    expect(decision.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.receiptJws.split(".")).toHaveLength(3);

    const verified = verifyCompactJws(decision.receiptJws);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.sha).toBe(decision.evidenceSha256);
    expect(verified.payload?.agt).toBe(agent.id);
  });

  it("returns pending_review when amount exceeds per-decision cap", async () => {
    const agent = await createSupportAgent(5000);
    const res = await createDecision(
      jsonRequest("/api/v1/decisions", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          action: "refund.issue",
          subject: "order:ord-99",
          amountCents: 60_000,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const { decision } = await res.json();
    expect(decision.capCheck.ok).toBe(false);
    expect(decision.decisionStatus).toBe("pending_review");
  });

  it("blocks decision when paused agent is used", async () => {
    const agent = await createSupportAgent();
    await pauseAgent(
      jsonRequest(`/api/v1/agents/${agent.id}/pause`, { method: "POST" }),
      { params: { id: agent.id } },
    );
    const res = await createDecision(
      jsonRequest("/api/v1/decisions", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          action: "refund.issue",
          subject: "order:ord-1",
          amountCents: 100,
        }),
      }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects an action not in the agent's allowed_actions", async () => {
    const agent = await createSupportAgent();
    const res = await createDecision(
      jsonRequest("/api/v1/decisions", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          action: "wire.send",
          subject: "vendor",
          amountCents: 100,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("allows decision without agentId (backward compatible)", async () => {
    const res = await createDecision(
      jsonRequest("/api/v1/decisions", {
        method: "POST",
        body: JSON.stringify({
          action: "manual.override",
          subject: "legacy",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const { decision } = await res.json();
    expect(decision.agentId).toBeNull();
    expect(decision.decisionStatus).toBe("allowed");
  });
});

describe("GET /api/v1/decisions", () => {
  it("returns tenant-scoped decisions, newest first", async () => {
    const agent = await createSupportAgent();
    for (let i = 0; i < 3; i++) {
      await createDecision(
        jsonRequest("/api/v1/decisions", {
          method: "POST",
          body: JSON.stringify({
            agentId: agent.id,
            action: "refund.issue",
            subject: `order:${i}`,
            amountCents: 100,
          }),
        }),
      );
    }
    const res = await listDecisions(jsonRequest("/api/v1/decisions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decisions).toHaveLength(3);
    expect(body.decisions[0].agentName).toBe("Support Refund Agent");
  });
});
