import { describe, expect, it } from "vitest";
import { applyDecision } from "@/lib/decision";
import {
  buildExecutiveSummary,
  summarizeRecordForEvidence,
} from "@/lib/evidence";
import { SEED_RECORDS } from "@/lib/seed-data";

const record = SEED_RECORDS.find((r) => r.id === "ra-rel-001")!;

describe("summarizeRecordForEvidence", () => {
  it("returns the headline fields for the evidence packet", () => {
    const summary = summarizeRecordForEvidence(record);
    expect(summary.decisionId).toBe("ra-rel-001");
    expect(summary.module).toBe("Secure Release Gate");
    expect(summary.riskLevel).toBe("HIGH");
    expect(summary.sourceSystem).toBe("GitHub Actions");
    expect(summary.owner).toBe("Jordan Pak");
    expect(summary.expirationDate).toBe("2026-05-27");
    expect(summary.frameworkTags).toContain("NIST SSDF PW.8");
  });

  it("describes pending outcomes when no decision has been recorded", () => {
    const summary = summarizeRecordForEvidence(record);
    expect(summary.outcome.toLowerCase()).toContain("pending");
  });

  it("describes accepted outcomes after a decision is applied", () => {
    const decided = applyDecision(record, "accept", { actor: "Alex Greene" });
    const summary = summarizeRecordForEvidence(decided);
    expect(summary.outcome).toMatch(/accepted/i);
  });
});

describe("buildExecutiveSummary", () => {
  it("mentions the module, source system, owner, and lifecycle", () => {
    const text = buildExecutiveSummary(record);
    expect(text).toContain("Secure Release Gate");
    expect(text).toContain("GitHub Actions");
    expect(text).toContain("Jordan Pak");
    expect(text).toMatch(/Decision pending|Decision recorded/);
  });

  it("uses NIST-aligned and CISA KEV-aware framing", () => {
    const text = buildExecutiveSummary(record);
    expect(text).toContain("NIST-aligned");
    expect(text).toContain("CISA KEV-aware");
    expect(text).toContain("designed to support audit evidence");
  });

  it("does not use prohibited compliance language", () => {
    const text = buildExecutiveSummary(record);
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
