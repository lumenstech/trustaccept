import type { ProductModuleKey } from "./types";
import { moduleKeyToQuery } from "./module-query";

export type CtaKey =
  | "homepage_primary"
  | "homepage_secondary"
  | "pack_48hour"
  | "pilot"
  | "managed_evidence_desk"
  | "secure_release_program"
  | "risk_record"
  | "product_primary"
  | "product_secondary";

export const CTA_ROUTES: Record<CtaKey, string> = {
  homepage_primary: "/book-risk-review",
  homepage_secondary: "/docs",
  pack_48hour: "/book-risk-review",
  pilot: "/start-pilot",
  managed_evidence_desk: "/request-evidence-desk",
  secure_release_program: "/contact",
  risk_record: "/book-risk-review",
  product_primary: "/book-risk-review",
  product_secondary: "/dashboard/risk-records/new",
};

export function ctaRouteFor(key: CtaKey, opts?: { module?: ProductModuleKey }): string {
  const base = CTA_ROUTES[key];
  if (key === "product_secondary" && opts?.module) {
    return `${base}?module=${moduleKeyToQuery(opts.module)}`;
  }
  return base;
}
