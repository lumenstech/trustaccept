import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/modules";
import { requireDashboardAccess } from "@/src/server/auth";
import { listRiskRecordsForOrganization } from "@/src/server/riskRecords";

export const dynamic = "force-dynamic";

export default function ProductModulesPage() {
  const user = requireDashboardAccess();
  const records = listRiskRecordsForOrganization(user);
  return (
    <>
      <DashboardHeader
        eyebrow="Product Modules"
        title="Seven product modules · one platform"
        description="Each module produces the same defensible Risk Record. Decision button labels vary per module to match how approvers actually decide."
      />
      <div className="grid gap-4 px-8 py-8 lg:grid-cols-2">
        {MODULES.map((module) => {
          const pending = records.filter(
            (r) => r.module === module.key && r.status === "pending",
          ).length;
          const total = records.filter((r) => r.module === module.key).length;
          return (
            <Card key={module.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{module.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge tone="amber">{pending} pending</Badge>
                    <Badge tone="neutral">{total} records</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{module.tagline}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{module.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-success/10 px-2 py-1 text-success">
                    {module.acceptLabel}
                  </span>
                  <span className="rounded-md bg-danger/10 px-2 py-1 text-danger">
                    {module.rejectLabel}
                  </span>
                  <span className="rounded-md bg-amber/10 px-2 py-1 text-amber">
                    {module.remediateLabel}
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={module.marketingRoute}
                    className="inline-flex items-center gap-1 text-sm text-primary"
                  >
                    Marketing page <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/dashboard/inbox"
                    className="inline-flex items-center gap-1 text-sm text-primary"
                  >
                    Inbox <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {module.key === "access-accept" ? (
                    <Link
                      href="/dashboard/access-accept"
                      className="inline-flex items-center gap-1 text-sm text-primary"
                    >
                      Command center <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                  {module.key === "vulnerability-accept" ? (
                    <Link
                      href="/dashboard/vulnerability-acceptance"
                      className="inline-flex items-center gap-1 text-sm text-primary"
                    >
                      Command center <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                  {module.key === "kev-exposure-review" ? (
                    <Link
                      href="/dashboard/cisa-kev-review"
                      className="inline-flex items-center gap-1 text-sm text-primary"
                    >
                      Command center <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
