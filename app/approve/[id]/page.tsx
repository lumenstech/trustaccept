import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock,
  FileCheck2,
  Shield,
  ShieldCheck,
  User2,
} from "lucide-react";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { getModule } from "@/lib/modules";
import { findRecord } from "@/lib/seed-data";

export default function ApprovePage({ params }: { params: { id: string } }) {
  const record = findRecord(params.id);
  if (!record) notFound();

  const module = getModule(record.module);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/inbox"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Approval Inbox
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{module.name}</Badge>
                <RiskLevelBadge level={record.riskLevel} />
                <StatusBadge status={record.status} />
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  Decision ID · {record.id}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {record.title}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">{record.description}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Module-aware actions. Every decision is signed, time-stamped, and
                  appended to the audit timeline.
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="accept" size="lg">
                  <ShieldCheck className="h-4 w-4" />
                  {module.acceptLabel}
                </Button>
                <Button variant="reject" size="lg">
                  {module.rejectLabel}
                </Button>
                <Button variant="remediate" size="lg">
                  {module.remediateLabel}
                </Button>
              </CardContent>
            </Card>

            <SectionCard title="Compensating controls" body={record.compensatingControls} />
            <SectionCard title="Evidence summary" body={record.evidenceSummary} />
            <SectionCard title="Business justification" body={record.businessJustification} />
            <SectionCard title="Technical context" body={record.technicalContext} />

            <Card>
              <CardHeader>
                <CardTitle>Source references</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {record.sourceReferences.map((ref, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <FileCheck2 className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{ref.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {ref.system}
                          {ref.externalId ? ` · ${ref.externalId}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

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

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Decision facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Fact icon={Shield} label="Product module" value={module.name} />
                <Fact icon={Building2} label="Source system" value={record.sourceSystem} />
                <Fact icon={User2} label="Owner" value={record.owner} />
                <Fact icon={Building2} label="Department" value={record.department} />
                <Fact icon={CalendarClock} label="Expiration" value={record.expirationDate ?? "—"} />
                <Fact icon={Clock} label="Review date" value={record.reviewDate ?? "—"} />
                <Fact
                  icon={CalendarClock}
                  label="Due date"
                  value={record.dueDate ?? "—"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Framework references</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {record.frameworkTags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  NIST-aligned and CISA KEV-aware. Designed to support audit evidence.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval delivery</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This hosted page is delivered to your named approver via SequenceNow.
                Once a decision is captured, the record flows to the Evidence Desk.
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}
