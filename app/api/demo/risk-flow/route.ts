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

const KEV_EXPOSURE_REVIEW_EXAMPLE_EVENT = {
  source: "tenable",
  event_type: "kev_exposure_review",
  cve: "CVE-2024-3094",
  affected_asset: "internet-facing-linux-build-server",
  exposure_status: "exposed",
  patch_availability: "patch available",
  risk_level: "critical",
  business_justification:
    "Production dependency requires maintenance window before remediation",
};

const KEV_EXPOSURE_REVIEW_DEMO_FLOW = [
  "Known exploited vulnerability exposure detected by Tenable / Wiz / Qualys / Rapid7 / GitHub / Fortify / CISA KEV reference",
  "TrustAccept creates a KEV Exposure Review record",
  "Owner accepts exposure, rejects acceptance, or requires remediation via the hosted approval page",
  "Evidence packet created in the Evidence Desk",
  "Ticket, risk register, or remediation workflow updated downstream",
];

export async function GET() {
  try {
    const user = requireDashboardAccess();
    const accessRecords = listRiskRecordsByModule(user, "access-accept");
    const vulnerabilityRecords = listRiskRecordsByModule(user, "vulnerability-accept");
    const kevRecords = listRiskRecordsByModule(user, "kev-exposure-review");
    return NextResponse.json({
      organizationId: user.organizationId,
      counts: {
        total: listRiskRecordsForOrganization(user).length,
        pending: listPendingRiskRecords(user).length,
        expiringInNext30Days: listExpiringRiskRecords(user, 30).length,
        auditEvents: listAuditLogsForOrganization(user.organizationId).length,
        accessAccept: accessRecords.length,
        accessAcceptPending: accessRecords.filter((r) => r.status === "pending").length,
        vulnerabilityAccept: vulnerabilityRecords.length,
        vulnerabilityAcceptPending: vulnerabilityRecords.filter((r) => r.status === "pending").length,
        vulnerabilityAcceptReleaseBlocking: vulnerabilityRecords.filter(
          (r) => r.vulnerabilityContext?.releaseBlocking,
        ).length,
        kevExposureReview: kevRecords.length,
        kevExposureReviewPending: kevRecords.filter((r) => r.status === "pending").length,
        kevExposureReviewEmergency: kevRecords.filter((r) => r.kevContext?.emergency).length,
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
      vulnerabilityAcceptExample: {
        event: VULNERABILITY_ACCEPT_EXAMPLE_EVENT,
        flow: VULNERABILITY_ACCEPT_DEMO_FLOW,
        sampleRecordId: vulnerabilityRecords[0]?.id ?? null,
      },
      kevExposureReviewExample: {
        event: KEV_EXPOSURE_REVIEW_EXAMPLE_EVENT,
        flow: KEV_EXPOSURE_REVIEW_DEMO_FLOW,
        sampleRecordId: kevRecords[0]?.id ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
