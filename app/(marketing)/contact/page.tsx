import { LeadCapturePage } from "@/components/site/lead-capture-page";

export default function Page() {
  return (
    <LeadCapturePage
      eyebrow="Contact"
      title="Talk to a TrustAccept specialist."
      subtitle="Secure Release Program, custom engagements, audit support, or a question about the platform. We'll route your request to the right team."
      bullets={[
        "Secure Release Program on-call approver coverage",
        "Custom service-led engagements",
        "Audit, risk register, and evidence packet support",
        "Lumens Technology / SequenceNow procurement questions",
      ]}
      submitLabel="Send to the TrustAccept team"
      successTitle="Message received"
      defaultRiskArea="secure-release"
    />
  );
}
