import type { AgentActionRequest, MerchantPolicy, PolicyMode, RiskLevel, TapVerificationResult } from "@/src/lib/agent-commerce/types";

const CRITICAL_ACTIONS = new Set(["checkout_purchase", "payout", "refund", "credential_retrieval", "subscription_change", "account_lookup"]);
const cardLike = /(\d[ -]*?){13,19}/;

export function evaluatePolicy(action: AgentActionRequest, policy: MerchantPolicy, tap: TapVerificationResult) {
  const reasons: string[] = []; const matchedRules: string[] = []; let mode: PolicyMode = policy.defaultMode === "allow" ? "require_review" : policy.defaultMode === "block" ? "auto_reject" : "require_review";
  let riskScore = 10;
  const payloadText = JSON.stringify(action);
  if (cardLike.test(payloadText)) { mode = "auto_reject"; reasons.push("Card-like data detected; only token placeholders are allowed."); matchedRules.push("reject_sensitive_payment_data"); riskScore += 90; }
  if (!tap.validNonce) { mode = "auto_reject"; reasons.push("Nonce replay detected."); matchedRules.push("reject_replay_nonce"); riskScore += 40; }
  if (policy.requireTapSignature && !tap.validSignature) { mode = "auto_reject"; reasons.push("Invalid or missing TAP-style signature."); matchedRules.push("reject_invalid_signature"); riskScore += 40; }
  if (policy.blockUnknownAgents && !tap.knownAgent) { mode = "auto_reject"; reasons.push("Unknown agent is blocked by policy."); matchedRules.push("reject_unknown_agent"); riskScore += 20; }
  if (action.amount >= policy.blockAboveAmount) { mode = "auto_reject"; reasons.push("Amount exceeds block threshold."); matchedRules.push("reject_block_threshold"); riskScore += 35; }
  if (policy.blockedCategories.includes(action.category)) { mode = "auto_reject"; reasons.push("Category is blocked by policy."); matchedRules.push("reject_blocked_category"); riskScore += 25; }
  if (policy.blockedActionTypes.includes(action.actionType)) { mode = "auto_reject"; reasons.push("Action type is blocked by policy."); matchedRules.push("reject_blocked_action_type"); riskScore += 25; }
  if (action.amount >= policy.requireReviewAboveAmount && mode !== "auto_reject") { mode = "require_review"; reasons.push("Amount requires human review."); matchedRules.push("review_threshold"); riskScore += 20; }
  if (CRITICAL_ACTIONS.has(action.actionType) && mode !== "auto_reject") { mode = "require_review"; reasons.push("Critical action type defaults to review."); matchedRules.push("critical_action_review"); riskScore += 20; }
  if (action.amount <= policy.autoApproveBelowAmount && tap.valid && mode !== "auto_reject" && !CRITICAL_ACTIONS.has(action.actionType)) { mode = "auto_approve"; reasons.push("Low amount with passing checks auto-approved."); matchedRules.push("auto_approve_threshold"); }
  const riskLevel: RiskLevel = riskScore <= 30 ? "low" : riskScore <= 60 ? "medium" : riskScore <= 85 ? "high" : "critical";
  return { mode, matchedRules, reasons, riskScore: Math.min(100, riskScore), riskLevel };
}
