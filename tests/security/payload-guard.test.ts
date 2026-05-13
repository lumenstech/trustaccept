import { describe, expect, it } from "vitest";

import {
  PayloadGuardError,
  rejectIfUnsafe,
  sanitizeForLogging,
} from "@/src/lib/security/payload-guard";

// Industry-published Visa test PAN. Valid Luhn, never associated with a
// real account; used by Stripe / Braintree test docs. Safe to commit.
const TEST_VISA = "4111111111111111";

describe("rejectIfUnsafe — card numbers", () => {
  it("rejects a bare PAN inside a string field", () => {
    expect(() => rejectIfUnsafe({ note: TEST_VISA })).toThrow(PayloadGuardError);
  });

  it("rejects a PAN with dashes or spaces", () => {
    expect(() => rejectIfUnsafe({ note: "4111-1111-1111-1111" })).toThrow(PayloadGuardError);
    expect(() => rejectIfUnsafe({ note: "4111 1111 1111 1111" })).toThrow(PayloadGuardError);
  });

  it("rejects a PAN nested under any key", () => {
    expect(() => rejectIfUnsafe({ a: { b: { c: `Payment: ${TEST_VISA}` } } })).toThrow(
      PayloadGuardError,
    );
  });

  it("does not flag a 16-digit identifier that fails Luhn", () => {
    expect(() => rejectIfUnsafe({ traceId: "1234567812345678" })).not.toThrow();
  });

  it("does not flag long but Luhn-failing digit runs", () => {
    expect(() => rejectIfUnsafe({ note: "9999999999999999" })).not.toThrow();
  });

  it("flags the field path in the thrown error", () => {
    try {
      rejectIfUnsafe({ data: { payment_method: TEST_VISA } });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayloadGuardError);
      expect((err as PayloadGuardError).fieldPath).toContain("payment_method");
      expect((err as PayloadGuardError).reason).toBe("card_number_detected");
    }
  });
});

describe("rejectIfUnsafe — CVV / CVC", () => {
  it("rejects a 3-digit CVV under a key like 'cvv'", () => {
    expect(() => rejectIfUnsafe({ cvv: "123" })).toThrow(PayloadGuardError);
  });

  it("rejects 'cvc' and 'card_cvc' style keys", () => {
    expect(() => rejectIfUnsafe({ cvc: "1234" })).toThrow(PayloadGuardError);
    expect(() => rejectIfUnsafe({ card_cvc: 123 })).toThrow(PayloadGuardError);
  });

  it("does not flag a bare 3-digit number under an innocuous key", () => {
    expect(() => rejectIfUnsafe({ riskScore: 123 })).not.toThrow();
    expect(() => rejectIfUnsafe({ pin: "123" })).not.toThrow();
  });
});

describe("rejectIfUnsafe — routing / ABA", () => {
  it("rejects a 9-digit value under a routing key", () => {
    expect(() => rejectIfUnsafe({ routing: "123456789" })).toThrow(PayloadGuardError);
    expect(() => rejectIfUnsafe({ aba_number: 123456789 })).toThrow(PayloadGuardError);
  });

  it("does not flag a 9-digit value under an innocuous key", () => {
    expect(() => rejectIfUnsafe({ caseId: "123456789" })).not.toThrow();
  });
});

describe("rejectIfUnsafe — safe payloads", () => {
  it("allows realistic decision-request payloads", () => {
    const ok = {
      source: "ai_agent",
      actionType: "wire_transfer_approval",
      amount: 5000,
      currency: "USD",
      description: "Approve customer refund for case 88421",
      metadata: {
        source: "api",
        risk_signals: { new_device: true, impossible_travel: false },
        trace: { id: "trace_abc123", parent: null },
      },
    };
    expect(() => rejectIfUnsafe(ok)).not.toThrow();
  });

  it("handles null and undefined without throwing", () => {
    expect(() => rejectIfUnsafe(null)).not.toThrow();
    expect(() => rejectIfUnsafe(undefined)).not.toThrow();
    expect(() => rejectIfUnsafe({ a: null, b: undefined })).not.toThrow();
  });
});

describe("sanitizeForLogging", () => {
  it("redacts card-shaped substrings inside strings", () => {
    const result = sanitizeForLogging({ note: `tail end: ${TEST_VISA}` }) as {
      note: string;
    };
    expect(result.note).not.toContain(TEST_VISA);
    expect(result.note).toContain("[REDACTED]");
  });

  it("redacts CVV-keyed values", () => {
    const result = sanitizeForLogging({ cvv: "456" }) as Record<string, unknown>;
    expect(result.cvv).toBe("[REDACTED]");
  });

  it("redacts routing-keyed values", () => {
    const result = sanitizeForLogging({ routing: "111000025" }) as Record<string, unknown>;
    expect(result.routing).toBe("[REDACTED]");
  });

  it("leaves safe data untouched", () => {
    const input = { id: "ra-123", amount: 50, currency: "USD" };
    expect(sanitizeForLogging(input)).toEqual(input);
  });
});
