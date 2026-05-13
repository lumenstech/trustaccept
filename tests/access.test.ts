import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  IDENTITY_EVENTS,
  buildAccessIntakeQuery,
  computeTemporaryAccessExpiration,
  getApprovalLabels,
  mapIdentityEventToRiskRecordDraft,
  parseRequestedDuration,
} from "@/lib/access";
import { ctaRouteFor } from "@/lib/cta";
import {
  buildAccessExecutiveSummary,
  summarizeRecordForEvidence,
} from "@/lib/evidence";
import { SEED_RECORDS } from "@/lib/seed-data";
import { RiskRecordCreateInput } from "@/src/lib/validation";
import { requireCurrentUser } from "@/src/server/auth";
import {
  createRiskRecord,
  listRiskRecordsByModule,
} from "@/src/server/riskRecords";
import { __resetStoreForTests } from "@/src/server/store";
import type { RiskRecord, SessionUser } from "@/lib/types";

beforeEach(() => {
  __resetStoreForTests();
});

afterEach(() => {
  __resetStoreForTests();
});

const accessRecord = (id: string): RiskRecord =>
  SEED_RECORDS.find((r) => r.id === id)!;

describe("Access Accept intake validation", () => {
  const baseInput = {
    module: "access-accept" as const,
    title: "Admin requests break-glass access",
    description: "SRE requests temporary GlobalAdmin to investigate EU outage.",
    sourceSystem: "Microsoft Entra",
    sourceType: "identity.break_glass_access",
    riskLevel: "critical" as const,
    owner: "Alex Greene",
    department: "Platform SRE",
    compensatingControls: "Session recording; 4h TTL.",
    evidenceSummary: "PagerDuty INC-50219; conditional access snapshot.",
    businessJustification: "EU prod-eu-1 customers reporting elevated 5xx.",
    technicalContext: "Requested role GlobalAdmin; tenant prod-eu-1.",
    frameworkTags: ["NIST 800-53 AC-2(7)"],
    sourceReferences: [],
    accessContext: {
      requestType: "break-glass-access",
      requester: "marcus.lee@lumens.io",
      identityProvider: "microsoft-entra",
      userOrServiceAccount: "marcus.lee@lumens.io",
      targetSystem: "prod-eu-1 tenant",
      privilegeLevel: "GlobalAdmin",
      requestedDuration: "4 hours",
      approvalOwner: "Alex Greene",
    },
  };

  it("accepts a fully-formed Access Accept payload", () => {
    expect(() => RiskRecordCreateInput.parse(baseInput)).not.toThrow();
  });

  it("rejects unknown access request types", () => {
    const bad = {
      ...baseInput,
      accessContext: { ...baseInput.accessContext, requestType: "not-a-thing" },
    };
    expect(RiskRecordCreateInput.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown identity providers", () => {
    const bad = {
      ...baseInput,
      accessContext: {
        ...baseInput.accessContext,
        identityProvider: "not-an-idp",
      },
    };
    expect(RiskRecordCreateInput.safeParse(bad).success).toBe(false);
  });

  it("requires requester, userOrServiceAccount, targetSystem, privilegeLevel", () => {
    for (const field of ["requester", "userOrServiceAccount", "targetSystem", "privilegeLevel"] as const) {
      const bad = {
        ...baseInput,
        accessContext: { ...baseInput.accessContext, [field]: "" },
      };
      expect(RiskRecordCreateInput.safeParse(bad).success).toBe(false);
    }
  });

  it("allows the access context to be omitted entirely (other modules)", () => {
    const { accessContext, ...withoutAccess } = baseInput;
    expect(RiskRecordCreateInput.safeParse(withoutAccess).success).toBe(true);
  });
});

describe("Access-specific approval labels", () => {
  it("uses the Access Accept labels by default", () => {
    const record = accessRecord("ra-acc-001");
    expect(getApprovalLabels(record)).toEqual({
      accept: "Approve Access",
      reject: "Reject Access",
      remediate: "Require More Evidence",
    });
  });

  it("swaps to suspicious login labels for suspicious-login request type", () => {
    const record = accessRecord("ra-acc-004");
    expect(getApprovalLabels(record)).toEqual({
      accept: "Accept Login Risk",
      reject: "Reject / Block",
      remediate: "Escalate Login",
    });
  });

  it("falls back to module defaults for non-Access Accept records", () => {
    const ai = SEED_RECORDS.find((r) => r.id === "ra-ai-001")!;
    expect(getApprovalLabels(ai)).toEqual({
      accept: "Approve Action",
      reject: "Reject Action",
      remediate: "Require Review",
    });

    const release = SEED_RECORDS.find((r) => r.id === "ra-rel-001")!;
    expect(getApprovalLabels(release).accept).toBe("Approve Release");

    const device = SEED_RECORDS.find((r) => r.id === "ra-dev-001")!;
    expect(getApprovalLabels(device).remediate).toBe("Require More Evidence");

    const evidence = SEED_RECORDS.find((r) => r.id === "ra-evd-001")!;
    expect(getApprovalLabels(evidence).accept).toBe("Mark Reviewed");
  });
});

describe("Identity event mapping", () => {
  it("translates every seeded identity event into a valid create-payload", () => {
    for (const event of IDENTITY_EVENTS) {
      const draft = mapIdentityEventToRiskRecordDraft(event);
      expect(draft.module).toBe("access-accept");
      expect(draft.accessContext.requestType).toBe(event.requestType);
      expect(draft.accessContext.identityProvider).toBe(event.identityProvider);
      expect(draft.accessContext.targetSystem).toBe(event.targetSystem);
      expect(draft.riskLevel).toBe(event.riskLevel);
      expect(draft.sourceReferences[0].externalId).toBe(event.id);
    }
  });

  it("emits a stable query string for the intake form prefill", () => {
    const event = IDENTITY_EVENTS[0];
    const query = buildAccessIntakeQuery(event);
    const params = new URLSearchParams(query);
    expect(params.get("requestType")).toBe(event.requestType);
    expect(params.get("source")).toBe(event.identityProvider);
    expect(params.get("user")).toBe(event.user);
    expect(params.get("riskLevel")).toBe(event.riskLevel);
    expect(params.get("targetSystem")).toBe(event.targetSystem);
    expect(params.get("eventId")).toBe(event.id);
  });
});

describe("Temporary access expiration math", () => {
  it("parses human durations into milliseconds", () => {
    expect(parseRequestedDuration("4 hours")).toBe(4 * 60 * 60 * 1000);
    expect(parseRequestedDuration("30 days")).toBe(30 * 24 * 60 * 60 * 1000);
    expect(parseRequestedDuration("2 weeks")).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    expect(parseRequestedDuration("6 months")).toBe(6 * 30 * 24 * 60 * 60 * 1000);
  });

  it("returns null for unrecognized inputs", () => {
    expect(parseRequestedDuration("forever")).toBeNull();
    expect(parseRequestedDuration("")).toBeNull();
    expect(parseRequestedDuration(undefined)).toBeNull();
  });

  it("computes an expiration ISO date from a base date", () => {
    const base = new Date("2026-05-13T12:00:00Z");
    const iso = computeTemporaryAccessExpiration(base, "4 hours");
    expect(iso).toBe("2026-05-13T16:00:00.000Z");
  });

  it("returns null when the duration cannot be parsed", () => {
    expect(
      computeTemporaryAccessExpiration(new Date(), "indefinite"),
    ).toBeNull();
  });
});

describe("Access Accept evidence summary", () => {
  const record = accessRecord("ra-acc-001");

  it("returns access fields on the summary when accessContext is present", () => {
    const summary = summarizeRecordForEvidence(record);
    expect(summary.accessFields).toBeDefined();
    expect(summary.accessFields?.requestType).toBe("Break-glass access");
    expect(summary.accessFields?.identityProvider).toBe("Microsoft Entra");
    expect(summary.accessFields?.targetSystem).toBe("prod-eu-1 tenant");
    expect(summary.accessFields?.privilegeLevel).toBe("GlobalAdmin");
  });

  it("uses the Access Accept executive summary template", () => {
    const text = buildAccessExecutiveSummary(record);
    expect(text).toContain("Access Accept record");
    expect(text).toContain("requester");
    expect(text).toContain("target system");
    expect(text).toContain("expiration");
    expect(text).toContain("compensating controls");
    expect(text).toContain("review timeline");
    expect(text).toContain("Microsoft Entra");
    expect(text).toContain("NIST-aligned");
    expect(text).toContain("CISA KEV-aware");
  });

  it("respects the language guardrails", () => {
    const text = buildAccessExecutiveSummary(record);
    const banned = [
      "NIST certified",
      "CISA approved",
      "guaranteed compliant",
      "eliminates risk",
      "auditor approved",
    ];
    for (const phrase of banned) {
      expect(text.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });
});

describe("Access Accept CTA routes", () => {
  it("primary CTA points to /book-risk-review", () => {
    expect(ctaRouteFor("access_accept_primary")).toBe("/book-risk-review");
  });

  it("secondary CTA points to the Access Accept intake form", () => {
    expect(ctaRouteFor("access_accept_secondary")).toBe(
      "/dashboard/access-accept/new",
    );
  });
});

describe("Access Accept filtering and creation", () => {
  function demoUser(): SessionUser {
    return requireCurrentUser();
  }

  it("seed data contains exactly 8 Access Accept records", () => {
    const access = SEED_RECORDS.filter((r) => r.module === "access-accept");
    expect(access.length).toBe(8);
  });

  it("listRiskRecordsByModule returns Access Accept records and ignores other modules", () => {
    const user = demoUser();
    const records = listRiskRecordsByModule(user, "access-accept");
    expect(records.length).toBe(8);
    expect(records.every((r) => r.module === "access-accept")).toBe(true);
  });

  it("createRiskRecord persists Access Accept context", () => {
    const user = demoUser();
    const created = createRiskRecord(user, {
      module: "access-accept",
      title: "Temporary admin for vendor",
      description: "Vendor needs build-tools-admin during install.",
      sourceSystem: "Okta",
      sourceType: "identity.contractor_temporary_access",
      riskLevel: "medium",
      owner: "Lena Petrova",
      department: "IT Operations",
      compensatingControls: "Sponsor required, 30-day revoke.",
      evidenceSummary: "Vendor SoW, Okta onboarding ticket.",
      businessJustification: "Atlanta upgrade installation window.",
      technicalContext: "Group: build-tools-admins.",
      frameworkTags: ["NIST 800-53 AC-2"],
      sourceReferences: [],
      accessContext: {
        requestType: "contractor-temporary-access",
        requester: "external+vendor@vendorco.com",
        identityProvider: "okta",
        userOrServiceAccount: "external+vendor@vendorco.com",
        targetSystem: "build-tools-admins group",
        privilegeLevel: "Group admin",
        requestedDuration: "30 days",
        approvalOwner: "Lena Petrova",
      },
    });

    expect(created.accessContext).toBeDefined();
    expect(created.accessContext?.requestType).toBe("contractor-temporary-access");
    expect(created.module).toBe("access-accept");
    expect(listRiskRecordsByModule(user, "access-accept").length).toBe(9);
  });
});
