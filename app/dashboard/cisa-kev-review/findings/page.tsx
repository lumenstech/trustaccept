import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge, RiskLevelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KEV_FINDINGS,
  buildKevIntakeQuery,
  getKevExposureStatusLabel,
  getKevPatchAvailabilityLabel,
} from "@/lib/kev";

export const dynamic = "force-dynamic";

export default function KevFindingsPage() {
  return (
    <>
      <DashboardHeader
        eyebrow="KEV finding feed"
        title="Known exploited vulnerability exposures awaiting a decision"
        description="A demo feed of CISA KEV-aware findings that warrant a KEV Exposure Review record. Click Create Risk Record to open the intake form with the finding details prefilled."
        actions={
          <Link href="/dashboard/cisa-kev-review">
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
              Findings sourced via the CISA KEV reference, Tenable, Wiz, Qualys, and Rapid7
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              In production these findings flow in from your scanners and posture
              tools over a webhook recipe. Here they are static seed data — but every
              Create Risk Record link prefills the KEV Exposure Review intake form
              via query params.
            </p>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {KEV_FINDINGS.map((finding) => {
            const query = buildKevIntakeQuery(finding);
            const href = `/dashboard/cisa-kev-review/new?${query}`;
            return (
              <Card key={finding.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{finding.sourceSystem}</Badge>
                    <RiskLevelBadge level={finding.riskLevel} />
                    {finding.emergency ? <Badge tone="danger">Emergency</Badge> : null}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {finding.cve}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-base">{finding.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{finding.detail}</p>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Affected asset
                      </dt>
                      <dd>{finding.asset}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Exposure status
                      </dt>
                      <dd>{getKevExposureStatusLabel(finding.exposureStatus)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Patch availability
                      </dt>
                      <dd>{getKevPatchAvailabilityLabel(finding.patchAvailability)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Recommended action
                      </dt>
                      <dd>{finding.recommendedAction}</dd>
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
