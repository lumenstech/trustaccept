import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { loadPolicySet, savePolicySet } from "@/src/server/policy";
import { PolicySet } from "@/src/lib/policy-types";

export async function GET() {
  try {
    const user = await requireDashboardAccessAsync();
    const policy = await loadPolicySet(user.organizationId);
    return NextResponse.json({ policy });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireDashboardAccessAsync();
    const json = await req.json();
    const input = PolicySet.parse(json);
    const policy = await savePolicySet(user, input);
    return NextResponse.json({ policy });
  } catch (err) {
    return handleApiError(err);
  }
}
