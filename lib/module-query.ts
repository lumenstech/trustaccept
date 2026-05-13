import type { ProductModuleKey } from "./types";

const QUERY_TO_KEY: Record<string, ProductModuleKey> = {
  ai_action_gate: "ai-action-gate",
  access_accept: "access-accept",
  vulnerability_accept: "vulnerability-accept",
  kev_exposure_review: "kev-exposure-review",
  secure_release_gate: "secure-release-gate",
  device_accept: "device-accept",
  evidence_desk: "evidence-desk",
};

const KEY_TO_QUERY: Record<ProductModuleKey, string> = {
  "ai-action-gate": "ai_action_gate",
  "access-accept": "access_accept",
  "vulnerability-accept": "vulnerability_accept",
  "kev-exposure-review": "kev_exposure_review",
  "secure-release-gate": "secure_release_gate",
  "device-accept": "device_accept",
  "evidence-desk": "evidence_desk",
};

export function parseModuleQuery(raw: string | string[] | null | undefined): ProductModuleKey | null {
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length === 0) return null;
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  return QUERY_TO_KEY[normalized] ?? null;
}

export function moduleKeyToQuery(key: ProductModuleKey): string {
  return KEY_TO_QUERY[key];
}

export function wizardLinkForModule(key: ProductModuleKey): string {
  return `/dashboard/risk-records/new?module=${KEY_TO_QUERY[key]}`;
}
