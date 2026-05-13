import { LeadCapturePage } from "@/components/site/lead-capture-page";

export default function Page() {
  return (
    <LeadCapturePage
      eyebrow="Managed Evidence Desk"
      title="Let us run your Evidence Desk."
      subtitle="We operate the review queue, track expirations, compile the monthly executive register, and produce audit-ready exports — so your team doesn't have to."
      bullets={[
        "Monthly executive risk register",
        "Expiration monitoring across all seven modules",
        "Audit binder exports on request",
        "Owner follow-up on lapsing decisions",
      ]}
      submitLabel="Talk to evidence team"
      successTitle="Evidence Desk request received"
      defaultRiskArea="evidence-desk"
      pricingNote="From $999 / month · approval delivery powered by SequenceNow"
    />
  );
}
