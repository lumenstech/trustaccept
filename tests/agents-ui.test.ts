import { describe, expect, it } from "vitest";
import {
  agentRiskTierTone,
  agentStatusTone,
  agentToFormInput,
  buildPatchBody,
  formatAllowedActionsCount,
  formatSpendCapsSummary,
  lifecyclePermissions,
  parseAllowedActions,
  validateAgentForm,
  type AgentCreateBody,
} from "@/lib/agents-ui";
import type { Agent } from "@/lib/types";

const fakeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: "11111111-1111-1111-1111-111111111111",
  tenantId: "demo-org",
  name: "support-copilot",
  ownerEmail: "ops@trustaccept.dev",
  environment: "prod",
  riskTier: "high",
  allowedActions: ["read.customer"],
  spendCaps: { daily_usd: 500 },
  status: "active",
  createdAt: "2026-05-13T00:00:00Z",
  updatedAt: "2026-05-13T00:00:00Z",
  ...overrides,
});

describe("agent list rendering helpers", () => {
  it("renders spend cap summary with a stable em-dash for empty caps", () => {
    expect(formatSpendCapsSummary({})).toBe("—");
  });

  it("orders cap parts per_txn → daily → weekly → monthly", () => {
    expect(
      formatSpendCapsSummary({
        monthly_usd: 1000,
        weekly_usd: 250,
        per_txn_usd: 25,
        daily_usd: 100,
      }),
    ).toBe("txn $25 · day $100 · wk $250 · mo $1000");
  });

  it("formats the allowed-actions count for table cells", () => {
    expect(formatAllowedActionsCount([])).toBe("None");
    expect(formatAllowedActionsCount(["x"])).toBe("1 action");
    expect(formatAllowedActionsCount(["x", "y", "z"])).toBe("3 actions");
  });

  it("maps status to a tone so the badge stays consistent", () => {
    expect(agentStatusTone("active")).toBe("success");
    expect(agentStatusTone("paused")).toBe("amber");
    expect(agentStatusTone("revoked")).toBe("danger");
  });

  it("maps risk tier to a tone", () => {
    expect(agentRiskTierTone("low")).toBe("neutral");
    expect(agentRiskTierTone("critical")).toBe("danger");
  });
});

describe("parseAllowedActions", () => {
  it("splits on commas and newlines, trims, drops empties, dedupes", () => {
    expect(
      parseAllowedActions("read.customer, draft.email\n  send.email \n read.customer"),
    ).toEqual(["read.customer", "draft.email", "send.email"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseAllowedActions("   \n  ")).toEqual([]);
  });
});

describe("validateAgentForm — agent create form validation", () => {
  const baseInput = {
    name: "support-copilot",
    owner_email: "ops@trustaccept.dev",
    environment: "prod" as const,
    risk_tier: "high" as const,
    allowed_actions_text: "read.customer, draft.email",
    spend_caps: { daily_usd: "500", per_txn_usd: "50" },
  };

  it("accepts a fully valid form and returns the strict POST body", () => {
    const result = validateAgentForm(baseInput);
    expect(result.ok).toBe(true);
    expect(result.body).toEqual({
      name: "support-copilot",
      owner_email: "ops@trustaccept.dev",
      environment: "prod",
      risk_tier: "high",
      allowed_actions: ["read.customer", "draft.email"],
      spend_caps: { daily_usd: 500, per_txn_usd: 50 },
    });
  });

  it("flags a missing name", () => {
    const result = validateAgentForm({ ...baseInput, name: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toMatch(/required/i);
  });

  it("flags a malformed owner email", () => {
    const result = validateAgentForm({ ...baseInput, owner_email: "not-an-email" });
    expect(result.ok).toBe(false);
    expect(result.errors.owner_email).toMatch(/valid email/i);
  });

  it("flags a negative spend cap", () => {
    const result = validateAgentForm({
      ...baseInput,
      spend_caps: { daily_usd: "-1" },
    });
    expect(result.ok).toBe(false);
    expect(result.errors["spend_caps.daily_usd"]).toMatch(/non-negative/);
  });

  it("treats blank caps as 'not set' rather than 0", () => {
    const result = validateAgentForm({
      ...baseInput,
      spend_caps: { per_txn_usd: "50", daily_usd: "", weekly_usd: "" },
    });
    expect(result.ok).toBe(true);
    expect(result.body?.spend_caps).toEqual({ per_txn_usd: 50 });
  });

  it("rejects an unknown environment value", () => {
    const result = validateAgentForm({
      ...baseInput,
      environment: "qa" as unknown as "prod",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.environment).toBeDefined();
  });

  it("omits department when blank", () => {
    const result = validateAgentForm({ ...baseInput, department: "  " });
    expect(result.ok).toBe(true);
    expect("department" in (result.body ?? {})).toBe(false);
  });
});

describe("pause / revoke button behavior", () => {
  it("active agent: pause + revoke both enabled, default labels", () => {
    const p = lifecyclePermissions(fakeAgent({ status: "active" }));
    expect(p.pauseEnabled).toBe(true);
    expect(p.revokeEnabled).toBe(true);
    expect(p.pauseLabel).toBe("Pause");
    expect(p.revokeLabel).toBe("Revoke");
    expect(p.revokeConfirmation).toMatch(/permanent/);
    expect(p.revokeConfirmation).toMatch(/cannot be reactivated/);
  });

  it("paused agent: pause disabled (already paused), revoke still enabled", () => {
    const p = lifecyclePermissions(fakeAgent({ status: "paused" }));
    expect(p.pauseEnabled).toBe(false);
    expect(p.pauseLabel).toBe("Paused");
    expect(p.revokeEnabled).toBe(true);
  });

  it("revoked agent: both buttons disabled, labels reflect terminal state", () => {
    const p = lifecyclePermissions(fakeAgent({ status: "revoked" }));
    expect(p.pauseEnabled).toBe(false);
    expect(p.revokeEnabled).toBe(false);
    expect(p.revokeLabel).toBe("Revoked");
  });

  it("revoke confirmation includes the agent name", () => {
    const p = lifecyclePermissions(fakeAgent({ name: "evil-twin" }));
    expect(p.revokeConfirmation).toContain('"evil-twin"');
  });
});

describe("agentToFormInput / buildPatchBody — edit form round-trip", () => {
  it("seeds the form state from a live agent", () => {
    const input = agentToFormInput(
      fakeAgent({
        name: "support-copilot",
        ownerEmail: "ops@trustaccept.dev",
        department: "Ops",
        environment: "staging",
        riskTier: "medium",
        allowedActions: ["read.customer", "draft.email"],
        spendCaps: { daily_usd: 500, per_txn_usd: 25 },
      }),
    );
    expect(input.name).toBe("support-copilot");
    expect(input.environment).toBe("staging");
    expect(input.risk_tier).toBe("medium");
    expect(input.allowed_actions_text).toBe("read.customer\ndraft.email");
    expect(input.spend_caps).toEqual({
      per_txn_usd: "25",
      daily_usd: "500",
      weekly_usd: "",
      monthly_usd: "",
    });
    expect(input.department).toBe("Ops");
  });

  it("treats a null department from the server as empty string", () => {
    const input = agentToFormInput({
      name: "n",
      ownerEmail: "o@x.dev",
      department: null,
      environment: "dev",
      riskTier: "low",
      allowedActions: [],
      spendCaps: {},
    });
    expect(input.department).toBe("");
  });

  const current: AgentCreateBody = {
    name: "support-copilot",
    owner_email: "ops@trustaccept.dev",
    department: "Ops",
    environment: "staging",
    risk_tier: "medium",
    allowed_actions: ["read.customer", "draft.email"],
    spend_caps: { daily_usd: 500, per_txn_usd: 25 },
  };

  it("returns an empty patch when nothing changed", () => {
    expect(buildPatchBody(current, { ...current })).toEqual({});
  });

  it("includes only the fields that differ", () => {
    const next: AgentCreateBody = {
      ...current,
      risk_tier: "high",
      spend_caps: { daily_usd: 750, per_txn_usd: 25 },
    };
    const patch = buildPatchBody(current, next);
    expect(patch).toEqual({
      risk_tier: "high",
      spend_caps: { daily_usd: 750, per_txn_usd: 25 },
    });
  });

  it("ignores allowed_actions when order and contents match", () => {
    const patch = buildPatchBody(current, {
      ...current,
      allowed_actions: ["read.customer", "draft.email"],
    });
    expect("allowed_actions" in patch).toBe(false);
  });

  it("detects an added action and patches the full new array", () => {
    const patch = buildPatchBody(current, {
      ...current,
      allowed_actions: ["read.customer", "draft.email", "send.email"],
    });
    expect(patch.allowed_actions).toEqual([
      "read.customer",
      "draft.email",
      "send.email",
    ]);
  });

  it("omits department from the patch when it was added back identically", () => {
    const patch = buildPatchBody(
      { ...current, department: "Ops" },
      { ...current, department: "Ops" },
    );
    expect("department" in patch).toBe(false);
  });
});
