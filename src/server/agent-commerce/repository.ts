import crypto from "crypto";
import { prisma } from "@/src/server/prisma";
import type { AgentActionRequest, MerchantPolicy } from "@/src/lib/agent-commerce/types";

export const hashValue = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function getMerchantByApiKey(apiKey: string) {
  return prisma.merchant.findUnique({ where: { apiKeyHash: hashValue(apiKey) } });
}

export async function getPolicy(merchantId: string): Promise<MerchantPolicy | null> {
  const p = await prisma.agentPolicy.findUnique({ where: { merchantId } }); if (!p) return null;
  return { defaultMode: p.defaultMode.toLowerCase() as any, autoApproveBelowAmount: Number(p.autoApproveBelowAmount), requireReviewAboveAmount: Number(p.requireReviewAboveAmount), blockAboveAmount: Number(p.blockAboveAmount), allowedActionTypes: p.allowedActionTypes as string[], blockedActionTypes: p.blockedActionTypes as string[], allowedCategories: p.allowedCategories as string[], blockedCategories: p.blockedCategories as string[], allowedAgentIds: p.allowedAgentIds as string[], blockUnknownAgents: p.blockUnknownAgents, requireTapSignature: p.requireTapSignature, businessHoursOnly: p.businessHoursOnly, webhookUrl: p.webhookUrl || undefined, webhookSecret: undefined };
}

export async function upsertPolicy(merchantId: string, policy: MerchantPolicy) { return prisma.agentPolicy.upsert({ where:{merchantId}, create:{merchantId, defaultMode: policy.defaultMode.toUpperCase() as any, autoApproveBelowAmount: policy.autoApproveBelowAmount, requireReviewAboveAmount: policy.requireReviewAboveAmount, blockAboveAmount: policy.blockAboveAmount, allowedActionTypes: policy.allowedActionTypes, blockedActionTypes: policy.blockedActionTypes, allowedCategories: policy.allowedCategories, blockedCategories: policy.blockedCategories, allowedAgentIds: policy.allowedAgentIds, blockUnknownAgents: policy.blockUnknownAgents, requireTapSignature: policy.requireTapSignature, businessHoursOnly: policy.businessHoursOnly, webhookUrl: policy.webhookUrl }, update:{ defaultMode: policy.defaultMode.toUpperCase() as any, autoApproveBelowAmount: policy.autoApproveBelowAmount, requireReviewAboveAmount: policy.requireReviewAboveAmount, blockAboveAmount: policy.blockAboveAmount, allowedActionTypes: policy.allowedActionTypes, blockedActionTypes: policy.blockedActionTypes, allowedCategories: policy.allowedCategories, blockedCategories: policy.blockedCategories, allowedAgentIds: policy.allowedAgentIds, blockUnknownAgents: policy.blockUnknownAgents, requireTapSignature: policy.requireTapSignature, businessHoursOnly: policy.businessHoursOnly, webhookUrl: policy.webhookUrl } }); }

export async function storeNonce(agentId:string, nonce:string, expiresAt:Date){ try{ await prisma.nonce.create({data:{agentId,nonce,expiresAt}}); return true;} catch {return false;} }
export async function createAction(merchantId:string, action:AgentActionRequest, status:string, risk:any, tap:any){ return prisma.agentAction.create({data:{merchantId,...action, amount:action.amount, metadata: action.metadata||{}, status: status as any, riskLevel: risk.riskLevel.toUpperCase(), riskScore:risk.riskScore, tapVerification: tap, policyResult:risk }}); }
export async function listActions(){ return prisma.agentAction.findMany({orderBy:{createdAt:'desc'}}); }
export async function getAction(id:string){ return prisma.agentAction.findUnique({where:{id}, include:{decisions:true,auditEvents:true,webhookDeliveries:true}}); }
export async function addDecision(actionId:string, decision:string,note?:string,reviewerName?:string){ return prisma.agentDecision.create({data:{actionId,decision:decision.toUpperCase() as any,note,reviewerName}}); }
export async function updateActionStatus(actionId:string,status:string){ return prisma.agentAction.update({where:{id:actionId},data:{status:status as any}}); }
export async function addAudit(data:{actionId?:string;merchantId?:string;eventType:string;actorType:any;actorName?:string;message:string;data?:unknown}){ return prisma.auditEvent.create({data:{...data,data:data.data||{}}}); }
export async function saveWebhookDelivery(data:{actionId:string;url:string;status:any;responseCode?:number;responseBody?:string}){ return prisma.webhookDelivery.create({data:{...data, status:data.status}}); }
