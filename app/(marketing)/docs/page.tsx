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
