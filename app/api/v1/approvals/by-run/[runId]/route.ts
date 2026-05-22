import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { ListRunActionsInput } from "@/src/lib/policy-types";
import { listRunActionsForUser } from "@/src/server/policy/actions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await requireDashboardAccessAsync();
    const { runId } = await params;
    const limit = req.nextUrl.searchParams.get("limit");
    const input = ListRunActionsInput.parse({
      agent_run_id: runId,
      limit: limit == null ? undefined : Number(limit),
    });
    const result = await listRunActionsForUser(user, input.agent_run_id, input.limit);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
