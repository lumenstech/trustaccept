import { randomUUID } from "node:crypto";
import type {
  Agent,
  AgentEnvironment,
  AgentRiskTier,
  AgentSpendCaps,
  AgentStatus,
  SessionUser,
} from "@/lib/types";
import { ForbiddenError } from "./auth";
import { getStore } from "./store";

export class AgentValidationError extends Error {
  status = 400 as const;
  details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "AgentValidationError";
    this.details = details;
  }
}

export class AgentNotFoundError extends Error {
  status = 404 as const;
  constructor(message = "Agent not found") {
    super(message);
    this.name = "AgentNotFoundError";
  }
}

export class AgentConflictError extends Error {
  status = 409 as const;
  constructor(message: string) {
    super(message);
    this.name = "AgentConflictError";
  }
}

export interface CreateAgentInput {
  name: string;
  owner_email: string;
  department?: string;
  environment: AgentEnvironment;
  risk_tier: AgentRiskTier;
  allowed_actions: string[];
  spend_caps: AgentSpendCaps;
}

export interface UpdateAgentInput {
  name?: string;
  owner_email?: string;
  department?: string;
  environment?: AgentEnvironment;
  risk_tier?: AgentRiskTier;
  allowed_actions?: string[];
  spend_caps?: AgentSpendCaps;
}

export interface ListAgentsQuery {
  status?: AgentStatus;
  environment?: AgentEnvironment;
  risk_tier?: AgentRiskTier;
  page: number;
  page_size: number;
}

export function createAgent(user: SessionUser, input: CreateAgentInput): Agent {
  const store = getStore();
  for (const existing of store.agents.values()) {
    if (existing.tenantId === user.organizationId && existing.name === input.name) {
      throw new AgentConflictError("Agent name already exists for this tenant");
    }
  }
  const now = new Date().toISOString();
  const agent: Agent = {
    id: randomUUID(),
    tenantId: user.organizationId,
    name: input.name,
    ownerEmail: input.owner_email,
    department: input.department,
    environment: input.environment,
    riskTier: input.risk_tier,
    allowedActions: input.allowed_actions,
    spendCaps: input.spend_caps,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  store.agents.set(agent.id, agent);
  return agent;
}

function getAgentForTenant(user: SessionUser, id: string): Agent {
  const agent = getStore().agents.get(id);
  if (!agent) throw new AgentNotFoundError();
  if (agent.tenantId !== user.organizationId) {
    // Don't leak existence across tenants — return the same 404.
    throw new AgentNotFoundError();
  }
  return agent;
}

export function getAgent(user: SessionUser, id: string): Agent {
  return getAgentForTenant(user, id);
}

export function listAgents(
  user: SessionUser,
  query: ListAgentsQuery,
): { items: Agent[]; total: number; page: number; page_size: number } {
  const all = Array.from(getStore().agents.values())
    .filter((a) => a.tenantId === user.organizationId)
    .filter((a) => (query.status ? a.status === query.status : true))
    .filter((a) => (query.environment ? a.environment === query.environment : true))
    .filter((a) => (query.risk_tier ? a.riskTier === query.risk_tier : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = all.length;
  const start = (query.page - 1) * query.page_size;
  const items = all.slice(start, start + query.page_size);
  return { items, total, page: query.page, page_size: query.page_size };
}

export function updateAgent(
  user: SessionUser,
  id: string,
  patch: UpdateAgentInput,
): Agent {
  const agent = getAgentForTenant(user, id);
  if (agent.status === "revoked") {
    throw new AgentValidationError("Cannot update a revoked agent");
  }
  if (patch.name && patch.name !== agent.name) {
    for (const existing of getStore().agents.values()) {
      if (
        existing.tenantId === user.organizationId &&
        existing.name === patch.name &&
        existing.id !== agent.id
      ) {
        throw new AgentConflictError("Agent name already exists for this tenant");
      }
    }
  }
  const next: Agent = {
    ...agent,
    name: patch.name ?? agent.name,
    ownerEmail: patch.owner_email ?? agent.ownerEmail,
    department: patch.department ?? agent.department,
    environment: patch.environment ?? agent.environment,
    riskTier: patch.risk_tier ?? agent.riskTier,
    allowedActions: patch.allowed_actions ?? agent.allowedActions,
    spendCaps: patch.spend_caps ?? agent.spendCaps,
    updatedAt: new Date().toISOString(),
  };
  getStore().agents.set(agent.id, next);
  return next;
}

export function pauseAgent(user: SessionUser, id: string): Agent {
  const agent = getAgentForTenant(user, id);
  if (agent.status === "revoked") {
    throw new AgentValidationError("Cannot pause a revoked agent");
  }
  if (agent.status === "paused") return agent;
  const next: Agent = { ...agent, status: "paused", updatedAt: new Date().toISOString() };
  getStore().agents.set(agent.id, next);
  return next;
}

export function revokeAgent(user: SessionUser, id: string): Agent {
  const agent = getAgentForTenant(user, id);
  if (agent.status === "revoked") {
    throw new AgentValidationError("Agent is already revoked");
  }
  const next: Agent = { ...agent, status: "revoked", updatedAt: new Date().toISOString() };
  getStore().agents.set(agent.id, next);
  return next;
}

/**
 * Cross-cutting helper used by the decision creation handler in M4. Looks
 * up an agent and asserts it is active for the caller's tenant. Throws
 * ForbiddenError for cross-tenant lookups (to keep the same 403 shape
 * the rest of the codebase uses) and AgentValidationError for non-active
 * agents so the caller can map to 400.
 */
export function getActiveAgentForDecision(
  user: SessionUser,
  agentId: string,
): Agent {
  const agent = getStore().agents.get(agentId);
  if (!agent) throw new AgentValidationError("agent_id does not exist");
  if (agent.tenantId !== user.organizationId) {
    throw new ForbiddenError("Agent belongs to another tenant");
  }
  if (agent.status !== "active") {
    throw new AgentValidationError(`Agent is ${agent.status}; cannot accept decisions`);
  }
  return agent;
}

export function serializeAgent(agent: Agent) {
  return {
    id: agent.id,
    tenant_id: agent.tenantId,
    name: agent.name,
    owner_email: agent.ownerEmail,
    department: agent.department ?? null,
    environment: agent.environment,
    risk_tier: agent.riskTier,
    allowed_actions: agent.allowedActions,
    spend_caps: agent.spendCaps,
    status: agent.status,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  };
}
