import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listAgents, POST as createAgent } from "@/app/api/v1/agents/route";
import { GET as getAgent, PATCH as patchAgent } from "@/app/api/v1/agents/[id]/route";
import { POST as pauseAgent } from "@/app/api/v1/agents/[id]/pause/route";
import { POST as revokeAgent } from "@/app/api/v1/agents/[id]/revoke/route";
import { __resetStoreForTests } from "@/src/server/store";

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

const validBody = {
  name: "Refund Agent",
  environment: "production" as const,
  riskTier: "high" as const,
  allowedActions: ["refund.issue"],
  spendCaps: { perDecisionCents: 50000, currency: "USD" },
};

describe("POST /api/v1/agents", () => {
  it("creates an agent and returns 201", async () => {
    const res = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agent.id).toMatch(/^agt-/);
    expect(body.agent.tenantId).toBe("demo-org");
    expect(body.agent.status).toBe("active");
  });

  it("rejects invalid input with 400", async () => {
    const res = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify({ ...validBody, name: "<script>" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate names with 409", async () => {
    await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    const res2 = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    expect(res2.status).toBe(409);
  });
});

describe("GET /api/v1/agents", () => {
  it("lists tenant-scoped agents", async () => {
    await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    const res = await listAgents();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].summary.allowedActionsCount).toBe(1);
  });
});

describe("GET /api/v1/agents/:id", () => {
  it("returns the agent for owner tenant", async () => {
    const createRes = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    const { agent } = await createRes.json();
    const res = await getAgent(jsonRequest(`/api/v1/agents/${agent.id}`), {
      params: { id: agent.id },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agent.id).toBe(agent.id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await getAgent(jsonRequest(`/api/v1/agents/missing`), {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/agents/:id", () => {
  it("updates risk tier", async () => {
    const createRes = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    const { agent } = await createRes.json();
    const res = await patchAgent(
      jsonRequest(`/api/v1/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ riskTier: "critical" }),
      }),
      { params: { id: agent.id } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agent.riskTier).toBe("critical");
  });
});

describe("POST /api/v1/agents/:id/pause + /revoke", () => {
  it("pauses then revokes; revoke is terminal", async () => {
    const createRes = await createAgent(
      jsonRequest("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    );
    const { agent } = await createRes.json();

    const pauseRes = await pauseAgent(
      jsonRequest(`/api/v1/agents/${agent.id}/pause`, { method: "POST" }),
      { params: { id: agent.id } },
    );
    expect(pauseRes.status).toBe(200);
    expect((await pauseRes.json()).agent.status).toBe("paused");

    const revokeRes = await revokeAgent(
      jsonRequest(`/api/v1/agents/${agent.id}/revoke`, { method: "POST" }),
      { params: { id: agent.id } },
    );
    expect(revokeRes.status).toBe(200);
    const revoked = (await revokeRes.json()).agent;
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toBeTruthy();

    const pauseAgain = await pauseAgent(
      jsonRequest(`/api/v1/agents/${agent.id}/pause`, { method: "POST" }),
      { params: { id: agent.id } },
    );
    expect(pauseAgain.status).toBe(409);
  });
});
