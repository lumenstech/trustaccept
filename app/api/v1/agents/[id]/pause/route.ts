import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import { requireAdminAccess } from "@/src/server/auth";
import {
  AgentNotFoundError,
  AgentValidationError,
  pauseAgent,
  serializeAgent,
} from "@/src/server/agents";

interface RouteCtx {
  params: { id: string };
}

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  try {
    const user = requireAdminAccess();
    const agent = pauseAgent(user, ctx.params.id);
    return NextResponse.json(serializeAgent(agent));
  } catch (err) {
    if (err instanceof AgentNotFoundError) return jsonError(err.message, err.status);
    if (err instanceof AgentValidationError) return jsonError(err.message, err.status);
    return handleApiError(err);
  }
}
