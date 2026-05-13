import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";

const PRACTICES = [
  {
    title: "Tenant isolation",
    body:
      "Each customer workspace is logically isolated. Decision records, evidence, and audit timelines never cross tenants.",
  },
  {
    title: "Signed decision capture",
    body:
      "Decisions are captured with a named approver, timestamp, and integrity hash. The audit timeline is append-only.",
  },
  {
    title: "Least-privilege integrations",
    body:
      "TrustAccept reads from your IdP, scanners, and pipelines using narrow scopes. We do not require write access to your production systems.",
  },
  {
    title: "Framework-informed mapping",
    body:
      "Records are mapped to NIST-aligned, CISA KEV-aware, and SOC 2 references. TrustAccept is designed to support audit evidence.",
  },
  {
    title: "Approver authentication",
    body:
      "Approver authentication is delivered via SequenceNow. Mock auth is used in local development only.",
  },
  {
    title: "Data retention",
    body:
      "Evidence records and audit timelines are retained per customer policy. Exports are immutable once issued.",
  },
];

export default function Page() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">Security & Trust</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Built to be defensible — for your approvers, your auditors, and your board.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            TrustAccept is designed to support audit evidence. We are NIST-aligned and
            CISA KEV-aware. We do not claim NIST certification or auditor approval.
          </p>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="Practices"
          title="How TrustAccept earns the right to hold your decisions."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRACTICES.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{p.body}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-card/30">
        <SectionHeader
          eyebrow="Language we use"
          title="What we say, and what we don't."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>We say</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>NIST-aligned</li>
                <li>CISA KEV-aware</li>
                <li>Designed to support audit evidence</li>
                <li>Framework-informed</li>
                <li>Evidence-ready</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>We don't say</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>NIST certified</li>
                <li>CISA approved</li>
                <li>Guaranteed compliant</li>
                <li>Eliminates risk</li>
                <li>Auditor approved</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
