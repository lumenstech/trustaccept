import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  KeyRound,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserPlus,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACCESS_REQUEST_TYPES,
  type AccessRequestType,
} from "@/lib/access";
import { requireDashboardAccess } from "@/src/server/auth";
import { listRiskRecordsByModuleAsync } from "@/src/server/riskRecords";

export const dynamic = "force-dynamic";

const SUMMARY_BUCKETS: Array<{
  label: string;
  match: (type: AccessRequestType | undefined, riskLevel: string, status: string) => boolean;
  icon: typeof Lock;
  tone: "amber" | "info" | "danger" | "success" | "neutral";
}> = [
  {
    label: "Pending access approvals",
    match: (_type, _r, status) => status === "pending",
    icon: ShieldCheck,
    tone: "amber",
  },
  {
    label: "Critical access events",
    match: (_type, risk) => risk === "critical",
    icon: ShieldAlert,
    tone: "danger",
  },
  {
    label: "Expiring temporary access",
    match: () => true,
    icon: AlertTriangle,
    tone: "amber",
  },
  {
    label: "MFA recovery requests",
    match: (type) => type === "mfa-recovery",
    icon: UserCog,
    tone: "info",
  },
  {
    label: "API key requests",
    match: (type) => type === "api-key-creation",
    icon: KeyRound,
    tone: "info",
  },
  {
    label: "Suspicious login reviews",
    match: (type) => type === "suspicious-login",
    icon: AlertTriangle,
    tone: "info",
  },
  {
    label: "Break-glass approvals",
    match: (type) => type === "break-glass-access",
    icon: Lock,
    tone: "info",
  },
  {
    label: "Contractor access requests",
    match: (type) => type === "contractor-temporary-access",
    icon: UserPlus,
    tone: "info",
  },
];

export default async function AccessAcceptDashboardPage() {
  const user = requireDashboardAccess();
  const records = await listRiskRecordsByModuleAsync(user, "access-accept");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);

  const counts = SUMMARY_BUCKETS.map((bucket) => {
    if (bucket.label === "Expiring temporary access") {
      const count = records.filter((r) => {
        if (!r.expirationDate) return false;
        return new Date(r.expirationDate) <= cutoff;
      }).length;
      return { ...bucket, count };
    }
    const count = records.filter((r) =>
      bucket.match(r.accessContext?.requestType, r.riskLevel, r.status),
    ).length;
    return { ...bucket, count };
  });

  return (
    <>
      <DashboardHeader
        eyebrow="Access Accept"
        title="Identity & access command center"
        description="Approval, acceptance, and evidence for every high-risk identity decision. Filtered to module = access_accept."
        actions={
          <>
            <Link href="/dashboard/access-accept/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Access Record
              </Button>
            </Link>
            <Link href="/dashboard/access-accept/events">
              <Button variant="outline">
                <Sparkles className="h-4 w-4" />
                View Identity Events
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-8 px-8 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((bucket) => {
            const Icon = bucket.icon;
            return (
              <Card key={bucket.label}>
                <CardContent className="flex items-start justify-between p-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {bucket.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {bucket.count}
                    </p>
                  </div>
                  <Badge tone={bucket.tone}>
                    <Icon className="h-3.5 w-3.5" />
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-10">
              <Badge tone="info">Empty</Badge>
              <p className="text-lg font-medium">
                No Access Accept records yet. Create a record or import an identity
                event.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/access-accept/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    New Access Record
                  </Button>
                </Link>
                <Link href="/dashboard/access-accept/events">
                  <Button variant="outline">View identity events</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Access Accept records</CardTitle>
              <p className="text-sm text-muted-foreground">
                Every Access Accept record across the organization, with module-aware
                decision routing.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Request type</th>
                      <th className="px-6 py-3">Requester</th>
                      <th className="px-6 py-3">Target</th>
                      <th className="px-6 py-3">Risk</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Owner</th>
                      <th className="px-6 py-3">Expires</th>
                      <th className="px-6 py-3">Review</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const ctx = record.accessContext;
                      const requestLabel = ctx
                        ? ACCESS_REQUEST_TYPES.find((t) => t.value === ctx.requestType)
                            ?.shortLabel
                        : "—";
                      return (
                        <tr key={record.id} className="border-b border-border last:border-0 align-top">
                          <td className="px-6 py-4">
                            <Link
                              href={`/approve/${record.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {record.title}
                            </Link>
                            <div className="font-mono text-xs text-muted-foreground">
                              {record.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {record.sourceSystem}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{requestLabel ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {ctx?.requester ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {ctx?.targetSystem ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <RiskLevelBadge level={record.riskLevel} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{record.owner}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {record.expirationDate ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {record.reviewDate ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1 text-xs">
                              <Link
                                href={`/approve/${record.id}`}
                                className="inline-flex items-center gap-1 text-primary"
                              >
                                View Approval <ArrowUpRight className="h-3 w-3" />
                              </Link>
                              <Link
                                href={`/dashboard/risk-records/${record.id}/evidence`}
                                className="inline-flex items-center gap-1 text-primary"
                              >
                                View Evidence <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
