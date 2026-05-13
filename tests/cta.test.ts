import { describe, expect, it } from "vitest";
import { CTA_ROUTES, ctaRouteFor } from "@/lib/cta";

describe("ctaRouteFor", () => {
  it("maps homepage and product primary CTAs to the risk review booking", () => {
    expect(ctaRouteFor("homepage_primary")).toBe("/book-risk-review");
    expect(ctaRouteFor("pack_48hour")).toBe("/book-risk-review");
    expect(ctaRouteFor("product_primary")).toBe("/book-risk-review");
    expect(ctaRouteFor("risk_record")).toBe("/book-risk-review");
  });

  it("maps the pilot, evidence desk, and release CTAs to their service intake routes", () => {
    expect(ctaRouteFor("pilot")).toBe("/start-pilot");
    expect(ctaRouteFor("managed_evidence_desk")).toBe("/request-evidence-desk");
    expect(ctaRouteFor("secure_release_program")).toBe("/contact");
  });

  it("appends the module query for the product secondary CTA when a module is provided", () => {
    expect(ctaRouteFor("product_secondary", { module: "ai-action-gate" })).toBe(
      "/dashboard/risk-records/new?module=ai_action_gate",
    );
    expect(ctaRouteFor("product_secondary", { module: "evidence-desk" })).toBe(
      "/dashboard/risk-records/new?module=evidence_desk",
    );
  });

  it("falls back to the bare wizard URL when no module is provided", () => {
    expect(ctaRouteFor("product_secondary")).toBe("/dashboard/risk-records/new");
  });

  it("exposes a stable map of every CTA key", () => {
    expect(Object.keys(CTA_ROUTES).sort()).toEqual(
      [
        "access_accept_primary",
        "access_accept_secondary",
        "homepage_primary",
        "homepage_secondary",
        "kev_exposure_review_primary",
        "kev_exposure_review_secondary",
        "managed_evidence_desk",
        "pack_48hour",
        "pilot",
        "product_primary",
        "product_secondary",
        "risk_record",
        "secure_release_program",
        "vulnerability_accept_primary",
        "vulnerability_accept_secondary",
      ].sort(),
    );
  });
});
