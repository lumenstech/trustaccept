import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import {
  listAuditLogsForOrganization,
} from "@/src/server/auditLogs";
import {
  listExpiringRiskRecords,
  listPendingRiskRecords,
  listRiskRecordsForOrganization,
} from "@/src/server/riskRecords";

export async function GET() {
  try {
    const user = requireDashboardAccess();
    return NextResponse.json({
      organizationId: user.organizationId,
      counts: {
        total: listRiskRecordsForOrganization(user).length,
        pending: listPendingRiskRecords(user).length,
        expiringInNext30Days: listExpiringRiskRecords(user, 30).length,
        auditEvents: listAuditLogsForOrganization(user.organizationId).length,
      },
      pending: listPendingRiskRecords(user).map((r) => ({
        id: r.id,
        module: r.module,
        title: r.title,
        riskLevel: r.riskLevel,
        owner: r.owner,
        expirationDate: r.expirationDate,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
