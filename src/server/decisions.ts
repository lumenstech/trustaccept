import type { DecisionEvent, DecisionStatus } from "@/lib/decisions";
import type { SessionUser } from "@/lib/types";
import type { DecisionCreateInputType } from "@/src/lib/validation";
import { ForbiddenError } from "./auth";
import { evidenceSha256 } from "./evidenceHash";
import { getAgent } from "./agents";
import { signCompactJws } from "./receipts";
import { evaluateCapCheck } from "./spendCap";
import { getStore } from "./store";

export class DecisionAgentUnusableError extends Error {
  status = 409 as const;
  constructor(message = "Agent is not active") {
    super(message);
    this.name = "DecisionAgentUnusableError";
  }
}

let decisionCounter = 0;
function generateDecisionId(): string {
  decisionCounter += 1;
  return `dec-${Date.now().toString(36)}-${decisionCounter.toString(36)}`;
}

function tenantId(user: SessionUser): string {
  return user.organizationId;
}

interface CreateOptions {
  now?: Date;
}

export function createDecision(
  user: SessionUser,
  input: DecisionCreateInputType,
  opts: CreateOptions = {},
): DecisionEvent {
  const now = opts.now ?? new Date();
  const tid = tenantId(user);

  let agentId: string | null = null;
  let capCheck;
  if (input.agentId) {
    const agent = getAgent(user, input.agentId);
    if (agent.status !== "active") {
      throw new DecisionAgentUnusableError(`Agent status is ${agent.status}`);
    }
    if (
      input.action &&
      agent.allowedActions.length > 0 &&
      !agent.allowedActions.includes(input.action)
    ) {
      throw new ForbiddenError(`Action not in agent's allowed_actions`);
    }
    agentId = agent.id;
    capCheck = evaluateCapCheck({
      agent,
      amountCents: input.amountCents,
      now,
    });
  } else {
    capCheck = {
      ok: true,
      evaluatedAt: now.toISOString(),
    };
  }

  let decisionStatus: DecisionStatus =
    input.decisionStatus ?? (capCheck.ok ? "allowed" : "pending_review");
  if (input.block === true && !capCheck.ok) {
    decisionStatus = "blocked";
  }

  const id = generateDecisionId();
  const createdAt = now.toISOString();

  const evidencePayload = {
    id,
    tenantId: tid,
    agentId,
    action: input.action,
    subject: input.subject,
    amountCents: input.amountCents ?? null,
    currency: input.currency ?? null,
    decisionStatus,
    policyVersion: input.policyVersion,
    capCheck,
    createdAt,
    extra: input.evidencePayload,
  };
  const evidenceSha = evidenceSha256(evidencePayload);
  const receipt = signCompactJws({
    sub: id,
    tnt: tid,
    agt: agentId,
    act: input.action,
    sts: decisionStatus,
    sha: evidenceSha,
    iat: Math.floor(now.getTime() / 1000),
  });

  const event: DecisionEvent = {
    id,
    tenantId: tid,
    agentId,
    action: input.action,
    subject: input.subject,
    amountCents: input.amountCents,
    currency: input.currency,
    decisionStatus,
    policyVersion: input.policyVersion,
    evidencePayload,
    evidenceSha256: evidenceSha,
    receiptJws: receipt.jws,
    capCheck,
    createdAt,
  };

  getStore().agentDecisions.push(event);
  return event;
}

export interface DecisionListFilters {
  agentId?: string | null;
  from?: Date;
  to?: Date;
  limit?: number;
}

export function listDecisions(
  user: SessionUser,
  filters: DecisionListFilters = {},
): DecisionEvent[] {
  const tid = tenantId(user);
  let rows = getStore().agentDecisions.filter((d) => d.tenantId === tid);
  if (filters.agentId !== undefined) {
    rows = rows.filter((d) => d.agentId === filters.agentId);
  }
  if (filters.from) {
    const from = filters.from.getTime();
    rows = rows.filter((d) => new Date(d.createdAt).getTime() >= from);
  }
  if (filters.to) {
    const to = filters.to.getTime();
    rows = rows.filter((d) => new Date(d.createdAt).getTime() <= to);
  }
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filters.limit && filters.limit > 0) rows = rows.slice(0, filters.limit);
  return rows;
}

export function getDecision(user: SessionUser, id: string): DecisionEvent | null {
  const tid = tenantId(user);
  const found = getStore().agentDecisions.find((d) => d.id === id);
  if (!found || found.tenantId !== tid) return null;
  return found;
}

/** Test-only reset of the per-process id counter. */
export function __resetDecisionCounterForTests(): void {
  decisionCounter = 0;
}
