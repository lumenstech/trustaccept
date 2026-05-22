import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { getApprovalAsync } from "@/src/server/approvals";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireDashboardAccessAsync();
    const approval = await getApprovalAsync(user, id);
    return NextResponse.json({ approval });
  } catch (err) {
    return handleApiError(err);
  }
}
