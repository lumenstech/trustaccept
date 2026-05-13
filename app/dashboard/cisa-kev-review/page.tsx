import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  FileCheck2,
  Globe,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getKevExposureStatusLabel,
  getKevPatchAvailabilityLabel,
  getKevSourceMeta,
} from "@/lib/kev";
import { requireDashboardAccess } from "@/src/server/auth";
import { listRiskRecordsByModule } from "@/src/server/riskRecords";

export const dynamic = "force-dynamic";

export default function KevExposureReviewDashboardPage() {
  const user = requireDashboardAccess();
  const records = listRiskRecordsByModule(user, "kev-exposure-review");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const today = new Date();

  const counts = {
    pending: records.filter((r) => r.status === "pending").length,
    critical: records.filter((r) => r.riskLevel === "critical").length,
    internetFacing: records.filter(
      (r) => r.kevContext?.assetType === "internet-facing-server",
    ).length,
    expiring: records.filter((r) => {
      if (!r.expirationDate) return false;
      return new Date(r.expirationDate) <= cutoff;
    }).length,
    remediationOverdue: records.filter((r) => {
      if (r.status === "accepted") return false;
      if (!r.dueDate) return false;
      return new Date(r.dueDate) < today;
    }).length,
    compensatingActive: records.filter(
      (r) =>
        r.kevContext?.patchAvailability === "compensating-control-only" ||
        r.kevContext?.patchAvailability === "vendor-workaround",
    ).length,
    executiveOwnerRequired: records.filter(
      (r) => r.department === "Office of the CISO" || r.kevContext?.emergency,
    ).length,
    evidenceReady: records.filter(
      (r) => r.status === "accepted" || r.status === "remediation_required",
    ).length,
  };

  const summaryCards = [
    { label: "Pending KEV exposure decisions", value: counts.pending, icon: ShieldCheck, tone: "amber" as const },
    { label: "Critical exposure records", value: counts.critical, icon: ShieldAlert, tone: "danger" as const },
    { label: "Internet-facing assets", value: counts.internetFacing, icon: Globe, tone: "info" as const },
    { label: "Expiring temporary acceptances", value: counts.expiring, icon: AlertTriangle, tone: "amber" as const },
    { label: "Remediation overdue", value: counts.remediationOverdue, icon: AlertOctagon, tone: "danger" as const },
    { label: "Compensating controls active", value: counts.compensatingActive, icon: Wrench, tone: "info" as const },
    { label: "Executive owner required", value: counts.executiveOwnerRequired, icon: Cloud, tone: "info" as const },
    { label: "Evidence-ready records", value: counts.evidenceReady, icon: CheckCircle2, tone: "success" as const },
  ];

  return (
    <>
      <DashboardHeader
        eyebrow="KEV Exposure Review"
        title="CISA KEV-aware exposure decisions command center"
        description="Approval, acceptance, remediation, and evidence for every known exploited vulnerability exposure. Filtered to module = kev_exposure_review."
        actions={
          <>
            <Link href="/dashboard/cisa-kev-review/new">
              <Button>
                <Plus className="h-4 w-4" />
                New KEV Record
              </Button>
            </Link>
            <Link href="/dashboard/cisa-kev-review/findings">
              <Button variant="outline">
                <Sparkles className="h-4 w-4" />
                View KEV Findings
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-8 px-8 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="flex items-start justify-between p-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
                  </div>
                  <Badge tone={card.tone}>
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
                No KEV Exposure Review records yet. Create a record or import a KEV
                finding.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/cisa-kev-review/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    New KEV Record
                  </Button>
                </Link>
                <Link href="/dashboard/cisa-kev-review/findings">
                  <Button variant="outline">View KEV findings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>KEV Exposure Review records</CardTitle>
              <p className="text-sm text-muted-foreground">
                Every KEV Exposure Review record across the organization, with
                module-aware decision routing. Emergency records highlighted.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">CVE</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Affected asset</th>
                      <th className="px-6 py-3">Exposure</th>
                      <th className="px-6 py-3">Patch availability</th>
                      <th className="px-6 py-3">Risk</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Owner</th>
                      <th className="px-6 py-3">Due</th>
                      <th className="px-6 py-3">Expires</th>
                      <th className="px-6 py-3">Review</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const ctx = record.kevContext;
                      const sourceLabel = ctx ? getKevSourceMeta(ctx.source).shortLabel : record.sourceSystem;
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
                              {ctx?.emergency ? (
                                <span className="ml-2 inline-flex items-center rounded-full bg-danger/10 px-2 text-[10px] uppercase text-danger">
                                  emergency
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                            {ctx?.cve ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{sourceLabel}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {ctx?.affectedAsset ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {ctx ? getKevExposureStatusLabel(ctx.exposureStatus) : "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {ctx ? getKevPatchAvailabilityLabel(ctx.patchAvailability) : "—"}
                          </td>
                          <td className="px-6 py-4">
                            <RiskLevelBadge level={record.riskLevel} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{record.owner}</td>
                          <td className="px-6 py-4 text-muted-foreground">{record.dueDate ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">{record.expirationDate ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">{record.reviewDate ?? "—"}</td>
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

// Avoid unused-import lints for FileCheck2 if the tone palette changes.
void FileCheck2;
