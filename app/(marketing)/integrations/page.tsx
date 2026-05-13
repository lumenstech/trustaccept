import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";

const CATEGORIES = [
  {
    name: "Identity",
    note: "Source of access and privilege events.",
    items: ["Okta", "Auth0", "Entra ID", "Ping Identity", "JumpCloud"],
  },
  {
    name: "Vulnerability & Posture",
    note: "Source of vulnerability and exposure findings.",
    items: ["Fortify", "Snyk", "Semgrep", "Wiz", "Tenable", "Qualys"],
  },
  {
    name: "Release Pipelines",
    note: "Pause releases at TrustAccept gates.",
    items: ["GitHub Actions", "GitLab CI", "Jenkins", "Argo CD", "CircleCI"],
  },
  {
    name: "Device & Network",
    note: "Device onboarding and quarantine events.",
    items: ["Cisco ISE", "Armis", "Intune", "Jamf", "CrowdStrike"],
  },
  {
    name: "Ticketing & ITSM",
    note: "Link decisions to your existing change records.",
    items: ["ServiceNow", "Jira Service Management", "Zendesk", "Linear"],
  },
  {
    name: "Approval Delivery",
    note: "Notifications, routing, and signed capture.",
    items: ["SequenceNow", "Email", "Slack", "Microsoft Teams"],
  },
];

export default function Page() {
  return (
    <div>
      <section className="relative isolate overflow-hidden grid-bg">
        <div className="container relative z-10 flex flex-col gap-6 py-20">
          <Badge tone="info">Integrations</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            TrustAccept reads from the tools you already run.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            TrustAccept does not replace Auth0, Okta, Entra, Fortify, Snyk, Wiz, Tenable,
            GitHub, Jira, or ServiceNow. We add the decision layer around them.
          </p>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="How it fits"
          title="One platform · seven modules · the tools you already trust."
          subtitle="Bring TrustAccept in alongside your existing scanners, IdP, and ticketing tools. Every connection produces decisions, not duplicate data stores."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Card key={cat.name}>
              <CardHeader>
                <CardTitle>{cat.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{cat.note}</p>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {cat.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
