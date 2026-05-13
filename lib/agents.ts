/**
 * Agent governance types. Additive to TrustAccept's existing
 * RiskRecord surface — agents are a separate registry of
 * autonomous actors that can produce decision events under
 * tenant-scoped policy.
 */

export const AGENT_ENVIRONMENTS = ["sandbox", "staging", "production"] as const;
export type AgentEnvironment = (typeof AGENT_ENVIRONMENTS)[number];

export const AGENT_RISK_TIERS = ["low", "medium", "high", "critical"] as const;
export type AgentRiskTier = (typeof AGENT_RISK_TIERS)[number];

export const AGENT_STATUSES = ["active", "paused", "revoked"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface SpendCaps {
  perDecisionCents?: number;
  perDayCents?: number;
  perMonthCents?: number;
  currency: string;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  environment: AgentEnvironment;
  riskTier: AgentRiskTier;
  status: AgentStatus;
  allowedActions: string[];
  spendCaps: SpendCaps;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  environment: AgentEnvironment;
  riskTier: AgentRiskTier;
  status: AgentStatus;
  allowedActionsCount: number;
  spendCaps: SpendCaps;
  updatedAt: string;
}

export function summarizeAgent(agent: Agent): AgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    environment: agent.environment,
    riskTier: agent.riskTier,
    status: agent.status,
    allowedActionsCount: agent.allowedActions.length,
    spendCaps: agent.spendCaps,
    updatedAt: agent.updatedAt,
  };
}

export function isAgentUsable(agent: Agent): boolean {
  return agent.status === "active";
}

export function describeSpendCaps(caps: SpendCaps): string {
  const parts: string[] = [];
  const fmt = (cents: number) =>
    `${(cents / 100).toFixed(2)} ${caps.currency.toUpperCase()}`;
  if (caps.perDecisionCents !== undefined) parts.push(`per decision ${fmt(caps.perDecisionCents)}`);
  if (caps.perDayCents !== undefined) parts.push(`per day ${fmt(caps.perDayCents)}`);
  if (caps.perMonthCents !== undefined) parts.push(`per month ${fmt(caps.perMonthCents)}`);
  return parts.length === 0 ? "No spend caps" : parts.join(" · ");
}
