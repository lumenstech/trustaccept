/**
 * Agent-attributable decision event types. Distinct from the
 * `Decision` enum on RiskRecord (accept/reject/remediate). A
 * Decision here is a discrete event produced by an Agent (or
 * by a backward-compatible legacy caller with no agent_id).
 */

export const DECISION_STATUSES = ["allowed", "blocked", "pending_review"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export interface CapCheckPart {
  limitCents: number;
  observedCents: number;
  ok: boolean;
}

export interface CapCheckResult {
  ok: boolean;
  reason?: string;
  perDecision?: CapCheckPart;
  perDay?: CapCheckPart;
  perMonth?: CapCheckPart;
  evaluatedAt: string;
}

export interface DecisionEvent {
  id: string;
  tenantId: string;
  agentId: string | null;
  action: string;
  subject: string;
  amountCents?: number;
  currency?: string;
  decisionStatus: DecisionStatus;
  policyVersion: string;
  evidencePayload: Record<string, unknown>;
  evidenceSha256: string;
  receiptJws: string;
  capCheck: CapCheckResult;
  createdAt: string;
}

export interface DecisionSummary {
  id: string;
  agentId: string | null;
  agentName?: string;
  action: string;
  decisionStatus: DecisionStatus;
  capCheckOk: boolean;
  evidenceSha256: string;
  hasReceipt: boolean;
  createdAt: string;
}

export function summarizeDecision(
  d: DecisionEvent,
  agentName?: string,
): DecisionSummary {
  return {
    id: d.id,
    agentId: d.agentId,
    agentName,
    action: d.action,
    decisionStatus: d.decisionStatus,
    capCheckOk: d.capCheck.ok,
    evidenceSha256: d.evidenceSha256,
    hasReceipt: d.receiptJws.length > 0,
    createdAt: d.createdAt,
  };
}
