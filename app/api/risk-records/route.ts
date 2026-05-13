import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import {
  createRiskRecord,
  listRiskRecordsByModule,
  listRiskRecordsByStatus,
  listRiskRecordsForOrganization,
} from "@/src/server/riskRecords";
import { RiskRecordCreateInput } from "@/src/lib/validation";
import type { ProductModuleKey, RiskStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const module = req.nextUrl.searchParams.get("module") as ProductModuleKey | null;
    const status = req.nextUrl.searchParams.get("status") as RiskStatus | null;

    let records = listRiskRecordsForOrganization(user);
    if (module) records = listRiskRecordsByModule(user, module);
    if (status) records = listRiskRecordsByStatus(user, status);

    return NextResponse.json({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const json = await req.json();
    const input = RiskRecordCreateInput.parse(json);
    const record = createRiskRecord(user, input as Parameters<typeof createRiskRecord>[1]);
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
