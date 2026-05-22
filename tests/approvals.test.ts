import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/src/server/auth";
import {
  createApproval,
  getApproval,
  listApprovals,
  toApprovalRecord,
} from "@/src/server/approvals";
import {
  getRiskRecordForOrganization,
  listRiskRecordsForOrganization,
} from "@/src/server/riskRecords";
import { listAuditLogsForRecord } from "@/src/server/auditLogs";
import { __resetStoreForTests } from "@/src/server/store";
import { __resetNotificationsForTests } from "@/src/server/notifications";
import type { ApprovalRequestInputType } from "@/src/lib/approval-types";


import { POST as approvalsPost, GET as approvalsGet } from "@/app/api/v1/approvals/route";
import { GET as approvalByIdGet } from "@/app/api/v1/approvals/[id]/route";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  __resetStoreForTests();
  __resetNotificationsForTests();
  delete process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const baseRequest = (): ApprovalRequestInputType => ({
  action: {
    type: "production_deploy",
    summary: "Deploy v2.4.1 to production",
    payload: { service: "checkout-api", commit: "abc1234" },
  },
  principal: {
    type: "email",
    value: "alex@example.com",
  },
  context: {
    agent_name: "release-bot",
    environment: "production",
    business_justification: "Scheduled weekly release.",
  },
  tool_id: "trustaccept.request_approval.v1",
});

describe("createApproval — service layer", () => {
  it("creates a PENDING record with full audit logging when the policy stub says require_approval", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());

    expect(approval.id).toMatch(/^ra-/);
    expect(approval.status).toBe("pending");
    expect(approval.action.type).toBe("production_deploy");
    expect(approval.action.summary).toBe("Deploy v2.4.1 to production");
    expect(approval.principal).toEqual({ type: "email", value: "alex@example.com" });
    expect(approval.context.agent_name).toBe("release-bot");
    expect(approval.context.environment).toBe("production");
    expect(approval.tool_id).toBe("trustaccept.request_approval.v1");
    expect(approval.organization_id).toBe(user.organizationId);

    const logs = listAuditLogsForRecord(user.organizationId, approval.id);
    expect(logs.map((l) => l.eventType)).toContain("risk_record.created");
  });

  it("delegates to the same store as /api/risk-records (equivalence)", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());
    const viaRiskRecords = getRiskRecordForOrganization(user, approval.id);

    expect(viaRiskRecords.id).toBe(approval.id);
    expect(viaRiskRecords.module).toBe("ai-action-gate");
    expect(viaRiskRecords.sourceSystem).toBe("trustaccept-mcp");
    expect(viaRiskRecords.sourceType).toBe("agent_action_request");
    expect(viaRiskRecords.title).toBe(approval.action.summary);
    expect(viaRiskRecords.owner).toBe(approval.principal.value);
  });

  it("returns the locked output shape with all reserved fields present", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());

    expect(approval).toHaveProperty("policy_id");
    expect(approval).toHaveProperty("risk_level");
    expect(approval).toHaveProperty("policy_reason");
    expect(approval).toHaveProperty("action_hash");
    expect(approval).toHaveProperty("tool_id");
    expect(approval).toHaveProperty("receipt_jwt");
    expect(approval).toHaveProperty("expires_at");
    expect(approval).toHaveProperty("decided_by");
    expect(approval).toHaveProperty("decision_actor_type");
    expect(approval).toHaveProperty("decided_at");
  });

  it("populates policy + action-hash fields from the live engine; only receipt_jwt and decision-state fields remain null while pending", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());

    // Block 4: populated
    expect(approval.policy_id).toBe("production-deploys-require-human-approval");
    expect(approval.risk_level).toBe("high");
    expect(approval.policy_reason).toMatch(/production deploys/i);
    expect(approval.action_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(approval.expires_at).not.toBeNull();

    // Block 5 / pending: still null
    expect(approval.receipt_jwt).toBeNull();
    expect(approval.decided_by).toBeNull();
    expect(approval.decision_actor_type).toBeNull();
    expect(approval.decided_at).toBeNull();
  });

  it("derives risk_level from the matched policy (production_deploy → high)", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());
    expect(approval.risk_level).toBe("high");
  });

  it("auto-allows read_* actions through the policy engine and finalizes via the synthetic policy actor", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, {
      ...baseRequest(),
      action: {
        type: "read_user_profile",
        summary: "Read user profile for support session",
        payload: { user_id: "u-42" },
      },
    });
    expect(approval.status).toBe("accepted");
    expect(approval.policy_id).toBe("read-only-low-risk-auto-allow");
    expect(approval.risk_level).toBe("low");
    expect(approval.decision_actor_type).toBe("policy");
    expect(approval.decided_by).toBe("policy:read-only-low-risk-auto-allow");
    expect(approval.decided_at).not.toBeNull();
  });

  it("produces identical action_hash for payloads with reordered keys", () => {
    const user = requireCurrentUser();
    const a = createApproval(user, {
      ...baseRequest(),
      action: {
        type: "production_deploy",
        summary: "Deploy with payload ordering A",
        payload: { commit: "abc1234", service: "checkout-api" },
      },
    });
    const b = createApproval(user, {
      ...baseRequest(),
      action: {
        type: "production_deploy",
        summary: "Deploy with payload ordering A",
        payload: { service: "checkout-api", commit: "abc1234" },
      },
    });
    expect(a.action_hash).toBe(b.action_hash);
  });

  it("supplies a default business_justification when context omits it", () => {
    const user = requireCurrentUser();
    const input = baseRequest();
    delete input.context!.business_justification;
    const approval = createApproval(user, input);

    expect(approval.context.business_justification).toContain("No business justification provided");
  });

  it("does not persist action.payload directly (only the hash will, in Block 4)", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseRequest());
    const record = getRiskRecordForOrganization(user, approval.id);

    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("abc1234");
    expect(serialized).not.toContain("checkout-api");
  });

  it("allows configured MCP tool ids when the allowlist is set", () => {
    process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS =
      "trustaccept.request_approval.v1, trustaccept.release_gate.v1";
    const user = requireCurrentUser();

    const approval = createApproval(user, baseRequest());

    expect(approval.tool_id).toBe("trustaccept.request_approval.v1");
    expect(approval.status).toBe("pending");
  });

  it("rejects missing or unlisted MCP tool ids when the allowlist is set", () => {
    process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS = "trustaccept.release_gate.v1";
    const user = requireCurrentUser();

    expect(() => createApproval(user, baseRequest())).toThrow(
      "Tool is not allowed to request approvals",
    );
    expect(() =>
      createApproval(user, {
        ...baseRequest(),
        tool_id: undefined,
      }),
    ).toThrow("Tool is not allowed to request approvals");
  });

});

describe("listApprovals — filtering", () => {
  it("returns only the records the caller has access to (org-scoped)", () => {
    const user = requireCurrentUser();
    const totalBefore = listRiskRecordsForOrganization(user).length;
    createApproval(user, baseRequest());
    const all = listApprovals(user, {});
    expect(all.length).toBe(totalBefore + 1);
  });

  it("filters by status", () => {
    const user = requireCurrentUser();
    createApproval(user, baseRequest());
    const pending = listApprovals(user, { status: "pending" });
    expect(pending.every((a) => a.status === "pending")).toBe(true);
  });

  it("filters by principal_type and principal_value", () => {
    const user = requireCurrentUser();
    createApproval(user, baseRequest());
    createApproval(user, {
      ...baseRequest(),
      principal: { type: "phone", value: "+15551234567" },
    });

    const phones = listApprovals(user, {
      principal_type: "phone",
      principal_value: "+15551234567",
    });
    expect(phones.length).toBe(1);
    expect(phones[0].principal).toEqual({
      type: "phone",
      value: "+15551234567",
    });
  });

  it("honors the limit parameter", () => {
    const user = requireCurrentUser();
    for (let i = 0; i < 4; i += 1) {
      createApproval(user, {
        ...baseRequest(),
        action: {
          ...baseRequest().action,
          summary: `Deploy revision number ${i}`,
        },
      });
    }
    const limited = listApprovals(user, { limit: 2 });
    expect(limited.length).toBe(2);
  });
});

describe("getApproval — read by id", () => {
  it("returns the approval record by id", () => {
    const user = requireCurrentUser();
    const created = createApproval(user, baseRequest());
    const fetched = getApproval(user, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.action.summary).toBe(created.action.summary);
  });

  it("throws on unknown id (no existence leak — mirrors getRiskRecordForOrganization)", () => {
    const user = requireCurrentUser();
    expect(() => getApproval(user, "does-not-exist")).toThrow();
  });
});

describe("toApprovalRecord — seeded records still map cleanly", () => {
  it("maps a legacy seeded record to the locked output shape with sensible nulls", () => {
    const user = requireCurrentUser();
    const records = listRiskRecordsForOrganization(user);
    const seed = records[0];
    const mapped = toApprovalRecord(seed);

    expect(mapped.id).toBe(seed.id);
    expect(mapped.risk_level).toBe(seed.riskLevel);
    expect(mapped.policy_id).toBeNull();
    expect(mapped.action_hash).toBeNull();
    expect(mapped.tool_id).toBeNull();
    expect(mapped.receipt_jwt).toBeNull();
  });
});

describe("POST /api/v1/approvals — route handler", () => {
  it("returns 401 when production auth is required and no session resolves", async () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";
    const req = new NextRequest("http://localhost/api/v1/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseRequest()),
    });

    const res = await approvalsPost(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("returns 201 with the created approval", async () => {
    const req = new NextRequest("http://localhost/api/v1/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseRequest()),
    });
    const res = await approvalsPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.approval.id).toMatch(/^ra-/);
    expect(body.approval.status).toBe("pending");
    expect(body.approval.action.type).toBe("production_deploy");
  });

  it("returns 400 with formatted Zod issues on invalid input", async () => {
    const req = new NextRequest("http://localhost/api/v1/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: { type: "x", summary: "no" } }),
    });
    const res = await approvalsPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation_failed");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns 403 when tool_id is not in the configured allowlist", async () => {
    process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS = "trustaccept.release_gate.v1";
    const req = new NextRequest("http://localhost/api/v1/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseRequest()),
    });
    const res = await approvalsPost(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Tool is not allowed to request approvals");
  });
});

describe("GET /api/v1/approvals — route handler", () => {
  it("returns 401 when production auth is required and no session resolves", async () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";
    const req = new NextRequest("http://localhost/api/v1/approvals");

    const res = await approvalsGet(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("returns approvals array including a freshly created one", async () => {
    const user = requireCurrentUser();
    createApproval(user, baseRequest());

    const req = new NextRequest("http://localhost/api/v1/approvals");
    const res = await approvalsGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.approvals)).toBe(true);
    expect(body.approvals.some((a: { action: { type: string } }) => a.action.type === "production_deploy")).toBe(true);
  });

  it("applies status and limit query params", async () => {
    const user = requireCurrentUser();
    for (let i = 0; i < 3; i += 1) {
      createApproval(user, {
        ...baseRequest(),
        action: { ...baseRequest().action, summary: `Deploy v2.4.${i + 1}` },
      });
    }
    const req = new NextRequest(
      "http://localhost/api/v1/approvals?status=pending&limit=2",
    );
    const res = await approvalsGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approvals.length).toBe(2);
    expect(body.approvals.every((a: { status: string }) => a.status === "pending")).toBe(true);
  });
});

describe("GET /api/v1/approvals/[id] — route handler", () => {
  it("returns the approval for a known id", async () => {
    const user = requireCurrentUser();
    const created = createApproval(user, baseRequest());
    const res = await approvalByIdGet(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval.id).toBe(created.id);
  });

  it("returns 403 for an unknown id (mirrors existing /api/risk-records behavior)", async () => {
    const res = await approvalByIdGet(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(res.status).toBe(403);
  });
});
