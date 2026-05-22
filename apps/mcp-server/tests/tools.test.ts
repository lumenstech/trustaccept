import { describe, expect, it, vi } from "vitest";
import { ApprovalsClient } from "../src/client.js";
import {
  TOOL_DEFINITIONS,
  handleEvaluateAction,
  handleGetApprovalStatus,
  handleListPendingApprovals,
  handleListRunActions,
  handleRequestApproval,
} from "../src/tools.js";

type FetchResponder = (
  url: string,
  init?: RequestInit,
) => Response | Promise<Response>;

function fakeFetch(responder: FetchResponder) {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return Promise.resolve(responder(url, init));
  });
}

function makeClient(fetchImpl: ReturnType<typeof fakeFetch>) {
  return new ApprovalsClient({
    baseUrl: "http://api.test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

const lockedApproval = {
  id: "ra-test-1",
  status: "pending",
  action: { type: "production_deploy", summary: "Deploy v2.4.1 to production" },
  principal: { type: "email", value: "alex@example.com" },
  context: {
    agent_name: "release-bot",
    environment: "production",
    amount: null,
    resource: null,
    business_justification: "Scheduled weekly release.",
  },
  policy_id: null,
  risk_level: "medium",
  policy_reason: null,
  action_hash: null,
  tool_id: "trustaccept.request_approval.v1",
  receipt_jwt: null,
  expires_at: null,
  decided_by: null,
  decision_actor_type: null,
  decided_at: null,
  created_at: "2026-05-20T22:00:00.000Z",
  updated_at: "2026-05-20T22:00:00.000Z",
  organization_id: "demo-org",
};

const RESERVED_FIELDS = [
  "policy_id",
  "risk_level",
  "policy_reason",
  "action_hash",
  "tool_id",
  "receipt_jwt",
  "expires_at",
  "decided_by",
  "decision_actor_type",
  "decided_at",
];

describe("TOOL_DEFINITIONS", () => {
  it("declares exactly the five locked tool names in the documented order", () => {
    expect(TOOL_DEFINITIONS.map((t) => t.name)).toEqual([
      "request_approval",
      "get_approval_status",
      "list_pending_approvals",
      "evaluate_action",
      "list_run_actions",
    ]);
  });

  it("documents the common action types in request_approval", () => {
    const def = TOOL_DEFINITIONS.find((t) => t.name === "request_approval")!;
    expect(def.description).toContain("production_deploy");
    expect(def.description).toContain("customer_data_export");
    expect(def.description).toContain("api_key_");
    expect(def.description).toContain("payment");
    expect(def.description).toContain("infrastructure_");
    expect(def.description).toContain("read_");
  });

  it("documents the receipt_jwt null-while-pending invariant", () => {
    const get = TOOL_DEFINITIONS.find((t) => t.name === "get_approval_status")!;
    expect(get.description).toContain("receipt_jwt");
    expect(get.description.toLowerCase()).toContain("null");
    const req = TOOL_DEFINITIONS.find((t) => t.name === "request_approval")!;
    expect(req.description).toContain("receipt_jwt");
  });

  it("documents the 120-character principal.value cap", () => {
    const req = TOOL_DEFINITIONS.find((t) => t.name === "request_approval")!;
    expect(req.description).toContain("120");
    const list = TOOL_DEFINITIONS.find((t) => t.name === "list_pending_approvals")!;
    expect(list.description).toContain("120");
  });
});

describe("evaluate_action", () => {
  it("POSTs the advisory policy evaluation input", async () => {
    const fetchImpl = fakeFetch((url, init) => {
      expect(url).toBe("http://api.test/api/v1/approvals/evaluate");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toMatchObject({
        action: "Deploy web v1.2.0 to staging",
        principal: { type: "user_id", value: "user-77", role: "sre" },
        context: {
          agent_name: "Deploy Gatekeeper",
          agent_run_id: "run-42",
          action_type: "deploy",
          risk_level: "low",
          summary: "Deploy web v1.2.0 to staging",
        },
      });
      return new Response(
        JSON.stringify({
          decision: "auto_approve",
          matched_rule_id: "sre-low-deploy",
          reason: "Matched policy rule sre-low-deploy.",
          suggested_request_approval_args: null,
          policy_set_version: "v1",
          evaluated_at: "2026-05-22T13:00:00.000Z",
        }),
      );
    });

    const result = await handleEvaluateAction(makeClient(fetchImpl), {
      action: "Deploy web v1.2.0 to staging",
      principal: { type: "user_id", value: "user-77", role: "sre" },
      context: {
        agent_name: "Deploy Gatekeeper",
        agent_run_id: "run-42",
        action_type: "deploy",
        risk_level: "low",
        summary: "Deploy web v1.2.0 to staging",
      },
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text).decision).toBe("auto_approve");
  });

  it("rejects invalid evaluate_action input without an HTTP call", async () => {
    const fetchImpl = fakeFetch(() => new Response("{}"));
    const result = await handleEvaluateAction(makeClient(fetchImpl), {
      action: "no",
    });
    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("list_run_actions", () => {
  it("GETs by-run endpoint with encoded run id and limit", async () => {
    const fetchImpl = fakeFetch((url, init) => {
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/v1/approvals/by-run/run%2042");
      expect(parsed.searchParams.get("limit")).toBe("25");
      expect(init?.method ?? "GET").toBe("GET");
      return new Response(
        JSON.stringify({
          agent_run_id: "run 42",
          actions: [],
          total: 0,
          summary: {
            auto_approved: 0,
            human_approved: 0,
            denied_or_blocked: 0,
            pending: 0,
          },
        }),
      );
    });

    const result = await handleListRunActions(makeClient(fetchImpl), {
      agent_run_id: "run 42",
      limit: 25,
    });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text).summary.pending).toBe(0);
  });

  it("rejects missing agent_run_id without an HTTP call", async () => {
    const fetchImpl = fakeFetch(() => new Response("{}"));
    const result = await handleListRunActions(makeClient(fetchImpl), {});
    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("request_approval — happy path", () => {
  it("POSTs the locked input shape to /api/v1/approvals", async () => {
    const fetchImpl = fakeFetch((url, init) => {
      expect(url).toBe("http://api.test/api/v1/approvals");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({
        action: {
          type: "production_deploy",
          summary: "Deploy v2.4.1 to production",
          payload: { commit: "abc1234" },
        },
        principal: { type: "email", value: "alex@example.com" },
        context: { agent_name: "release-bot" },
      });
      return new Response(JSON.stringify({ approval: lockedApproval }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: {
        type: "production_deploy",
        summary: "Deploy v2.4.1 to production",
        payload: { commit: "abc1234" },
      },
      principal: { type: "email", value: "alex@example.com" },
      context: { agent_name: "release-bot" },
    });

    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.approval.id).toBe("ra-test-1");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns a payload containing every reserved locked-output field", async () => {
    const fetchImpl = fakeFetch(
      () =>
        new Response(JSON.stringify({ approval: lockedApproval }), {
          status: 201,
        }),
    );
    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: { type: "production_deploy", summary: "Deploy v2.4.1" },
      principal: { type: "email", value: "alex@example.com" },
    });
    const parsed = JSON.parse(result.content[0].text);
    for (const field of RESERVED_FIELDS) {
      expect(parsed.approval).toHaveProperty(field);
    }
  });
});

describe("request_approval — consolidated-schema validation", () => {
  // Block 4 follow-up: the schema consolidation moved MCP off its own
  // copy of the Zod schemas. This test proves the shared schema (now
  // imported from src/lib/approval-types.ts) actually accepts a
  // wrapper response with the Block-4 fields populated — not just
  // the Block-2 all-nulls reality the original duplicate covered.
  it("parses a wrapper response with populated policy_id, risk_level, action_hash, expires_at", async () => {
    const populated = {
      ...lockedApproval,
      policy_id: "production-deploys-require-human-approval",
      risk_level: "high",
      policy_reason: "Production deploys require human approval.",
      action_hash:
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      expires_at: "2026-05-21T04:01:25.493Z",
    };
    const fetchImpl = fakeFetch(
      () =>
        new Response(JSON.stringify({ approval: populated }), { status: 201 }),
    );
    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: {
        type: "production_deploy",
        summary: "Deploy v2.4.1 to production",
      },
      principal: { type: "email", value: "alex@example.com" },
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.approval.policy_id).toBe(
      "production-deploys-require-human-approval",
    );
    expect(parsed.approval.risk_level).toBe("high");
    expect(parsed.approval.policy_reason).toBe(
      "Production deploys require human approval.",
    );
    expect(parsed.approval.action_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(parsed.approval.expires_at).toBe("2026-05-21T04:01:25.493Z");
  });
});

describe("request_approval — error paths", () => {
  it("returns isError=true when the input fails schema validation (no HTTP call)", async () => {
    const fetchImpl = fakeFetch(() => new Response("{}"));
    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: { type: "x", summary: "no" }, // summary too short
      principal: { type: "email", value: "alex@example.com" },
    });
    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects principal.value over 120 characters at the schema boundary", async () => {
    const fetchImpl = fakeFetch(() => new Response("{}"));
    const overflow = "a".repeat(121);
    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: { type: "x", summary: "Deploy v1.0.0 stable" },
      principal: { type: "email", value: overflow },
    });
    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces HTTP errors (e.g. 500) as isError with status code", async () => {
    const fetchImpl = fakeFetch(
      () => new Response("server down", { status: 500 }),
    );
    const result = await handleRequestApproval(makeClient(fetchImpl), {
      action: { type: "production_deploy", summary: "Deploy v2.4.1 to production" },
      principal: { type: "email", value: "alex@example.com" },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("500");
  });
});

describe("get_approval_status", () => {
  it("GETs /api/v1/approvals/[id] with the URL-encoded request_id", async () => {
    const fetchImpl = fakeFetch((url, init) => {
      expect(url).toBe("http://api.test/api/v1/approvals/ra-test-1");
      expect(init?.method ?? "GET").toBe("GET");
      return new Response(JSON.stringify({ approval: lockedApproval }));
    });

    const result = await handleGetApprovalStatus(makeClient(fetchImpl), {
      request_id: "ra-test-1",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.approval.id).toBe("ra-test-1");
    for (const field of RESERVED_FIELDS) {
      expect(parsed.approval).toHaveProperty(field);
    }
  });

  it("URL-encodes ids containing special characters", async () => {
    const fetchImpl = fakeFetch((url) => {
      expect(url).toBe("http://api.test/api/v1/approvals/ra%20with%20space");
      return new Response(JSON.stringify({ approval: lockedApproval }));
    });
    await handleGetApprovalStatus(makeClient(fetchImpl), {
      request_id: "ra with space",
    });
  });

  it("requires the request_id field", async () => {
    const fetchImpl = fakeFetch(() => new Response("{}"));
    const result = await handleGetApprovalStatus(makeClient(fetchImpl), {});
    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("list_pending_approvals", () => {
  it("serializes the principal into status=pending + principal_* query params", async () => {
    const fetchImpl = fakeFetch((url) => {
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/v1/approvals");
      expect(parsed.searchParams.get("status")).toBe("pending");
      expect(parsed.searchParams.get("principal_type")).toBe("email");
      expect(parsed.searchParams.get("principal_value")).toBe("alex@example.com");
      return new Response(
        JSON.stringify({ approvals: [lockedApproval] }),
      );
    });

    const result = await handleListPendingApprovals(makeClient(fetchImpl), {
      principal_type: "email",
      principal_value: "alex@example.com",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(1);
    expect(parsed.approvals[0].id).toBe("ra-test-1");
  });

  it("forwards the optional limit param", async () => {
    const fetchImpl = fakeFetch((url) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get("limit")).toBe("5");
      return new Response(JSON.stringify({ approvals: [] }));
    });
    await handleListPendingApprovals(makeClient(fetchImpl), { limit: 5 });
  });

  it("treats undefined/missing args as 'no filters' rather than failing", async () => {
    const fetchImpl = fakeFetch((url) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get("status")).toBe("pending");
      expect(parsed.searchParams.get("principal_type")).toBeNull();
      return new Response(JSON.stringify({ approvals: [] }));
    });
    const result = await handleListPendingApprovals(makeClient(fetchImpl), undefined);
    expect(result.isError).not.toBe(true);
  });
});

describe("ApprovalsClient — auth/header behavior", () => {
  it("sends the ta_session cookie when an apiKey is configured", async () => {
    const fetchImpl = fakeFetch((_url, init) => {
      const cookie = (init?.headers as Headers).get("cookie");
      expect(cookie).toBe("ta_session=demo-token");
      return new Response(JSON.stringify({ approval: lockedApproval }), {
        status: 201,
      });
    });
    const client = new ApprovalsClient({
      baseUrl: "http://api.test",
      apiKey: "demo-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.requestApproval({
      action: {
        type: "production_deploy",
        summary: "Deploy v2.4.1 to production",
        payload: {},
      },
      principal: { type: "email", value: "alex@example.com" },
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("does not send a cookie header when no apiKey is set", async () => {
    const fetchImpl = fakeFetch((_url, init) => {
      const cookie = (init?.headers as Headers).get("cookie");
      expect(cookie).toBeNull();
      return new Response(JSON.stringify({ approval: lockedApproval }), {
        status: 201,
      });
    });
    const client = new ApprovalsClient({
      baseUrl: "http://api.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.requestApproval({
      action: {
        type: "production_deploy",
        summary: "Deploy v2.4.1 to production",
        payload: {},
      },
      principal: { type: "email", value: "alex@example.com" },
    });
  });
});
