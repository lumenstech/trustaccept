import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  Gauge,
  ShieldCheck,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InboxCard } from "@/components/risk/inbox-card";
import { Section, SectionHeader } from "@/components/ui/section";
import { ctaRouteFor } from "@/lib/cta";
import { MODULES } from "@/lib/modules";
import { SEED_RECORDS } from "@/lib/seed-data";

const TIMELINE_STEPS = [
  {
    icon: CircleDot,
    title: "Risk event lands",
    detail:
      "AI agent action, identity request, vulnerability finding, KEV match, release gate, or device onboarding triggers a TrustAccept record.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence assembled",
    detail:
      "Compensating controls, source references, owner, expiration, and framework tags are attached before review.",
  },
  {
    icon: Gauge,
    title: "Approver decides",
    detail:
      "Named approver accepts, rejects, or requires remediation — every action signed and timestamped.",
  },
  {
    icon: FileCheck2,
    title: "Evidence-ready record",
    detail:
      "Decision flows to the Evidence Desk as a defensible record auditors and executives can review.",
  },
];

const PRICING = [
  {
    name: "Risk Record",
    price: "$750",
    cadence: "one-time",
    description:
      "We produce a single defensible risk acceptance record on your behalf, including evidence packet.",
    cta: "Order a Risk Record",
    href: ctaRouteFor("risk_record"),
  },
  {
    name: "48-Hour Risk Acceptance Pack",
    price: "$1,500",
    cadence: "one-time",
    description:
      "Featured. Three risk records, framework-informed compensating controls, and an executive-ready summary delivered in 48 hours.",
    cta: "Book the 48-Hour Pack",
    featured: true,
    href: ctaRouteFor("pack_48hour"),
  },
  {
    name: "TrustAccept Pilot",
    price: "$2,500 – $5,000",
    cadence: "engagement",
    description:
      "Stand up TrustAccept in your environment for one product module. Workflow design, integration mapping, and approver onboarding.",
    cta: "Scope a pilot",
    href: ctaRouteFor("pilot"),
  },
  {
    name: "Managed Evidence Desk",
    price: "$999",
    cadence: "per month, from",
    description:
      "We run your Evidence Desk for you: review queue, expirations, monthly executive register, audit-ready exports.",
    cta: "Talk to evidence team",
    href: ctaRouteFor("managed_evidence_desk"),
  },
  {
    name: "Secure Release Program",
    price: "$3,500",
    cadence: "per month, from",
    description:
      "Dedicated Secure Release Gate program with on-call approver coverage and release-by-release evidence packets.",
    cta: "Start a release program",
    href: ctaRouteFor("secure_release_program"),
  },
];

const TIMELINE_RECORDS = SEED_RECORDS.slice(0, 3);

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <DemoTimelineSection />
      <FeaturedModuleSection />
      <ModulesSection />
      <RiskPackSection />
      <WhyTrustAcceptSection />
      <InboxPreviewSection />
      <EvidenceRecordsSection />
      <ClarificationSection />
      <PricingSection />
      <BrandArchitectureSection />
      <FinalCtaSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden grid-bg">
      <div className="container relative z-10 flex flex-col items-start gap-10 py-24 lg:py-32">
        <Badge tone="info">
          <Sparkles className="h-3 w-3" />
          Defensible approval records for high-risk decisions
        </Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Accept or reject cyber risk before it becomes an incident.
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground sm:text-xl">
          TrustAccept gives teams a defensible approval record for high-risk AI-agent
          actions, identity events, vulnerability exceptions, CISA KEV exposure, secure
          software releases, and device access.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={ctaRouteFor("homepage_primary")}>
            <Button size="lg">
              Book a 48-Hour Risk Acceptance Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={ctaRouteFor("homepage_secondary")}>
            <Button variant="outline" size="lg">
              View API Demo
            </Button>
          </Link>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Approval delivery powered by SequenceNow.
        </p>
      </div>
    </section>
  );
}

function DemoTimelineSection() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Live demo workflow"
        title="A risk event becomes a defensible decision in four steps."
        subtitle="TrustAccept sits between your existing systems and your approvers, turning every risky moment into a signed, time-stamped record."
      />
      <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIMELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                    <Icon className="h-4 w-4" />
                    Step {idx + 1}
                  </div>
                  <CardTitle className="mt-3">{step.title}</CardTitle>
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
  );
}

function FeaturedModuleSection() {
  return (
    <Section className="bg-card/30">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeader
            eyebrow="Featured product"
            title="AI Action Gate"
            subtitle="Approve or reject high-impact AI agent actions before they execute. Stop autonomous agents from exporting data, calling tools, or changing systems without a named approver."
          />
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Intercepts agent tool calls that touch sensitive data or production
              systems.
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Routes to a named approver with compensating controls and expiration.
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Returns an evidence-ready record tagged to NIST AI RMF and SOC 2.
            </li>
          </ul>
          <div className="mt-8 flex gap-3">
            <Link href="/ai-action-gate">
              <Button>
                Explore AI Action Gate <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/approve/ra-ai-001">
              <Button variant="outline">See a live decision</Button>
            </Link>
          </div>
        </div>
        <InboxCard record={SEED_RECORDS[0]} />
      </div>
    </Section>
  );
}

function ModulesSection() {
  return (
    <Section>
      <SectionHeader
        eyebrow="One platform · seven product modules"
        title="The decision layer around your existing security stack."
        subtitle="TrustAccept does not replace your scanners, IdP, or ITSM tools. It turns the high-risk moments those systems surface into accepted, rejected, or remediated decisions."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <Card key={module.key} className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Boxes className="h-4 w-4" />
                {module.shortName}
              </div>
              <CardTitle className="mt-3">{module.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{module.description}</p>
              <div className="mt-6">
                <Link
                  href={module.marketingRoute}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function RiskPackSection() {
  return (
    <Section className="bg-card/30">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeader
            eyebrow="Featured service"
            title="48-Hour Risk Acceptance Pack"
            subtitle="Three high-risk decisions, fully evidence-ready, delivered in two business days. Framework-informed, executive-ready, audit-defensible."
          />
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Timer className="h-4 w-4 text-primary" />
              48-hour turnaround on three risk records.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Compensating controls mapped to NIST and SOC 2 references.
            </li>
            <li className="flex gap-3">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Executive summary you can hand straight to a board sub-committee.
            </li>
          </ul>
          <div className="mt-8">
            <Link href={ctaRouteFor("pack_48hour")}>
              <Button size="lg">
                Book the 48-Hour Pack <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardHeader>
            <Badge tone="amber">$1,500 · one-time</Badge>
            <CardTitle className="mt-2">What you receive</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {TIMELINE_RECORDS.map((rec) => (
                <li key={rec.id} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <span>
                    <span className="font-medium">{rec.title}.</span>{" "}
                    <span className="text-muted-foreground">
                      Evidence packet, compensating controls, expiration window.
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <span className="text-muted-foreground">
                  Executive-ready cover summary mapped to your risk register.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function WhyTrustAcceptSection() {
  const points = [
    {
      title: "Risk decisions are getting faster than approvers.",
      detail:
        "AI agents, JIT access, KEV catalogs, and continuous releases produce decisions hourly. Email and ticket threads are not a defensible record.",
    },
    {
      title: "Auditors keep asking the same question.",
      detail:
        "Who decided, when, with what evidence, and under what compensating control? TrustAccept answers that in one record.",
    },
    {
      title: "Risk acceptance shouldn't live in a spreadsheet.",
      detail:
        "Decisions deserve a system of record with expirations, ownership, framework tags, and an audit-ready packet.",
    },
  ];
  return (
    <Section>
      <SectionHeader
        eyebrow="Why TrustAccept exists"
        title="Risk acceptance has outgrown email, tickets, and spreadsheets."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {points.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{p.detail}</CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function InboxPreviewSection() {
  return (
    <Section className="bg-card/30">
      <SectionHeader
        eyebrow="Approval Inbox preview"
        title="A single queue for every risk decision."
        subtitle="One inbox across all seven modules. Each card carries the evidence an approver needs to accept, reject, or escalate without leaving the page."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {SEED_RECORDS.slice(0, 4).map((record) => (
          <InboxCard key={record.id} record={record} />
        ))}
      </div>
      <div className="mt-8">
        <Link href="/dashboard/inbox">
          <Button variant="outline">
            Open Approval Inbox <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Section>
  );
}

function EvidenceRecordsSection() {
  const features = [
    "Signed and timestamped decision with named approver.",
    "Compensating controls and expiration date attached.",
    "Mapped to NIST-aligned, CISA KEV-aware, and framework-informed references.",
    "Audit-ready export with full audit timeline.",
  ];
  return (
    <Section>
      <SectionHeader
        eyebrow="Evidence-ready records"
        title="Every decision is a defensible, exportable record."
        subtitle="Designed to support audit evidence. Built for the way enterprise risk, compliance, and engineering teams actually share decisions."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What's in a record</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What it isn't</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 text-danger" />A claim that anyone
                is "certified" or "approved" by NIST, CISA, or an auditor.
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 text-danger" />A promise that risk
                is eliminated. TrustAccept makes the decision defensible, not
                hypothetical.
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 text-danger" />A replacement for
                your identity, scanner, or ticketing systems.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function ClarificationSection() {
  return (
    <Section className="bg-card/30">
      <SectionHeader
        eyebrow="Clarification"
        title="TrustAccept adds the decision layer around your existing tools."
        subtitle="TrustAccept does not replace Auth0, Okta, Entra, Fortify, Snyk, Wiz, Tenable, GitHub, Jira, ServiceNow, or your existing scanners and identity systems. TrustAccept creates the approval, acceptance, and evidence layer around the high-risk decisions those systems expose."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "Auth0 · Okta · Entra",
          "Fortify · Snyk · Semgrep",
          "Wiz · Tenable · CrowdStrike",
          "GitHub · Jira · ServiceNow",
        ].map((row) => (
          <Card key={row}>
            <CardContent className="p-6 text-sm text-muted-foreground">{row}</CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function PricingSection() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Pricing"
        title="Service-led offers, not SaaS tiers."
        subtitle="TrustAccept is delivered as an outcome. Start with a single record or hand us the Evidence Desk."
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PRICING.map((plan) => (
          <Card
            key={plan.name}
            className={plan.featured ? "border-primary/50 ring-1 ring-primary/40" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.featured ? <Badge tone="info">Featured</Badge> : null}
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{plan.price}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {plan.cadence}
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {plan.description}
              <div className="mt-6">
                <Link href={plan.href}>
                  <Button variant={plan.featured ? "primary" : "outline"} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function BrandArchitectureSection() {
  return (
    <Section className="bg-card/30">
      <SectionHeader
        eyebrow="Brand architecture"
        title="TrustAccept is a Lumens Technology product."
        subtitle="Approval delivery and identity workflow support powered by SequenceNow. One platform, seven modules, two trusted brands behind it."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>TrustAccept</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The risk acceptance, approval, and evidence platform. Seven product
            modules under one defensible record.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lumens Technology</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The parent company. Builds enterprise-credible cyber risk products for
            regulated industries.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SequenceNow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Approval delivery and identity workflow engine that powers TrustAccept's
            routing, notifications, and signed decision capture.
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function FinalCtaSection() {
  return (
    <Section>
      <div className="rounded-lg border border-border bg-card p-10 sm:p-16">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Accept or reject your next high-risk decision with evidence on the record.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Start with the 48-Hour Risk Acceptance Pack. Three defensible records in two
          business days.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={ctaRouteFor("homepage_primary")}>
            <Button size="lg">
              Book a 48-Hour Risk Acceptance Review <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={ctaRouteFor("homepage_secondary")}>
            <Button variant="outline" size="lg">
              View API Demo
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          Approval delivery powered by SequenceNow.
        </p>
      </div>
    </Section>
  );
}
