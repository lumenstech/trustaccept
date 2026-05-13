import type { ProductModuleKey, ProductModuleMeta } from "./types";

export const MODULES: ProductModuleMeta[] = [
  {
    key: "ai-action-gate",
    name: "AI Action Gate",
    shortName: "AI Action",
    route: "/dashboard/product-modules/ai-action-gate",
    marketingRoute: "/ai-action-gate",
    tagline: "Approve or reject high-impact AI agent actions before they execute.",
    description:
      "Insert a defensible approval checkpoint in front of AI agents that touch customer data, payments, infrastructure, or production tenants.",
    acceptLabel: "Approve Action",
    rejectLabel: "Reject Action",
    remediateLabel: "Require Review",
  },
  {
    key: "access-accept",
    name: "Access Accept",
    shortName: "Access",
    route: "/dashboard/product-modules/access-accept",
    marketingRoute: "/access-accept",
    tagline: "Make break-glass, privileged, and just-in-time access decisions reviewable.",
    description:
      "Wrap your identity provider with an approval and evidence layer for privileged, emergency, and contractor access events.",
    acceptLabel: "Accept Risk",
    rejectLabel: "Reject Risk",
    remediateLabel: "Require Remediation",
  },
  {
    key: "vulnerability-accept",
    name: "Vulnerability Accept",
    shortName: "Vuln Accept",
    route: "/dashboard/product-modules/vulnerability-accept",
    marketingRoute: "/vulnerability-acceptance",
    tagline: "Document risk acceptance for vulnerabilities you cannot patch today.",
    description:
      "Capture compensating controls, expiration dates, and owner sign-off for vulnerability exceptions in a single defensible record.",
    acceptLabel: "Accept Risk",
    rejectLabel: "Reject Risk",
    remediateLabel: "Require Remediation",
  },
  {
    key: "kev-exposure-review",
    name: "KEV Exposure Review",
    shortName: "KEV Review",
    route: "/dashboard/product-modules/kev-exposure-review",
    marketingRoute: "/cisa-kev-review",
    tagline: "CISA KEV-aware exposure reviews with auditable acceptance trails.",
    description:
      "Surface known exploited vulnerabilities mapped to assets, owners, and remediation deadlines — and capture the decision.",
    acceptLabel: "Accept Risk",
    rejectLabel: "Reject Risk",
    remediateLabel: "Require Remediation",
  },
  {
    key: "secure-release-gate",
    name: "Secure Release Gate",
    shortName: "Release Gate",
    route: "/dashboard/product-modules/secure-release-gate",
    marketingRoute: "/secure-release-gate",
    tagline: "A signed approval checkpoint for risky software releases.",
    description:
      "Pause production releases on unresolved SAST, DAST, or dependency findings until a named approver decides.",
    acceptLabel: "Approve Release",
    rejectLabel: "Block Release",
    remediateLabel: "Require Remediation",
  },
  {
    key: "device-accept",
    name: "Device Accept",
    shortName: "Device",
    route: "/dashboard/product-modules/device-accept",
    marketingRoute: "/device-accept",
    tagline: "Approve, reject, or escalate device access requests with evidence.",
    description:
      "Make device onboarding — including contractor, BYOD, and IoT — a reviewable decision with attached evidence and expiration.",
    acceptLabel: "Approve Device",
    rejectLabel: "Reject Device",
    remediateLabel: "Require More Evidence",
  },
  {
    key: "evidence-desk",
    name: "Evidence Desk",
    shortName: "Evidence",
    route: "/dashboard/product-modules/evidence-desk",
    marketingRoute: "/evidence-desk",
    tagline: "One evidence-ready system of record for every risk decision.",
    description:
      "Audit-ready packets for every accepted, rejected, and remediated risk — exportable for executive risk registers and auditors.",
    acceptLabel: "Mark Reviewed",
    rejectLabel: "Request Update",
    remediateLabel: "Export Evidence",
  },
];

export function getModule(key: ProductModuleKey): ProductModuleMeta {
  const found = MODULES.find((m) => m.key === key);
  if (!found) throw new Error(`Unknown module: ${key}`);
  return found;
}
