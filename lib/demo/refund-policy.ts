import { z } from "zod";

/**
 * Refund Approval demo. Policy templates here are illustrative — they
 * describe how the existing agent registry + decision pipeline behaves,
 * they do not introduce a new policy engine.
 */

export const REFUND_POLICY_BULLETS: ReadonlyArray<string> = [
  "Refunds over $100 require review.",
  "Refunds over $500 require manager approval.",
  "Refunds from production agents are always logged.",
  "Revoked or paused agents cannot submit decisions.",
];

export const DEMO_AGENT_NAME = "Support Refund Agent";
export const DEMO_AGENT_ACTION = "refund.issue";
export const DEMO_AGENT_DEFAULT_CAP_CENTS = 100_000;

export const REFUND_RISK_LEVELS = ["low", "medium", "high"] as const;
export type RefundRiskLevel = (typeof REFUND_RISK_LEVELS)[number];

export const REFUND_OUTCOMES = ["accept", "reject", "manual_review"] as const;
export type RefundOutcome = (typeof REFUND_OUTCOMES)[number];

export const RefundRequestSchema = z.object({
  customer_id: z
    .string()
    .min(1, "Customer ID is required")
    .max(120)
    .regex(/^[A-Za-z0-9_\-:]+$/u, "Invalid characters in customer ID"),
  refund_amount: z
    .number({ invalid_type_error: "Refund amount must be a number" })
    .positive("Refund amount must be greater than zero")
    .max(100_000, "Refund amount is too large"),
  reason: z
    .string()
    .min(4, "Reason is required")
    .max(500, "Reason is too long"),
  order_id: z
    .string()
    .min(1, "Order ID is required")
    .max(120)
    .regex(/^[A-Za-z0-9_\-:]+$/u, "Invalid characters in order ID"),
  requested_by_agent: z.string().min(1).max(120),
  risk_level: z.enum(REFUND_RISK_LEVELS),
});
export type RefundRequest = z.infer<typeof RefundRequestSchema>;

export interface RefundPolicyBand {
  band: "auto" | "review" | "manager";
  label: string;
  detail: string;
  suggestedOutcome: RefundOutcome;
}

/**
 * Map a refund amount to the policy band the demo will surface. The
 * thresholds match the on-screen bullet list above so the operator can
 * tie the displayed label back to a policy line.
 */
export function refundPolicyBand(amountUsd: number): RefundPolicyBand {
  if (amountUsd > 500) {
    return {
      band: "manager",
      label: "Manager approval required",
      detail:
        "Refunds over $500 require manager approval. Decision will be marked pending_review.",
      suggestedOutcome: "manual_review",
    };
  }
  if (amountUsd > 100) {
    return {
      band: "review",
      label: "Review recommended",
      detail:
        "Refunds over $100 require review. Decision will be marked pending_review unless explicitly accepted.",
      suggestedOutcome: "manual_review",
    };
  }
  return {
    band: "auto",
    label: "Auto-approvable",
    detail:
      "Under the $100 threshold; decision will be allowed by the cap check.",
    suggestedOutcome: "accept",
  };
}

/**
 * Map the operator's chosen RefundOutcome to (a) the boolean `block`
 * flag the decision API understands and (b) the recommended initial
 * decisionStatus. `manual_review` does not block — it just surfaces the
 * existing `pending_review` lifecycle.
 */
export function outcomeToDecisionFields(
  outcome: RefundOutcome,
): { decisionStatus: "allowed" | "blocked" | "pending_review"; block: boolean } {
  switch (outcome) {
    case "accept":
      return { decisionStatus: "allowed", block: false };
    case "reject":
      return { decisionStatus: "blocked", block: true };
    case "manual_review":
      return { decisionStatus: "pending_review", block: false };
  }
}

export interface ReceiptDisplay {
  shortHash: string;
  fullHash: string;
  shortJws: string;
  capCheckLabel: string;
  capCheckTone: "ok" | "warn" | "block";
  receiptValidLabel: string;
}

/**
 * Build the small, presentation-only view-model the demo uses to render
 * the receipt panel. Pure function — no IO, easy to unit test.
 */
export function buildReceiptDisplay(input: {
  evidenceSha256: string;
  receiptJws: string;
  decisionStatus: "allowed" | "blocked" | "pending_review";
  capCheckOk: boolean;
}): ReceiptDisplay {
  const shortHash = `${input.evidenceSha256.slice(0, 8)}…${input.evidenceSha256.slice(-6)}`;
  const parts = input.receiptJws.split(".");
  const shortJws =
    parts.length === 3
      ? `${parts[0].slice(0, 12)}…${parts[2].slice(-8)}`
      : "(unsigned)";

  let capCheckTone: ReceiptDisplay["capCheckTone"];
  let capCheckLabel: string;
  if (input.capCheckOk) {
    capCheckTone = "ok";
    capCheckLabel = "Cap check passed";
  } else if (input.decisionStatus === "blocked") {
    capCheckTone = "block";
    capCheckLabel = "Cap check failed — blocked";
  } else {
    capCheckTone = "warn";
    capCheckLabel = "Cap check failed — pending review";
  }

  return {
    shortHash,
    fullHash: input.evidenceSha256,
    shortJws,
    capCheckLabel,
    capCheckTone,
    receiptValidLabel:
      parts.length === 3 ? "RS256 signature present" : "Receipt missing",
  };
}
