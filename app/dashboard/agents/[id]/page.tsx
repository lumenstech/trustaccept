import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AgentLifecycleActions } from "@/components/agents/agent-lifecycle-actions";
import {
  AgentEnvironmentBadge,
  AgentRiskTierBadge,
  AgentStatusBadge,
  AllowedActionsList,
} from "@/components/agents/agent-badges";
import { DecisionsTable } from "@/components/decisions/decisions-table";
import { formatSpendCapsSummary } from "@/lib/agents-ui";
import { requireDashboardAccess } from "@/src/server/auth";
import { AgentNotFoundError, getAgent } from "@/src/server/agents";
import { getStore } from "@/src/server/store";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default function AgentDetailPage({ params }: Props) {
  const user = requireDashboardAccess();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";
  let agent;
  try {
    agent = getAgent(user, params.id);
  } catch (err) {
    if (err instanceof AgentNotFoundError) notFound();
    throw err;
  }

  const recentDecisions = Array.from(getStore().decisions.values())
    .filter((d) => d.tenantId === user.organizationId && d.agentId === agent.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);

  return (
    <>
      <DashboardHeader
        eyebrow={agent.environment.toUpperCase()}
        title={agent.name}
        description={agent.ownerEmail}
        actions={
          isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              {agent.status !== "revoked" ? (
                <Link href={`/dashboard/agents/${agent.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              ) : null}
              <AgentLifecycleActions agent={agent} variant="detail" />
            </div>
          ) : null
        }
      />
      <div className="space-y-8 px-8 py-8">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to agents
        </Link>

        {agent.status === "revoked" ? (
          <div className="flex items-center gap-3 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">This agent has been revoked.</p>
              <p className="text-xs">
                Revocation is terminal. To use this capability again, create a
                new agent.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <KeyValue label="Agent ID" mono value={agent.id} />
              <KeyValue label="Tenant" mono value={agent.tenantId} />
              <KeyValue label="Department" value={agent.department ?? "—"} />
              <KeyValue
                label="Environment"
                value={<AgentEnvironmentBadge environment={agent.environment} />}
              />
              <KeyValue
                label="Risk tier"
                value={<AgentRiskTierBadge tier={agent.riskTier} />}
              />
              <KeyValue
                label="Status"
                value={<AgentStatusBadge status={agent.status} />}
              />
              <KeyValue label="Created" value={agent.createdAt} />
              <KeyValue label="Updated" value={agent.updatedAt} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spend caps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Observed at decision time as `cap_check`. Enforcement is not yet
                gated.
              </p>
              <p>{formatSpendCapsSummary(agent.spendCaps)}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ["per_txn_usd", "Per txn"],
                    ["daily_usd", "Daily"],
                    ["weekly_usd", "Weekly"],
                    ["monthly_usd", "Monthly"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <dt className="uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd>
                      {typeof agent.spendCaps[k] === "number"
                        ? `$${agent.spendCaps[k]}`
                        : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allowed actions</CardTitle>
          </CardHeader>
          <CardContent>
            <AllowedActionsList actions={agent.allowedActions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent decisions</CardTitle>
              <Link
                href="/dashboard/decisions"
                className="text-sm text-primary hover:underline"
              >
                View all decisions
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentDecisions.length === 0 ? (
              <EmptyState
                size="sm"
                icon={Activity}
                title="No decisions yet"
                description="Decisions referencing this agent will appear here as soon as they are recorded."
              />
            ) : (
              <DecisionsTable decisions={recentDecisions} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KeyValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={mono ? "mt-1 font-mono text-xs" : "mt-1 text-sm"}>
        {value}
      </p>
    </div>
  );
}
