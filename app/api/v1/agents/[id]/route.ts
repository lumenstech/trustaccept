import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { getAgent, patchAgent } from "@/src/server/agents";
import { AgentPatchInput } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = requireDashboardAccess();
    const agent = getAgent(user, ctx.params.id);
    return NextResponse.json({ agent });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = requireDashboardAccess();
    const body = await req.json();
    const parsed = AgentPatchInput.parse(body);
    const agent = patchAgent(user, ctx.params.id, parsed);
    return NextResponse.json({ agent });
  } catch (err) {
    return handleApiError(err);
  }
}
