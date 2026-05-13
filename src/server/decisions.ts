import { randomUUID } from "node:crypto";
import type {
  Agent,
  Decision,
  DecisionCapCheck,
  DecisionRecord,
  SessionUser,
} from "@/lib/types";
import { getActiveAgentForDecision } from "./agents";
import { getStore } from "./store";
import {
  canonicalHash,
  getSigningKeyId,
  signDecisionReceipt,
} from "./signing";

export interface CreateDecisionInput {
  action: string;
  decision: Decision;
  agent_id?: string;
  amount?: number;
  approver_id?: string;
  request_body?: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function spendUsedSince(
  tenantId: string,
  agentId: string,
  since: number,
): number {
  const store = getStore();
  let total = 0;
  for (const d of store.decisions.values()) {
    if (d.tenantId !== tenantId) continue;
    if (d.agentId !== agentId) continue;
    if (typeof d.amount !== "number") continue;
    if (new Date(d.createdAt).getTime() < since) continue;
    total += d.amount;
  }
  return total;
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function computeCapCheck(
  agent: Agent,
  amount: number,
  now: Date = new Date(),
): DecisionCapCheck {
  const dayCutoff = now.getTime() - DAY_MS;
  const weekCutoff = now.getTime() - WEEK_MS;
  const monthCutoff = startOfMonth(now).getTime();
  const dailyUsed = spendUsedSince(agent.tenantId, agent.id, dayCutoff);
  const weeklyUsed = spendUsedSince(agent.tenantId, agent.id, weekCutoff);
  const monthlyUsed = spendUsedSince(agent.tenantId, agent.id, monthCutoff);
  const caps = agent.spendCaps;
  let exceeded = false;
  if (typeof caps.per_txn_usd === "number" && amount > caps.per_txn_usd) {
    exceeded = true;
  }
  if (
    typeof caps.daily_usd === "number" &&
    dailyUsed + amount > caps.daily_usd
  ) {
    exceeded = true;
  }
  if (
    typeof caps.weekly_usd === "number" &&
    weeklyUsed + amount > caps.weekly_usd
  ) {
    exceeded = true;
  }
  if (
    typeof caps.monthly_usd === "number" &&
    monthlyUsed + amount > caps.monthly_usd
  ) {
    exceeded = true;
  }
  return {
    daily_used: dailyUsed,
    weekly_used: weeklyUsed,
    monthly_used: monthlyUsed,
    exceeded,
  };
}

export function createDecisionV1(
  user: SessionUser,
  input: CreateDecisionInput,
): DecisionRecord {
  let agent: Agent | undefined;
  if (input.agent_id) {
    agent = getActiveAgentForDecision(user, input.agent_id);
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const policyVersion = "v0";
  const requestBody = input.request_body ?? null;
  const evidenceHash =
    requestBody !== null && requestBody !== undefined
      ? canonicalHash(requestBody)
      : undefined;

  const context: DecisionRecord["context"] = {};
  if (agent && typeof input.amount === "number") {
    const capCheck = computeCapCheck(agent, input.amount);
    context.cap_check = capCheck;
  }

  const signedReceipt = signDecisionReceipt({
    iss: "trustaccept",
    decision_id: id,
    tenant_id: user.organizationId,
    action: input.action,
    decision: input.decision,
    agent_id: agent?.id,
    evidence_hash: evidenceHash,
    policy_version: policyVersion,
    iat: Math.floor(Date.now() / 1000),
  });

  const record: DecisionRecord = {
    id,
    tenantId: user.organizationId,
    action: input.action,
    decision: input.decision,
    amount: input.amount,
    approverId: input.approver_id ?? user.id,
    requestBody,
    context,
    policyVersion,
    agentId: agent?.id,
    evidenceHash,
    signedReceipt,
    createdAt: now,
  };

  getStore().decisions.set(id, record);
  return record;
}

export interface ListDecisionsForExport {
  from: string;
  to: string;
  agentId?: string;
}

export function listDecisionsForExport(
  user: SessionUser,
  query: ListDecisionsForExport,
): DecisionRecord[] {
  const fromMs = new Date(query.from).getTime();
  const toMs = new Date(query.to).getTime();
  const store = getStore();
  return Array.from(store.decisions.values())
    .filter((d) => d.tenantId === user.organizationId)
    .filter((d) => (query.agentId ? d.agentId === query.agentId : true))
    .filter((d) => {
      const t = new Date(d.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function serializeDecisionForExport(d: DecisionRecord) {
  return {
    id: d.id,
    agent_id: d.agentId ?? null,
    action: d.action,
    decision: d.decision,
    policy_version: d.policyVersion,
    evidence_hash: d.evidenceHash ?? null,
    signed_receipt: d.signedReceipt ?? null,
    approver_id: d.approverId ?? null,
    created_at: d.createdAt,
  };
}

export function serializeDecisionFull(d: DecisionRecord) {
  return {
    ...serializeDecisionForExport(d),
    tenant_id: d.tenantId,
    amount: d.amount ?? null,
    context: d.context,
    request_body: d.requestBody ?? null,
    signing_key_id: getSigningKeyId(),
  };
}
