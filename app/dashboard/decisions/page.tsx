import Link from "next/link";
import { Activity, FileSignature } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  capCheckTone,
  decisionOutcomeLabel,
  decisionOutcomeTone,
  formatCapCheckSummary,
  formatEvidenceHash,
  receiptIndicator,
} from "@/lib/decisions-ui";
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
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <Activity className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-base font-medium">No decisions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Decisions appear here as soon as your agents post to
                    <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      POST /api/v1/decisions
                    </code>
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Decision ID</th>
                      <th className="px-6 py-3">Agent</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Outcome</th>
                      <th className="px-6 py-3">Cap check</th>
                      <th className="px-6 py-3">Evidence hash</th>
                      <th className="px-6 py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisions.map((d) => {
                      const indicator = receiptIndicator(d);
                      const agent = d.agentId ? agents.get(d.agentId) : undefined;
                      return (
                        <tr
                          key={d.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-6 py-3 text-muted-foreground">
                            {d.createdAt}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs">
                            {d.id.slice(0, 8)}…
                          </td>
                          <td className="px-6 py-3">
                            {d.agentId ? (
                              <Link
                                href={`/dashboard/agents/${d.agentId}`}
                                className="hover:underline"
                              >
                                {agent?.name ?? d.agentId.slice(0, 8)}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3">{d.action}</td>
                          <td className="px-6 py-3">
                            <Badge tone={decisionOutcomeTone(d.decision)}>
                              {decisionOutcomeLabel(d.decision)}
                            </Badge>
                          </td>
                          <td className="px-6 py-3">
                            <Badge tone={capCheckTone(d.context.cap_check)}>
                              {formatCapCheckSummary(d.context.cap_check)}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                            {formatEvidenceHash(d.evidenceHash)}
                          </td>
                          <td className="px-6 py-3">
                            {indicator.signed ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <FileSignature className="h-3.5 w-3.5" />
                                {indicator.short}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {indicator.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
