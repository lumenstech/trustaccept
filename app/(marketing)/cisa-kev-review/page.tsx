import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Cloud,
  FileCheck2,
  Globe,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { ctaRouteFor } from "@/lib/cta";

const DECISION_EXAMPLES = [
  {
    icon: ShieldAlert,
    title: "Known exploited vulnerability exposure requires remediation decision",
    detail: "CISA KEV-aware finding on three internet-facing gateways; signature deployed; maintenance window pending.",
    badge: "Critical",
  },
  {
    icon: Server,
    title: "Patch not immediately possible due to production dependency",
    detail: "Internal server with ledger integrations; segmentation tightened; patch deferred to month-end window.",
    badge: "High",
  },
  {
    icon: Cloud,
    title: "Temporary exposure accepted with compensating controls",
    detail: "Cloud workload mitigated by a geo-restricted firewall rule; vendor patch ETA two weeks.",
    badge: "Critical",
  },
  {
    icon: AlertTriangle,
    title: "Executive owner required for remediation delay",
    detail: "Legacy ERP; not internet-facing; quarterly review at the Office of the CISO.",
    badge: "High",
  },
  {
    icon: Wrench,
    title: "Firewall mitigation accepted pending patch window",
    detail: "Internal asset; firewall mitigation across ingress; weekly owner attestation; remediation in next window.",
    badge: "High",
  },
  {
    icon: Globe,
    title: "Asset exposure requires emergency escalation",
    detail: "Internet-facing portal; active exploitation in the wild; emergency edge rule; on-call engaged.",
    badge: "Critical",
  },
  {
    icon: ShieldCheck,
    title: "Internet-facing asset requires KEV exposure review",
    detail: "Sensitive build pipeline; CI runner pool rebuild scheduled; signed-artifact policy mitigates risk.",
    badge: "High",
  },
  {
    icon: CircleDot,
    title: "Patch exception requires expiration date",
    detail: "Vendor workaround applied; exception bound to July 10 vendor release with required review date.",
    badge: "High",
  },
];

const WORKFLOW_STEPS = [
  {
    icon: CircleDot,
    title: "Known exploited vulnerability exposure detected",
    detail:
      "Tenable, Wiz, Qualys, Rapid7, GitHub, Fortify, or a CISA KEV reference flags a KEV-aware exposure on one of your assets.",
  },
  {
    icon: ShieldCheck,
    title: "TrustAccept creates a KEV Exposure Review record",
    detail:
      "CVE, KEV status, source, affected asset, asset type, exposure status, patch availability, remediation owner, business reason for delay, and compensating controls land on the record.",
  },
  {
    icon: Wrench,
    title: "Owner decides",
    detail:
      "Named owner clicks Accept Exposure, Reject Acceptance, or Require Remediation. Emergency exposure records swap to Emergency Accept / Escalate Now / Require Immediate Remediation.",
  },
  {
    icon: FileCheck2,
    title: "Evidence packet + downstream update",
    detail:
      "Evidence packet lands in the Evidence Desk; callback or ticket update flows back to your scanner, risk register, or remediation workflow.",
  },
];

const SOURCE_SYSTEMS = [
  { name: "CISA KEV reference", note: "Public reference for known exploited vulnerabilities" },
  { name: "Tenable", note: "Host and network scans matched to the KEV reference" },
  { name: "Wiz", note: "Cloud posture findings matched to the KEV reference" },
  { name: "Qualys", note: "Host and application findings matched to the KEV reference" },
  { name: "Rapid7", note: "InsightVM findings matched to the KEV reference" },
  { name: "GitHub", note: "GHAS alerts that overlap with the KEV reference" },
  { name: "Fortify", note: "SAST findings that overlap with the KEV reference" },
  { name: "Manual + Other", note: "Pen test or vendor advisory entry" },
];

export default function KevExposureReviewPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">KEV Exposure Review</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Document known exploited vulnerability exposure decisions.
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Create CISA KEV-aware records for remediation delays, temporary exposure
            acceptance, compensating controls, ownership, review dates, and
            executive-ready evidence.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={ctaRouteFor("kev_exposure_review_primary")}>
              <Button size="lg">
                Book Risk Acceptance Review <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={ctaRouteFor("kev_exposure_review_secondary")}>
              <Button variant="outline" size="lg">
                Create KEV Demo Record
              </Button>
            </Link>
            <Link href="/dashboard/cisa-kev-review">
              <Button variant="ghost" size="lg">
                Open KEV Exposure Review command center
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="What this covers"
          title="Known exploited vulnerability exposure, decided on the record."
          subtitle="KEV-aware exposure stacks up across internet-facing servers, internal systems, cloud resources, network appliances, applications, and containers. Decisions to accept, defer, or remediate frequently land in a ticket comment. KEV Exposure Review captures the decision, the compensating control, the owner, the expiration, and the review timeline on a single defensible record."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Exposure stacks up</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Patch dependencies, vendor advisories, and partner integrations make
              every KEV-aware exposure a context-heavy decision. KEV Exposure Review
              keeps that context attached to the record.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The audit question never changes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Who decided, when, with what compensating control, against what
              exposure status and patch availability, and when will the decision be
              reviewed? KEV Exposure Review answers that on every record.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CISA KEV-aware, not CISA-approved</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Records reference the CISA KEV catalog as a public reference point.
              They are designed to support audit evidence; they are not a CISA
              endorsement, certification, or review.
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Clarification"
          title="TrustAccept does not replace CISA or your scanners."
          subtitle="TrustAccept does not replace CISA, vulnerability scanners, patch management systems, asset inventory tools, Jira, ServiceNow, Tenable, Wiz, Qualys, Rapid7, GitHub, or Fortify. TrustAccept creates the approval, acceptance, remediation, and evidence layer around the known exploited vulnerability decisions those systems expose."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "CISA is the public reference. TrustAccept does not imply CISA approval, certification, validation, or endorsement.",
            "Tenable, Wiz, Qualys, and Rapid7 stay your scanners.",
            "GitHub and Fortify stay your code surfaces.",
            "ServiceNow and Jira stay your change record system.",
          ].map((line) => (
            <Card key={line}>
              <CardContent className="p-6 text-sm text-muted-foreground">
                <CheckCircle2 className="mb-3 h-4 w-4 text-success" />
                {line}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Example decisions"
          title="Eight kinds of KEV-aware exposure decisions, one defensible record."
          subtitle="KEV Exposure Review ships with module-aware decision buttons. Emergency exposure records swap to Emergency Accept / Escalate Now / Require Immediate Remediation."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {DECISION_EXAMPLES.map((example) => {
            const Icon = example.icon;
            return (
              <Card key={example.title}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge tone="info">{example.badge}</Badge>
                  </div>
                  <CardTitle className="mt-3 text-base">{example.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {example.detail}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Workflow"
          title="Known exploited vulnerability exposure → defensible decision in four steps."
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                      <Icon className="h-4 w-4" />
                      Step {idx + 1}
                    </div>
                    <CardTitle className="mt-3 text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {step.detail}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Evidence packet preview"
              title="Every KEV Exposure Review decision becomes a defensible record."
              subtitle="KEV Exposure Review evidence packets carry CVE, KEV status, source, affected asset, asset type, exposure status, patch availability, remediation owner, business reason for delay, executive summary note, compensating controls, expiration date, review date, and the full audit timeline."
            />
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Signed by a named remediation owner and time-stamped.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                CISA KEV-aware references attached.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Designed to support audit evidence; exportable as PDF or CSV.
              </li>
              <li className="flex gap-3">
                <XCircle className="h-4 w-4 text-danger" />
                We do not claim CISA approval, CISA certification, NIST certification,
                or guaranteed compliance.
              </li>
            </ul>
          </div>
          <Card>
            <CardHeader>
              <Badge tone="info">Sample packet</Badge>
              <CardTitle className="mt-2">
                ra-kev-001 — Known exploited vulnerability exposure requires remediation decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  CVE / KEV status
                </p>
                <p>CVE-2026-1455 · Known exploited</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Affected asset / type
                </p>
                <p>edge-gw-{`{01,02,03}`} · Network appliance</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Exposure / patch availability
                </p>
                <p>Exposed · Patch available</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Compensating controls
                </p>
                <p>Geo-fenced ingress, IPS signature deployed, elevated alerting.</p>
              </div>
              <Link href="/approve/ra-kev-001">
                <Button variant="outline" className="w-full">
                  View live decision page <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Source systems"
          title="Works with the scanners and references you already run."
          subtitle="KEV Exposure Review reads from the systems below. We are not a scanner, a patch manager, or an asset inventory tool; we are the approval, acceptance, remediation, and evidence layer around them."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCE_SYSTEMS.map((source) => (
            <Card key={source.name}>
              <CardHeader>
                <CardTitle className="text-base">{source.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {source.note}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-lg border border-border bg-card p-10 sm:p-14">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight">
            Put KEV Exposure Review in front of your team this week.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Start with a single defensible record, or scope a pilot. Approval delivery
            powered by SequenceNow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctaRouteFor("kev_exposure_review_primary")}>
              <Button size="lg">
                Book Risk Acceptance Review <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={ctaRouteFor("kev_exposure_review_secondary")}>
              <Button variant="outline" size="lg">
                Create KEV Demo Record
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
