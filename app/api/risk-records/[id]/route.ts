import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { getRiskRecordForOrganization } from "@/src/server/riskRecords";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = requireDashboardAccess();
    const record = getRiskRecordForOrganization(user, params.id);
    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
