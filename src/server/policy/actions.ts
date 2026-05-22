import type { RiskRecord, SessionUser, SourceReference } from "@/lib/types";
import type { ApprovalRequestInputType } from "@/src/lib/approval-types";
import {
  type EvaluateActionInputType,
  type EvaluateActionOutputType,
  type ListRunActionsOutputType,
  type RunActionDecisionSource,
  type RunActionStatus,
  type PolicyDecisionType,
} from "@/src/lib/policy-types";
import {
  createRiskRecordAsync,
  listRiskRecordsForOrganizationAsync,
  updateRiskRecordDecisionAsync,
  type RiskRecordCreateData,
} from "../riskRecords";
import { evaluatePolicy, loadPolicySet } from "./index";

const POLICY_SYSTEM = "policy_engine";
const MCP_SYSTEM = "trustaccept_mcp";

export async function evaluateActionForUser(
  user: SessionUser,
  input: EvaluateActionInputType,
): Promise<EvaluateActionOutputType> {
  const policySet = await loadPolicySet(user.organizationId);
  const evaluatedAt = new Date().toISOString();
  const result = evaluatePolicy(policySet, input);
  const suggested = buildSuggestedApprovalArgs(input);

  if (result.decision !== "require_human") {
    await writePolicyDecisionRecord(user, input, result.decision, {
      matchedRuleId: result.matched_rule_id,
      reason: result.reason,
      version: policySet.version,
    });
  }

  return {
    decision: result.decision,
    matched_rule_id: result.matched_rule_id,
    reason: result.reason,
    suggested_request_approval_args:
      result.decision === "require_human" ? suggested : null,
    policy_set_version: policySet.version,
    evaluated_at: evaluatedAt,
  };
}

function buildSuggestedApprovalArgs(
  input: EvaluateActionInputType,
): ApprovalRequestInputType {
  return {
    action: {
      type: input.context.action_type,
      summary: approvalSummary(input.context.summary),
      payload: input.context.metadata ?? {},
    },
    principal: {
      type: input.principal.type,
      value: input.principal.value,
    },
    context: {
      agent_name: input.context.agent_name,
      business_justification: input.action,
      metadata: {
        ...(input.context.metadata ?? {}),
        agent_run_id: input.context.agent_run_id,
        action_type: input.context.action_type,
        principal_role: input.principal.role,
      },
    },
  };
}

function approvalSummary(summary: string): string {
  const trimmed = summary.trim();
  if (trimmed.length >= 4) return trimmed.slice(0, 280);
  return `${trimmed} action`.slice(0, 280);
}

async function writePolicyDecisionRecord(
  user: SessionUser,
  input: EvaluateActionInputType,
  decision: Exclude<PolicyDecisionType, "require_human">,
  policy: { matchedRuleId: string | null; reason: string; version: string },
): Promise<RiskRecord> {
  const created = await createRiskRecordAsync(user, buildRecordData(input, policy));
  const actor = syntheticPolicyActor(user, policy.matchedRuleId ?? "default");
  return updateRiskRecordDecisionAsync(actor, created.id, {
    action: decision === "auto_approve" ? "accept" : "reject",
    decisionNote: policy.reason,
  });
}

function buildRecordData(
  input: EvaluateActionInputType,
  policy: { matchedRuleId: string | null; reason: string; version: string },
): RiskRecordCreateData {
  return {
    module: "ai-action-gate",
    title: input.context.summary,
    description: `Advisory policy decision for ${input.context.action_type}: ${input.action}`,
    sourceSystem: "trustaccept-mcp",
    sourceType: "policy_evaluation",
    riskLevel: input.context.risk_level,
    owner: input.principal.value,
    department: "AI Agents",
    compensatingControls: "Policy decision point evaluated before agent action.",
    evidenceSummary: "Policy decision, matched rule, and run context captured for audit.",
    businessJustification: input.action,
    technicalContext: policy.reason,
    frameworkTags: [],
    sourceReferences: buildPolicySourceReferences(input, policy),
  };
}

function buildPolicySourceReferences(
  input: EvaluateActionInputType,
  policy: { matchedRuleId: string | null; version: string },
): SourceReference[] {
  const refs: SourceReference[] = [
    {
      label: "decision_source",
      system: POLICY_SYSTEM,
      externalId: policy.matchedRuleId ?? "default",
    },
    {
      label: "policy_set_version",
      system: POLICY_SYSTEM,
      externalId: policy.version,
    },
    {
      label: "approval_principal",
      system: input.principal.type,
      externalId: input.principal.value,
    },
    {
      label: "agent_name",
      system: MCP_SYSTEM,
      externalId: input.context.agent_name,
    },
    {
      label: "action_type",
      system: MCP_SYSTEM,
      externalId: input.context.action_type,
    },
  ];
  if (input.context.agent_run_id) {
    refs.push({
      label: "agent_run_id",
      system: MCP_SYSTEM,
      externalId: input.context.agent_run_id,
    });
  }
  if (input.principal.role) {
    refs.push({
      label: "principal_role",
      system: input.principal.type,
      externalId: input.principal.role,
    });
  }
  return refs;
}

function syntheticPolicyActor(
  caller: SessionUser,
  ruleId: string,
): SessionUser {
  return {
    id: `policy:${ruleId}`,
    name: `policy:${ruleId}`,
    email: "policy@trustaccept.local",
    role: "OWNER",
    organizationId: caller.organizationId,
  };
}

export async function listRunActionsForUser(
  user: SessionUser,
  agentRunId: string,
  limit: number,
): Promise<ListRunActionsOutputType> {
  const records = (await listRiskRecordsForOrganizationAsync(user))
    .filter((record) => record.module === "ai-action-gate")
    .filter((record) => findRef(record, "agent_run_id") === agentRunId)
    .slice(0, limit);

  const actions = records.map((record) => {
    const decisionSource: RunActionDecisionSource =
      findRefSystem(record, "decision_source") === POLICY_SYSTEM
      ? "policy_engine"
      : "human";
    return {
      request_id: record.id,
      action: record.title,
      decision_source: decisionSource,
      status: presentationStatus(record.status),
      risk_level: record.riskLevel,
      created_at: record.createdAt ?? "",
      decided_at: record.decisionAt ?? null,
    };
  });

  return {
    agent_run_id: agentRunId,
    actions,
    total: actions.length,
    summary: {
      auto_approved: actions.filter(
        (action) =>
          action.decision_source === "policy_engine" &&
          action.status === "approved",
      ).length,
      human_approved: actions.filter(
        (action) =>
          action.decision_source === "human" && action.status === "approved",
      ).length,
      denied_or_blocked: actions.filter((action) => action.status === "denied").length,
      pending: actions.filter((action) => action.status === "pending").length,
    },
  };
}

function findRef(record: RiskRecord, label: string): string | null {
  const match = record.sourceReferences.find((ref) => ref.label === label);
  return match?.externalId ?? null;
}

function findRefSystem(record: RiskRecord, label: string): string | null {
  const match = record.sourceReferences.find((ref) => ref.label === label);
  return match?.system ?? null;
}

function presentationStatus(status: RiskRecord["status"]): RunActionStatus {
  if (status === "accepted") return "approved";
  if (status === "rejected") return "denied";
  if (status === "expired") return "expired";
  return "pending";
}
