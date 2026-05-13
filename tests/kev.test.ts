import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getApprovalLabels } from "@/lib/access";
import { ctaRouteFor } from "@/lib/cta";
import {
  buildKevExecutiveSummary,
  summarizeRecordForEvidence,
} from "@/lib/evidence";
import {
  KEV_FINDINGS,
  buildKevIntakeQuery,
  computeExposureExpiration,
  mapKevFindingToRiskRecordDraft,
  parseExposureAcceptanceWindow,
} from "@/lib/kev";
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

const kevRecord = (id: string): RiskRecord =>
  SEED_RECORDS.find((r) => r.id === id)!;

describe("KEV Exposure Review intake validation", () => {
  const baseInput = {
    module: "kev-exposure-review" as const,
    title: "Known exploited vulnerability exposure requires remediation decision",
    description:
      "Known exploited vulnerability CVE-2026-1455 detected on three internet-facing gateways.",
    sourceSystem: "Tenable",
    sourceType: "kev.tenable",
    riskLevel: "critical" as const,
    owner: "Sara Romero",
    department: "Infrastructure Security",
    compensatingControls: "Geo-fenced ingress, IPS signature deployed.",
    evidenceSummary: "CISA KEV reference, Tenable scan, IPS signature deployment.",
    businessJustification: "Partner integrations mid-cutover prevent patch.",
    technicalContext: "Edge gateway; exploit observed in the wild.",
    frameworkTags: ["CISA KEV", "NIST 800-53 SI-2"],
    sourceReferences: [],
    kevContext: {
      cve: "CVE-2026-1455",
      kevStatus: "known-exploited",
      source: "tenable",
      affectedAsset: "edge-gw-{01,02,03}",
      assetType: "network-appliance",
      exposureStatus: "exposed",
      patchAvailability: "patch-available",
      remediationOwner: "Sara Romero",
      businessReasonForDelay: "Partner integrations mid-cutover.",
      executiveSummaryNote: "Patch in maintenance window.",
      emergency: false,
    },
  };

  it("accepts a fully-formed KEV Exposure Review payload", () => {
    expect(() => RiskRecordCreateInput.parse(baseInput)).not.toThrow();
  });

  it("rejects unknown KEV status, source, asset type, exposure status, patch availability", () => {
    for (const field of [
      "kevStatus",
      "source",
      "assetType",
      "exposureStatus",
      "patchAvailability",
    ] as const) {
      const bad = {
        ...baseInput,
        kevContext: { ...baseInput.kevContext, [field]: "not-valid" },
      };
      expect(RiskRecordCreateInput.safeParse(bad).success).toBe(false);
    }
  });

  it("requires CVE, affected asset, remediation owner, and business reason for delay", () => {
    for (const field of [
      "cve",
      "affectedAsset",
      "remediationOwner",
      "businessReasonForDelay",
    ] as const) {
      const bad = {
        ...baseInput,
        kevContext: { ...baseInput.kevContext, [field]: "" },
      };
      expect(RiskRecordCreateInput.safeParse(bad).success).toBe(false);
    }
  });

  it("allows kevContext to be omitted entirely (other modules)", () => {
    const { kevContext, ...withoutKev } = baseInput;
    expect(RiskRecordCreateInput.safeParse(withoutKev).success).toBe(true);
  });
});

describe("KEV-specific approval labels", () => {
  it("uses the KEV Exposure Review labels by default", () => {
    const record = kevRecord("ra-kev-001");
    expect(record.kevContext?.emergency).toBe(false);
    expect(getApprovalLabels(record)).toEqual({
      accept: "Accept Exposure",
      reject: "Reject Acceptance",
      remediate: "Require Remediation",
    });
  });

  it("swaps to emergency labels for emergency exposure records", () => {
    const record = kevRecord("ra-kev-006");
    expect(record.kevContext?.emergency).toBe(true);
    expect(getApprovalLabels(record)).toEqual({
      accept: "Emergency Accept",
      reject: "Escalate Now",
      remediate: "Require Immediate Remediation",
    });
  });

  it("does not affect Access Accept, Vulnerability Accept, AI Action Gate, Secure Release Gate, Device Accept, or Evidence Desk labels", () => {
    const ai = SEED_RECORDS.find((r) => r.id === "ra-ai-001")!;
    expect(getApprovalLabels(ai).accept).toBe("Approve Action");

    const access = SEED_RECORDS.find((r) => r.id === "ra-acc-001")!;
    expect(getApprovalLabels(access).accept).toBe("Approve Access");

    const suspicious = SEED_RECORDS.find((r) => r.id === "ra-acc-004")!;
    expect(getApprovalLabels(suspicious).accept).toBe("Accept Login Risk");

    const vulnDefault = SEED_RECORDS.find((r) => r.id === "ra-vul-002")!;
    expect(getApprovalLabels(vulnDefault).accept).toBe("Accept Finding Risk");

    const vulnBlocking = SEED_RECORDS.find((r) => r.id === "ra-vul-001")!;
    expect(getApprovalLabels(vulnBlocking).accept).toBe("Accept for Release");

    const release = SEED_RECORDS.find((r) => r.id === "ra-rel-001")!;
    expect(getApprovalLabels(release).accept).toBe("Approve Release");

    const device = SEED_RECORDS.find((r) => r.id === "ra-dev-001")!;
    expect(getApprovalLabels(device).remediate).toBe("Require More Evidence");

    const evidence = SEED_RECORDS.find((r) => r.id === "ra-evd-001")!;
    expect(getApprovalLabels(evidence).accept).toBe("Mark Reviewed");
  });
});

describe("KEV finding mapping", () => {
  it("translates every seeded KEV finding into a valid create-payload draft", () => {
    for (const finding of KEV_FINDINGS) {
      const draft = mapKevFindingToRiskRecordDraft(finding);
      expect(draft.module).toBe("kev-exposure-review");
      expect(draft.kevContext.cve).toBe(finding.cve);
      expect(draft.kevContext.source).toBe(finding.source);
      expect(draft.kevContext.affectedAsset).toBe(finding.asset);
      expect(draft.kevContext.assetType).toBe(finding.assetType);
      expect(draft.kevContext.exposureStatus).toBe(finding.exposureStatus);
      expect(draft.kevContext.patchAvailability).toBe(finding.patchAvailability);
      expect(draft.riskLevel).toBe(finding.riskLevel);
      expect(draft.sourceReferences[0].externalId).toBe(finding.id);
      expect(draft.sourceReferences[1].system).toBe("CISA KEV reference");
      if (finding.emergency) {
        expect(draft.kevContext.emergency).toBe(true);
      }
    }
  });

  it("emits a stable query string for the intake prefill", () => {
    const finding = KEV_FINDINGS[0];
    const query = buildKevIntakeQuery(finding);
    const params = new URLSearchParams(query);
    expect(params.get("cve")).toBe(finding.cve);
    expect(params.get("source")).toBe(finding.source);
    expect(params.get("asset")).toBe(finding.asset);
    expect(params.get("assetType")).toBe(finding.assetType);
    expect(params.get("exposureStatus")).toBe(finding.exposureStatus);
    expect(params.get("patchAvailability")).toBe(finding.patchAvailability);
    expect(params.get("riskLevel")).toBe(finding.riskLevel);
    expect(params.get("kevStatus")).toBe(finding.kevStatus);
    expect(params.get("emergency")).toBe(finding.emergency ? "1" : null);
  });
});

describe("Exposure acceptance window math", () => {
  it("parses human windows into milliseconds", () => {
    expect(parseExposureAcceptanceWindow("48 hours")).toBe(48 * 60 * 60 * 1000);
    expect(parseExposureAcceptanceWindow("14 days")).toBe(14 * 24 * 60 * 60 * 1000);
    expect(parseExposureAcceptanceWindow("2 weeks")).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    expect(parseExposureAcceptanceWindow("1 month")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("returns null for unrecognized inputs", () => {
    expect(parseExposureAcceptanceWindow("indefinite")).toBeNull();
    expect(parseExposureAcceptanceWindow("")).toBeNull();
    expect(parseExposureAcceptanceWindow(undefined)).toBeNull();
  });

  it("computes a future ISO expiration from a base date", () => {
    const base = new Date("2026-05-13T12:00:00Z");
    expect(computeExposureExpiration(base, "48 hours")).toBe("2026-05-15T12:00:00.000Z");
  });
});

describe("KEV evidence summary", () => {
  const record = kevRecord("ra-kev-001");

  it("returns kevFields on the summary when context is present", () => {
    const summary = summarizeRecordForEvidence(record);
    expect(summary.kevFields).toBeDefined();
    expect(summary.kevFields?.cve).toBe("CVE-2026-1455");
    expect(summary.kevFields?.kevStatus).toBe("Known exploited");
    expect(summary.kevFields?.source).toBe("Tenable");
    expect(summary.kevFields?.assetType).toBe("Network appliance");
    expect(summary.kevFields?.exposureStatus).toBe("Exposed");
    expect(summary.kevFields?.patchAvailability).toBe("Patch available");
    expect(summary.kevFields?.emergency).toBe(false);
  });

  it("renders the KEV Exposure Review executive summary template", () => {
    const text = buildKevExecutiveSummary(record);
    expect(text).toContain("KEV Exposure Review record");
    expect(text).toContain("CISA KEV-aware");
    expect(text).toContain("affected asset");
    expect(text).toContain("exposure status");
    expect(text).toContain("patch availability");
    expect(text).toContain("remediation owner");
    expect(text).toContain("compensating controls");
    expect(text).toContain("expiration date");
    expect(text).toContain("review timeline");
    expect(text).toContain("CVE-2026-1455");
    expect(text).toContain("NIST-aligned");
    expect(text).toContain("framework-informed");
    expect(text).toContain("designed to support audit evidence");
  });

  it("never emits prohibited compliance phrases", () => {
    const text = buildKevExecutiveSummary(record);
    const banned = [
      "CISA approved",
      "CISA certified",
      "NIST certified",
      "guaranteed compliant",
      "eliminates risk",
      "auditor approved",
    ];
    for (const phrase of banned) {
      expect(text.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });
});

describe("KEV Exposure Review CTA routes", () => {
  it("primary CTA points to /book-risk-review", () => {
    expect(ctaRouteFor("kev_exposure_review_primary")).toBe("/book-risk-review");
  });

  it("secondary CTA points to the KEV intake form", () => {
    expect(ctaRouteFor("kev_exposure_review_secondary")).toBe(
      "/dashboard/cisa-kev-review/new",
    );
  });
});

describe("KEV Exposure Review filtering and creation", () => {
  function demoUser(): SessionUser {
    return requireCurrentUser();
  }

  it("seed data contains exactly 8 KEV Exposure Review records", () => {
    const kev = SEED_RECORDS.filter((r) => r.module === "kev-exposure-review");
    expect(kev.length).toBe(8);
  });

  it("listRiskRecordsByModule returns KEV records and ignores other modules", () => {
    const user = demoUser();
    const records = listRiskRecordsByModule(user, "kev-exposure-review");
    expect(records.length).toBe(8);
    expect(records.every((r) => r.module === "kev-exposure-review")).toBe(true);
  });

  it("createRiskRecord persists kevContext including emergency flag", () => {
    const user = demoUser();
    const created = createRiskRecord(user, {
      module: "kev-exposure-review",
      title: "Emergency KEV exposure",
      description: "Internet-facing exposure flagged by Tenable.",
      sourceSystem: "Tenable",
      sourceType: "kev.tenable",
      riskLevel: "critical",
      owner: "Sara Romero",
      department: "Infrastructure Security",
      compensatingControls: "Emergency edge rule applied.",
      evidenceSummary: "Tenable export, edge rule diff.",
      businessJustification: "Active exploitation in the wild.",
      technicalContext: "Internet-facing portal; patch available.",
      frameworkTags: ["CISA KEV", "NIST 800-53 SI-2"],
      sourceReferences: [],
      kevContext: {
        cve: "CVE-2025-99999",
        kevStatus: "known-exploited",
        source: "tenable",
        affectedAsset: "external-portal-test",
        assetType: "internet-facing-server",
        exposureStatus: "exposed",
        patchAvailability: "patch-available",
        remediationOwner: "Sara Romero",
        businessReasonForDelay:
          "None — emergency remediation in progress; record captures the decision.",
        emergency: true,
      },
    });

    expect(created.module).toBe("kev-exposure-review");
    expect(created.kevContext?.emergency).toBe(true);
    expect(created.kevContext?.cve).toBe("CVE-2025-99999");
    expect(listRiskRecordsByModule(user, "kev-exposure-review").length).toBe(9);
  });
});

describe("Language guardrails on KEV marketing copy and helpers", () => {
  const banned = [
    "CISA approved",
    "CISA certified",
    "NIST certified",
    "guaranteed compliant",
    "eliminates risk",
    "auditor approved",
  ];

  it("none of the eight seeded KEV records contain banned phrases anywhere", () => {
    const kev = SEED_RECORDS.filter((r) => r.module === "kev-exposure-review");
    for (const record of kev) {
      const blob = [
        record.title,
        record.description,
        record.compensatingControls,
        record.evidenceSummary,
        record.businessJustification,
        record.technicalContext,
        record.kevContext?.businessReasonForDelay ?? "",
        record.kevContext?.executiveSummaryNote ?? "",
      ]
        .join(" ")
        .toLowerCase();
      for (const phrase of banned) {
        expect(blob).not.toContain(phrase.toLowerCase());
      }
    }
  });
});
