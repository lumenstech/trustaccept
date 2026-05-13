import { describe, expect, it } from "vitest";
import {
  ApprovalDecisionInput,
  EvidencePacketExportInput,
  LeadCaptureInput,
  RiskRecordCreateInput,
  formatZodError,
} from "@/src/lib/validation";

const validRecord = {
  module: "ai-action-gate",
  title: "AI agent wants to export 1,240 customer records",
  description: "Support copilot is attempting to export.",
  sourceSystem: "AgentOps",
  sourceType: "agent.tool_call",
  riskLevel: "high",
  owner: "Priya Shah",
  department: "Customer Operations",
  compensatingControls: "DLP scan, 24h TTL",
  evidenceSummary: "Agent intent log, requested SQL query",
  businessJustification: "May board pack refresh window",
  technicalContext: "Export target is the analytics workspace.",
  frameworkTags: ["NIST AI RMF GOVERN 1.3"],
  sourceReferences: [
    { label: "Agent run agent-7741", system: "AgentOps", externalId: "agent-7741" },
  ],
} as const;

describe("RiskRecordCreateInput", () => {
  it("accepts a fully-formed payload", () => {
    expect(() => RiskRecordCreateInput.parse(validRecord)).not.toThrow();
  });

  it("rejects unknown modules", () => {
    const result = RiskRecordCreateInput.safeParse({
      ...validRecord,
      module: "not-a-module",
    });
    expect(result.success).toBe(false);
  });

  it("requires a title of at least 4 characters", () => {
    const result = RiskRecordCreateInput.safeParse({ ...validRecord, title: "yo" });
    expect(result.success).toBe(false);
  });

  it("requires the four core narrative fields", () => {
    for (const field of [
      "compensatingControls",
      "evidenceSummary",
      "businessJustification",
    ]) {
      const result = RiskRecordCreateInput.safeParse({
        ...validRecord,
        [field]: "",
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects oversize source reference arrays", () => {
    const refs = Array.from({ length: 25 }, (_, i) => ({
      label: `ref ${i}`,
      system: "scanner",
    }));
    const result = RiskRecordCreateInput.safeParse({
      ...validRecord,
      sourceReferences: refs,
    });
    expect(result.success).toBe(false);
  });

  it("defaults framework tags and source references", () => {
    const parsed = RiskRecordCreateInput.parse({
      ...validRecord,
      frameworkTags: undefined,
      sourceReferences: undefined,
    });
    expect(parsed.frameworkTags).toEqual([]);
    expect(parsed.sourceReferences).toEqual([]);
  });
});

describe("ApprovalDecisionInput", () => {
  it("requires a valid action", () => {
    expect(ApprovalDecisionInput.safeParse({ action: "approve" }).success).toBe(false);
    expect(ApprovalDecisionInput.safeParse({ action: "accept" }).success).toBe(true);
  });

  it("accepts optional note and review date", () => {
    const parsed = ApprovalDecisionInput.parse({
      action: "accept",
      decisionNote: "Approved with WAF rule R-882 in place.",
      reviewDate: "2026-06-30",
    });
    expect(parsed.reviewDate).toBe("2026-06-30");
  });

  it("rejects an oversize decision note", () => {
    const parsed = ApprovalDecisionInput.safeParse({
      action: "accept",
      decisionNote: "x".repeat(2_500),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("LeadCaptureInput", () => {
  const validLead = {
    formType: "book-risk-review",
    name: "Avery Chen",
    company: "Lumens",
    email: "avery@lumens.io",
    phone: "",
    riskArea: "ai-agent-action",
    urgency: "48-hours",
    description: "We need three risk records this week.",
  } as const;

  it("accepts a valid lead", () => {
    expect(LeadCaptureInput.parse(validLead).riskArea).toBe("ai-agent-action");
  });

  it("rejects invalid emails", () => {
    expect(
      LeadCaptureInput.safeParse({ ...validLead, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects unknown form types", () => {
    expect(
      LeadCaptureInput.safeParse({ ...validLead, formType: "newsletter" }).success,
    ).toBe(false);
  });
});

describe("EvidencePacketExportInput", () => {
  it("defaults format to pdf", () => {
    expect(EvidencePacketExportInput.parse({ recordId: "ra-ai-001" }).format).toBe("pdf");
  });
});

describe("formatZodError", () => {
  it("flattens issues to a structured error", () => {
    const result = RiskRecordCreateInput.safeParse({ ...validRecord, title: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.error).toBe("validation_failed");
      expect(formatted.issues[0].path).toContain("title");
    }
  });
});
