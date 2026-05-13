import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as exportEvidence } from "@/app/api/v1/evidence/export/route";
import { POST as createAgent } from "@/app/api/v1/agents/route";
import { POST as createDecision } from "@/app/api/v1/decisions/route";
import { __resetStoreForTests } from "@/src/server/store";

beforeEach(() => {
  __resetStoreForTests();
});

function getRequest(qs: string): NextRequest {
  return new NextRequest(new URL(`/api/v1/evidence/export?${qs}`, "http://localhost"));
}

function recentWindow(days = 30): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

function jsonReq(url: string, body: object): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function setupOneAgentOneDecision() {
  const agentRes = await createAgent(
    jsonReq("/api/v1/agents", {
      name: "Refund Agent",
      environment: "production",
      riskTier: "low",
      allowedActions: ["refund.issue"],
      spendCaps: { currency: "USD" },
    }),
  );
  const { agent } = await agentRes.json();
  const decisionRes = await createDecision(
    jsonReq("/api/v1/decisions", {
      agentId: agent.id,
      action: "refund.issue",
      subject: "order:1",
      amountCents: 1234,
      evidencePayload: { note: "test" },
    }),
  );
  const { decision } = await decisionRes.json();
  return { agent, decision };
}

describe("GET /api/v1/evidence/export", () => {
  it("returns 400 for malformed dates", async () => {
    const res = await exportEvidence(getRequest("from=foo&to=bar"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when window exceeds 90 days", async () => {
    const res = await exportEvidence(
      getRequest("from=2026-01-01&to=2026-12-31"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("window_too_large");
    expect(body.max_window_days).toBe(90);
  });

  it("returns 400 when 'to' is before 'from'", async () => {
    const res = await exportEvidence(
      getRequest("from=2026-05-13&to=2026-05-01"),
    );
    expect(res.status).toBe(400);
  });

  it("returns an empty JSON envelope when no decisions match", async () => {
    const { from, to } = recentWindow(7);
    const res = await exportEvidence(
      getRequest(`from=${from}&to=${to}&format=json`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.decisions).toEqual([]);
    expect(body.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns CSV with header row and one data row", async () => {
    await setupOneAgentOneDecision();
    const { from, to } = recentWindow(30);
    const res = await exportEvidence(
      getRequest(`from=${from}&to=${to}&format=csv`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toContain("id,tenantId,agentId");
    expect(lines).toHaveLength(2);
  });

  it("returns a valid ZIP starting with PK signature and containing manifest", async () => {
    await setupOneAgentOneDecision();
    const { from, to } = recentWindow(30);
    const res = await exportEvidence(
      getRequest(`from=${from}&to=${to}&format=zip`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(buf.indexOf(Buffer.from("manifest.json"))).toBeGreaterThan(-1);
    expect(buf.indexOf(Buffer.from("decisions.csv"))).toBeGreaterThan(-1);
    expect(buf.indexOf(Buffer.from("decisions.json"))).toBeGreaterThan(-1);
    expect(buf.indexOf(Buffer.from("README.txt"))).toBeGreaterThan(-1);
  });

  it("filters by agentId", async () => {
    const { agent } = await setupOneAgentOneDecision();
    const other = await createAgent(
      jsonReq("/api/v1/agents", {
        name: "Other Agent",
        environment: "sandbox",
        riskTier: "low",
        allowedActions: ["refund.issue"],
        spendCaps: { currency: "USD" },
      }),
    );
    const otherAgent = (await other.json()).agent;
    await createDecision(
      jsonReq("/api/v1/decisions", {
        agentId: otherAgent.id,
        action: "refund.issue",
        subject: "order:other",
        amountCents: 1,
      }),
    );
    const { from, to } = recentWindow(30);
    const res = await exportEvidence(
      getRequest(`from=${from}&to=${to}&agentId=${agent.id}`),
    );
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.decisions[0].agentId).toBe(agent.id);
  });
});
