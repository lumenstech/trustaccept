import type { RiskLevel } from "@/lib/types";

export type DecisionRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "canceled"
  | "error";

export type DecisionActorType = "system" | "slack_user" | "api" | "admin";

export interface DecisionRequest {
  id: string;
  externalId: string | null;
  source: string;
  actionType: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  status: DecisionRequestStatus;
  requester: string;
  subject: string;
  amount: number | null;
  currency: string | null;
  evidenceUrl: string | null;
  metadata: Record<string, unknown>;
  slackTeamId: string | null;
  slackChannelId: string | null;
  slackMessageTs: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  decidedBySlackUserId: string | null;
  decidedByName: string | null;
  decisionReason: string | null;
}

export interface DecisionAuditEvent {
  id: string;
  decisionId: string;
  eventType: string;
  actorType: DecisionActorType;
  actorId: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SlackInstallation {
  id: string;
  slackTeamId: string;
  slackTeamName: string;
  slackBotUserId: string;
  slackBotToken: string;
  defaultApprovalChannelId: string | null;
  defaultApprovalChannelName: string | null;
  installedBySlackUserId: string | null;
  installedAt: string;
  updatedAt: string;
}

export const TERMINAL_STATUSES: ReadonlySet<DecisionRequestStatus> = new Set([
  "approved",
  "rejected",
  "expired",
  "canceled",
]);
