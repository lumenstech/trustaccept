import { LeadCapturePage } from "@/components/site/lead-capture-page";

export default function Page() {
  return (
    <LeadCapturePage
      eyebrow="TrustAccept Pilot"
      title="Stand up one TrustAccept module in your environment."
      subtitle="Workflow design, integration mapping, and approver onboarding for a single product module. Designed to support audit evidence from day one."
      bullets={[
        "One product module live in your tenant",
        "Approver onboarding and role mapping",
        "Integration mapping to your IdP, scanners, or pipelines",
        "SequenceNow delivery configuration for hosted approvals",
      ]}
      submitLabel="Scope a pilot"
      successTitle="Pilot request received"
      defaultRiskArea="ai-agent-action"
      pricingNote="$2,500 – $5,000 · engagement"
    />
  );
}
