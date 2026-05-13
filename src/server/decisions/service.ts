import type { RiskLevel } from "@/lib/types";
import { getStore } from "@/src/server/store";
import {
  TERMINAL_STATUSES,
  type DecisionActorType,
  type DecisionAuditEvent,
  type DecisionRequest,
  type DecisionRequestStatus,
} from "./types";

let decisionCounter = 0;
function generateDecisionId(): string {
  decisionCounter += 1;
  return `td-${Date.now().toString(36)}-${decisionCounter.toString(36)}`;
}

let auditCounter = 0;
function generateAuditId(): string {
  auditCounter += 1;
  return `da-${Date.now().toString(36)}-${auditCounter.toString(36)}`;
}

export interface CreateDecisionInput {
  externalId?: string | null;
  source: string;
  actionType: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  requester: string;
  subject: string;
  amount?: number | null;
  currency?: string | null;
  evidenceUrl?: string | null;
  metadata?: Record<string, unknown>;
  slackTeamId?: string | null;
  approvalChannelId?: string | null;
}

export function createDecisionRequest(input: CreateDecisionInput): DecisionRequest {
  const now = new Date().toISOString();
  const decision: DecisionRequest = {
    id: generateDecisionId(),
    externalId: input.externalId ?? null,
    source: input.source,
    actionType: input.actionType,
    title: input.title,
    description: input.description,
    riskLevel: input.riskLevel,
    status: "pending",
    requester: input.requester,
    subject: input.subject,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    evidenceUrl: input.evidenceUrl ?? null,
    metadata: input.metadata ?? {},
    slackTeamId: input.slackTeamId ?? null,
    slackChannelId: input.approvalChannelId ?? null,
    slackMessageTs: null,
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
    decidedBySlackUserId: null,
    decidedByName: null,
    decisionReason: null,
  };
  getStore().decisionRequests.set(decision.id, decision);
  recordDecisionAuditEvent({
    decisionId: decision.id,
    eventType: "decision.created",
    actorType: "api",
    message: `Decision created from source "${input.source}" for action "${input.actionType}"`,
    metadata: {
      riskLevel: input.riskLevel,
      requester: input.requester,
      subject: input.subject,
      externalId: input.externalId ?? null,
    },
  });
  return decision;
}

export function attachSlackMessage(
  decisionId: string,
  args: { slackTeamId: string; slackChannelId: string; slackMessageTs: string },
): DecisionRequest | null {
  const store = getStore();
  const existing = store.decisionRequests.get(decisionId);
  if (!existing) return null;
  const updated: DecisionRequest = {
    ...existing,
    slackTeamId: args.slackTeamId,
    slackChannelId: args.slackChannelId,
    slackMessageTs: args.slackMessageTs,
    updatedAt: new Date().toISOString(),
  };
  store.decisionRequests.set(decisionId, updated);
  recordDecisionAuditEvent({
    decisionId,
    eventType: "slack.posted",
    actorType: "system",
    message: `Slack approval card posted to channel ${args.slackChannelId}`,
    metadata: { slackTeamId: args.slackTeamId, slackMessageTs: args.slackMessageTs },
  });
  return updated;
}

export function getDecisionRequest(id: string): DecisionRequest | null {
  return getStore().decisionRequests.get(id) ?? null;
}

export function listDecisionRequests(): DecisionRequest[] {
  return Array.from(getStore().decisionRequests.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export type DecideAction = "approve" | "reject" | "escalate";

export interface RecordDecisionInput {
  decisionId: string;
  action: DecideAction;
  slackUserId: string;
  slackUserName?: string | null;
  reason?: string | null;
}

export type RecordDecisionResult =
  | { ok: true; decision: DecisionRequest }
  | {
      ok: false;
      reason: "not_found" | "already_final";
      decision?: DecisionRequest;
    };

export function recordSlackDecision(
  input: RecordDecisionInput,
): RecordDecisionResult {
  const store = getStore();
  const existing = store.decisionRequests.get(input.decisionId);
  if (!existing) return { ok: false, reason: "not_found" };

  if (input.action !== "escalate" && TERMINAL_STATUSES.has(existing.status)) {
    return { ok: false, reason: "already_final", decision: existing };
  }

  const now = new Date().toISOString();
  if (input.action === "escalate") {
    recordDecisionAuditEvent({
      decisionId: existing.id,
      eventType: "decision.escalated",
      actorType: "slack_user",
      actorId: input.slackUserId,
      message: `Escalated by ${input.slackUserName ?? input.slackUserId}`,
      metadata: { reason: input.reason ?? null },
    });
    const updated: DecisionRequest = {
      ...existing,
      updatedAt: now,
    };
    store.decisionRequests.set(existing.id, updated);
    return { ok: true, decision: updated };
  }

  const newStatus: DecisionRequestStatus =
    input.action === "approve" ? "approved" : "rejected";
  const updated: DecisionRequest = {
    ...existing,
    status: newStatus,
    decidedAt: now,
    decidedBySlackUserId: input.slackUserId,
    decidedByName: input.slackUserName ?? null,
    decisionReason: input.reason ?? null,
    updatedAt: now,
  };
  store.decisionRequests.set(existing.id, updated);
  recordDecisionAuditEvent({
    decisionId: existing.id,
    eventType:
      input.action === "approve" ? "decision.approved" : "decision.rejected",
    actorType: "slack_user",
    actorId: input.slackUserId,
    message: `${input.action === "approve" ? "Approved" : "Rejected"} by ${
      input.slackUserName ?? input.slackUserId
    }`,
    metadata: { reason: input.reason ?? null },
  });
  return { ok: true, decision: updated };
}

export interface RecordDecisionAuditEventInput {
  decisionId: string;
  eventType: string;
  actorType: DecisionActorType;
  actorId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

export function recordDecisionAuditEvent(
  input: RecordDecisionAuditEventInput,
): DecisionAuditEvent {
  const entry: DecisionAuditEvent = {
    id: generateAuditId(),
    decisionId: input.decisionId,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  getStore().decisionAuditEvents.push(entry);
  return entry;
}

export function listDecisionAuditEvents(decisionId: string): DecisionAuditEvent[] {
  return getStore()
    .decisionAuditEvents.filter((event) => event.decisionId === decisionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
