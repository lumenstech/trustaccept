import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantByApiKey, getPolicy, upsertPolicy } from "@/src/server/agent-commerce/repository";
const schema=z.object({defaultMode:z.enum(["allow","require_review","block"]),autoApproveBelowAmount:z.number(),requireReviewAboveAmount:z.number(),blockAboveAmount:z.number(),blockUnknownAgents:z.boolean(),requireTapSignature:z.boolean(),businessHoursOnly:z.boolean(),webhookUrl:z.string().optional(),allowedCategories:z.array(z.string()),blockedCategories:z.array(z.string()),allowedActionTypes:z.array(z.string()),blockedActionTypes:z.array(z.string()),allowedAgentIds:z.array(z.string())});
async function merchant(req:Request){return getMerchantByApiKey(req.headers.get('x-trustaccept-api-key')||'');}
export async function GET(req:Request){const m=await merchant(req); if(!m) return NextResponse.json({error:'Unauthorized'},{status:401}); return NextResponse.json({policy:await getPolicy(m.id)});}
export async function PUT(req:Request){const m=await merchant(req); if(!m) return NextResponse.json({error:'Unauthorized'},{status:401}); const body=schema.parse(await req.json()); await upsertPolicy(m.id, body as any); return NextResponse.json({ok:true});}
