import { NextResponse } from "next/server";
import { getAction } from "@/src/server/agent-commerce/repository";
export async function GET(_:Request,{params}:{params:{id:string}}){ const action = await getAction(params.id); if(!action) return NextResponse.json({error:"Not found"},{status:404}); return NextResponse.json({action,audit:action.auditEvents}); }
