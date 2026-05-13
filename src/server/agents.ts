import type { Agent, AgentStatus, SpendCaps } from "@/lib/agents";
import type { SessionUser } from "@/lib/types";
import type { AgentCreateInputType, AgentPatchInputType } from "@/src/lib/validation";
import { ForbiddenError } from "./auth";
import { getStore } from "./store";

export class AgentNotFoundError extends Error {
  status = 404 as const;
  constructor(message = "Agent not found") {
    super(message);
    this.name = "AgentNotFoundError";
  }
}

export class AgentNameConflictError extends Error {
  status = 409 as const;
  constructor(message = "Agent name already exists in tenant") {
    super(message);
    this.name = "AgentNameConflictError";
  }
}

export class AgentTerminalStateError extends Error {
  status = 409 as const;
  constructor(message = "Agent has been revoked and cannot be modified") {
    super(message);
    this.name = "AgentTerminalStateError";
  }
}

let agentCounter = 0;
function generateAgentId(): string {
  agentCounter += 1;
  return `agt-${Date.now().toString(36)}-${agentCounter.toString(36)}`;
}

function tenantId(user: SessionUser): string {
  return user.organizationId;
}

function requireAdmin(user: SessionUser): void {
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw new ForbiddenError("Only OWNER or ADMIN can mutate agents");
  }
}

function normalizeSpendCaps(input: SpendCaps): SpendCaps {
  return {
    perDecisionCents: input.perDecisionCents,
    perDayCents: input.perDayCents,
    perMonthCents: input.perMonthCents,
    currency: input.currency.toUpperCase(),
  };
}

export function listAgents(user: SessionUser): Agent[] {
  const tid = tenantId(user);
  return Array.from(getStore().agents.values())
    .filter((a) => a.tenantId === tid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function findAgentByName(user: SessionUser, name: string): Agent | null {
  const tid = tenantId(user);
  for (const agent of getStore().agents.values()) {
    if (agent.tenantId === tid && agent.name === name) return agent;
  }
  return null;
}

export function getAgent(user: SessionUser, id: string): Agent {
  const found = getStore().agents.get(id);
  if (!found || found.tenantId !== tenantId(user)) {
    // Do not leak existence across tenants — same shape as a missing record.
    throw new AgentNotFoundError();
  }
  return found;
}

export function createAgent(
  user: SessionUser,
  input: AgentCreateInputType,
): Agent {
  requireAdmin(user);
  const tid = tenantId(user);
  for (const existing of getStore().agents.values()) {
    if (existing.tenantId === tid && existing.name === input.name) {
      throw new AgentNameConflictError();
    }
  }
  const now = new Date().toISOString();
  const agent: Agent = {
    id: generateAgentId(),
    tenantId: tid,
    name: input.name,
    environment: input.environment,
    riskTier: input.riskTier,
    status: "active",
    allowedActions: [...input.allowedActions],
    spendCaps: normalizeSpendCaps(input.spendCaps),
    createdAt: now,
    updatedAt: now,
  };
  getStore().agents.set(agent.id, agent);
  return agent;
}

export function patchAgent(
  user: SessionUser,
  id: string,
  patch: AgentPatchInputType,
): Agent {
  requireAdmin(user);
  const existing = getAgent(user, id);
  if (existing.status === "revoked") {
    throw new AgentTerminalStateError();
  }
  if (patch.name && patch.name !== existing.name) {
    for (const other of getStore().agents.values()) {
      if (
        other.tenantId === existing.tenantId &&
        other.id !== existing.id &&
        other.name === patch.name
      ) {
        throw new AgentNameConflictError();
      }
    }
  }
  const updated: Agent = {
    ...existing,
    name: patch.name ?? existing.name,
    environment: patch.environment ?? existing.environment,
    riskTier: patch.riskTier ?? existing.riskTier,
    allowedActions: patch.allowedActions
      ? [...patch.allowedActions]
      : existing.allowedActions,
    spendCaps: patch.spendCaps
      ? normalizeSpendCaps(patch.spendCaps)
      : existing.spendCaps,
    updatedAt: new Date().toISOString(),
  };
  getStore().agents.set(updated.id, updated);
  return updated;
}

function setStatus(
  user: SessionUser,
  id: string,
  status: AgentStatus,
): Agent {
  requireAdmin(user);
  const existing = getAgent(user, id);
  if (existing.status === "revoked") {
    throw new AgentTerminalStateError();
  }
  const now = new Date().toISOString();
  const updated: Agent = {
    ...existing,
    status,
    revokedAt: status === "revoked" ? now : existing.revokedAt,
    updatedAt: now,
  };
  getStore().agents.set(updated.id, updated);
  return updated;
}

export function pauseAgent(user: SessionUser, id: string): Agent {
  return setStatus(user, id, "paused");
}

export function revokeAgent(user: SessionUser, id: string): Agent {
  return setStatus(user, id, "revoked");
}

export function resumeAgent(user: SessionUser, id: string): Agent {
  return setStatus(user, id, "active");
}

/** Test-only convenience used by service-level fixtures. */
export function __resetAgentCounterForTests(): void {
  agentCounter = 0;
}
