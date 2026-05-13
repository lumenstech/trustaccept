import Link from "next/link";
import { Slack } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { DecisionStatusBadge } from "@/components/dashboard/decision-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiskLevelBadge } from "@/components/ui/badge";
import { listDecisionRequests } from "@/src/server/decisions/service";
import { listSlackInstallations } from "@/src/server/slackInstallations";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function DecisionsPage() {
  const decisions = listDecisionRequests();
  const installations = listSlackInstallations();

  return (
    <>
      <DashboardHeader
        eyebrow="TrustAccept for Slack"
        title="AI decision queue"
        description="Approve, reject, or escalate risky AI-agent actions in Slack. TrustAccept is the system of record for every decision."
        actions={
          <>
            <Link href="/dashboard/integrations">
              <Button variant="outline">
                <Slack className="h-4 w-4" />
                {installations.length > 0 ? "Slack connected" : "Connect Slack"}
              </Button>
            </Link>
            <form action="/api/demo/slack-decision" method="post">
              <Button type="submit">Send demo Slack approval</Button>
            </form>
          </>
        }
      />
      <div className="px-8 py-8">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Risk</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Requester</th>
                    <th className="px-6 py-3">Decided by</th>
                    <th className="px-6 py-3">Decided at</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-12 text-center text-muted-foreground"
                      >
                        No decisions yet. Send a demo Slack approval, or POST to{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          /api/decisions
                        </code>
                        .
                      </td>
                    </tr>
                  ) : (
                    decisions.map((decision) => (
                      <tr
                        key={decision.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {formatDate(decision.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/decisions/${decision.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {decision.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {decision.source}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {decision.actionType}
                        </td>
                        <td className="px-6 py-4">
                          <RiskLevelBadge level={decision.riskLevel} />
                        </td>
                        <td className="px-6 py-4">
                          <DecisionStatusBadge status={decision.status} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {decision.requester}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {decision.decidedByName ??
                            decision.decidedBySlackUserId ??
                            "—"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatDate(decision.decidedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
