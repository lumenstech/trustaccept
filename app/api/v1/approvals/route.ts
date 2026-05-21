import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import {
  createApprovalWithDeliveryAsync,
  listApprovalsAsync,
} from "@/src/server/approvals";
import {
  ApprovalListQueryInput,
  ApprovalRequestInput,
} from "@/src/lib/approval-types";

export async function POST(req: NextRequest) {
  try {
    const user = await requireDashboardAccessAsync();
    const json = await req.json();
    const input = ApprovalRequestInput.parse(json);
    const result = await createApprovalWithDeliveryAsync(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireDashboardAccessAsync();
    const params = req.nextUrl.searchParams;
    const query = ApprovalListQueryInput.parse({
      status: params.get("status") ?? undefined,
      principal_type: params.get("principal_type") ?? undefined,
      principal_value: params.get("principal_value") ?? undefined,
      limit: params.get("limit") ?? undefined,
    });
    const approvals = await listApprovalsAsync(user, query);
    return NextResponse.json({ approvals });
  } catch (err) {
    return handleApiError(err);
  }
}
