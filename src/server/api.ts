import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "./auth";
import { formatZodError } from "@/src/lib/validation";

export function jsonError(message: string, status: number, extra?: object) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(formatZodError(err), { status: 400 });
  }
  if (err instanceof UnauthorizedError) {
    return jsonError(err.message, err.status);
  }
  if (err instanceof ForbiddenError) {
    return jsonError(err.message, err.status);
  }
  // Any thrown Error that carries its own numeric `status` propagates
  // through unchanged. Service-layer error classes
  // (AgentNotFoundError, AgentNameConflictError, AgentTerminalStateError,
  // DecisionAgentUnusableError) all use this shape so they surface as
  // 4xx instead of falling through to a generic 500.
  if (err instanceof Error) {
    const status = (err as Error & { status?: unknown }).status;
    if (typeof status === "number" && status >= 400 && status < 600) {
      return jsonError(err.message, status);
    }
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return jsonError(message, 500);
}
