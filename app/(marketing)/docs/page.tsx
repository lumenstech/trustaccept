import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";

const TOPICS = [
  {
    title: "Quickstart",
    body:
      "Mock-auth onboarding, create your first risk record, and route it to an approver.",
  },
  {
    title: "Risk Record schema",
    body:
      "Fields, framework tags, source references, and audit timeline. The core record produced by every module.",
  },
  {
    title: "Approval Inbox",
    body:
      "How approvers see pending decisions across all seven modules — and the actions available per module.",
  },
  {
    title: "Hosted approval pages",
    body:
      "Share /approve/[id] with a named approver. They see evidence, compensating controls, and module-aware buttons.",
  },
  {
    title: "Evidence Desk export",
    body:
      "Generate a monthly executive risk register and an audit-ready binder.",
  },
  {
    title: "Module-specific behavior",
    body:
      "How AI Action Gate, Secure Release Gate, and Device Accept relabel decision buttons.",
  },
];

const CURL = `curl -X POST https://api.trustaccept.dev/v1/risk-records \\
  -H "Authorization: Bearer $TRUSTACCEPT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "module": "ai-action-gate",
    "title": "AI agent wants to export 1,240 customer records",
    "sourceSystem": "AgentOps",
    "sourceType": "agent.tool_call",
    "riskLevel": "high",
    "owner": "Priya Shah",
    "department": "Customer Operations",
    "expirationDate": "2026-05-20",
    "compensatingControls": "Vaulted bucket, 24h TTL, DLP scan required.",
    "businessJustification": "Churn dashboard refresh for May board pack.",
    "frameworkTags": ["NIST AI RMF GOVERN 1.3", "SOC 2 CC6.7"]
  }'`;

const ACCESS_EVENT_JSON = `{
  "source": "okta",
  "event_type": "break_glass_access_request",
  "requester": "admin@company.com",
  "target_system": "production tenant",
  "privilege_level": "super_admin",
  "duration": "4 hours",
  "risk_level": "critical",
  "business_justification": "Production incident response"
}`;

const ACCESS_FLOW = [
  "Identity event detected by Okta / Auth0 / Microsoft Entra / Duo / GitHub",
  "TrustAccept creates an Access Accept risk record",
  "Approver approves or rejects access via the hosted approval page",
  "Evidence record created in the Evidence Desk",
  "Callback or ticket update sent to the source identity / ITSM system",
];

const VULNERABILITY_EVENT_JSON = `{
  "source": "fortify",
  "event_type": "critical_finding_exception_request",
  "finding_id": "FORTIFY-2026-1182",
  "application": "customer-portal",
  "severity": "critical",
  "cwe": "CWE-89",
  "requested_decision": "accept_until_next_release",
  "business_justification": "Emergency production release with compensating WAF rule"
}`;

const VULNERABILITY_FLOW = [
  "Scanner finding detected by Fortify / Snyk / GitHub Advanced Security / Wiz / Tenable / Qualys / Rapid7 / pen test",
  "TrustAccept creates a Vulnerability Accept risk record",
  "Owner accepts, rejects, or requires remediation via the hosted approval page",
  "Evidence packet created in the Evidence Desk",
  "Ticket or release workflow updated downstream",
];

const KEV_EVENT_JSON = `{
  "source": "tenable",
  "event_type": "kev_exposure_review",
  "cve": "CVE-2024-3094",
  "affected_asset": "internet-facing-linux-build-server",
  "exposure_status": "exposed",
  "patch_availability": "patch available",
  "risk_level": "critical",
  "business_justification": "Production dependency requires maintenance window before remediation"
}`;

const KEV_FLOW = [
  "Known exploited vulnerability exposure detected by Tenable / Wiz / Qualys / Rapid7 / GitHub / Fortify / CISA KEV reference",
  "TrustAccept creates a KEV Exposure Review record",
  "Owner accepts exposure, rejects acceptance, or requires remediation via the hosted approval page",
  "Evidence packet created in the Evidence Desk",
  "Ticket, risk register, or remediation workflow updated downstream",
];

export default function Page() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">Docs · API Demo</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            One API, seven modules, one defensible record.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Open the dashboard to see how risk records, the Approval Inbox, and hosted
            approval pages connect. The API contract below is the shape every module
            produces.
          </p>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="API demo"
          title="Create a risk record"
          subtitle="Every module accepts the same payload shape. Module-specific fields go into technicalContext and sourceReferences."
        />
        <Card className="mt-10">
          <CardContent className="overflow-x-auto p-6">
            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {CURL}
            </pre>
          </CardContent>
        </Card>
        <p className="mt-4 text-sm text-muted-foreground">
          Want to see a live decision instead?{" "}
          <Link href="/approve/ra-ai-001" className="text-primary">
            Open the hosted approval page →
          </Link>
        </p>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Access Accept API demo"
          title="Identity event → defensible decision"
          subtitle="An Access Accept record is the same RiskRecord shape with module = access-accept and an accessContext block describing the request."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="overflow-x-auto p-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                Inbound identity event
              </p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {ACCESS_EVENT_JSON}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Demo flow
              </p>
              <ol className="mt-3 space-y-2 text-muted-foreground">
                {ACCESS_FLOW.map((step, idx) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-primary">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/dashboard/access-accept/events" className="text-sm text-primary">
                  Open the demo event feed →
                </Link>
                <Link href="/approve/ra-acc-001" className="text-sm text-primary">
                  See a live Access Accept decision →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Vulnerability Accept API demo"
          title="Scanner finding → defensible decision"
          subtitle="A Vulnerability Accept record is the same RiskRecord shape with module = vulnerability-accept and a vulnerabilityContext block describing the finding."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="overflow-x-auto p-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                Inbound scanner event
              </p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {VULNERABILITY_EVENT_JSON}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Demo flow
              </p>
              <ol className="mt-3 space-y-2 text-muted-foreground">
                {VULNERABILITY_FLOW.map((step, idx) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-primary">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/vulnerability-acceptance/findings"
                  className="text-sm text-primary"
                >
                  Open the demo scanner feed →
                </Link>
                <Link href="/approve/ra-vul-001" className="text-sm text-primary">
                  See a live Vulnerability Accept decision →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="KEV Exposure Review API demo"
          title="Known exploited vulnerability exposure → defensible decision"
          subtitle="A KEV Exposure Review record is the same RiskRecord shape with module = kev-exposure-review and a kevContext block describing the CVE, KEV status, asset, exposure, patch availability, and remediation owner. TrustAccept is CISA KEV-aware; it does not imply CISA approval or certification."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="overflow-x-auto p-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                Inbound KEV-aware event
              </p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {KEV_EVENT_JSON}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Demo flow
              </p>
              <ol className="mt-3 space-y-2 text-muted-foreground">
                {KEV_FLOW.map((step, idx) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-primary">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/cisa-kev-review/findings"
                  className="text-sm text-primary"
                >
                  Open the demo KEV finding feed →
                </Link>
                <Link href="/approve/ra-kev-001" className="text-sm text-primary">
                  See a live KEV Exposure Review decision →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader eyebrow="Topics" title="Documentation overview" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => (
            <Card key={t.title}>
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t.body}</CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
