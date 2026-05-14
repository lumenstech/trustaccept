import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluatePolicy } from "@/src/lib/agent-commerce/policy-engine";
import { verifyTapHeaders } from "@/src/lib/agent-commerce/tap-verifier";
import { createAction, getMerchantByApiKey, getPolicy, listActions, storeNonce, addAudit } from "@/src/server/agent-commerce/repository";

const schema = z.object({ agentId:z.string(), agentName:z.string(), merchantId:z.string(), merchantName:z.string(), consumerRef:z.string(), actionType:z.string(), amount:z.number(), currency:z.string(), category:z.string(), paymentToken:z.string().optional(), description:z.string().optional(), metadata:z.record(z.unknown()).optional() });

export async function POST(req: Request){
  const apiKey=req.headers.get("x-trustaccept-api-key")||""; const merchant= await getMerchantByApiKey(apiKey); if(!merchant) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body = schema.parse(await req.json());
  const tap = await verifyTapHeaders(req.headers, body, storeNonce);
  const policy = await getPolicy(merchant.id); if(!policy) return NextResponse.json({error:"Missing policy"},{status:400});
  const decision = evaluatePolicy(body, policy, tap);
  const status = decision.mode === "auto_approve" ? "AUTO_APPROVED" : decision.mode === "auto_reject" ? "AUTO_REJECTED" : "PENDING_REVIEW";
  const action = await createAction(merchant.id, body, status, decision, tap);
  await addAudit({actionId:action.id, merchantId:merchant.id, eventType:"agent_action.created", actorType:"SYSTEM", message:`Action created ${status}`});
  return NextResponse.json({ actionId: action.id, status: action.status.toLowerCase(), riskLevel: action.riskLevel.toLowerCase(), policyResult: action.policyResult, reviewUrl: `/dashboard/agent-actions/${action.id}` });
}

export async function GET(){ return NextResponse.json({ items: await listActions() }); }
