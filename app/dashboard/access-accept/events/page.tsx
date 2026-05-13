import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge, RiskLevelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IDENTITY_EVENTS,
  buildAccessIntakeQuery,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export default function IdentityEventsPage() {
  return (
    <>
      <DashboardHeader
        eyebrow="Identity event feed"
        title="High-risk identity events awaiting a decision"
        description="A demo feed of identity and access events that warrant an Access Accept record. Click Create Risk Record to open the intake form with the event details prefilled."
        actions={
          <Link href="/dashboard/access-accept">
            <Button variant="outline">
              <Sparkles className="h-4 w-4" /> Back to command center
            </Button>
          </Link>
        }
      />
      <div className="space-y-6 px-8 py-8">
        <Card>
          <CardHeader>
            <Badge tone="info">
              <AlertTriangle className="h-3.5 w-3.5" /> Mock data
            </Badge>
            <CardTitle className="mt-3">
              Identity events from Auth0, Okta, Microsoft Entra, Duo, and GitHub
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              In production these events flow in from your identity provider over a
              webhook recipe. Here they are static seed data — but every Create Risk
              Record link prefills the Access Accept intake form via query params.
            </p>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {IDENTITY_EVENTS.map((event) => {
            const query = buildAccessIntakeQuery(event);
            const href = `/dashboard/access-accept/new?${query}`;
            return (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{event.source}</Badge>
                    <RiskLevelBadge level={event.riskLevel} />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {event.id}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-base">
                    {event.eventType.replace(/_/g, " ")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{event.detail}</p>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        User
                      </dt>
                      <dd>{event.user}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Target system
                      </dt>
                      <dd>{event.targetSystem}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Timestamp
                      </dt>
                      <dd className="font-mono text-xs">{event.timestamp}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Recommended action
                      </dt>
                      <dd>{event.recommendedAction}</dd>
                    </div>
                  </dl>
                  <div className="mt-6">
                    <Link href={href}>
                      <Button>
                        Create Risk Record <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
