import type { ApprovalRequestInputType } from "@/src/lib/approval-types";

/**
 * Pre-execution policy engine. Deterministic and rule-based — no LLM,
 * no ML, no DB lookups. Ordered rules, first match wins.
 *
 * Wiring: src/server/approvals.ts calls this immediately before
 * createRiskRecord. The decision then drives whether the wrapper
 * finalizes the record via updateRiskRecordDecision (allow/deny) or
 * leaves it PENDING for a human (require_approval).
 *
 * Rule registry lives in code because the MVP plan explicitly defers
 * a database-backed policy store and a policy editing UI. New rules
 * are added by editing RULES[] and shipping a release.
 */

export type PolicyDecision = "allow" | "require_approval" | "deny";
export type PolicyRiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyEvaluation {
  decision: PolicyDecision;
  policy_id: string;
  risk_level: PolicyRiskLevel;
  reason: string;
  expires_at_seconds: number | null;
}

/**
 * Default expiration per risk level. The wrapper turns this into an
 * absolute ISO timestamp at request time and stores it on the
 * RiskRecord. Rules can override by setting expires_at_seconds
 * explicitly on the rule (none do today).
 */
const DEFAULT_EXPIRATION_SECONDS: Record<PolicyRiskLevel, number | null> = {
  critical: 300,
  high: 600,
  medium: 3600,
  low: null,
};

const HIGH_DOLLAR_PAYMENT_THRESHOLD = 5000;

interface Rule {
  policy_id: string;
  decision: PolicyDecision;
  risk_level: PolicyRiskLevel;
  reason: string;
  matches: (input: ApprovalRequestInputType) => boolean;
}

const RULES: Rule[] = [
  {
    policy_id: "production-deploys-require-human-approval",
    decision: "require_approval",
    risk_level: "high",
    reason:
      "Production deploys require a documented human approval before execution.",
    matches: (i) => i.action.type === "production_deploy",
  },
  {
    policy_id: "customer-data-export-requires-approval",
    decision: "require_approval",
    risk_level: "critical",
    reason:
      "Customer data exports must be reviewed by a human approver before release.",
    matches: (i) => i.action.type === "customer_data_export",
  },
  {
    policy_id: "secret-issuance-requires-admin-approval",
    decision: "require_approval",
    risk_level: "critical",
    reason:
      "Issuing API keys or secrets requires admin review; secrets cannot be auto-allowed.",
    matches: (i) => /^(api_key_|secret_)/.test(i.action.type),
  },
  {
    policy_id: "high-dollar-payment-requires-approval",
    decision: "require_approval",
    risk_level: "high",
    reason: `Payments above $${HIGH_DOLLAR_PAYMENT_THRESHOLD.toLocaleString("en-US")} require human approval.`,
    matches: (i) =>
      i.action.type === "payment" &&
      typeof i.context?.amount === "number" &&
      i.context.amount > HIGH_DOLLAR_PAYMENT_THRESHOLD,
  },
  {
    policy_id: "infrastructure-access-requires-approval",
    decision: "require_approval",
    risk_level: "high",
    reason: "Infrastructure-modifying actions require human approval.",
    matches: (i) => /^infrastructure_/.test(i.action.type),
  },
  {
    policy_id: "read-only-low-risk-auto-allow",
    decision: "allow",
    risk_level: "low",
    reason:
      "Read-only or report actions with no monetary impact are auto-allowed.",
    matches: (i) =>
      /^(read_|report_)/.test(i.action.type) && i.context?.amount == null,
  },
];

const DEFAULT_RULE = {
  policy_id: "default-require-human-approval",
  decision: "require_approval" as PolicyDecision,
  risk_level: "medium" as PolicyRiskLevel,
  reason: "No matching policy; defaulting to human approval.",
};

export function evaluateApprovalPolicy(
  input: ApprovalRequestInputType,
): PolicyEvaluation {
  for (const rule of RULES) {
    if (rule.matches(input)) {
      return {
        decision: rule.decision,
        policy_id: rule.policy_id,
        risk_level: rule.risk_level,
        reason: rule.reason,
        expires_at_seconds: DEFAULT_EXPIRATION_SECONDS[rule.risk_level],
      };
    }
  }
  return {
    decision: DEFAULT_RULE.decision,
    policy_id: DEFAULT_RULE.policy_id,
    risk_level: DEFAULT_RULE.risk_level,
    reason: DEFAULT_RULE.reason,
    expires_at_seconds: DEFAULT_EXPIRATION_SECONDS[DEFAULT_RULE.risk_level],
  };
}

/**
 * Exposed for documentation surfaces (admin UI, docs page). Not used
 * by the runtime engine, which iterates RULES directly.
 */
export function listPolicies(): Array<Omit<Rule, "matches">> {
  return RULES.map(({ matches: _ignored, ...meta }) => meta).concat([
    {
      policy_id: DEFAULT_RULE.policy_id,
      decision: DEFAULT_RULE.decision,
      risk_level: DEFAULT_RULE.risk_level,
      reason: DEFAULT_RULE.reason,
    },
  ]);
}
