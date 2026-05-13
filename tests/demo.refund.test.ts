import { describe, expect, it } from "vitest";
import {
  buildReceiptDisplay,
  outcomeToDecisionFields,
  refundPolicyBand,
  RefundRequestSchema,
  REFUND_POLICY_BULLETS,
} from "@/lib/demo/refund-policy";

describe("RefundRequestSchema", () => {
  const valid = {
    customer_id: "cus_123",
    refund_amount: 49.99,
    reason: "duplicate charge on invoice INV-2026-001",
    order_id: "ord-42",
    requested_by_agent: "Support Refund Agent",
    risk_level: "low" as const,
  };

  it("accepts a well-formed payload", () => {
    expect(() => RefundRequestSchema.parse(valid)).not.toThrow();
  });

  it("rejects zero or negative amounts", () => {
    expect(() => RefundRequestSchema.parse({ ...valid, refund_amount: 0 })).toThrow();
    expect(() => RefundRequestSchema.parse({ ...valid, refund_amount: -5 })).toThrow();
  });

  it("rejects amounts beyond the demo limit", () => {
    expect(() =>
      RefundRequestSchema.parse({ ...valid, refund_amount: 250_000 }),
    ).toThrow();
  });

  it("rejects suspicious characters in identifiers", () => {
    expect(() =>
      RefundRequestSchema.parse({ ...valid, customer_id: "<script>" }),
    ).toThrow();
    expect(() =>
      RefundRequestSchema.parse({ ...valid, order_id: "ord 42" }),
    ).toThrow();
  });

  it("requires a recognised risk level", () => {
    expect(() =>
      RefundRequestSchema.parse({ ...valid, risk_level: "extreme" }),
    ).toThrow();
  });

  it("requires a non-trivial reason", () => {
    expect(() => RefundRequestSchema.parse({ ...valid, reason: "x" })).toThrow();
  });
});

describe("refundPolicyBand", () => {
  it("returns 'auto' under the review threshold", () => {
    const band = refundPolicyBand(50);
    expect(band.band).toBe("auto");
    expect(band.suggestedOutcome).toBe("accept");
  });
  it("returns 'review' between $100 and $500", () => {
    const band = refundPolicyBand(250);
    expect(band.band).toBe("review");
    expect(band.suggestedOutcome).toBe("manual_review");
  });
  it("returns 'manager' above $500", () => {
    const band = refundPolicyBand(750);
    expect(band.band).toBe("manager");
    expect(band.label).toContain("Manager");
  });
  it("snaps exactly $100 into 'auto' and exactly $500 into 'review' (inclusive lower bound)", () => {
    expect(refundPolicyBand(100).band).toBe("auto");
    expect(refundPolicyBand(500).band).toBe("review");
  });
});

describe("outcomeToDecisionFields", () => {
  it("maps accept to allowed without block", () => {
    expect(outcomeToDecisionFields("accept")).toEqual({
      decisionStatus: "allowed",
      block: false,
    });
  });
  it("maps reject to blocked", () => {
    expect(outcomeToDecisionFields("reject")).toEqual({
      decisionStatus: "blocked",
      block: true,
    });
  });
  it("maps manual_review to pending_review without block", () => {
    expect(outcomeToDecisionFields("manual_review")).toEqual({
      decisionStatus: "pending_review",
      block: false,
    });
  });
});

describe("buildReceiptDisplay", () => {
  it("produces short and full hashes plus signature short-form", () => {
    const display = buildReceiptDisplay({
      evidenceSha256: "abcdef0123456789".repeat(4),
      receiptJws: "header.payload.signature",
      decisionStatus: "allowed",
      capCheckOk: true,
    });
    expect(display.fullHash.length).toBe(64);
    expect(display.shortHash).toMatch(/^abcdef01…/);
    expect(display.shortJws).toContain("…");
    expect(display.capCheckTone).toBe("ok");
    expect(display.capCheckLabel).toMatch(/passed/);
    expect(display.receiptValidLabel).toMatch(/RS256/);
  });

  it("labels a cap-check failure as warn for pending review", () => {
    const display = buildReceiptDisplay({
      evidenceSha256: "f".repeat(64),
      receiptJws: "a.b.c",
      decisionStatus: "pending_review",
      capCheckOk: false,
    });
    expect(display.capCheckTone).toBe("warn");
    expect(display.capCheckLabel).toMatch(/pending review/);
  });

  it("labels a cap-check failure as block for blocked decisions", () => {
    const display = buildReceiptDisplay({
      evidenceSha256: "f".repeat(64),
      receiptJws: "a.b.c",
      decisionStatus: "blocked",
      capCheckOk: false,
    });
    expect(display.capCheckTone).toBe("block");
  });

  it("flags a missing receipt", () => {
    const display = buildReceiptDisplay({
      evidenceSha256: "f".repeat(64),
      receiptJws: "",
      decisionStatus: "allowed",
      capCheckOk: true,
    });
    expect(display.shortJws).toBe("(unsigned)");
    expect(display.receiptValidLabel).toBe("Receipt missing");
  });
});

describe("REFUND_POLICY_BULLETS", () => {
  it("contains the four policy lines surfaced in the demo UI", () => {
    expect(REFUND_POLICY_BULLETS).toHaveLength(4);
    expect(REFUND_POLICY_BULLETS.join(" ")).toMatch(/over \$100/);
    expect(REFUND_POLICY_BULLETS.join(" ")).toMatch(/over \$500/);
    expect(REFUND_POLICY_BULLETS.join(" ")).toMatch(/Revoked or paused/);
  });
});
