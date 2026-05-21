import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import { listAuditLogsForOrganizationAsync } from "@/src/server/auditLogs";
import {
  listExpiringRiskRecordsAsync,
  listPendingRiskRecordsAsync,
  listRiskRecordsByModuleAsync,
  listRiskRecordsForOrganizationAsync,
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

const VULNERABILITY_ACCEPT_EXAMPLE_EVENT = {
  source: "fortify",
  event_type: "critical_finding_exception_request",
  finding_id: "FORTIFY-2026-1182",
  application: "customer-portal",
  severity: "critical",
  cwe: "CWE-89",
  requested_decision: "accept_until_next_release",
  business_justification:
    "Emergency production release with compensating WAF rule",
};

const VULNERABILITY_ACCEPT_DEMO_FLOW = [
  "Scanner finding detected by Fortify / Snyk / GitHub Advanced Security / Wiz / Tenable / Qualys / Rapid7 / pen test",
  "TrustAccept creates a Vulnerability Accept risk record",
  "Owner accepts, rejects, or requires remediation via the hosted approval page",
  "Evidence packet created in the Evidence Desk",
  "Ticket or release workflow updated downstream",
];

export async function GET() {
  try {
    const user = await requireDashboardAccessAsync();
    const accessRecords = await listRiskRecordsByModuleAsync(user, "access-accept");
    const vulnerabilityRecords = await listRiskRecordsByModuleAsync(
      user,
      "vulnerability-accept",
    );
    const allRecords = await listRiskRecordsForOrganizationAsync(user);
    const pendingRecords = await listPendingRiskRecordsAsync(user);
    const expiringRecords = await listExpiringRiskRecordsAsync(user, 30);
    const auditLogs = await listAuditLogsForOrganizationAsync(user.organizationId);
    return NextResponse.json({
      organizationId: user.organizationId,
      counts: {
        total: allRecords.length,
        pending: pendingRecords.length,
        expiringInNext30Days: expiringRecords.length,
        auditEvents: auditLogs.length,
        accessAccept: accessRecords.length,
        accessAcceptPending: accessRecords.filter((r) => r.status === "pending").length,
        vulnerabilityAccept: vulnerabilityRecords.length,
        vulnerabilityAcceptPending: vulnerabilityRecords.filter((r) => r.status === "pending").length,
        vulnerabilityAcceptReleaseBlocking: vulnerabilityRecords.filter(
          (r) => r.vulnerabilityContext?.releaseBlocking,
        ).length,
      },
      pending: pendingRecords.map((r) => ({
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
      vulnerabilityAcceptExample: {
        event: VULNERABILITY_ACCEPT_EXAMPLE_EVENT,
        flow: VULNERABILITY_ACCEPT_DEMO_FLOW,
        sampleRecordId: vulnerabilityRecords[0]?.id ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
