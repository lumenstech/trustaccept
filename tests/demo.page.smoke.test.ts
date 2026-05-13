import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as createDecision } from "@/app/api/v1/decisions/route";
import { POST as createAgent } from "@/app/api/v1/agents/route";
import { __resetStoreForTests } from "@/src/server/store";
import {
  DEMO_AGENT_NAME,
  DEMO_AGENT_ACTION,
  DEMO_AGENT_DEFAULT_CAP_CENTS,
  outcomeToDecisionFields,
  refundPolicyBand,
} from "@/lib/demo/refund-policy";

beforeEach(() => {
  __resetStoreForTests();
});

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/**
 * End-to-end smoke for the demo flow: the same sequence of API calls
 * the client component makes when the operator clicks through steps 1-3.
 * Doesn't render the page — verifies the wire-level behaviour the page
 * relies on.
 */
describe("refund approval demo — wire-level smoke", () => {
  it("registers the demo agent, submits a decision, and produces a signed receipt", async () => {
    const agentRes = await createAgent(
      jsonReq("/api/v1/agents", {
        name: DEMO_AGENT_NAME,
        environment: "production",
        riskTier: "high",
        allowedActions: [DEMO_AGENT_ACTION],
        spendCaps: {
          perDecisionCents: DEMO_AGENT_DEFAULT_CAP_CENTS,
          currency: "USD",
        },
      }),
    );
    expect(agentRes.status).toBe(201);
    const { agent } = await agentRes.json();
    expect(agent.name).toBe(DEMO_AGENT_NAME);

    const refundAmountUsd = 75;
    const band = refundPolicyBand(refundAmountUsd);
    expect(band.band).toBe("auto");

    const outcome = outcomeToDecisionFields("accept");
    const decisionRes = await createDecision(
      jsonReq("/api/v1/decisions", {
        agentId: agent.id,
        action: DEMO_AGENT_ACTION,
        subject: "order:ord-smoke",
        amountCents: refundAmountUsd * 100,
        currency: "USD",
        decisionStatus: outcome.decisionStatus,
        block: outcome.block,
        policyVersion: "refund-policy-v1",
        evidencePayload: {
          customer_id: "cus-smoke",
          refund_amount: refundAmountUsd,
          reason: "duplicate charge smoke test",
          order_id: "ord-smoke",
          requested_by_agent: DEMO_AGENT_NAME,
          risk_level: "low",
          policyBand: band.band,
        },
      }),
    );
    expect(decisionRes.status).toBe(201);
    const { decision } = await decisionRes.json();
    expect(decision.decisionStatus).toBe("allowed");
    expect(decision.capCheck.ok).toBe(true);
    expect(decision.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.receiptJws.split(".")).toHaveLength(3);
  });

  it("imports the demo page module without throwing at import time", async () => {
    const mod = await import("@/app/dashboard/demo/refund-approval/page");
    expect(typeof mod.default).toBe("function");
  });
});
