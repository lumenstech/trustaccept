import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as createDecisionRoute } from "@/app/api/v1/decisions/route";
import { POST as createAgentRoute } from "@/app/api/v1/agents/route";
import { POST as revokeAgentRoute } from "@/app/api/v1/agents/[id]/revoke/route";
import { POST as pauseAgentRoute } from "@/app/api/v1/agents/[id]/pause/route";
import { __resetStoreForTests } from "@/src/server/store";
import { DEMO_ORGANIZATION_ID } from "@/lib/seed-data";
import { verifyDecisionReceipt } from "@/src/server/signing";

const AGENTS_BASE = "http://localhost/api/v1/agents";
const DECISIONS_BASE = "http://localhost/api/v1/decisions";

function makeJsonRequest(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function createAgent(overrides: Record<string, unknown> = {}) {
  const res = await createAgentRoute(
    makeJsonRequest(AGENTS_BASE, {
      name: "support-copilot",
      owner_email: "ops@trustaccept.dev",
      environment: "prod",
      risk_tier: "high",
      allowed_actions: ["transfer.funds"],
      spend_caps: { daily_usd: 200, per_txn_usd: 75 },
      ...overrides,
    }),
  );
  return res.json();
}

async function createDecision(body: Record<string, unknown>) {
  const res = await createDecisionRoute(
    makeJsonRequest(DECISIONS_BASE, body),
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  __resetStoreForTests();
});

describe("POST /api/v1/decisions — M4 agent_id wiring", () => {
  it("stores agent_id when a valid active agent is provided", async () => {
    const agent = await createAgent();
    const { status, body } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
      amount: 50,
      request_body: { to: "vendor", amount: 50 },
    });
    expect(status).toBe(201);
    expect(body.agent_id).toBe(agent.id);
    expect(body.tenant_id).toBe(DEMO_ORGANIZATION_ID);
    expect(body.policy_version).toBe("v0");
    expect(body.evidence_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.signed_receipt).toBeDefined();
    const v = verifyDecisionReceipt(body.signed_receipt);
    expect(v.valid).toBe(true);
    expect(v.payload?.agent_id).toBe(agent.id);
  });

  it("rejects a decision against a revoked agent", async () => {
    const agent = await createAgent();
    await revokeAgentRoute(
      makeJsonRequest(`${AGENTS_BASE}/${agent.id}/revoke`, {}),
      { params: { id: agent.id } },
    );
    const { status, body } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/revoked/);
  });

  it("rejects a decision against a paused agent", async () => {
    const agent = await createAgent({ name: "paused-bot" });
    await pauseAgentRoute(
      makeJsonRequest(`${AGENTS_BASE}/${agent.id}/pause`, {}),
      { params: { id: agent.id } },
    );
    const { status, body } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/paused/);
  });

  it("rejects an unknown agent_id with 400 (no existence leak via 404)", async () => {
    const { status, body } = await createDecision({
      action: "noop",
      decision: "accept",
      agent_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/does not exist/);
  });

  it("accepts a decision without agent_id (backward compatible)", async () => {
    const { status, body } = await createDecision({
      action: "noop",
      decision: "accept",
    });
    expect(status).toBe(201);
    expect(body.agent_id).toBeNull();
  });

  it("populates cap_check on context when amount + agent are present", async () => {
    const agent = await createAgent();
    const { body: first } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
      amount: 50,
    });
    expect(first.context.cap_check).toMatchObject({
      daily_used: 0,
      weekly_used: 0,
      monthly_used: 0,
      exceeded: false,
    });

    const { body: second } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
      amount: 80,
    });
    // daily cap was 200; first txn added 50; second is 80 within per-txn 75
    // → per_txn cap exceeded. Daily usage so far is the 50 from the first.
    expect(second.context.cap_check.daily_used).toBe(50);
    expect(second.context.cap_check.exceeded).toBe(true);
  });

  it("does NOT block the decision when cap_check is exceeded (observability only)", async () => {
    const agent = await createAgent({ spend_caps: { per_txn_usd: 10 } });
    const { status, body } = await createDecision({
      action: "transfer.funds",
      decision: "accept",
      agent_id: agent.id,
      amount: 999,
    });
    expect(status).toBe(201);
    expect(body.context.cap_check.exceeded).toBe(true);
  });

  it("rejects unknown body fields via strict Zod", async () => {
    const { status, body } = await createDecision({
      action: "noop",
      decision: "accept",
      not_a_field: true,
    });
    expect(status).toBe(400);
    expect(body.error).toBe("validation_failed");
  });
});
