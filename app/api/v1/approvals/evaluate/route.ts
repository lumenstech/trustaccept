import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { evaluateActionForUser } from "@/src/server/policy/actions";
import { EvaluateActionInput } from "@/src/lib/policy-types";

export async function POST(req: NextRequest) {
  try {
    const user = await requireDashboardAccessAsync();
    const json = await req.json();
    const input = EvaluateActionInput.parse(json);
    const result = await evaluateActionForUser(user, input);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
