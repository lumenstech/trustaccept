import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as exportRoute } from "@/app/api/v1/decisions/export/route";
import { createDecisionV1 } from "@/src/server/decisions";
import { __resetStoreForTests, getStore } from "@/src/server/store";
import { __setDemoUserForTests, requireCurrentUser } from "@/src/server/auth";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID } from "@/lib/seed-data";
import { readZip, sha256Hex } from "@/src/server/zip";

const BASE = "http://localhost/api/v1/decisions/export";

beforeEach(() => {
  __resetStoreForTests();
});

function url(params: Record<string, string>): string {
  const u = new URL(BASE);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

describe("GET /api/v1/decisions/export", () => {
  it("returns an empty array for an empty window", async () => {
    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-05-01T00:00:00Z",
          to: "2026-05-13T00:00:00Z",
          format: "json",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("rejects windows longer than 90 days with 400", async () => {
    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-01-01T00:00:00Z",
          to: "2026-05-13T00:00:00Z",
          format: "json",
        }),
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/90-day/);
  });

  it("rejects from > to and missing params via Zod", async () => {
    const res = await exportRoute(
      new NextRequest(url({ from: "not-a-date", to: "2026-05-13T00:00:00Z" })),
    );
    expect(res.status).toBe(400);
  });

  it("enforces tenant isolation in the export", async () => {
    const user = requireCurrentUser();
    createDecisionV1(user, { action: "act1", decision: "accept" });

    __setDemoUserForTests({
      id: DEMO_USER_ID,
      name: "Other",
      email: "o@x.dev",
      role: "ADMIN",
      organizationId: "other-org",
    });

    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-05-13T00:00:00Z",
          to: "2026-05-13T23:59:59Z",
          format: "json",
        }),
      ),
    );
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("zip bundle: manifest sha256 matches decisions.json bytes", async () => {
    const user = requireCurrentUser();
    createDecisionV1(user, {
      action: "transfer.funds",
      decision: "accept",
      amount: 100,
      request_body: { foo: "bar" },
    });
    createDecisionV1(user, {
      action: "send.email",
      decision: "reject",
    });

    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-05-13T00:00:00Z",
          to: "2026-05-13T23:59:59Z",
          format: "zip",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    const buf = Buffer.from(await res.arrayBuffer());
    const entries = readZip(buf);
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["README.txt", "decisions.json", "manifest.json"]);

    const decisionsEntry = entries.find((e) => e.name === "decisions.json")!;
    const manifestEntry = entries.find((e) => e.name === "manifest.json")!;
    const manifest = JSON.parse(manifestEntry.data.toString("utf8"));
    expect(manifest.tenant_id).toBe(DEMO_ORGANIZATION_ID);
    expect(manifest.count).toBe(2);
    expect(manifest.decisions_sha256).toBe(sha256Hex(decisionsEntry.data));
    expect(manifest.signing_key_id).toBeDefined();
  });

  it("csv format escapes commas, quotes, and newlines", async () => {
    const user = requireCurrentUser();
    createDecisionV1(user, {
      action: 'evil, "action"\nwith newline',
      decision: "accept",
    });

    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-05-13T00:00:00Z",
          to: "2026-05-13T23:59:59Z",
          format: "csv",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    const body = await res.text();
    expect(body.split("\r\n")[0]).toBe(
      "id,agent_id,action,decision,policy_version,evidence_hash,signed_receipt,approver_id,created_at",
    );
    expect(body).toContain('"evil, ""action""\nwith newline"');
  });

  it("agent_id filter narrows the result set", async () => {
    const user = requireCurrentUser();
    const a = getStore();
    const aid1 = "11111111-1111-1111-1111-111111111111";
    const aid2 = "22222222-2222-2222-2222-222222222222";
    a.agents.set(aid1, {
      id: aid1,
      tenantId: DEMO_ORGANIZATION_ID,
      name: "a1",
      ownerEmail: "o@x.dev",
      environment: "prod",
      riskTier: "low",
      allowedActions: [],
      spendCaps: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    a.agents.set(aid2, {
      id: aid2,
      tenantId: DEMO_ORGANIZATION_ID,
      name: "a2",
      ownerEmail: "o@x.dev",
      environment: "prod",
      riskTier: "low",
      allowedActions: [],
      spendCaps: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    createDecisionV1(user, { action: "x", decision: "accept", agent_id: aid1 });
    createDecisionV1(user, { action: "y", decision: "accept", agent_id: aid2 });

    const res = await exportRoute(
      new NextRequest(
        url({
          from: "2026-05-13T00:00:00Z",
          to: "2026-05-13T23:59:59Z",
          format: "json",
          agent_id: aid1,
        }),
      ),
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].agent_id).toBe(aid1);
  });
});
