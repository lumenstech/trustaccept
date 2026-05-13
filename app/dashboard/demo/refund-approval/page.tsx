import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefundDemoClient } from "@/components/demo/refund-demo-client";
import { requireDashboardAccess } from "@/src/server/auth";
import { findAgentByName } from "@/src/server/agents";
import {
  DEMO_AGENT_NAME,
  REFUND_POLICY_BULLETS,
} from "@/lib/demo/refund-policy";

export const dynamic = "force-dynamic";

export default function RefundApprovalDemoPage() {
  const user = requireDashboardAccess();
  const existing = findAgentByName(user, DEMO_AGENT_NAME);
  const initialAgent = existing
    ? {
        id: existing.id,
        name: existing.name,
        status: existing.status,
        environment: existing.environment,
        riskTier: existing.riskTier,
        allowedActions: existing.allowedActions,
        spendCaps: existing.spendCaps,
      }
    : null;

  return (
    <>
      <DashboardHeader
        eyebrow="Demo"
        title="AI Agent Refund Approval"
        description="Walk through a real refund decision: register an agent, simulate a refund request, submit through /api/v1/decisions, and inspect the signed receipt."
        actions={<Badge tone="info">Live API · no mocks</Badge>}
      />
      <div className="px-4 py-6 sm:px-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Policy template</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {REFUND_POLICY_BULLETS.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              These lines describe how the existing agent registry + decision
              pipeline behaves. They are illustrative — TrustAccept does not
              introduce a new policy engine for the demo.
            </p>
          </CardContent>
        </Card>

        <RefundDemoClient initialAgent={initialAgent} />
      </div>
    </>
  );
}
