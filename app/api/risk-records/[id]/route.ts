import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { getRiskRecordForOrganizationAsync } from "@/src/server/riskRecords";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireDashboardAccessAsync();
    const record = await getRiskRecordForOrganizationAsync(user, id);
    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
