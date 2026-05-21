import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { buildRiskRecordsCsv } from "@/src/server/csv";
import { listRiskRecordsForOrganizationAsync } from "@/src/server/riskRecords";

export async function GET() {
  try {
    const user = await requireDashboardAccessAsync();
    const records = await listRiskRecordsForOrganizationAsync(user);
    const csv = buildRiskRecordsCsv(records);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trustaccept-risk-records-${user.organizationId}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
