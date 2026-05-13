import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as listAgentsRoute,
  POST as createAgentRoute,
} from "@/app/api/v1/agents/route";
import {
  GET as getAgentRoute,
  PATCH as patchAgentRoute,
} from "@/app/api/v1/agents/[id]/route";
import { POST as pauseAgentRoute } from "@/app/api/v1/agents/[id]/pause/route";
import { POST as revokeAgentRoute } from "@/app/api/v1/agents/[id]/revoke/route";
import {
  __resetStoreForTests,
  getStore,
} from "@/src/server/store";
import { __setDemoUserForTests } from "@/src/server/auth";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID } from "@/lib/seed-data";

const BASE = "http://localhost/api/v1/agents";

function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown },
): NextRequest {
  return new NextRequest(url, {
    method: init?.method ?? "GET",
    body: init?.body ? JSON.stringify(init.body) : undefined,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
}

const validAgent = {
  name: "support-copilot",
  owner_email: "ops@trustaccept.dev",
  environment: "prod" as const,
  risk_tier: "high" as const,
  allowed_actions: ["read.customer", "draft.email"],
  spend_caps: { daily_usd: 500, per_txn_usd: 50 },
};

async function createAgent(body: Record<string, unknown> = validAgent) {
  const req = makeRequest(BASE, { method: "POST", body });
  const res = await createAgentRoute(req);
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  __resetStoreForTests();
});

describe("POST /api/v1/agents", () => {
  it("creates an agent (happy path)", async () => {
    const { status, body } = await createAgent();
    expect(status).toBe(201);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.tenant_id).toBe(DEMO_ORGANIZATION_ID);
    expect(body.name).toBe("support-copilot");
    expect(body.status).toBe("active");
    expect(body.spend_caps).toEqual({ daily_usd: 500, per_txn_usd: 50 });
  });

  it("rejects a duplicate name within the same tenant", async () => {
    await createAgent();
    const { status, body } = await createAgent();
    expect(status).toBe(409);
    expect(body.error).toMatch(/already exists/);
  });

  it("validates spend_caps shape and rejects unknown caps fields", async () => {
    const { status, body } = await createAgent({
      ...validAgent,
      name: "bad-caps",
      spend_caps: { daily_usd: -1 },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("validation_failed");

    const { status: s2, body: b2 } = await createAgent({
      ...validAgent,
      name: "bad-caps-2",
      spend_caps: { weekly_usd: 100, unknown_field: 1 } as unknown as Record<string, number>,
    });
    expect(s2).toBe(400);
    expect(b2.error).toBe("validation_failed");
  });

  it("rejects unknown top-level fields (strict zod)", async () => {
    const { status, body } = await createAgent({
      ...validAgent,
      name: "extras",
      whatever: "nope",
    } as unknown as typeof validAgent);
    expect(status).toBe(400);
    expect(body.error).toBe("validation_failed");
  });

  it("returns 403 when a non-admin tries to create", async () => {
    __setDemoUserForTests({
      id: DEMO_USER_ID,
      name: "Viewer",
      email: "v@x.dev",
      role: "VIEWER",
      organizationId: DEMO_ORGANIZATION_ID,
    });
    const { status } = await createAgent({ ...validAgent, name: "viewer-attempt" });
    expect(status).toBe(403);
  });
});

describe("agent lifecycle (pause / revoke)", () => {
  it("transitions active -> paused on POST /pause", async () => {
    const { body } = await createAgent();
    const res = await pauseAgentRoute(
      makeRequest(`${BASE}/${body.id}/pause`, { method: "POST" }),
      { params: { id: body.id } },
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("paused");
  });

  it("revoke is terminal: revoked agents cannot be patched, paused, or re-revoked", async () => {
    const { body } = await createAgent();
    const revoked = await revokeAgentRoute(
      makeRequest(`${BASE}/${body.id}/revoke`, { method: "POST" }),
      { params: { id: body.id } },
    );
    expect(revoked.status).toBe(200);
    expect((await revoked.json()).status).toBe("revoked");

    const repause = await pauseAgentRoute(
      makeRequest(`${BASE}/${body.id}/pause`, { method: "POST" }),
      { params: { id: body.id } },
    );
    expect(repause.status).toBe(400);

    const repatch = await patchAgentRoute(
      makeRequest(`${BASE}/${body.id}`, {
        method: "PATCH",
        body: { name: "renamed" },
      }),
      { params: { id: body.id } },
    );
    expect(repatch.status).toBe(400);

    const rerevoke = await revokeAgentRoute(
      makeRequest(`${BASE}/${body.id}/revoke`, { method: "POST" }),
      { params: { id: body.id } },
    );
    expect(rerevoke.status).toBe(400);
  });
});

describe("tenant isolation", () => {
  it("tenant A cannot read or list tenant B agents", async () => {
    await createAgent();

    // Switch the session to tenant B.
    __setDemoUserForTests({
      id: DEMO_USER_ID,
      name: "Other Admin",
      email: "other@x.dev",
      role: "ADMIN",
      organizationId: "other-org",
    });

    const listRes = await listAgentsRoute(makeRequest(BASE));
    const listJson = await listRes.json();
    expect(listJson.items).toEqual([]);
    expect(listJson.total).toBe(0);

    // Resurrect the original to find its id.
    __setDemoUserForTests({
      id: DEMO_USER_ID,
      name: "Alex Greene",
      email: "alex@trustaccept.dev",
      role: "OWNER",
      organizationId: DEMO_ORGANIZATION_ID,
    });
    const stored = Array.from(getStore().agents.values())[0];

    __setDemoUserForTests({
      id: DEMO_USER_ID,
      name: "Other Admin",
      email: "other@x.dev",
      role: "ADMIN",
      organizationId: "other-org",
    });
    const getRes = await getAgentRoute(
      makeRequest(`${BASE}/${stored.id}`),
      { params: { id: stored.id } },
    );
    expect(getRes.status).toBe(404);
  });
});

describe("pagination + filtering", () => {
  it("paginates list results and supports status/env/tier filters", async () => {
    for (let i = 0; i < 5; i++) {
      await createAgent({
        ...validAgent,
        name: `agent-${i}`,
        environment: i < 3 ? "prod" : "staging",
        risk_tier: i % 2 === 0 ? "high" : "low",
      });
    }

    const page1 = await listAgentsRoute(
      makeRequest(`${BASE}?page=1&page_size=2`),
    );
    const p1 = await page1.json();
    expect(p1.items).toHaveLength(2);
    expect(p1.total).toBe(5);

    const page2 = await listAgentsRoute(
      makeRequest(`${BASE}?page=2&page_size=2`),
    );
    const p2 = await page2.json();
    expect(p2.items).toHaveLength(2);
    expect(p2.items[0].id).not.toBe(p1.items[0].id);

    const filtered = await listAgentsRoute(
      makeRequest(`${BASE}?environment=staging`),
    );
    const f = await filtered.json();
    expect(f.items.every((a: { environment: string }) => a.environment === "staging"))
      .toBe(true);
    expect(f.total).toBe(2);

    const tierFiltered = await listAgentsRoute(
      makeRequest(`${BASE}?risk_tier=high`),
    );
    const t = await tierFiltered.json();
    expect(t.items.every((a: { risk_tier: string }) => a.risk_tier === "high"))
      .toBe(true);
  });
});

describe("PATCH /api/v1/agents/:id", () => {
  it("ignores unknown fields and applies known partial fields", async () => {
    const { body } = await createAgent();

    const res = await patchAgentRoute(
      makeRequest(`${BASE}/${body.id}`, {
        method: "PATCH",
        body: {
          risk_tier: "critical",
          unexpected: "ignored",
        },
      }),
      { params: { id: body.id } },
    );
    expect(res.status).toBe(400);
    const errBody = await res.json();
    // Strict mode catches the unknown field — the patch did not apply.
    expect(errBody.error).toBe("validation_failed");

    // Now patch only valid fields; spend_caps unchanged because not provided.
    const ok = await patchAgentRoute(
      makeRequest(`${BASE}/${body.id}`, {
        method: "PATCH",
        body: { risk_tier: "critical" },
      }),
      { params: { id: body.id } },
    );
    const okJson = await ok.json();
    expect(ok.status).toBe(200);
    expect(okJson.risk_tier).toBe("critical");
    expect(okJson.spend_caps).toEqual({ daily_usd: 500, per_txn_usd: 50 });
  });
});
