import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import {
  requireAdminAccess,
  requireDashboardAccess,
} from "@/src/server/auth";
import {
  AgentConflictError,
  AgentValidationError,
  createAgent,
  listAgents,
  serializeAgent,
} from "@/src/server/agents";
import {
  AgentCreateInput,
  AgentListQuery,
  formatZodError,
} from "@/src/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const params = AgentListQuery.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    const result = listAgents(user, params);
    return NextResponse.json({
      items: result.items.map(serializeAgent),
      total: result.total,
      page: result.page,
      page_size: result.page_size,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAdminAccess();
    const json = await req.json();
    const parsed = AgentCreateInput.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    const agent = createAgent(user, parsed.data);
    return NextResponse.json(serializeAgent(agent), { status: 201 });
  } catch (err) {
    if (err instanceof AgentConflictError) {
      return jsonError(err.message, err.status);
    }
    if (err instanceof AgentValidationError) {
      return jsonError(err.message, err.status);
    }
    return handleApiError(err);
  }
}
