import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { getApprovalAsync } from "@/src/server/approvals";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireDashboardAccess();
    const approval = await getApprovalAsync(user, params.id);
    return NextResponse.json({ approval });
  } catch (err) {
    return handleApiError(err);
  }
}
