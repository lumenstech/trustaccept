import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { createDecision, listDecisions } from "@/src/server/decisions";
import { DecisionCreateInput } from "@/src/lib/validation";
import { summarizeDecision } from "@/lib/decisions";
import { getAgent } from "@/src/server/agents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const agentIdParam = req.nextUrl.searchParams.get("agentId");
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const limitParam = req.nextUrl.searchParams.get("limit");

    const decisions = listDecisions(user, {
      agentId: agentIdParam ?? undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      limit: limitParam ? Number(limitParam) : undefined,
    });

    const summaries = decisions.map((d) => {
      let agentName: string | undefined;
      if (d.agentId) {
        try {
          agentName = getAgent(user, d.agentId).name;
        } catch {
          agentName = undefined;
        }
      }
      return { ...summarizeDecision(d, agentName), ...d };
    });

    return NextResponse.json({ decisions: summaries });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const body = await req.json();
    const parsed = DecisionCreateInput.parse(body);
    const decision = createDecision(user, parsed);
    return NextResponse.json({ decision }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
