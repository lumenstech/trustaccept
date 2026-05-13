import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { pauseAgent } from "@/src/server/agents";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user = requireDashboardAccess();
    const agent = pauseAgent(user, ctx.params.id);
    return NextResponse.json({ agent });
  } catch (err) {
    return handleApiError(err);
  }
}
