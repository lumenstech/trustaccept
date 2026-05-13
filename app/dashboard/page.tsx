import Link from "next/link";
import { ArrowUpRight, AlertTriangle, CheckCircle2, ShieldAlert, Timer } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskLevelBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { SEED_RECORDS } from "@/lib/seed-data";
import { getModule } from "@/lib/modules";

export default function DashboardOverview() {
  const pending = SEED_RECORDS.filter((r) => r.status === "pending");
  const critical = SEED_RECORDS.filter((r) => r.riskLevel === "critical");
  const kev = SEED_RECORDS.filter((r) => r.module === "kev-exposure-review");

  const stats = [
    {
      label: "Pending decisions",
      value: pending.length,
      icon: Timer,
      tone: "amber" as const,
    },
    {
      label: "Critical-risk records",
      value: critical.length,
      icon: ShieldAlert,
      tone: "danger" as const,
    },
    {
      label: "KEV-tagged records",
      value: kev.length,
      icon: AlertTriangle,
      tone: "info" as const,
    },
    {
      label: "Evidence packets ready",
      value: 1,
      icon: CheckCircle2,
      tone: "success" as const,
    },
  ];

  return (
    <>
      <DashboardHeader
        eyebrow="Overview"
        title="TrustAccept workspace"
        description="Pending risk decisions, critical-risk records, and KEV exposure surfaced across all seven modules."
        actions={
          <>
            <Link href="/dashboard/inbox">
              <Button>Open Approval Inbox</Button>
            </Link>
            <Link href="/dashboard/evidence-desk">
              <Button variant="outline">Evidence Desk</Button>
            </Link>
          </>
        }
      />

      <div className="px-8 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="flex items-start justify-between p-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                  <Badge tone={stat.tone}>
                    <Icon className="h-3.5 w-3.5" />
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Section className="border-b-0 px-0 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent risk records</h2>
            <Link
              href="/dashboard/risk-records"
              className="inline-flex items-center gap-1 text-sm text-primary"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Card className="mt-6">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Record</th>
                      <th className="px-6 py-3">Module</th>
                      <th className="px-6 py-3">Risk</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Owner</th>
                      <th className="px-6 py-3">Expires</th>
                      <th className="px-6 py-3 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SEED_RECORDS.map((record) => {
                      const module = getModule(record.module);
                      return (
                        <tr key={record.id} className="border-b border-border last:border-0">
                          <td className="px-6 py-4">
                            <div className="font-medium">{record.title}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {record.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{module.name}</td>
                          <td className="px-6 py-4">
                            <RiskLevelBadge level={record.riskLevel} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{record.owner}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {record.expirationDate ?? record.dueDate ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/approve/${record.id}`}
                              className="text-primary hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Section>
      </div>
    </>
  );
}
