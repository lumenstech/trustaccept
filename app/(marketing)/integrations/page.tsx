import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";

interface IntegrationCard {
  name: string;
  fit: string;
  recipe: string;
}

interface Category {
  name: string;
  note: string;
  items: IntegrationCard[];
}

const CATEGORIES: Category[] = [
  {
    name: "Identity",
    note: "Source of access, MFA, role, and consent events.",
    items: [
      {
        name: "Auth0",
        fit: "Works with — read management API requests, API key creation, role changes.",
        recipe: "Recipe available: connect using webhook into Access Accept.",
      },
      {
        name: "Okta",
        fit: "Works with — sign-in risk, ThreatInsight, admin role assignments.",
        recipe: "Connect using webhook (System Log → Access Accept).",
      },
      {
        name: "Microsoft Entra",
        fit: "Works with — JIT roles, conditional access, admin consent, break-glass.",
        recipe: "Recipe available: Graph subscriptions → Access Accept records.",
      },
      {
        name: "Duo",
        fit: "Works with — MFA recovery, bypass code issuance, step-up enforcement.",
        recipe: "Connect using webhook into Access Accept records.",
      },
      {
        name: "Google Workspace",
        fit: "Works with — admin role grants and OAuth app consent events.",
        recipe: "Recipe available: Admin SDK reports → Access Accept.",
      },
      {
        name: "GitHub",
        fit: "Works with — organization owner role, PAT creation, app installation.",
        recipe: "Connect using webhook (org and audit events).",
      },
    ],
  },
  {
    name: "Vulnerability & Posture",
    note: "Source of vulnerability, code, container, cloud, and pen test findings.",
    items: [
      {
        name: "CISA KEV reference",
        fit: "Works with — KEV-aware review against the public CISA KEV reference. Approval record layer only; no partnership or government approval implied.",
        recipe: "Recipe available: CVE match → KEV Exposure Review.",
      },
      {
        name: "Fortify",
        fit: "Works with — SAST findings flow to Vulnerability Accept.",
        recipe: "Recipe available: SSC webhook → Risk Record.",
      },
      {
        name: "Snyk",
        fit: "Works with — open source, dependency, container, and IaC findings.",
        recipe: "Recipe available: project webhook → Risk Record.",
      },
      {
        name: "GitHub Advanced Security",
        fit: "Works with — code scanning, secret scanning, and Dependabot alerts.",
        recipe: "Connect using webhook into Vulnerability Accept.",
      },
      {
        name: "Wiz",
        fit: "Works with — cloud posture, exposures, and KEV matches.",
        recipe: "Connect using webhook into Vulnerability Accept.",
      },
      {
        name: "Tenable",
        fit: "Works with — host scans and CISA KEV matches.",
        recipe: "Recipe available: T.io export → Risk Record.",
      },
      {
        name: "Qualys",
        fit: "Works with — host and web application findings.",
        recipe: "Connect using webhook into Vulnerability Accept.",
      },
      {
        name: "Rapid7",
        fit: "Works with — InsightVM findings and remediation projects.",
        recipe: "Connect using webhook into Vulnerability Accept.",
      },
      {
        name: "Pen test reports",
        fit: "Works with — manual findings, recreate runbooks, and evidence packets.",
        recipe: "Approval record layer around your assessment vendor workflow.",
      },
    ],
  },
  {
    name: "Release Pipelines",
    note: "Pause releases at the Secure Release Gate.",
    items: [
      {
        name: "GitHub Actions",
        fit: "Works with — pipeline gates that wait on Secure Release approval.",
        recipe: "Recipe available: required check → Risk Record.",
      },
      {
        name: "GitLab CI",
        fit: "Works with — manual job + Risk Record gate.",
        recipe: "Recipe available: pipeline webhook → Risk Record.",
      },
      {
        name: "Jenkins",
        fit: "Works with — block-on-approval stage.",
        recipe: "Recipe available: shared library → Risk Record.",
      },
    ],
  },
  {
    name: "Device & Network",
    note: "Device onboarding and quarantine events feed Device Accept.",
    items: [
      {
        name: "Cisco ISE",
        fit: "Works with — quarantine and onboarding events.",
        recipe: "Connect using webhook into Device Accept.",
      },
      {
        name: "Armis",
        fit: "Works with — IoT fingerprinting and risk scoring.",
        recipe: "Recipe available: alert webhook → Risk Record.",
      },
      {
        name: "Intune",
        fit: "Works with — compliance state changes.",
        recipe: "Recipe available: Graph subscription → Risk Record.",
      },
    ],
  },
  {
    name: "Ticketing & ITSM",
    note: "Approval record layer alongside the change record.",
    items: [
      {
        name: "ServiceNow",
        fit: "Works with — link Risk Records to change tickets; receive callbacks.",
        recipe: "Recipe available: REST step → Risk Record + callback.",
      },
      {
        name: "Jira",
        fit: "Works with — Jira issue ↔ Risk Record sync.",
        recipe: "Recipe available: automation rule → Risk Record.",
      },
      {
        name: "Linear",
        fit: "Works with — engineering exception tracking.",
        recipe: "Connect using webhook into TrustAccept.",
      },
    ],
  },
  {
    name: "Approval Delivery",
    note: "Notifications, routing, and signed capture.",
    items: [
      {
        name: "SequenceNow",
        fit: "Approval delivery and identity workflow engine that powers TrustAccept routing.",
        recipe: "Native — no recipe required.",
      },
      {
        name: "Slack",
        fit: "Works with — approver notifications and link delivery.",
        recipe: "Connect using webhook.",
      },
      {
        name: "Microsoft Teams",
        fit: "Works with — approver notifications and link delivery.",
        recipe: "Connect using webhook.",
      },
    ],
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
            TrustAccept does not replace Auth0, Okta, Microsoft Entra, Duo, GitHub,
            Jira, or ServiceNow. We add the approval record layer around the high-risk
            decisions those systems expose.
          </p>
          <p className="max-w-2xl text-xs uppercase tracking-widest text-muted-foreground">
            Vendor names are reference points only. No partnership is implied unless
            explicitly marked as official.
          </p>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="How it fits"
          title="One platform · seven modules · the tools you already trust."
          subtitle="Bring TrustAccept in alongside your existing scanners, IdP, and ticketing tools. Every connection produces decisions, not duplicate data stores."
        />
        <div className="mt-12 space-y-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <p className="text-xs uppercase tracking-widest text-primary">{cat.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{cat.note}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((item) => (
                  <Card key={item.name}>
                    <CardHeader>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p>{item.fit}</p>
                      <p className="text-xs uppercase tracking-widest text-foreground">
                        {item.recipe}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
