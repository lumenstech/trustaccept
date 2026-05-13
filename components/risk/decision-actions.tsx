"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea, FieldGroup, Input } from "@/components/ui/form";
import { getApprovalLabels } from "@/lib/access";
import { nextStepFor, type DecisionAction } from "@/lib/decision";
import type { RiskRecord } from "@/lib/types";

export function DecisionActions({ initialRecord }: { initialRecord: RiskRecord }) {
  const [record, setRecord] = useState<RiskRecord>(initialRecord);
  const [lastAction, setLastAction] = useState<DecisionAction | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [compensatingControlsNote, setCompensatingControlsNote] = useState("");
  const [reviewDate, setReviewDate] = useState(initialRecord.reviewDate ?? "");
  const [pending, setPending] = useState<DecisionAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(() => getApprovalLabels(record), [record]);

  async function decide(action: DecisionAction) {
    setError(null);
    setPending(action);
    try {
      const response = await fetch(`/api/risk-records/${record.id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          decisionNote: decisionNote.length > 0 ? decisionNote : undefined,
          compensatingControlsNote:
            compensatingControlsNote.length > 0 ? compensatingControlsNote : undefined,
          reviewDate: reviewDate.length > 0 ? reviewDate : undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          body?.issues?.[0]
            ? `${body.issues[0].path}: ${body.issues[0].message}`
            : body?.error ?? "Decision could not be recorded";
        throw new Error(message);
      }
      const body = (await response.json()) as { record: RiskRecord };
      setRecord(body.record);
      setLastAction(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision could not be recorded");
    } finally {
      setPending(null);
    }
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
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Decision note (optional)" htmlFor="decisionNote">
              <Textarea
                id="decisionNote"
                rows={3}
                disabled={lastAction !== null}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Approver context, conditions, references."
              />
            </FieldGroup>
            <FieldGroup
              label="Compensating control note (optional)"
              htmlFor="compNote"
            >
              <Textarea
                id="compNote"
                rows={3}
                disabled={lastAction !== null}
                value={compensatingControlsNote}
                onChange={(e) => setCompensatingControlsNote(e.target.value)}
                placeholder="Additional mitigations applied at decision time."
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Set review date (optional)" htmlFor="reviewDate">
            <Input
              id="reviewDate"
              type="date"
              value={reviewDate}
              disabled={lastAction !== null}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </FieldGroup>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="accept"
              size="lg"
              disabled={lastAction !== null || pending !== null}
              onClick={() => decide("accept")}
            >
              <ShieldCheck className="h-4 w-4" />
              {pending === "accept" ? "Recording…" : labels.accept}
            </Button>
            <Button
              variant="reject"
              size="lg"
              disabled={lastAction !== null || pending !== null}
              onClick={() => decide("reject")}
            >
              {pending === "reject" ? "Recording…" : labels.reject}
            </Button>
            <Button
              variant="remediate"
              size="lg"
              disabled={lastAction !== null || pending !== null}
              onClick={() => decide("remediate")}
            >
              {pending === "remediate" ? "Recording…" : labels.remediate}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
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
    action === "accept"
      ? "accepted"
      : action === "reject"
        ? "rejected"
        : "marked for remediation";

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
          The audit timeline below has been appended and an immutable audit log entry
          has been written.
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
