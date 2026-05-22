import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/src/server/auth";
import { __resetStoreForTests } from "@/src/server/store";
import { createApproval } from "@/src/server/approvals";
import { updateRiskRecordDecision } from "@/src/server/riskRecords";
import {
  __resetPolicyStoreForTests,
  evaluatePolicy,
  loadPolicySet,
  savePolicySet,
} from "@/src/server/policy";
import {
  evaluateActionForUser,
  listRunActionsForUser,
} from "@/src/server/policy/actions";
import type { PolicySetType } from "@/src/lib/policy-types";
import type { SessionUser } from "@/lib/types";
import { GET as policyGet, PUT as policyPut } from "@/app/api/v1/policy/route";
import { POST as evaluatePost } from "@/app/api/v1/approvals/evaluate/route";
import { GET as byRunGet } from "@/app/api/v1/approvals/by-run/[runId]/route";

beforeEach(() => {
  __resetStoreForTests();
  __resetPolicyStoreForTests();
});

const input = {
  action: "Deploy web v1.2.0 to staging",
  principal: { type: "user_id" as const, value: "user-77", role: "sre" },
  context: {
    agent_name: "Deploy Gatekeeper",
    agent_run_id: "run-42",
    action_type: "deploy",
    risk_level: "low" as const,
    summary: "Deploy web v1.2.0 to staging",
  },
};

function policySet(rules: PolicySetType["rules"]): PolicySetType {
  return {
    version: "v1",
    default_decision: "require_human",
    rules,
  };
}

function otherUser(): SessionUser {
  return {
    id: "other-user",
    name: "Other User",
    email: "other@example.com",
    role: "OWNER",
    organizationId: "other-org",
  };
}

describe("evaluatePolicy", () => {
  it("uses ordered first-match-wins semantics", () => {
    const result = evaluatePolicy(
      policySet([
        { id: "first", match: { action_types: ["deploy"] }, decision: "require_human" },
        { id: "second", match: { action_types: ["deploy"] }, decision: "auto_approve" },
      ]),
      input,
    );
    expect(result).toMatchObject({
      decision: "require_human",
      matched_rule_id: "first",
    });
  });

  it("lets an earlier block rule take precedence by ordering", () => {
    const result = evaluatePolicy(
      policySet([
        { id: "block-deploy", match: { action_types: ["deploy"] }, decision: "block" },
        { id: "allow-sre", match: { roles: ["sre"] }, decision: "auto_approve" },
      ]),
      input,
    );
    expect(result).toMatchObject({
      decision: "block",
      matched_rule_id: "block-deploy",
    });
  });

  it("matches minimum risk thresholds", () => {
    const result = evaluatePolicy(
      policySet([
        {
          id: "high-or-above",
          match: { min_risk_level: "high" },
          decision: "block",
        },
      ]),
      { ...input, context: { ...input.context, risk_level: "critical" } },
    );
    expect(result.decision).toBe("block");
  });

  it("defaults empty and unmatched policies to require_human", () => {
    expect(evaluatePolicy(policySet([]), input).decision).toBe("require_human");
    expect(
      evaluatePolicy(
        policySet([{ id: "refund", match: { action_types: ["refund"] }, decision: "block" }]),
        input,
      ).decision,
    ).toBe("require_human");
  });

  it("fails policy evaluation closed to require_human", () => {
    const result = evaluatePolicy(policySet([]), {
      ...input,
      context: { ...input.context, action_type: "" },
    });
    expect(result.decision).toBe("require_human");
    expect(result.reason).toContain("failed safe");
  });
});

describe("policy admin route and store", () => {
  it("returns the default tenant policy", async () => {
    const res = await policyGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy.default_decision).toBe("require_human");
  });

  it("replaces a valid policy and bumps the version", async () => {
    const res = await policyPut(
      new NextRequest("http://localhost/api/v1/policy", {
        method: "PUT",
        body: JSON.stringify(policySet([
          { id: "sre-low", match: { roles: ["sre"] }, decision: "auto_approve" },
        ])),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy.version).toMatch(/^v1\+updated\./);
    expect(body.policy.rules).toHaveLength(1);
  });

  it("rejects invalid policy JSON", async () => {
    const res = await policyPut(
      new NextRequest("http://localhost/api/v1/policy", {
        method: "PUT",
        body: JSON.stringify({ version: "v1", default_decision: "auto_approve", rules: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("keeps policy overrides tenant isolated", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "tenant-a", match: { roles: ["sre"] }, decision: "auto_approve" },
    ]));
    expect((await loadPolicySet(user.organizationId)).rules[0]?.id).toBe("tenant-a");
    expect(await loadPolicySet(otherUser().organizationId)).toMatchObject({
      version: "default-v1",
      rules: [],
    });
  });
});

describe("evaluate_action route and service", () => {
  it("auto-approves and writes an accepted policy audit record", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "sre-low-deploy", match: { roles: ["sre"], action_types: ["deploy"] }, decision: "auto_approve" },
    ]));

    const result = await evaluateActionForUser(user, input);
    const run = await listRunActionsForUser(user, "run-42", 50);

    expect(result.decision).toBe("auto_approve");
    expect(run.summary.auto_approved).toBe(1);
    expect(run.actions[0]).toMatchObject({
      decision_source: "policy_engine",
      status: "approved",
    });
  });

  it("blocks and writes a rejected policy audit record", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "block-db-drop", match: { action_types: ["db_drop"] }, decision: "block" },
    ]));

    const result = await evaluateActionForUser(user, {
      ...input,
      context: { ...input.context, action_type: "db_drop" },
    });
    const run = await listRunActionsForUser(user, "run-42", 50);

    expect(result.decision).toBe("block");
    expect(run.summary.denied_or_blocked).toBe(1);
    expect(run.actions[0]?.status).toBe("denied");
  });

  it("requires a human and writes no RiskRecord", async () => {
    const user = requireCurrentUser()!;
    const before = await listRunActionsForUser(user, "run-42", 50);
    const result = await evaluateActionForUser(user, {
      ...input,
      context: { ...input.context, risk_level: "critical" },
    });
    const after = await listRunActionsForUser(user, "run-42", 50);

    expect(result.decision).toBe("require_human");
    expect(result.suggested_request_approval_args?.context?.metadata).toMatchObject({
      agent_run_id: "run-42",
      action_type: "deploy",
      principal_role: "sre",
    });
    expect(after.total).toBe(before.total);
  });

  it("routes validation errors to HTTP 400", async () => {
    const res = await evaluatePost(
      new NextRequest("http://localhost/api/v1/approvals/evaluate", {
        method: "POST",
        body: JSON.stringify({ action: "no" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("keeps evaluation tenant isolated", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "tenant-a", match: { action_types: ["deploy"] }, decision: "auto_approve" },
    ]));
    const result = await evaluateActionForUser(otherUser(), input);
    expect(result.decision).toBe("require_human");
  });

  it("does not add RiskStatus enum values", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).not.toContain("AUTO_APPROVED");
    expect(schema).not.toContain("BLOCKED");
    expect(schema).not.toContain("CANCELLED");
  });
});

describe("list_run_actions route and rollup", () => {
  it("rolls up mixed policy and human decisions for one run", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "sre-low-deploy", match: { roles: ["sre"], action_types: ["deploy"] }, decision: "auto_approve" },
      { id: "block-db-drop", match: { action_types: ["db_drop"] }, decision: "block" },
    ]));
    await evaluateActionForUser(user, input);
    await evaluateActionForUser(user, {
      ...input,
      action: "Drop production database",
      context: { ...input.context, action_type: "db_drop", summary: "Drop production database" },
    });
    const human = createApproval(user, {
      action: { type: "production_deploy", summary: "Deploy web v1.2.0 to production", payload: {} },
      principal: { type: "user_id", value: "user-77" },
      context: {
        agent_name: "Deploy Gatekeeper",
        metadata: { agent_run_id: "run-42", principal_role: "sre", action_type: "deploy" },
      },
    });
    updateRiskRecordDecision(user, human.id, { action: "accept" });
    createApproval(user, {
      action: { type: "production_deploy", summary: "Deploy worker v1.2.0 to production", payload: {} },
      principal: { type: "user_id", value: "user-77" },
      context: {
        agent_name: "Deploy Gatekeeper",
        metadata: { agent_run_id: "run-42", principal_role: "sre", action_type: "deploy" },
      },
    });

    const res = await byRunGet(
      new NextRequest("http://localhost/api/v1/approvals/by-run/run-42"),
      { params: Promise.resolve({ runId: "run-42" }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary).toEqual({
      auto_approved: 1,
      human_approved: 1,
      denied_or_blocked: 1,
      pending: 1,
    });
  });

  it("returns zeros for an empty run", async () => {
    const user = requireCurrentUser()!;
    const result = await listRunActionsForUser(user, "missing-run", 50);
    expect(result).toMatchObject({
      agent_run_id: "missing-run",
      total: 0,
      summary: {
        auto_approved: 0,
        human_approved: 0,
        denied_or_blocked: 0,
        pending: 0,
      },
    });
  });

  it("keeps run actions tenant isolated", async () => {
    const user = requireCurrentUser()!;
    await savePolicySet(user, policySet([
      { id: "sre-low-deploy", match: { roles: ["sre"] }, decision: "auto_approve" },
    ]));
    await evaluateActionForUser(user, input);
    expect((await listRunActionsForUser(otherUser(), "run-42", 50)).total).toBe(0);
  });
});
