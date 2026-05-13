import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InboxCard } from "@/components/risk/inbox-card";
import { Section, SectionHeader } from "@/components/ui/section";
import { ctaRouteFor } from "@/lib/cta";
import { getModule } from "@/lib/modules";
import { SEED_RECORDS } from "@/lib/seed-data";
import type { ProductModuleKey } from "@/lib/types";

export interface ModuleMarketingProps {
  moduleKey: ProductModuleKey;
  heroHeadline: string;
  heroSubheadline: string;
  exampleRecordId: string;
  capabilities: string[];
  frameworkRefs: string[];
}

export function ModuleMarketing({
  moduleKey,
  heroHeadline,
  heroSubheadline,
  exampleRecordId,
  capabilities,
  frameworkRefs,
}: ModuleMarketingProps) {
  const module = getModule(moduleKey);
  const record = SEED_RECORDS.find((r) => r.id === exampleRecordId);

  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-8 py-20 lg:py-28">
          <Badge tone="info">{module.name}</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {heroHeadline}
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">{heroSubheadline}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={ctaRouteFor("product_primary")}>
              <Button size="lg">
                Book a 48-Hour Risk Acceptance Review <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={ctaRouteFor("product_secondary", { module: moduleKey })}>
              <Button variant="outline" size="lg">
                Start a risk record for {module.shortName}
              </Button>
            </Link>
            {record ? (
              <Link href={`/approve/${record.id}`}>
                <Button variant="ghost" size="lg">
                  See a live decision
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Capabilities"
              title={`What ${module.name} does`}
              subtitle={module.description}
            />
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {capabilities.map((cap) => (
                <li key={cap} className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {cap}
                </li>
              ))}
            </ul>
          </div>
          {record ? <InboxCard record={record} /> : null}
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Framework-informed"
          title="Reference points TrustAccept records can carry"
          subtitle="TrustAccept records are designed to support audit evidence. We map decisions to NIST-aligned and framework-informed references — we do not claim certification."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameworkRefs.map((ref) => (
            <Card key={ref}>
              <CardHeader>
                <CardTitle className="text-base">{ref}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Decision buttons"
          title={`${module.name} ships with module-aware actions`}
          subtitle="Default Accept Risk, Reject Risk, and Require Remediation actions are relabeled per module to match how approvers actually decide."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="accept">{module.acceptLabel}</Button>
          <Button variant="reject">{module.rejectLabel}</Button>
          <Button variant="remediate">{module.remediateLabel}</Button>
        </div>
      </Section>

      <Section className="bg-card/30">
        <div className="rounded-lg border border-border bg-card p-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to put {module.name} in front of your team?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Start with one defensible record or scope a pilot. Approval delivery
            powered by SequenceNow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={ctaRouteFor("pack_48hour")}>
              <Button>Book the 48-Hour Pack</Button>
            </Link>
            <Link href={ctaRouteFor("product_secondary", { module: moduleKey })}>
              <Button variant="outline">Start a {module.shortName} record</Button>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}

interface ModulePageData {
  heroHeadline: string;
  heroSubheadline: string;
  exampleRecordId: string;
  capabilities: string[];
  frameworkRefs: string[];
}

export const MODULE_PAGES: Record<ProductModuleKey, ModulePageData> = {
  "ai-action-gate": {
    heroHeadline: "Approve or reject high-impact AI agent actions before they execute.",
    heroSubheadline:
      "Intercept agent tool calls that touch sensitive data, payments, infrastructure, or production tenants. Route to a named approver with evidence and expiration attached.",
    exampleRecordId: "ra-ai-001",
    capabilities: [
      "Block agent actions on sensitive resources until an approver decides.",
      "Capture intent log, requested tool call, data classification, and prior approvals.",
      "Return an evidence record tagged to NIST AI RMF and SOC 2 controls.",
      "Hand off to SequenceNow for approver routing, notifications, and signed capture.",
    ],
    frameworkRefs: ["NIST AI RMF GOVERN", "NIST AI RMF MAP", "NIST AI RMF MEASURE", "SOC 2 CC6.7", "ISO 42001"],
  },
  "access-accept": {
    heroHeadline: "Make break-glass and privileged access decisions reviewable.",
    heroSubheadline:
      "Wrap your identity provider with an approval and evidence layer for privileged, emergency, and contractor access events — without rebuilding your IdP.",
    exampleRecordId: "ra-acc-001",
    capabilities: [
      "Pause GlobalAdmin and break-glass requests for two-person review.",
      "Attach incident context, session recording status, and JIT window to every record.",
      "Set expiration windows that auto-flip status when access should be revoked.",
      "Operates alongside Entra, Okta, and Auth0 — not as a replacement.",
    ],
    frameworkRefs: ["NIST 800-53 AC-2", "NIST 800-53 AC-5", "NIST 800-53 AU-12", "ISO 27001 A.9.2.3", "SOC 2 CC6.1"],
  },
  "vulnerability-accept": {
    heroHeadline: "Document risk acceptance for vulnerabilities you cannot patch today.",
    heroSubheadline:
      "Capture compensating controls, expiration dates, and owner sign-off for vulnerability exceptions in a single defensible record — instead of a Slack thread or spreadsheet.",
    exampleRecordId: "ra-vul-001",
    capabilities: [
      "Ingest critical and high findings from Fortify, Snyk, Semgrep, and Wiz.",
      "Require compensating controls before an exception can be accepted.",
      "Track expiration and auto-resurface decisions before they lapse.",
      "Export an evidence packet auditors can review without follow-up questions.",
    ],
    frameworkRefs: ["NIST 800-53 RA-5", "NIST SSDF PW.7", "SOC 2 CC7.1", "PCI DSS 6.3.1", "ISO 27001 A.12.6.1"],
  },
  "kev-exposure-review": {
    heroHeadline: "CISA KEV-aware exposure reviews with auditable acceptance trails.",
    heroSubheadline:
      "Surface known exploited vulnerabilities mapped to assets, owners, and remediation deadlines — and capture the decision the moment it is made.",
    exampleRecordId: "ra-kev-001",
    capabilities: [
      "Match CISA KEV catalog entries to your scanner findings automatically.",
      "Highlight KEV due dates and overdue items inside the Approval Inbox.",
      "Capture the decision to patch, isolate, or accept with compensating controls.",
      "Maintain a CISA KEV-aware register your audit team can trace.",
    ],
    frameworkRefs: ["CISA KEV", "NIST 800-53 SI-2", "NIST 800-53 RA-5", "BOD 22-01 alignment", "SOC 2 CC7.1"],
  },
  "secure-release-gate": {
    heroHeadline: "A signed approval checkpoint for risky software releases.",
    heroSubheadline:
      "Pause production releases on unresolved SAST, DAST, or dependency findings until a named approver decides — without blocking every release indefinitely.",
    exampleRecordId: "ra-rel-001",
    capabilities: [
      "Block a release pipeline at the TrustAccept gate when policy fails.",
      "Capture mitigation, canary plan, and exception expiration in the record.",
      "Notify approvers via SequenceNow with one-click Approve Release or Block Release.",
      "Produce a release-by-release evidence packet for change management.",
    ],
    frameworkRefs: ["NIST SSDF PW.8", "NIST SSDF RV.1", "SOC 2 CC8.1", "ISO 27001 A.14.2.9"],
  },
  "device-accept": {
    heroHeadline: "Approve, reject, or escalate device access requests with evidence.",
    heroSubheadline:
      "Make device onboarding — including contractor, BYOD, and IoT — a reviewable decision with attached evidence and an expiration window.",
    exampleRecordId: "ra-dev-001",
    capabilities: [
      "Quarantine unknown devices and route for owner-level approval.",
      "Attach fingerprint, firmware, and authorization letter to the record.",
      "Set expiration windows for contractor and temporary device access.",
      "Operate alongside Cisco ISE, Armis, and Intune — not as a replacement.",
    ],
    frameworkRefs: ["NIST 800-53 AC-3", "NIST 800-53 CM-8", "NIST 800-53 IA-3", "SOC 2 CC6.1"],
  },
  "evidence-desk": {
    heroHeadline: "One evidence-ready system of record for every risk decision.",
    heroSubheadline:
      "Every accepted, rejected, and remediated decision flows to the Evidence Desk as a defensible record — exportable for executive risk registers and auditors.",
    exampleRecordId: "ra-evd-001",
    capabilities: [
      "Aggregate decisions across all seven product modules.",
      "Track expirations and surface decisions due for review.",
      "Generate monthly executive risk register and signed evidence packet.",
      "Export framework-informed audit binders without manual compilation.",
    ],
    frameworkRefs: ["NIST 800-53 PM-9", "NIST 800-53 CA-7", "SOC 2 CC3.2", "ISO 27001 Clause 9.1", "SOX ITGC"],
  },
};
