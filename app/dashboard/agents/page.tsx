import Link from "next/link";
import { BotMessageSquare, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AgentLifecycleActions } from "@/components/agents/agent-lifecycle-actions";
import {
  AgentEnvironmentBadge,
  AgentRiskTierBadge,
  AgentStatusBadge,
} from "@/components/agents/agent-badges";
import {
  formatAllowedActionsCount,
  formatSpendCapsSummary,
} from "@/lib/agents-ui";
import { requireDashboardAccess } from "@/src/server/auth";
import { listAgents } from "@/src/server/agents";

export const dynamic = "force-dynamic";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export default function AgentsPage() {
  const user = requireDashboardAccess();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";
  const { items: agents, total } = listAgents(user, {
    page: 1,
    page_size: 100,
  });

  return (
    <>
      <DashboardHeader
        eyebrow="Agent Registry"
        title="AI agents"
        description="Every agent allowed to make a decision on behalf of your tenant. Pause to temporarily block decisions, revoke when the capability is retired."
        actions={
          isAdmin ? (
            <Link href="/dashboard/agents/new">
              <Button>
                <Plus className="h-4 w-4" />
                Register agent
              </Button>
            </Link>
          ) : null
        }
      />
      <div className="px-8 py-8">
        <Card>
          <CardContent className="p-0">
            {total === 0 ? (
              <EmptyState
                icon={BotMessageSquare}
                title="No agents registered yet"
                description="Register an agent to start recording decisions, evidence hashes, and signed receipts."
                action={
                  isAdmin ? (
                    <Link href="/dashboard/agents/new">
                      <Button>
                        <Plus className="h-4 w-4" />
                        Register your first agent
                      </Button>
                    </Link>
                  ) : null
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Agent</th>
                      <th className="px-6 py-3">Environment</th>
                      <th className="px-6 py-3">Risk tier</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Allowed actions</th>
                      <th className="px-6 py-3">Spend caps</th>
                      <th className="px-6 py-3">Updated</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr
                        key={agent.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/agents/${agent.id}`}
                            className="font-medium hover:underline"
                          >
                            {agent.name}
                          </Link>
                          <div className="font-mono text-xs text-muted-foreground">
                            {agent.id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <AgentEnvironmentBadge environment={agent.environment} />
                        </td>
                        <td className="px-6 py-4">
                          <AgentRiskTierBadge tier={agent.riskTier} />
                        </td>
                        <td className="px-6 py-4">
                          <AgentStatusBadge status={agent.status} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatAllowedActionsCount(agent.allowedActions)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatSpendCapsSummary(agent.spendCaps)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatRelative(agent.updatedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/agents/${agent.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            {isAdmin ? (
                              <AgentLifecycleActions agent={agent} variant="row" />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
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
