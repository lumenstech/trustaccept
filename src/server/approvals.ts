import type { RiskLevel, RiskRecord, RiskStatus, SessionUser, SourceReference } from "@/lib/types";
import {
  createRiskRecord,
  getRiskRecordForOrganization,
  listRiskRecordsForOrganization,
  updateRiskRecordDecision,
  type RiskRecordCreateData,
} from "./riskRecords";
import type {
  ApprovalListQueryInputType,
  ApprovalRecord,
  ApprovalRequestInputType,
  ApprovalRiskLevel,
  ApprovalStatus,
  DecisionActorType,
  PrincipalType,
} from "@/src/lib/approval-types";

/**
 * Wrapper around the existing RiskRecord services that exposes the
 * locked MCP-facing input/output shape. See apps/mcp-server/FIELD_MAPPING.md
 * for the storage contract that this module implements.
 *
 * Block 2 ships a no-op policy stub (always "require_approval", medium).
 * Block 4 will replace `evaluatePolicyStub` with the real engine in
 * src/server/policies.ts without changing this module's public surface.
 */

const REFERENCE_SYSTEM = "trustaccept";

const REF_LABELS = {
  actionType: "Action type",
  principalType: "Principal type",
  principalValue: "Principal value",
  agent: "Agent",
  environment: "Environment",
  amount: "Amount",
  resource: "Resource",
  toolId: "Tool ID",
  policy: "Policy",
  actionHash: "Action hash",
} as const;

const STATIC_COMPENSATING_CONTROLS =
  "Pre-execution approval gate. Action will not execute until this record resolves to ACCEPTED.";
const STATIC_EVIDENCE_SUMMARY =
  "Action hash and policy decision captured at request time; signed receipt JWT issued on resolution.";

interface PolicyEvaluation {
  decision: "allow" | "require_approval" | "deny";
  policy_id: string | null;
  risk_level: RiskLevel;
  reason: string | null;
  expires_at_seconds: number | null;
}

/**
 * Block 2 no-op policy. Always returns require_approval / medium so the
 * wrapper has a non-null riskLevel to satisfy the underlying schema, but
 * the policy_id / reason / expiry remain null until Block 4 wires the
 * real engine. The MCP output for these fields therefore returns null
 * during Block 2.
 */
function evaluatePolicyStub(_input: ApprovalRequestInputType): PolicyEvaluation {
  return {
    decision: "require_approval",
    policy_id: null,
    risk_level: "medium",
    reason: null,
    expires_at_seconds: null,
  };
}

function buildSourceReferences(
  input: ApprovalRequestInputType,
  policy: PolicyEvaluation,
): SourceReference[] {
  const ctx = input.context ?? {};
  const refs: SourceReference[] = [
    {
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.actionType,
      externalId: input.action.type,
    },
    {
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.principalType,
      externalId: input.principal.type,
    },
    {
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.principalValue,
      externalId: input.principal.value,
    },
  ];
  if (ctx.agent_name) {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.agent,
      externalId: ctx.agent_name,
    });
  }
  if (ctx.environment) {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.environment,
      externalId: ctx.environment,
    });
  }
  if (typeof ctx.amount === "number") {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.amount,
      externalId: String(ctx.amount),
    });
  }
  if (ctx.resource) {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.resource,
      externalId: ctx.resource,
    });
  }
  if (input.tool_id) {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.toolId,
      externalId: input.tool_id,
    });
  }
  if (policy.policy_id) {
    refs.push({
      system: REFERENCE_SYSTEM,
      label: REF_LABELS.policy,
      externalId: policy.policy_id,
    });
  }
  return refs;
}

function buildCreateData(
  input: ApprovalRequestInputType,
  policy: PolicyEvaluation,
): RiskRecordCreateData {
  const ctx = input.context ?? {};
  const agentLabel = ctx.agent_name ?? "unnamed agent";
  return {
    module: "ai-action-gate",
    title: input.action.summary,
    description: `Agent action request from ${agentLabel}. Action type: ${input.action.type}.`,
    sourceSystem: "trustaccept-mcp",
    sourceType: "agent_action_request",
    riskLevel: policy.risk_level,
    owner: input.principal.value,
    department: ctx.environment ?? "AI Agents",
    expirationDate: computeExpirationIso(policy.expires_at_seconds),
    compensatingControls: STATIC_COMPENSATING_CONTROLS,
    evidenceSummary: STATIC_EVIDENCE_SUMMARY,
    businessJustification:
      ctx.business_justification ??
      `Submitted via TrustAccept MCP by ${agentLabel}. No business justification provided.`,
    technicalContext: policy.reason ?? "",
    frameworkTags: [],
    sourceReferences: buildSourceReferences(input, policy),
  };
}

function computeExpirationIso(seconds: number | null): string | undefined {
  if (seconds == null) return undefined;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function syntheticPolicyActor(
  caller: SessionUser,
  policyId: string,
): SessionUser {
  return {
    id: `policy:${policyId}`,
    name: `policy:${policyId}`,
    email: "policy@trustaccept.local",
    role: "OWNER",
    organizationId: caller.organizationId,
  };
}

function findRef(record: RiskRecord, label: string): string | null {
  const match = record.sourceReferences.find((r) => r.label === label);
  return match?.externalId ?? null;
}

function findAmount(record: RiskRecord): number | null {
  const raw = findRef(record, REF_LABELS.amount);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function decisionActorType(record: RiskRecord): DecisionActorType | null {
  if (!record.decisionBy) return null;
  return record.decisionBy.startsWith("policy:") ? "policy" : "human";
}

function presentationStatus(record: RiskRecord): ApprovalStatus {
  if (record.status === "pending" && record.expirationDate) {
    const expiresAt = new Date(record.expirationDate).getTime();
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      return "expired";
    }
  }
  return record.status as ApprovalStatus;
}

export function toApprovalRecord(record: RiskRecord): ApprovalRecord {
  const principalTypeRaw = findRef(record, REF_LABELS.principalType);
  const principalType = (principalTypeRaw === "email" ||
    principalTypeRaw === "phone" ||
    principalTypeRaw === "user_id")
    ? (principalTypeRaw as PrincipalType)
    : null;

  return {
    id: record.id,
    status: presentationStatus(record),
    action: {
      type: findRef(record, REF_LABELS.actionType) ?? "",
      summary: record.title,
    },
    principal: {
      type: principalType,
      value: findRef(record, REF_LABELS.principalValue) ?? record.owner ?? null,
    },
    context: {
      agent_name: findRef(record, REF_LABELS.agent),
      environment: findRef(record, REF_LABELS.environment),
      amount: findAmount(record),
      resource: findRef(record, REF_LABELS.resource),
      business_justification: record.businessJustification || null,
    },
    policy_id: findRef(record, REF_LABELS.policy),
    risk_level: (record.riskLevel ?? null) as ApprovalRiskLevel | null,
    policy_reason: record.technicalContext ? record.technicalContext : null,
    action_hash: findRef(record, REF_LABELS.actionHash),
    tool_id: findRef(record, REF_LABELS.toolId),
    // Block 5 wires receipt JWT generation on demand.
    receipt_jwt: null,
    expires_at: record.expirationDate ?? null,
    decided_by: record.decisionBy ?? null,
    decision_actor_type: decisionActorType(record),
    decided_at: record.decisionAt ?? null,
    created_at: record.createdAt ?? "",
    updated_at: record.updatedAt ?? "",
    organization_id: record.organizationId ?? "",
  };
}

export function createApproval(
  caller: SessionUser,
  input: ApprovalRequestInputType,
): ApprovalRecord {
  const policy = evaluatePolicyStub(input);
  const data = buildCreateData(input, policy);
  const created = createRiskRecord(caller, data);

  if (policy.decision === "require_approval") {
    return toApprovalRecord(created);
  }

  const actor = policy.policy_id
    ? syntheticPolicyActor(caller, policy.policy_id)
    : caller;
  const finalized = updateRiskRecordDecision(actor, created.id, {
    action: policy.decision === "allow" ? "accept" : "reject",
    decisionNote: policy.reason ?? `Auto-${policy.decision} by policy.`,
  });
  return toApprovalRecord(finalized);
}

export function getApproval(
  caller: SessionUser,
  id: string,
): ApprovalRecord {
  const record = getRiskRecordForOrganization(caller, id);
  return toApprovalRecord(record);
}

const STATUS_FILTERS: Record<ApprovalStatus, RiskStatus> = {
  pending: "pending",
  accepted: "accepted",
  rejected: "rejected",
  remediation_required: "remediation_required",
  expired: "expired",
};

export function listApprovals(
  caller: SessionUser,
  query: ApprovalListQueryInputType,
): ApprovalRecord[] {
  let records = listRiskRecordsForOrganization(caller);

  if (query.principal_type) {
    records = records.filter(
      (r) => findRef(r, REF_LABELS.principalType) === query.principal_type,
    );
  }
  if (query.principal_value) {
    records = records.filter(
      (r) => findRef(r, REF_LABELS.principalValue) === query.principal_value,
    );
  }

  const mapped = records.map(toApprovalRecord);

  if (query.status) {
    const wanted = STATUS_FILTERS[query.status];
    return applyLimit(
      mapped.filter((m) => m.status === wanted),
      query.limit,
    );
  }
  return applyLimit(mapped, query.limit);
}

function applyLimit<T>(rows: T[], limit: number | undefined): T[] {
  if (!limit || limit >= rows.length) return rows;
  return rows.slice(0, limit);
}
