import defaultPolicySet from "@/config/policy.default.json";
import type { SessionUser } from "@/lib/types";
import {
  EvaluateActionInput,
  PolicySet,
  type EvaluateActionInputType,
  type PolicyDecisionType,
  type PolicyRiskLevelType,
  type PolicyRuleType,
  type PolicySetType,
} from "@/src/lib/policy-types";
import { recordAuditEventAsync } from "../auditLogs";

const RISK_RANK: Record<PolicyRiskLevelType, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_POLICY_OVERRIDES__: Map<string, PolicySetType> | undefined;
}

function overrideStore(): Map<string, PolicySetType> {
  if (!globalThis.__TRUSTACCEPT_POLICY_OVERRIDES__) {
    globalThis.__TRUSTACCEPT_POLICY_OVERRIDES__ = new Map();
  }
  return globalThis.__TRUSTACCEPT_POLICY_OVERRIDES__;
}

function defaultSet(): PolicySetType {
  return PolicySet.parse(defaultPolicySet);
}

function tenantKey(tenantId: string): string {
  return tenantId;
}

export async function loadPolicySet(tenantId: string): Promise<PolicySetType> {
  return overrideStore().get(tenantKey(tenantId)) ?? defaultSet();
}

export async function savePolicySet(
  actor: SessionUser,
  set: PolicySetType,
): Promise<PolicySetType> {
  const parsed = PolicySet.parse({
    ...set,
    version: nextVersion(set.version),
  });
  overrideStore().set(tenantKey(actor.organizationId), parsed);
  await recordAuditEventAsync({
    eventType: "risk_record.updated",
    actor,
    organizationId: actor.organizationId,
    metadata: {
      action: "policy.changed",
      policy_set_version: parsed.version,
      rules: parsed.rules.map((rule) => rule.id),
    },
  });
  return parsed;
}

function nextVersion(version: string): string {
  return `${version.replace(/\+updated\.\d+$/, "")}+updated.${Date.now()}`;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecisionType;
  matched_rule_id: string | null;
  reason: string;
}

export function evaluatePolicy(
  set: PolicySetType,
  rawInput: EvaluateActionInputType,
): PolicyEvaluationResult {
  try {
    const input = EvaluateActionInput.parse(rawInput);
    for (const rule of set.rules) {
      if (ruleMatches(rule, input)) {
        return {
          decision: rule.decision,
          matched_rule_id: rule.id,
          reason: rule.description ?? `Matched policy rule ${rule.id}.`,
        };
      }
    }
    return {
      decision: "require_human",
      matched_rule_id: null,
      reason: "No policy rule matched; defaulting to human approval.",
    };
  } catch (err) {
    return {
      decision: "require_human",
      matched_rule_id: null,
      reason: `Policy evaluation failed safe: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

function ruleMatches(
  rule: PolicyRuleType,
  input: EvaluateActionInputType,
): boolean {
  const { match } = rule;
  if (match.roles?.length && !input.principal.role) return false;
  if (
    match.roles?.length &&
    !match.roles.some((role) => role.toLowerCase() === input.principal.role?.toLowerCase())
  ) {
    return false;
  }
  if (
    match.action_types?.length &&
    !match.action_types.some(
      (actionType) => actionType.toLowerCase() === input.context.action_type.toLowerCase(),
    )
  ) {
    return false;
  }
  if (match.min_risk_level) {
    return RISK_RANK[input.context.risk_level] >= RISK_RANK[match.min_risk_level];
  }
  return true;
}

export function __resetPolicyStoreForTests(): void {
  globalThis.__TRUSTACCEPT_POLICY_OVERRIDES__ = new Map();
}
