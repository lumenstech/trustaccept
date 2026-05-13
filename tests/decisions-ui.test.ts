import { describe, expect, it } from "vitest";
import {
  capCheckTone,
  decisionOutcomeLabel,
  decisionOutcomeTone,
  formatCapCheckSummary,
  formatEvidenceHash,
  receiptIndicator,
} from "@/lib/decisions-ui";
import type { DecisionRecord } from "@/lib/types";

const fakeRecord = (overrides: Partial<DecisionRecord> = {}): DecisionRecord => ({
  id: "00000000-0000-0000-0000-000000000001",
  tenantId: "demo-org",
  action: "transfer.funds",
  decision: "accept",
  context: {},
  policyVersion: "v0",
  createdAt: "2026-05-13T10:00:00Z",
  ...overrides,
});

describe("decisions table rendering helpers", () => {
  it("maps each decision outcome to a stable tone and label", () => {
    expect(decisionOutcomeTone("accept")).toBe("success");
    expect(decisionOutcomeTone("reject")).toBe("danger");
    expect(decisionOutcomeTone("remediate")).toBe("info");
    expect(decisionOutcomeLabel("accept")).toBe("Accepted");
    expect(decisionOutcomeLabel("reject")).toBe("Rejected");
    expect(decisionOutcomeLabel("remediate")).toBe("Remediate");
  });

  it("shows em-dash for missing cap_check, otherwise summarizes usage", () => {
    expect(formatCapCheckSummary(undefined)).toBe("—");
    expect(
      formatCapCheckSummary({
        daily_used: 50,
        weekly_used: 80,
        monthly_used: 80,
        exceeded: false,
      }),
    ).toBe("day $50 · within");
    expect(
      formatCapCheckSummary({
        daily_used: 200,
        weekly_used: 200,
        monthly_used: 200,
        exceeded: true,
      }),
    ).toBe("day $200 · exceeded");
  });

  it("maps cap_check tone for the badge", () => {
    expect(capCheckTone(undefined)).toBe("neutral");
    expect(
      capCheckTone({ daily_used: 0, weekly_used: 0, monthly_used: 0, exceeded: false }),
    ).toBe("success");
    expect(
      capCheckTone({ daily_used: 1, weekly_used: 1, monthly_used: 1, exceeded: true }),
    ).toBe("danger");
  });

  it("returns a signed indicator with the trailing 8 chars when a receipt exists", () => {
    const r = fakeRecord({
      signedReceipt: "header.payload.abcdef1234567890",
    });
    const ind = receiptIndicator(r);
    expect(ind.signed).toBe(true);
    expect(ind.label).toBe("Signed (RS256)");
    expect(ind.short).toBe("34567890");
  });

  it("returns a no-receipt indicator when signedReceipt is missing", () => {
    const r = fakeRecord({ signedReceipt: undefined });
    const ind = receiptIndicator(r);
    expect(ind.signed).toBe(false);
    expect(ind.short).toBe("—");
  });

  it("truncates evidence hashes to 12 chars with an ellipsis", () => {
    expect(formatEvidenceHash(undefined)).toBe("—");
    expect(formatEvidenceHash("abc")).toBe("abc");
    expect(formatEvidenceHash("abcdef0123456789abcdef")).toBe("abcdef012345…");
  });
});
