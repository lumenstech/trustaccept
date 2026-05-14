import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { hashValue, upsertPolicy } from "@/src/server/agent-commerce/repository";
export async function POST(){ if(process.env.NODE_ENV==='production') return NextResponse.json({error:'Disabled'},{status:403});
 const merchant=await prisma.merchant.upsert({where:{apiKeyHash:hashValue(process.env.TRUSTACCEPT_DEMO_API_KEY||'trustaccept_demo_key')},update:{name:'Demo Store'},create:{name:'Demo Store',apiKeyHash:hashValue(process.env.TRUSTACCEPT_DEMO_API_KEY||'trustaccept_demo_key')}});
 await prisma.agentIdentity.upsert({where:{agentId:'agent_demo_001'},update:{name:'Demo Shopping Agent',status:'TRUSTED',keyId:process.env.TAP_DEMO_KEY_ID||'tap_demo_key_1'},create:{agentId:'agent_demo_001',name:'Demo Shopping Agent',status:'TRUSTED',keyId:process.env.TAP_DEMO_KEY_ID||'tap_demo_key_1'}});
 await upsertPolicy(merchant.id,{defaultMode:'require_review',autoApproveBelowAmount:100,requireReviewAboveAmount:500,blockAboveAmount:5000,allowedActionTypes:[],blockedActionTypes:['credential_retrieval'],allowedCategories:[],blockedCategories:['gambling'],allowedAgentIds:['agent_demo_001'],blockUnknownAgents:true,requireTapSignature:true,businessHoursOnly:false,webhookUrl:'',webhookSecret:''});
 return NextResponse.json({ok:true,merchantId:merchant.id}); }
