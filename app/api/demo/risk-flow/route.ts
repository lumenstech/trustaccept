import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { listAuditLogsForOrganization } from "@/src/server/auditLogs";
import {
  listExpiringRiskRecords,
  listPendingRiskRecords,
  listRiskRecordsByModule,
  listRiskRecordsForOrganization,
} from "@/src/server/riskRecords";

const ACCESS_ACCEPT_EXAMPLE_EVENT = {
  source: "okta",
  event_type: "break_glass_access_request",
  requester: "admin@company.com",
  target_system: "production tenant",
  privilege_level: "super_admin",
  duration: "4 hours",
  risk_level: "critical",
  business_justification: "Production incident response",
};

const ACCESS_ACCEPT_DEMO_FLOW = [
  "Identity event detected by Okta / Auth0 / Microsoft Entra / Duo / GitHub",
  "TrustAccept creates an Access Accept risk record",
  "Approver approves or rejects access via the hosted approval page",
  "Evidence record created in the Evidence Desk",
  "Callback or ticket update sent to the source identity / ITSM system",
];

export async function GET() {
  try {
    const user = requireDashboardAccess();
    const accessRecords = listRiskRecordsByModule(user, "access-accept");
    return NextResponse.json({
      organizationId: user.organizationId,
      counts: {
        total: listRiskRecordsForOrganization(user).length,
        pending: listPendingRiskRecords(user).length,
        expiringInNext30Days: listExpiringRiskRecords(user, 30).length,
        auditEvents: listAuditLogsForOrganization(user.organizationId).length,
        accessAccept: accessRecords.length,
        accessAcceptPending: accessRecords.filter((r) => r.status === "pending").length,
      },
      pending: listPendingRiskRecords(user).map((r) => ({
        id: r.id,
        module: r.module,
        title: r.title,
        riskLevel: r.riskLevel,
        owner: r.owner,
        expirationDate: r.expirationDate,
      })),
      accessAcceptExample: {
        event: ACCESS_ACCEPT_EXAMPLE_EVENT,
        flow: ACCESS_ACCEPT_DEMO_FLOW,
        sampleRecordId: accessRecords[0]?.id ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
