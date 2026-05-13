import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import {
  createAgent,
  listAgents,
} from "@/src/server/agents";
import { AgentCreateInput } from "@/src/lib/validation";
import { summarizeAgent } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = requireDashboardAccess();
    const agents = listAgents(user);
    return NextResponse.json({
      agents: agents.map((a) => ({ ...a, summary: summarizeAgent(a) })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const body = await req.json();
    const parsed = AgentCreateInput.parse(body);
    const agent = createAgent(user, parsed);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
