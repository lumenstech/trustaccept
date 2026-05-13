import type { Agent, AgentSpendCaps } from "./types";

/**
 * Parses the comma/newline-separated allowed-actions field from the new
 * agent form into a clean string[]. Trims whitespace, drops empties,
 * dedupes while preserving first-seen order.
 */
export function parseAllowedActions(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[\n,]+/u)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Renders the spend caps map as a compact one-line summary for the
 * agent list table. Order: per_txn, daily, weekly, monthly. Returns
 * a literal em-dash when no caps are configured so the column stays
 * visually consistent.
 */
export function formatSpendCapsSummary(caps: AgentSpendCaps): string {
  const parts: string[] = [];
  if (typeof caps.per_txn_usd === "number") parts.push(`txn $${caps.per_txn_usd}`);
  if (typeof caps.daily_usd === "number") parts.push(`day $${caps.daily_usd}`);
  if (typeof caps.weekly_usd === "number") parts.push(`wk $${caps.weekly_usd}`);
  if (typeof caps.monthly_usd === "number") parts.push(`mo $${caps.monthly_usd}`);
  return parts.length === 0 ? "—" : parts.join(" · ");
}

export function formatAllowedActionsCount(actions: string[]): string {
  if (actions.length === 0) return "None";
  if (actions.length === 1) return "1 action";
  return `${actions.length} actions`;
}

const STATUS_TONE: Record<Agent["status"], "success" | "amber" | "danger"> = {
  active: "success",
  paused: "amber",
  revoked: "danger",
};

export function agentStatusTone(status: Agent["status"]): "success" | "amber" | "danger" {
  return STATUS_TONE[status];
}

const TIER_TONE: Record<Agent["riskTier"], "neutral" | "info" | "amber" | "danger"> = {
  low: "neutral",
  medium: "info",
  high: "amber",
  critical: "danger",
};

export function agentRiskTierTone(tier: Agent["riskTier"]): "neutral" | "info" | "amber" | "danger" {
  return TIER_TONE[tier];
}

export type LifecycleAction = "pause" | "revoke";

export interface LifecyclePermission {
  pauseEnabled: boolean;
  revokeEnabled: boolean;
  pauseLabel: string;
  revokeLabel: string;
  revokeConfirmation: string;
}

/**
 * Single source of truth for what the row/detail buttons should
 * look like given the agent's current status. Revoke is always
 * presented with a destructive-confirmation message because it is
 * terminal — there is no path back to active.
 */
export function lifecyclePermissions(agent: Agent): LifecyclePermission {
  const isRevoked = agent.status === "revoked";
  const isPaused = agent.status === "paused";
  return {
    pauseEnabled: !isRevoked && !isPaused,
    revokeEnabled: !isRevoked,
    pauseLabel: isPaused ? "Paused" : "Pause",
    revokeLabel: isRevoked ? "Revoked" : "Revoke",
    revokeConfirmation:
      `Revoking "${agent.name}" is permanent. Future decisions referencing ` +
      "this agent will be rejected and the agent cannot be reactivated. To " +
      "use this capability again, create a new agent.",
  };
}

/**
 * Maps the dashboard form input into the strict JSON body the
 * POST /api/v1/agents handler expects. Drops empty/undefined fields
 * so strict Zod parsing accepts the body. The form passes raw text
 * for allowed_actions; we run it through parseAllowedActions here.
 */
export interface AgentFormInput {
  name: string;
  owner_email: string;
  department?: string;
  environment: "dev" | "staging" | "prod";
  risk_tier: "low" | "medium" | "high" | "critical";
  allowed_actions_text: string;
  spend_caps: {
    per_txn_usd?: string;
    daily_usd?: string;
    weekly_usd?: string;
    monthly_usd?: string;
  };
}

export interface AgentCreateBody {
  name: string;
  owner_email: string;
  department?: string;
  environment: "dev" | "staging" | "prod";
  risk_tier: "low" | "medium" | "high" | "critical";
  allowed_actions: string[];
  spend_caps: AgentSpendCaps;
}

export interface AgentFormValidation {
  ok: boolean;
  body?: AgentCreateBody;
  errors: Record<string, string>;
}

function parseUsd(raw: string | undefined): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

/**
 * Client-side mirror of the server-side Zod validation. Catches the
 * common mistakes (missing required fields, malformed email, negative
 * caps) before the network round-trip; the server still validates.
 */
export function validateAgentForm(input: AgentFormInput): AgentFormValidation {
  const errors: Record<string, string> = {};
  if (!input.name || input.name.trim().length === 0) {
    errors.name = "Name is required";
  } else if (input.name.length > 120) {
    errors.name = "Name must be 120 characters or fewer";
  }
  if (!input.owner_email || input.owner_email.trim().length === 0) {
    errors.owner_email = "Owner email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.owner_email)) {
    errors.owner_email = "Enter a valid email address";
  }
  if (!["dev", "staging", "prod"].includes(input.environment)) {
    errors.environment = "Choose an environment";
  }
  if (!["low", "medium", "high", "critical"].includes(input.risk_tier)) {
    errors.risk_tier = "Choose a risk tier";
  }
  const allowed = parseAllowedActions(input.allowed_actions_text ?? "");

  const caps: AgentSpendCaps = {};
  for (const key of ["per_txn_usd", "daily_usd", "weekly_usd", "monthly_usd"] as const) {
    const parsed = parseUsd(input.spend_caps[key]);
    if (parsed === "invalid") {
      errors[`spend_caps.${key}`] = "Must be a non-negative number";
    } else if (typeof parsed === "number") {
      caps[key] = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const body: AgentCreateBody = {
    name: input.name.trim(),
    owner_email: input.owner_email.trim(),
    environment: input.environment,
    risk_tier: input.risk_tier,
    allowed_actions: allowed,
    spend_caps: caps,
  };
  if (input.department && input.department.trim().length > 0) {
    body.department = input.department.trim();
  }
  return { ok: true, body, errors: {} };
}

/**
 * Convert an existing Agent into the form's text-shaped input state so
 * the edit screen can be pre-populated from the server's serialized
 * representation. Spend caps come in as numbers and are rendered as
 * strings; allowed actions come in as string[] and are joined on
 * newlines so the textarea reads naturally.
 */
export function agentToFormInput(agent: {
  name: string;
  ownerEmail: string;
  department?: string | null;
  environment: AgentFormInput["environment"];
  riskTier: AgentFormInput["risk_tier"];
  allowedActions: string[];
  spendCaps: AgentSpendCaps;
}): AgentFormInput {
  const cap = (n: number | undefined) =>
    typeof n === "number" ? String(n) : "";
  return {
    name: agent.name,
    owner_email: agent.ownerEmail,
    department: agent.department ?? "",
    environment: agent.environment,
    risk_tier: agent.riskTier,
    allowed_actions_text: agent.allowedActions.join("\n"),
    spend_caps: {
      per_txn_usd: cap(agent.spendCaps.per_txn_usd),
      daily_usd: cap(agent.spendCaps.daily_usd),
      weekly_usd: cap(agent.spendCaps.weekly_usd),
      monthly_usd: cap(agent.spendCaps.monthly_usd),
    },
  };
}

export type AgentPatchBody = Partial<AgentCreateBody>;

/**
 * Build a PATCH body containing only the fields that differ from the
 * server's current view of the agent. Avoids round-tripping unchanged
 * values (which the server would accept but adds noise to audit logs).
 * Returns an empty object when nothing changed; callers should skip
 * the network call in that case.
 */
export function buildPatchBody(
  current: AgentCreateBody,
  next: AgentCreateBody,
): AgentPatchBody {
  const patch: AgentPatchBody = {};
  if (next.name !== current.name) patch.name = next.name;
  if (next.owner_email !== current.owner_email) {
    patch.owner_email = next.owner_email;
  }
  if ((next.department ?? "") !== (current.department ?? "")) {
    if (next.department) patch.department = next.department;
  }
  if (next.environment !== current.environment) patch.environment = next.environment;
  if (next.risk_tier !== current.risk_tier) patch.risk_tier = next.risk_tier;

  const sameActions =
    next.allowed_actions.length === current.allowed_actions.length &&
    next.allowed_actions.every((a, i) => a === current.allowed_actions[i]);
  if (!sameActions) patch.allowed_actions = next.allowed_actions;

  const capKeys = ["per_txn_usd", "daily_usd", "weekly_usd", "monthly_usd"] as const;
  const capsDiffer = capKeys.some(
    (k) => (next.spend_caps[k] ?? null) !== (current.spend_caps[k] ?? null),
  );
  if (capsDiffer) patch.spend_caps = next.spend_caps;

  return patch;
}
