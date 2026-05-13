import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { ctaRouteFor } from "@/lib/cta";

const PLANS = [
  {
    name: "Risk Record",
    price: "$750",
    cadence: "one-time",
    description:
      "We produce a single defensible risk acceptance record on your behalf, including evidence packet, compensating controls, and expiration.",
    includes: [
      "One named risk record",
      "Compensating controls documented",
      "Framework-informed references",
      "Audit-ready evidence packet",
    ],
    cta: "Order a Risk Record",
    href: ctaRouteFor("risk_record"),
  },
  {
    name: "48-Hour Risk Acceptance Pack",
    price: "$1,500",
    cadence: "one-time",
    featured: true,
    description:
      "Featured. Three risk records produced in two business days, with an executive-ready cover summary.",
    includes: [
      "Three risk records, 48-hour delivery",
      "Executive-ready cover summary",
      "Framework-informed compensating controls",
      "Hand-off to your audit and risk leads",
    ],
    cta: "Book the 48-Hour Pack",
    href: ctaRouteFor("pack_48hour"),
  },
  {
    name: "TrustAccept Pilot",
    price: "$2,500 – $5,000",
    cadence: "engagement",
    description:
      "Stand up TrustAccept in your environment for one product module. Workflow design, integration mapping, and approver onboarding included.",
    includes: [
      "One module live in your tenant",
      "Approver onboarding",
      "Integration mapping",
      "SequenceNow delivery configuration",
    ],
    cta: "Scope a pilot",
    href: ctaRouteFor("pilot"),
  },
  {
    name: "Managed Evidence Desk",
    price: "$999",
    cadence: "per month, from",
    description:
      "We run your Evidence Desk: review queue, expirations, monthly executive register, and audit-ready exports.",
    includes: [
      "Monthly executive risk register",
      "Expiration monitoring",
      "Audit binder exports",
      "Owner follow-up on lapsing decisions",
    ],
    cta: "Talk to evidence team",
    href: ctaRouteFor("managed_evidence_desk"),
  },
  {
    name: "Secure Release Program",
    price: "$3,500",
    cadence: "per month, from",
    description:
      "Dedicated Secure Release Gate program with on-call approver coverage and release-by-release evidence packets.",
    includes: [
      "On-call approver coverage",
      "Release-by-release evidence packets",
      "SAST and dependency exception management",
      "Quarterly change-management review",
    ],
    cta: "Start a release program",
    href: ctaRouteFor("secure_release_program"),
  },
];

export default function Page() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">Pricing · Service-led offers</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Buy outcomes, not seats.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            TrustAccept is sold as service-led engagements — a record, a pack, a pilot,
            or a managed program. No per-seat tier games.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
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
                <p>{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link href={plan.href}>
                    <Button
                      variant={plan.featured ? "primary" : "outline"}
                      className="w-full"
                    >
                      {plan.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="What's included with every engagement"
          title="Every TrustAccept deliverable carries the same shape."
        />
        <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex gap-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Named approver, signed and time-stamped decision.
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Compensating controls and expiration window.
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Framework-informed references (NIST-aligned, CISA KEV-aware).
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Audit-ready export with full audit timeline.
          </li>
        </ul>
        <p className="mt-8 text-xs uppercase tracking-widest text-muted-foreground">
          Approval delivery powered by SequenceNow.
        </p>
      </Section>
    </div>
  );
}
