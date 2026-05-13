import Link from "next/link";
import { Activity, FileSignature } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DecisionsTable } from "@/components/decisions/decisions-table";
import { requireDashboardAccess } from "@/src/server/auth";
import { listAgents } from "@/src/server/agents";
import { getStore } from "@/src/server/store";

export const dynamic = "force-dynamic";

export default function DecisionsPage() {
  const user = requireDashboardAccess();

  const agents = new Map(
    listAgents(user, { page: 1, page_size: 1000 }).items.map((a) => [a.id, a]),
  );
  const decisions = Array.from(getStore().decisions.values())
    .filter((d) => d.tenantId === user.organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <DashboardHeader
        eyebrow="Audit"
        title="Decisions"
        description="Every decision recorded for this tenant. Each row carries a canonical evidence hash and an RS256-signed receipt suitable for export and downstream audit."
        actions={
          <Link href="/dashboard/evidence">
            <Button variant="outline">
              <FileSignature className="h-4 w-4" />
              Export evidence
            </Button>
          </Link>
        }
      />
      <div className="px-8 py-8">
        <Card>
          <CardContent className="p-0">
            {decisions.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No decisions yet"
                description={
                  <>
                    Decisions appear here as soon as your agents post to
                    <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      POST /api/v1/decisions
                    </code>
                    .
                  </>
                }
              />
            ) : (
              <DecisionsTable decisions={decisions} agents={agents} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
