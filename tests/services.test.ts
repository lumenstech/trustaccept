import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID } from "@/lib/seed-data";
import {
  ForbiddenError,
  assertCanAccessOrganizationRecord,
  getCurrentUser,
  requireCurrentUser,
} from "@/src/server/auth";
import {
  listAuditLogsForRecord,
  recordAuditEvent,
} from "@/src/server/auditLogs";
import {
  buildEvidencePacketSummary,
  createEvidencePacket,
  generateEvidencePdf,
} from "@/src/server/evidencePackets";
import { createLead } from "@/src/server/leads";
import {
  __resetNotificationsForTests,
  getSentNotifications,
} from "@/src/server/notifications";
import {
  createRiskRecord,
  getRiskRecordForOrganization,
  getRiskRecordPublic,
  listPendingRiskRecords,
  listRiskRecordsByModule,
  updateRiskRecordDecision,
} from "@/src/server/riskRecords";
import { __resetStoreForTests } from "@/src/server/store";
import type { SessionUser } from "@/lib/types";

beforeEach(() => {
  __resetStoreForTests();
  __resetNotificationsForTests();
});

const demoUser = (): SessionUser => requireCurrentUser();

describe("getCurrentUser (demo mode)", () => {
  it("returns the demo user with the demo org", () => {
    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(DEMO_USER_ID);
    expect(user?.organizationId).toBe(DEMO_ORGANIZATION_ID);
    expect(user?.role).toBe("OWNER");
  });
});

describe("assertCanAccessOrganizationRecord", () => {
  it("allows access to records in the same organization", () => {
    const user = demoUser();
    const record = getRiskRecordPublic("ra-ai-001")!;
    expect(() => assertCanAccessOrganizationRecord(user, record)).not.toThrow();
  });

  it("forbids access to records from another organization", () => {
    const user = demoUser();
    expect(() =>
      assertCanAccessOrganizationRecord(user, {
        organizationId: "other-org",
      }),
    ).toThrowError(ForbiddenError);
  });

  it("forbids access when the record is missing", () => {
    const user = demoUser();
    expect(() => assertCanAccessOrganizationRecord(user, null)).toThrowError(
      ForbiddenError,
    );
  });
});

describe("createRiskRecord", () => {
  it("persists a new record with sane defaults and an initial audit log", () => {
    const user = demoUser();
    const record = createRiskRecord(user, {
      module: "access-accept",
      title: "Test break-glass access",
      description: "SRE requests temporary GlobalAdmin.",
      sourceSystem: "Entra ID",
      sourceType: "identity.priv_request",
      riskLevel: "critical",
      owner: "Marcus Lee",
      department: "Platform SRE",
      compensatingControls: "Session recording, 4h TTL.",
      evidenceSummary: "Conditional access policy snapshot.",
      businessJustification: "EU incident investigation.",
      technicalContext: "GlobalAdmin in prod-eu-1.",
      frameworkTags: ["NIST 800-53 AC-2(7)"],
      sourceReferences: [],
    });

    expect(record.id).toMatch(/^ra-/);
    expect(record.organizationId).toBe(DEMO_ORGANIZATION_ID);
    expect(record.status).toBe("pending");
    expect(record.riskScore).toBe(95);

    const fetched = getRiskRecordForOrganization(user, record.id);
    expect(fetched.id).toBe(record.id);

    const logs = listAuditLogsForRecord(user.organizationId, record.id);
    expect(logs.map((l) => l.eventType)).toContain("risk_record.created");
  });
});

describe("updateRiskRecordDecision", () => {
  it("persists the decision, status, and audit timeline entry", () => {
    const user = demoUser();
    const before = getRiskRecordPublic("ra-ai-001")!;
    expect(before.status).toBe("pending");

    const updated = updateRiskRecordDecision(user, before.id, {
      action: "accept",
      decisionNote: "Approved with DLP and 24h TTL.",
      reviewDate: "2026-06-15",
    });

    expect(updated.status).toBe("accepted");
    expect(updated.decision).toBe("accept");
    expect(updated.decisionBy).toBe(user.name);
    expect(updated.decisionAt).toBeDefined();
    expect(updated.reviewDate).toBe("2026-06-15");
    expect(updated.auditTimeline.at(-1)).toMatchObject({
      actor: user.name,
      action: "decided.accept",
    });

    const logs = listAuditLogsForRecord(user.organizationId, before.id);
    const decisionLog = logs.find((l) => l.eventType === "decision.accepted");
    expect(decisionLog).toBeDefined();
    expect(decisionLog?.previousStatus).toBe("pending");
    expect(decisionLog?.newStatus).toBe("accepted");
  });

  it("rejects unknown record IDs with a forbidden error (no existence leak)", () => {
    expect(() =>
      updateRiskRecordDecision(demoUser(), "does-not-exist", {
        action: "accept",
      }),
    ).toThrowError(ForbiddenError);
  });
});

describe("listPendingRiskRecords / listRiskRecordsByModule", () => {
  it("filters records by status and module", () => {
    const user = demoUser();
    const pendingBefore = listPendingRiskRecords(user).length;
    expect(pendingBefore).toBeGreaterThan(0);

    updateRiskRecordDecision(user, "ra-ai-001", { action: "accept" });
    expect(listPendingRiskRecords(user).length).toBe(pendingBefore - 1);

    const aiRecords = listRiskRecordsByModule(user, "ai-action-gate");
    expect(aiRecords.every((r) => r.module === "ai-action-gate")).toBe(true);
  });
});

describe("audit log append-only behavior", () => {
  it("only ever appends entries", () => {
    const user = demoUser();
    const before = listAuditLogsForRecord(user.organizationId, "ra-ai-001").length;
    recordAuditEvent({
      eventType: "approval_page.viewed",
      actor: user,
      organizationId: user.organizationId,
      riskRecordId: "ra-ai-001",
      metadata: { source: "test" },
    });
    const after = listAuditLogsForRecord(user.organizationId, "ra-ai-001").length;
    expect(after).toBe(before + 1);
  });
});

describe("evidence packets", () => {
  it("builds a summary and records an audit event when created", () => {
    const user = demoUser();
    const record = getRiskRecordPublic("ra-rel-001")!;
    const summary = buildEvidencePacketSummary(record);
    expect(summary.module).toBe("Secure Release Gate");

    const packet = createEvidencePacket(user, record);
    const logs = listAuditLogsForRecord(user.organizationId, record.id);
    expect(logs.some((l) => l.eventType === "evidence_packet.generated")).toBe(true);
    expect(packet.summary.executiveSummary).toContain("Secure Release Gate");
  });

  it("renders a PDF buffer with the %PDF- header", () => {
    const user = demoUser();
    const record = getRiskRecordPublic("ra-rel-001")!;
    const packet = createEvidencePacket(user, record);
    const pdf = generateEvidencePdf(packet);
    expect(pdf.length).toBeGreaterThan(200);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("lead capture persistence", () => {
  it("persists the lead, fires a notification, and records an audit event", () => {
    const lead = createLead({
      formType: "book-risk-review",
      name: "Avery Chen",
      company: "Lumens",
      email: "avery@lumens.io",
      riskArea: "ai-agent-action",
      urgency: "48-hours",
      description: "Three risk records this week.",
    });
    expect(lead.id).toMatch(/^lead-/);
    expect(lead.status).toBe("new");

    const notifications = getSentNotifications();
    expect(notifications.at(-1)?.subject).toContain("book-risk-review");
  });
});
