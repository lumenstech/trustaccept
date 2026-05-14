export type AgentActionStatus = "pending_review" | "approved" | "rejected" | "auto_approved" | "auto_rejected" | "expired";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PolicyMode = "auto_approve" | "require_review" | "auto_reject";

export interface AgentActionRequest {
  agentId: string; agentName: string; merchantId: string; merchantName: string; consumerRef: string;
  actionType: string; amount: number; currency: string; category: string; paymentToken?: string; description?: string; metadata?: Record<string, unknown>;
}
export interface TapVerificationResult { valid: boolean; validSignature: boolean; validTimestamp: boolean; validNonce: boolean; knownAgent: boolean; errors: string[]; keyId?: string; }
export interface MerchantPolicy { defaultMode: "allow" | "require_review" | "block"; autoApproveBelowAmount: number; requireReviewAboveAmount: number; blockAboveAmount: number; allowedActionTypes: string[]; blockedActionTypes: string[]; allowedCategories: string[]; blockedCategories: string[]; allowedAgentIds: string[]; blockUnknownAgents: boolean; requireTapSignature: boolean; businessHoursOnly: boolean; webhookUrl?: string; webhookSecret?: string; }
