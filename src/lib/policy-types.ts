import { z } from "zod";
import { ApprovalRequestInput } from "./approval-types";

export const PolicyDecision = z.enum([
  "auto_approve",
  "require_human",
  "block",
]);
export type PolicyDecisionType = z.infer<typeof PolicyDecision>;

export const PolicyRiskLevel = z.enum(["low", "medium", "high", "critical"]);
export type PolicyRiskLevelType = z.infer<typeof PolicyRiskLevel>;

export const PolicyRule = z.object({
  id: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  match: z.object({
    roles: z.array(z.string()).optional(),
    action_types: z.array(z.string()).optional(),
    min_risk_level: PolicyRiskLevel.optional(),
  }),
  decision: PolicyDecision,
});
export type PolicyRuleType = z.infer<typeof PolicyRule>;

export const PolicySet = z.object({
  version: z.string(),
  default_decision: z.literal("require_human"),
  rules: z.array(PolicyRule),
});
export type PolicySetType = z.infer<typeof PolicySet>;

export const EvaluateActionInput = z.object({
  action: z
    .string()
    .min(3)
    .max(200)
    .describe("Short imperative describing the action the agent wants to take"),
  principal: z
    .object({
      type: z.enum(["phone", "email", "user_id"]),
      value: z.string().min(3).max(200),
      role: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe("Principal role used for policy matching, e.g. 'sre'"),
    })
    .describe("Who is accountable for the action"),
  context: z.object({
    agent_name: z.string().min(1).max(100),
    agent_run_id: z.string().min(1).max(200).optional(),
    action_type: z
      .string()
      .min(1)
      .max(100)
      .describe("Coarse category used for policy matching, e.g. 'deploy'"),
    risk_level: PolicyRiskLevel.default("medium"),
    summary: z.string().min(1).max(1000),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  }),
});
export type EvaluateActionInputType = z.infer<typeof EvaluateActionInput>;

export const EvaluateActionOutput = z.object({
  decision: PolicyDecision,
  matched_rule_id: z
    .string()
    .nullable()
    .describe("ID of the policy rule that produced the decision; null for default fallthrough"),
  reason: z
    .string()
    .describe("Human-readable explanation of why this decision was reached"),
  suggested_request_approval_args: ApprovalRequestInput.nullable(),
  policy_set_version: z
    .string()
    .describe("Version/hash of the policy set evaluated, for audit reproducibility"),
  evaluated_at: z.string(),
});
export type EvaluateActionOutputType = z.infer<typeof EvaluateActionOutput>;

export const ListRunActionsInput = z.object({
  agent_run_id: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ListRunActionsInputType = z.infer<typeof ListRunActionsInput>;

export const RunActionStatus = z.enum(["pending", "approved", "denied", "expired"]);
export type RunActionStatus = z.infer<typeof RunActionStatus>;
export const RunActionDecisionSource = z.enum(["policy_engine", "human"]);
export type RunActionDecisionSource = z.infer<typeof RunActionDecisionSource>;

export const ListRunActionsOutput = z.object({
  agent_run_id: z.string(),
  actions: z.array(
    z.object({
      request_id: z.string(),
      action: z.string(),
      decision_source: RunActionDecisionSource,
      status: RunActionStatus,
      risk_level: PolicyRiskLevel,
      created_at: z.string(),
      decided_at: z.string().nullable(),
    }),
  ),
  total: z.number().int(),
  summary: z.object({
    auto_approved: z.number().int(),
    human_approved: z.number().int(),
    denied_or_blocked: z.number().int(),
    pending: z.number().int(),
  }),
});
export type ListRunActionsOutputType = z.infer<typeof ListRunActionsOutput>;
