import { describe, expect, it } from "vitest";
import {
  moduleKeyToQuery,
  parseModuleQuery,
  wizardLinkForModule,
} from "@/lib/module-query";

describe("parseModuleQuery", () => {
  it("maps every supported underscore-style key", () => {
    expect(parseModuleQuery("ai_action_gate")).toBe("ai-action-gate");
    expect(parseModuleQuery("access_accept")).toBe("access-accept");
    expect(parseModuleQuery("vulnerability_accept")).toBe("vulnerability-accept");
    expect(parseModuleQuery("kev_exposure_review")).toBe("kev-exposure-review");
    expect(parseModuleQuery("secure_release_gate")).toBe("secure-release-gate");
    expect(parseModuleQuery("device_accept")).toBe("device-accept");
    expect(parseModuleQuery("evidence_desk")).toBe("evidence-desk");
  });

  it("accepts the hyphen form for resilience", () => {
    expect(parseModuleQuery("ai-action-gate")).toBe("ai-action-gate");
    expect(parseModuleQuery("Secure_Release_Gate")).toBe("secure-release-gate");
  });

  it("returns null for unknown or empty values", () => {
    expect(parseModuleQuery(null)).toBeNull();
    expect(parseModuleQuery(undefined)).toBeNull();
    expect(parseModuleQuery("")).toBeNull();
    expect(parseModuleQuery("not_a_module")).toBeNull();
  });

  it("handles arrays (Next searchParams shape) by taking the first value", () => {
    expect(parseModuleQuery(["device_accept", "ignored"])).toBe("device-accept");
    expect(parseModuleQuery([])).toBeNull();
  });
});

describe("moduleKeyToQuery", () => {
  it("round-trips via parseModuleQuery", () => {
    const keys = [
      "ai-action-gate",
      "access-accept",
      "vulnerability-accept",
      "kev-exposure-review",
      "secure-release-gate",
      "device-accept",
      "evidence-desk",
    ] as const;
    for (const key of keys) {
      expect(parseModuleQuery(moduleKeyToQuery(key))).toBe(key);
    }
  });
});

describe("wizardLinkForModule", () => {
  it("builds the wizard URL with the module query param", () => {
    expect(wizardLinkForModule("ai-action-gate")).toBe(
      "/dashboard/risk-records/new?module=ai_action_gate",
    );
    expect(wizardLinkForModule("evidence-desk")).toBe(
      "/dashboard/risk-records/new?module=evidence_desk",
    );
  });
});
