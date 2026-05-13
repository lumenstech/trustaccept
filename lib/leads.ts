export const RISK_AREAS = [
  { value: "ai-agent-action", label: "AI agent action" },
  { value: "identity-access-event", label: "Identity / access event" },
  { value: "vulnerability-exception", label: "Vulnerability exception" },
  { value: "cisa-kev-exposure", label: "CISA KEV exposure" },
  { value: "secure-release", label: "Secure release" },
  { value: "device-access", label: "Device access" },
  { value: "evidence-desk", label: "Evidence Desk" },
  { value: "other", label: "Other" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "48-hours", label: "Within 48 hours" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "exploring", label: "Exploring" },
] as const;

export type RiskAreaValue = (typeof RISK_AREAS)[number]["value"];
export type UrgencyValue = (typeof URGENCY_OPTIONS)[number]["value"];
