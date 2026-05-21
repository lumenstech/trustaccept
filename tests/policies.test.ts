import { describe, expect, it } from "vitest";
import {
  evaluateApprovalPolicy,
  listPolicies,
} from "@/src/server/policies";
import type { ApprovalRequestInputType } from "@/src/lib/approval-types";

function input(
  patch: Partial<ApprovalRequestInputType> & {
    actionType?: string;
    amount?: number;
  } = {},
): ApprovalRequestInputType {
  return {
    action: {
      type: patch.actionType ?? "unknown_kind",
      summary: "Some action summary",
      payload: {},
    },
    principal: { type: "email", value: "alex@example.com" },
    context: { amount: patch.amount },
    ...patch,
  };
}

describe("evaluateApprovalPolicy — ordered rules", () => {
  it("rule 1: production_deploy → require_approval, high, 600s expiry", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "production_deploy" }));
    expect(out.decision).toBe("require_approval");
    expect(out.policy_id).toBe("production-deploys-require-human-approval");
    expect(out.risk_level).toBe("high");
    expect(out.expires_at_seconds).toBe(600);
    expect(out.reason).toMatch(/production deploys/i);
  });

  it("rule 2: customer_data_export → require_approval, critical, 300s", () => {
    const out = evaluateApprovalPolicy(
      input({ actionType: "customer_data_export" }),
    );
    expect(out.decision).toBe("require_approval");
    expect(out.policy_id).toBe("customer-data-export-requires-approval");
    expect(out.risk_level).toBe("critical");
    expect(out.expires_at_seconds).toBe(300);
  });

  it("rule 3: api_key_* → require_approval, critical", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "api_key_create" }));
    expect(out.policy_id).toBe("secret-issuance-requires-admin-approval");
    expect(out.risk_level).toBe("critical");
  });

  it("rule 3: secret_* → require_approval, critical", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "secret_rotate" }));
    expect(out.policy_id).toBe("secret-issuance-requires-admin-approval");
    expect(out.risk_level).toBe("critical");
  });

  it("rule 4: payment > $5,000 → require_approval, high", () => {
    const out = evaluateApprovalPolicy(
      input({ actionType: "payment", amount: 5001 }),
    );
    expect(out.policy_id).toBe("high-dollar-payment-requires-approval");
    expect(out.risk_level).toBe("high");
  });

  it("rule 4 boundary: payment of exactly $5,000 does NOT match (>, not >=)", () => {
    const out = evaluateApprovalPolicy(
      input({ actionType: "payment", amount: 5000 }),
    );
    expect(out.policy_id).toBe("default-require-human-approval");
  });

  it("rule 4: payment without amount falls through to default", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "payment" }));
    expect(out.policy_id).toBe("default-require-human-approval");
  });

  it("rule 5: infrastructure_* → require_approval, high", () => {
    const out = evaluateApprovalPolicy(
      input({ actionType: "infrastructure_provision" }),
    );
    expect(out.policy_id).toBe("infrastructure-access-requires-approval");
    expect(out.risk_level).toBe("high");
  });

  it("rule 6: read_* with no amount → allow, low, no expiry", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "read_user_profile" }));
    expect(out.decision).toBe("allow");
    expect(out.policy_id).toBe("read-only-low-risk-auto-allow");
    expect(out.risk_level).toBe("low");
    expect(out.expires_at_seconds).toBeNull();
  });

  it("rule 6: report_* with no amount → allow, low", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "report_weekly" }));
    expect(out.decision).toBe("allow");
    expect(out.risk_level).toBe("low");
  });

  it("rule 6: read_* WITH amount → falls through to default (the amount kicks it out of auto-allow)", () => {
    const out = evaluateApprovalPolicy(
      input({ actionType: "read_billing_records", amount: 1 }),
    );
    expect(out.policy_id).toBe("default-require-human-approval");
    expect(out.decision).toBe("require_approval");
    expect(out.risk_level).toBe("medium");
  });

  it("default rule: unknown action → require_approval, medium, 3600s", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "some_brand_new_action" }));
    expect(out.decision).toBe("require_approval");
    expect(out.policy_id).toBe("default-require-human-approval");
    expect(out.risk_level).toBe("medium");
    expect(out.expires_at_seconds).toBe(3600);
  });
});

describe("evaluateApprovalPolicy — ordering invariants", () => {
  it("production_deploy is matched before infrastructure_* even if both could theoretically fit", () => {
    // production_deploy doesn't match infrastructure_, but this asserts
    // the first-match-wins contract for any future rule reshuffles.
    const out = evaluateApprovalPolicy(
      input({ actionType: "production_deploy" }),
    );
    expect(out.policy_id).toBe("production-deploys-require-human-approval");
  });

  it("api_key_* matches the secret rule before the read_ rule could ever see it", () => {
    const out = evaluateApprovalPolicy(input({ actionType: "api_key_read" }));
    expect(out.policy_id).toBe("secret-issuance-requires-admin-approval");
  });
});

describe("listPolicies", () => {
  it("returns one entry per rule plus the default", () => {
    const policies = listPolicies();
    const ids = policies.map((p) => p.policy_id);
    expect(ids).toContain("production-deploys-require-human-approval");
    expect(ids).toContain("customer-data-export-requires-approval");
    expect(ids).toContain("secret-issuance-requires-admin-approval");
    expect(ids).toContain("high-dollar-payment-requires-approval");
    expect(ids).toContain("infrastructure-access-requires-approval");
    expect(ids).toContain("read-only-low-risk-auto-allow");
    expect(ids).toContain("default-require-human-approval");
  });
});
