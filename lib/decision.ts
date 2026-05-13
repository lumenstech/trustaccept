import type {
  AuditTimelineEntry,
  Decision,
  RiskRecord,
  RiskStatus,
} from "./types";

export type DecisionAction = "accept" | "reject" | "remediate";

export interface DecisionContext {
  actor: string;
  occurredAt?: string;
  notes?: string;
}

const DECISION_TO_STATUS: Record<DecisionAction, RiskStatus> = {
  accept: "accepted",
  reject: "rejected",
  remediate: "remediation_required",
};

const DECISION_TO_DECISION: Record<DecisionAction, Decision> = {
  accept: "accept",
  reject: "reject",
  remediate: "remediate",
};

export function applyDecision(
  record: RiskRecord,
  action: DecisionAction,
  ctx: DecisionContext,
): RiskRecord {
  const occurredAt = ctx.occurredAt ?? new Date().toISOString();
  const newStatus = DECISION_TO_STATUS[action];
  const entry: AuditTimelineEntry = {
    actor: ctx.actor,
    action: `decided.${action}`,
    detail: ctx.notes ?? `Decision recorded: ${action}.`,
    occurredAt,
  };

  return {
    ...record,
    status: newStatus,
    decision: DECISION_TO_DECISION[action],
    decisionBy: ctx.actor,
    decisionAt: occurredAt,
    auditTimeline: [...record.auditTimeline, entry],
  };
}

export function statusToneFor(status: RiskStatus): "amber" | "success" | "danger" | "info" | "neutral" {
  switch (status) {
    case "pending":
      return "amber";
    case "accepted":
      return "success";
    case "rejected":
      return "danger";
    case "remediation_required":
      return "info";
    case "expired":
      return "neutral";
  }
}

export function nextStepFor(action: DecisionAction, recordId: string): { label: string; href: string } {
  switch (action) {
    case "accept":
      return {
        label: "Send to Evidence Desk",
        href: `/dashboard/risk-records/${recordId}/evidence`,
      };
    case "reject":
      return {
        label: "Open Risk Records",
        href: "/dashboard/risk-records",
      };
    case "remediate":
      return {
        label: "Track remediation in Inbox",
        href: "/dashboard/inbox",
      };
  }
}
