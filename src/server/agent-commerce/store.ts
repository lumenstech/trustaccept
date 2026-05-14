import { randomUUID } from "crypto";
import type { AgentActionRequest, AgentActionStatus, MerchantPolicy } from "@/src/lib/agent-commerce/types";

export interface ActionRecord extends AgentActionRequest { id: string; status: AgentActionStatus; riskLevel: string; riskScore: number; policyResult: unknown; tapVerification: unknown; createdAt: string; updatedAt: string; }
const policy: MerchantPolicy = { defaultMode: "require_review", autoApproveBelowAmount: 100, requireReviewAboveAmount: 500, blockAboveAmount: 5000, allowedActionTypes: [], blockedActionTypes: ["credential_retrieval"], allowedCategories: [], blockedCategories: ["gambling"], allowedAgentIds: ["agent_demo_001"], blockUnknownAgents: true, requireTapSignature: true, businessHoursOnly: false, webhookUrl: "" };
const actions = new Map<string, ActionRecord>();
const audits: Array<{actionId:string; message:string; createdAt:string}> = [];
export const agentStore = { policy, actions, audits };
export function createAction(input: AgentActionRequest & { status: AgentActionStatus; riskLevel: string; riskScore: number; policyResult: unknown; tapVerification: unknown;}) { const now = new Date().toISOString(); const id = randomUUID(); const rec: ActionRecord = { ...input, id, createdAt: now, updatedAt: now }; actions.set(id, rec); audits.push({ actionId:id, message:`Action created with status ${rec.status}`, createdAt: now }); return rec; }
