import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Local demo auth is available for development. Production approval sessions resolve through SequenceNow."
      />
      <div className="grid gap-6 px-8 py-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Workspace name" value="Lumens Internal" />
            <Row label="Workspace ID" value="ws_lumens" mono />
            <Row label="Default approver group" value="Office of the CISO" />
            <Row label="Evidence retention" value="7 years" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approver identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Signed in as" value="Alex Greene" />
            <Row label="Email" value="alex@trustaccept.dev" />
            <Row label="Auth source" value="Demo local / SequenceNow production" badge="info" />
            <Row label="Approval delivery" value="SequenceNow" badge="info" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Language guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              TrustAccept records use NIST-aligned, CISA KEV-aware, framework-informed
              language. The platform blocks "NIST certified", "CISA approved",
              "guaranteed compliant", "eliminates risk", and "auditor approved" from
              public-facing decision text.
            </p>
            <Button variant="outline" size="sm">
              View guardrail policy
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Brand architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              TrustAccept is a Lumens Technology product. Approval delivery and identity
              workflow support powered by SequenceNow.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: "info" | "amber";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>
        {badge ? <Badge tone={badge}>{value}</Badge> : value}
      </span>
    </div>
  );
}
