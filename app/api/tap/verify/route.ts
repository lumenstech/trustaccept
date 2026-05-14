import { NextResponse } from "next/server";
import { verifyTapHeaders } from "@/src/lib/agent-commerce/tap-verifier";
export async function POST(req:Request){ const body = await req.json(); return NextResponse.json(verifyTapHeaders(req.headers, body)); }
