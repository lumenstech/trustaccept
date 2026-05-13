import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import {
  requireAdminAccess,
  requireDashboardAccess,
} from "@/src/server/auth";
import {
  AgentConflictError,
  AgentNotFoundError,
  AgentValidationError,
  getAgent,
  serializeAgent,
  updateAgent,
} from "@/src/server/agents";
import { AgentUpdateInput, formatZodError } from "@/src/lib/validation";

interface RouteCtx {
  params: { id: string };
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const user = requireDashboardAccess();
    const agent = getAgent(user, ctx.params.id);
    return NextResponse.json(serializeAgent(agent));
  } catch (err) {
    if (err instanceof AgentNotFoundError) return jsonError(err.message, err.status);
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const user = requireAdminAccess();
    const json = await req.json();
    const parsed = AgentUpdateInput.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    const agent = updateAgent(user, ctx.params.id, parsed.data);
    return NextResponse.json(serializeAgent(agent));
  } catch (err) {
    if (err instanceof AgentNotFoundError) return jsonError(err.message, err.status);
    if (err instanceof AgentConflictError) return jsonError(err.message, err.status);
    if (err instanceof AgentValidationError) return jsonError(err.message, err.status);
    return handleApiError(err);
  }
}
