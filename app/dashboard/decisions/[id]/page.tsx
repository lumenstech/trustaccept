import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { DecisionStatusBadge } from "@/components/dashboard/decision-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RiskLevelBadge } from "@/components/ui/badge";
import {
  getDecisionRequest,
  listDecisionAuditEvents,
} from "@/src/server/decisions/service";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "—";
  if (!currency) return amount.toLocaleString();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      amount,
    );
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export default function DecisionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const decision = getDecisionRequest(params.id);
  if (!decision) notFound();
  const events = listDecisionAuditEvents(decision.id);

  return (
    <>
      <DashboardHeader
        eyebrow="Decision"
        title={decision.title}
        description={`${decision.source} · ${decision.actionType}`}
        actions={<DecisionStatusBadge status={decision.status} />}
      />
      <div className="grid gap-6 px-8 py-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{decision.description}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Decision ID" value={<code>{decision.id}</code>} />
              <Field label="External ID" value={decision.externalId ?? "—"} />
              <Field
                label="Risk level"
                value={<RiskLevelBadge level={decision.riskLevel} />}
              />
              <Field
                label="Status"
                value={<DecisionStatusBadge status={decision.status} />}
              />
              <Field label="Requester" value={decision.requester} />
              <Field label="Subject" value={decision.subject} />
              <Field
                label="Amount"
                value={formatAmount(decision.amount, decision.currency)}
              />
              <Field
                label="Evidence"
                value={
                  decision.evidenceUrl ? (
                    <a
                      href={decision.evidenceUrl}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open evidence
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Created" value={formatDate(decision.createdAt)} />
              <Field label="Decided at" value={formatDate(decision.decidedAt)} />
              <Field
                label="Decided by"
                value={decision.decidedByName ?? decision.decidedBySlackUserId ?? "—"}
              />
              <Field label="Reason" value={decision.decisionReason ?? "—"} />
            </dl>
            {Object.keys(decision.metadata).length > 0 ? (
              <details>
                <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">
                  Metadata
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(decision.metadata, null, 2)}
                </pre>
              </details>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Slack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field label="Team" value={decision.slackTeamId ?? "—"} />
              <Field label="Channel" value={decision.slackChannelId ?? "—"} />
              <Field label="Message ts" value={decision.slackMessageTs ?? "—"} />
              {decision.slackChannelId && decision.slackMessageTs ? (
                <p className="text-xs text-muted-foreground">
                  Slack is the approval UI. TrustAccept is the system of record.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No Slack message was posted. Connect Slack via{" "}
                  <Link href="/dashboard/integrations" className="text-primary">
                    Integrations
                  </Link>{" "}
                  or pass <code>approval_channel_id</code> when creating the
                  decision.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {events.length === 0 ? (
                  <li className="text-muted-foreground">No events yet.</li>
                ) : (
                  events.map((event) => (
                    <li key={event.id} className="border-l-2 border-border pl-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{event.eventType}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        actor: {event.actorType}
                        {event.actorId ? ` (${event.actorId})` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
