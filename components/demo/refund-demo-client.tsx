"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildReceiptDisplay,
  DEMO_AGENT_ACTION,
  DEMO_AGENT_DEFAULT_CAP_CENTS,
  DEMO_AGENT_NAME,
  outcomeToDecisionFields,
  refundPolicyBand,
  REFUND_OUTCOMES,
  REFUND_RISK_LEVELS,
  RefundRequestSchema,
  type RefundOutcome,
  type RefundRequest,
} from "@/lib/demo/refund-policy";

interface InitialAgent {
  id: string;
  name: string;
  status: string;
  environment: string;
  riskTier: string;
  allowedActions: string[];
  spendCaps: { perDecisionCents?: number; currency: string };
}

interface DecisionResponseShape {
  id: string;
  agentId: string | null;
  action: string;
  subject: string;
  decisionStatus: "allowed" | "blocked" | "pending_review";
  evidenceSha256: string;
  receiptJws: string;
  capCheck: { ok: boolean; reason?: string };
  amountCents?: number;
  createdAt: string;
}

interface Props {
  initialAgent: InitialAgent | null;
}

const DEFAULT_REFUND: RefundRequest = {
  customer_id: "cus-1042",
  refund_amount: 75,
  reason: "Duplicate charge on subscription renewal.",
  order_id: "ord-7841",
  requested_by_agent: DEMO_AGENT_NAME,
  risk_level: "low",
};

export function RefundDemoClient({ initialAgent }: Props) {
  const [agent, setAgent] = React.useState<InitialAgent | null>(initialAgent);
  const [creatingAgent, setCreatingAgent] = React.useState(false);
  const [agentError, setAgentError] = React.useState<string | null>(null);

  const [refund, setRefund] = React.useState<RefundRequest>(DEFAULT_REFUND);
  const [refundErrors, setRefundErrors] = React.useState<Record<string, string>>({});

  const [outcome, setOutcome] = React.useState<RefundOutcome>("accept");
  const [submitting, setSubmitting] = React.useState(false);
  const [decision, setDecision] = React.useState<DecisionResponseShape | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const band = refundPolicyBand(refund.refund_amount);
  const policyBlocksDecision =
    agent !== null && agent.status !== "active";

  async function handleRegisterAgent() {
    setAgentError(null);
    setCreatingAgent(true);
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: DEMO_AGENT_NAME,
          environment: "production",
          riskTier: "high",
          allowedActions: [DEMO_AGENT_ACTION],
          spendCaps: {
            perDecisionCents: DEMO_AGENT_DEFAULT_CAP_CENTS,
            currency: "USD",
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "agent_create_failed" }));
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const body = await res.json();
      setAgent(body.agent as InitialAgent);
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreatingAgent(false);
    }
  }

  async function handleRefreshAgent() {
    if (!agent) return;
    setAgentError(null);
    try {
      const res = await fetch(`/api/v1/agents/${agent.id}`);
      if (res.ok) {
        const body = await res.json();
        setAgent(body.agent as InitialAgent);
      }
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Refresh failed");
    }
  }

  function handleRefundChange<K extends keyof RefundRequest>(
    key: K,
    value: RefundRequest[K],
  ) {
    setRefund((prev) => ({ ...prev, [key]: value }));
  }

  function validateRefund(): RefundRequest | null {
    const parsed = RefundRequestSchema.safeParse(refund);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setRefundErrors(next);
      return null;
    }
    setRefundErrors({});
    return parsed.data;
  }

  async function handleSubmitDecision() {
    setSubmitError(null);
    setDecision(null);
    if (!agent) {
      setSubmitError("Register the demo agent before submitting.");
      return;
    }
    if (agent.status !== "active") {
      setSubmitError(
        `Agent is ${agent.status}. Revoked or paused agents cannot submit decisions.`,
      );
      return;
    }
    const validated = validateRefund();
    if (!validated) return;

    const { decisionStatus, block } = outcomeToDecisionFields(outcome);
    const amountCents = Math.round(validated.refund_amount * 100);

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          action: DEMO_AGENT_ACTION,
          subject: `order:${validated.order_id}`,
          amountCents,
          currency: "USD",
          decisionStatus,
          block,
          policyVersion: "refund-policy-v1",
          evidencePayload: {
            customer_id: validated.customer_id,
            refund_amount: validated.refund_amount,
            reason: validated.reason,
            order_id: validated.order_id,
            requested_by_agent: validated.requested_by_agent,
            risk_level: validated.risk_level,
            policyBand: band.band,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Status ${res.status}` }));
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const body = await res.json();
      setDecision(body.decision as DecisionResponseShape);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const receiptView = decision
    ? buildReceiptDisplay({
        evidenceSha256: decision.evidenceSha256,
        receiptJws: decision.receiptJws,
        decisionStatus: decision.decisionStatus,
        capCheckOk: decision.capCheck.ok,
      })
    : null;

  return (
    <div className="space-y-6 px-4 py-8 sm:px-8">
      <StepCard
        number={1}
        title="Register or select the demo agent"
        description="Posts to POST /api/v1/agents. If the named agent already exists, the registry returns 409 and we surface that — re-run the demo with a fresh org if you need a clean slate."
        status={agent ? "done" : "active"}
      >
        {agent ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Agent</Badge>
              <span className="font-mono text-xs text-muted-foreground">{agent.id}</span>
              <Badge tone={agent.status === "active" ? "success" : "amber"}>
                {agent.status}
              </Badge>
              <Badge tone="neutral">{agent.environment}</Badge>
              <Badge tone="amber">tier: {agent.riskTier}</Badge>
            </div>
            <p className="text-muted-foreground">
              {agent.name} · allowed actions: {agent.allowedActions.join(", ")}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefreshAgent}>
              Refresh agent status
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              No agent named &quot;{DEMO_AGENT_NAME}&quot; exists in this workspace yet.
              Click below to register one via the real Agent Registry API.
            </p>
            <Button onClick={handleRegisterAgent} disabled={creatingAgent}>
              {creatingAgent ? "Registering…" : "Register demo agent"}
            </Button>
          </div>
        )}
        {agentError ? <ErrorLine message={agentError} /> : null}
      </StepCard>

      <StepCard
        number={2}
        title="Simulate an AI-agent refund request"
        description="These fields are what an upstream copilot would send. The form validates with the same Zod schema the demo helper exports — see lib/demo/refund-policy.ts."
        status={agent ? "active" : "locked"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Customer ID"
            value={refund.customer_id}
            error={refundErrors["customer_id"]}
            onChange={(v) => handleRefundChange("customer_id", v)}
          />
          <Field
            label="Order ID"
            value={refund.order_id}
            error={refundErrors["order_id"]}
            onChange={(v) => handleRefundChange("order_id", v)}
          />
          <Field
            label="Refund amount (USD)"
            type="number"
            value={String(refund.refund_amount)}
            error={refundErrors["refund_amount"]}
            onChange={(v) => handleRefundChange("refund_amount", Number(v))}
          />
          <Field
            label="Requested by agent"
            value={refund.requested_by_agent}
            error={refundErrors["requested_by_agent"]}
            onChange={(v) => handleRefundChange("requested_by_agent", v)}
          />
          <Select
            label="Risk level"
            value={refund.risk_level}
            options={REFUND_RISK_LEVELS.map((r) => ({ value: r, label: r }))}
            onChange={(v) => handleRefundChange("risk_level", v as RefundRequest["risk_level"])}
          />
          <Field
            label="Reason"
            value={refund.reason}
            error={refundErrors["reason"]}
            onChange={(v) => handleRefundChange("reason", v)}
          />
        </div>
        <div className="mt-4 rounded-md border border-border bg-muted/40 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge
              tone={
                band.band === "auto"
                  ? "success"
                  : band.band === "review"
                    ? "amber"
                    : "danger"
              }
            >
              {band.label}
            </Badge>
            <span className="text-muted-foreground">{band.detail}</span>
          </div>
        </div>
      </StepCard>

      <StepCard
        number={3}
        title="Submit the decision through /api/v1/decisions"
        description="This POST hits the real decision pipeline: spend-cap check, canonical SHA-256 evidence hash, RS256 JWS receipt. No mocking."
        status={agent ? "active" : "locked"}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select
            label="Decision outcome"
            value={outcome}
            options={REFUND_OUTCOMES.map((o) => ({ value: o, label: o }))}
            onChange={(v) => setOutcome(v as RefundOutcome)}
          />
          <Button
            onClick={handleSubmitDecision}
            disabled={submitting || !agent || policyBlocksDecision}
          >
            {submitting ? "Submitting…" : "Submit decision"}
          </Button>
        </div>
        {policyBlocksDecision ? (
          <ErrorLine
            message={`Agent is ${agent?.status}. Pause or revoke blocks new decisions.`}
          />
        ) : null}
        {submitError ? <ErrorLine message={submitError} /> : null}
      </StepCard>

      <StepCard
        number={4}
        title="Signed receipt + evidence hash"
        description="Pulled straight from the decision response. The hash is a canonical SHA-256 of the evidence payload; the receipt is an RS256 JWS the auditor can verify with the tenant's public key."
        status={decision ? "done" : "locked"}
      >
        {decision && receiptView ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  decision.decisionStatus === "allowed"
                    ? "success"
                    : decision.decisionStatus === "blocked"
                      ? "danger"
                      : "amber"
                }
              >
                {decision.decisionStatus}
              </Badge>
              <Badge
                tone={
                  receiptView.capCheckTone === "ok"
                    ? "success"
                    : receiptView.capCheckTone === "warn"
                      ? "amber"
                      : "danger"
                }
              >
                {receiptView.capCheckLabel}
              </Badge>
              <Badge tone="info">{receiptView.receiptValidLabel}</Badge>
            </div>
            <KeyValue label="Decision ID" value={decision.id} mono />
            <KeyValue label="Evidence SHA-256" value={receiptView.fullHash} mono />
            <KeyValue label="Receipt (JWS)" value={receiptView.shortJws} mono />
            <KeyValue
              label="Amount"
              value={`$${((decision.amountCents ?? 0) / 100).toFixed(2)}`}
            />
            <KeyValue label="Created at" value={decision.createdAt} mono />
            <div className="pt-3">
              <a
                className="text-sm font-medium text-primary underline"
                href={evidenceExportHref(decision)}
                target="_blank"
                rel="noreferrer"
              >
                Export evidence (JSON, last 30 days) →
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submit a decision in step 3 to see the signed receipt here.
          </p>
        )}
      </StepCard>
    </div>
  );
}

function evidenceExportHref(decision: DecisionResponseShape): string {
  const to = new Date(decision.createdAt);
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({ from: fmt(from), to: fmt(to), format: "json" });
  if (decision.agentId) params.set("agentId", decision.agentId);
  return `/api/v1/evidence/export?${params.toString()}`;
}

function StepCard({
  number,
  title,
  description,
  status,
  children,
}: {
  number: number;
  title: string;
  description: string;
  status: "locked" | "active" | "done";
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              status === "done"
                ? "bg-success/15 text-success"
                : status === "active"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {number}
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  type = "text",
  error,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KeyValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-t border-border pt-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={mono ? "break-all font-mono text-xs" : "text-sm"}>
        {value}
      </span>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
      {message}
    </p>
  );
}
