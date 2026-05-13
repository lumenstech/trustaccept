"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyDecision,
  nextStepFor,
  type DecisionAction,
} from "@/lib/decision";
import { getModule } from "@/lib/modules";
import type { RiskRecord } from "@/lib/types";

const ACTOR = "Alex Greene";

export function DecisionActions({ initialRecord }: { initialRecord: RiskRecord }) {
  const [record, setRecord] = useState<RiskRecord>(initialRecord);
  const [lastAction, setLastAction] = useState<DecisionAction | null>(null);

  const module = useMemo(() => getModule(record.module), [record.module]);

  function decide(action: DecisionAction) {
    setRecord((prev) => applyDecision(prev, action, { actor: ACTOR }));
    setLastAction(action);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Decision</CardTitle>
            <StatusBadge status={record.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Module-aware actions. Every decision is signed, time-stamped, and appended
            to the audit timeline below.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="accept"
            size="lg"
            disabled={lastAction !== null}
            onClick={() => decide("accept")}
          >
            <ShieldCheck className="h-4 w-4" />
            {module.acceptLabel}
          </Button>
          <Button
            variant="reject"
            size="lg"
            disabled={lastAction !== null}
            onClick={() => decide("reject")}
          >
            {module.rejectLabel}
          </Button>
          <Button
            variant="remediate"
            size="lg"
            disabled={lastAction !== null}
            onClick={() => decide("remediate")}
          >
            {module.remediateLabel}
          </Button>
        </CardContent>
      </Card>

      {lastAction ? <ConfirmationCard record={record} action={lastAction} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Audit timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l border-border pl-6">
            {record.auditTimeline.map((entry, idx) => (
              <li key={idx}>
                <span className="absolute -left-[6px] mt-1 h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm font-medium">
                  {entry.actor}{" "}
                  <span className="font-normal text-muted-foreground">
                    {entry.action}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{entry.detail}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {entry.occurredAt}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfirmationCard({
  record,
  action,
}: {
  record: RiskRecord;
  action: DecisionAction;
}) {
  const next = nextStepFor(action, record.id);
  const verb =
    action === "accept" ? "accepted" : action === "reject" ? "rejected" : "marked for remediation";

  return (
    <Card className="border-success/40 bg-success/5">
      <CardHeader>
        <Badge tone="success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Decision recorded
        </Badge>
        <CardTitle className="mt-3">
          Risk record {record.id} {verb}.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Signed by {record.decisionBy ?? "—"} at{" "}
          <span className="font-mono text-xs text-foreground">{record.decisionAt}</span>.
          The audit timeline below has been appended. In production, SequenceNow would
          notify watchers and the Evidence Desk would receive the packet.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={next.href}>
            <Button>
              {next.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/risk-records/${record.id}/evidence`}>
            <Button variant="outline">View evidence packet</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
