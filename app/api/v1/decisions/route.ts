import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import { requireDecisionAccess } from "@/src/server/auth";
import { createDecisionV1, serializeDecisionFull } from "@/src/server/decisions";
import { AgentValidationError } from "@/src/server/agents";
import { V1DecisionCreateInput, formatZodError } from "@/src/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const user = requireDecisionAccess();
    const json = await req.json();
    const parsed = V1DecisionCreateInput.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    const record = createDecisionV1(user, parsed.data);
    return NextResponse.json(serializeDecisionFull(record), { status: 201 });
  } catch (err) {
    if (err instanceof AgentValidationError) {
      return jsonError(err.message, err.status);
    }
    return handleApiError(err);
  }
}
