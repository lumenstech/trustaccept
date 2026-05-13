import type { CapCheckResult } from "@/lib/decisions";
import type { Agent, SpendCaps } from "@/lib/agents";
import { getStore } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

interface CapInputs {
  agent: Agent;
  amountCents?: number;
  now?: Date;
}

/**
 * Compute the cap check for a candidate decision.
 *
 * - Sums all prior allowed-and-billable decisions for this agent inside
 *   the relevant time window (per-day, per-month) by reading from the
 *   in-memory store.
 * - Adds the candidate `amountCents` and compares against each cap.
 * - Returns a structured result; callers decide whether to block.
 */
export function evaluateCapCheck({
  agent,
  amountCents = 0,
  now = new Date(),
}: CapInputs): CapCheckResult {
  const caps: SpendCaps = agent.spendCaps;
  const result: CapCheckResult = { ok: true, evaluatedAt: now.toISOString() };

  if (caps.perDecisionCents !== undefined) {
    const ok = amountCents <= caps.perDecisionCents;
    result.perDecision = {
      limitCents: caps.perDecisionCents,
      observedCents: amountCents,
      ok,
    };
    if (!ok) {
      result.ok = false;
      result.reason = "per_decision_cap_exceeded";
    }
  }

  if (caps.perDayCents !== undefined || caps.perMonthCents !== undefined) {
    const since = (windowMs: number) => new Date(now.getTime() - windowMs);
    const dayCutoff = since(DAY_MS);
    const monthCutoff = since(MONTH_MS);
    let dayObserved = 0;
    let monthObserved = 0;
    const decisions = getStore().agentDecisions;
    for (const d of decisions) {
      if (d.agentId !== agent.id) continue;
      if (d.tenantId !== agent.tenantId) continue;
      if (d.decisionStatus !== "allowed") continue;
      const amount = d.amountCents ?? 0;
      const created = new Date(d.createdAt);
      if (created >= dayCutoff) dayObserved += amount;
      if (created >= monthCutoff) monthObserved += amount;
    }

    if (caps.perDayCents !== undefined) {
      const observed = dayObserved + amountCents;
      const ok = observed <= caps.perDayCents;
      result.perDay = { limitCents: caps.perDayCents, observedCents: observed, ok };
      if (!ok) {
        result.ok = false;
        result.reason = result.reason ?? "per_day_cap_exceeded";
      }
    }
    if (caps.perMonthCents !== undefined) {
      const observed = monthObserved + amountCents;
      const ok = observed <= caps.perMonthCents;
      result.perMonth = { limitCents: caps.perMonthCents, observedCents: observed, ok };
      if (!ok) {
        result.ok = false;
        result.reason = result.reason ?? "per_month_cap_exceeded";
      }
    }
  }

  return result;
}
