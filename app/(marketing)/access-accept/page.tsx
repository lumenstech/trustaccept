import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { ctaRouteFor } from "@/lib/cta";

const DECISION_EXAMPLES = [
  {
    icon: Lock,
    title: "Admin requests break-glass access to production tenant",
    detail: "GlobalAdmin JIT held pending owner approval, paired on-call manager required.",
    badge: "Critical",
  },
  {
    icon: KeyRound,
    title: "Service account requests new API key",
    detail: "Expiration enforced, scope downgraded, vault rotation logged.",
    badge: "Medium",
  },
  {
    icon: UserCog,
    title: "User requests MFA recovery after lost device",
    detail: "Manager attestation + temporary bypass capped at 24 hours.",
    badge: "Medium",
  },
  {
    icon: AlertTriangle,
    title: "Suspicious login requires escalation",
    detail: "Sign-in held in step-up; module-aware buttons (Accept Login Risk / Escalate / Reject).",
    badge: "High",
  },
  {
    icon: UserPlus,
    title: "Contractor requests temporary admin access",
    detail: "Sponsor required, scope-limited group, automatic 30-day revoke.",
    badge: "Medium",
  },
  {
    icon: ShieldAlert,
    title: "Privileged role assignment requires owner approval",
    detail: "Two-person approval, 90-day review window, audit log replay attached.",
    badge: "High",
  },
  {
    icon: KeyRound,
    title: "API key creation request needs expiration date",
    detail: "Approval blocks issuance until a TTL is captured; default 90 days.",
    badge: "Medium",
  },
  {
    icon: ShieldCheck,
    title: "Entra admin consent request requires review",
    detail: "Scopes downgraded where possible, consent capped at six months, vendor SIG-Lite filed.",
    badge: "High",
  },
];

const WORKFLOW_STEPS = [
  {
    icon: CircleDot,
    title: "Identity event detected",
    detail:
      "Auth0, Okta, Microsoft Entra, Duo, Google Workspace, GitHub, or your internal IAM emits a high-risk identity or access event.",
  },
  {
    icon: ShieldCheck,
    title: "TrustAccept creates an Access Accept record",
    detail:
      "Requester, target system, identity provider, privilege level, requested duration, and compensating controls are captured on the record.",
  },
  {
    icon: UserCog,
    title: "Approver decides",
    detail:
      "Named approver clicks Approve Access, Reject Access, or Require More Evidence — or for suspicious logins, Accept Login Risk / Escalate / Reject.",
  },
  {
    icon: FileCheck2,
    title: "Evidence record + callback",
    detail:
      "Decision flows to the Evidence Desk; callback or ticket update goes back to your identity, IAM, or ITSM system.",
  },
];

const SOURCE_SYSTEMS = [
  { name: "Auth0", note: "Identity events and management API requests" },
  { name: "Okta", note: "Sign-in risk events and admin role assignments" },
  { name: "Microsoft Entra", note: "JIT roles, admin consent, conditional access" },
  { name: "Duo", note: "MFA recovery and step-up enforcement events" },
  { name: "Google Workspace", note: "Admin role grants and OAuth app consent" },
  { name: "GitHub", note: "Organization owner role and PAT creation requests" },
  { name: "Internal IAM", note: "Custom role and API key issuance" },
  { name: "ServiceNow / Jira", note: "Linked change tickets and approval handoff" },
];

export default function AccessAcceptPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">Access Accept</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Access Accept
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Create evidence-ready approval records for privileged access, admin
            escalation, API key creation, MFA recovery, break-glass access, suspicious
            login events, and temporary contractor access.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={ctaRouteFor("access_accept_secondary")}>
              <Button size="lg">
                Create Access Accept Demo Record <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={ctaRouteFor("access_accept_primary")}>
              <Button variant="outline" size="lg">
                Book Risk Acceptance Review
              </Button>
            </Link>
            <Link href="/dashboard/access-accept">
              <Button variant="ghost" size="lg">
                Open Access Accept command center
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="The problem"
          title="Identity is the new perimeter — and approvals live in DMs, tickets, and inboxes."
          subtitle="Security and platform teams approve privileged access dozens of times a week. Decisions get made over chat, in a ticket comment, or in a meeting — and the evidence trail is thin when an auditor or incident review asks who decided, when, and on what evidence."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>The decisions stack up</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Break-glass, JIT roles, MFA recovery, API key issuance, contractor onboarding,
              admin consent — each is a high-risk decision with its own reviewer, justification,
              and expiration. None of them belong in a spreadsheet.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The audit ask never changes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Who decided, when, with what evidence, under what compensating control, and when
              will the decision be reviewed? Access Accept produces that record on every event.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The identity providers are not the problem</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your IdP detects and enforces. Access Accept makes the decision around it
              defensible and exportable.
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Clarification"
          title="TrustAccept does not replace your identity provider."
          subtitle="TrustAccept does not replace Auth0, Okta, Microsoft Entra, Duo, GitHub, Jira, or ServiceNow. TrustAccept creates the approval, acceptance, and evidence layer around the high-risk identity and access decisions those systems expose."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Auth0 stays your authorization platform.",
            "Okta and Entra stay your identity provider.",
            "Duo stays your MFA enforcement.",
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
          title="Eight kinds of high-risk identity decisions, one defensible record."
          subtitle="Access Accept ships with module-aware decision buttons. Suspicious-login records swap to Accept Login Risk / Escalate Login / Reject."
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
          title="Identity event → defensible decision in four steps."
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
              title="Every Access Accept decision becomes a defensible record."
              subtitle="Access Accept evidence packets carry the requester, target system, identity provider, privilege level, requested duration, expiration, review date, approval owner, compensating controls, business justification, technical context, and full audit timeline."
            />
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Signed by a named approver and time-stamped.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                NIST-aligned and CISA KEV-aware references attached.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Exportable as PDF or CSV for audit binders and risk registers.
              </li>
              <li className="flex gap-3">
                <XCircle className="h-4 w-4 text-danger" />
                We do not claim NIST certification, CISA approval, or guaranteed
                compliance.
              </li>
            </ul>
          </div>
          <Card>
            <CardHeader>
              <Badge tone="info">Sample packet</Badge>
              <CardTitle className="mt-2">
                ra-acc-001 — Admin requests break-glass access to production tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Requester
                </p>
                <p>marcus.lee@lumens.io · Microsoft Entra</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Target system
                </p>
                <p>prod-eu-1 tenant · GlobalAdmin (JIT)</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Requested duration / expiration
                </p>
                <p>4 hours · expires 2026-05-13</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground">
                  Compensating controls
                </p>
                <p>
                  Session recording, scope read-only, auto revoke, on-call manager
                  paired.
                </p>
              </div>
              <Link href="/approve/ra-acc-001">
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
          title="Works with the identity stack you already run."
          subtitle="Access Accept reads identity events from the systems below. We are not an identity provider; we are the approval, acceptance, and evidence layer around them."
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
            Put Access Accept in front of your team this week.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Start with a single defensible record, or scope a pilot. Approval delivery
            powered by SequenceNow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctaRouteFor("access_accept_secondary")}>
              <Button size="lg">
                Create Access Accept Demo Record <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={ctaRouteFor("access_accept_primary")}>
              <Button variant="outline" size="lg">
                Book Risk Acceptance Review
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
