import { LeadCapturePage } from "@/components/site/lead-capture-page";

export default function Page() {
  return (
    <LeadCapturePage
      eyebrow="48-Hour Risk Acceptance Pack"
      title="Book a 48-Hour Risk Acceptance Review."
      subtitle="Three defensible risk records produced in two business days. Framework-informed compensating controls. Executive-ready cover summary."
      bullets={[
        "Three risk records, delivered in 48 hours",
        "Executive-ready cover summary mapped to your risk register",
        "NIST-aligned and CISA KEV-aware compensating controls",
        "Hand-off to your audit, risk, and engineering leads",
      ]}
      submitLabel="Book the 48-Hour Pack"
      successTitle="48-Hour Review booked"
      pricingNote="$1,500 · one-time · approval delivery powered by SequenceNow"
    />
  );
}
