import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { SEED_RECORDS } from "@/lib/seed-data";
import { getModule } from "@/lib/modules";

export default function EvidenceDeskPage() {
  const monthly = SEED_RECORDS.find((r) => r.module === "evidence-desk");

  return (
    <>
      <DashboardHeader
        eyebrow="Evidence Desk"
        title="Evidence-ready system of record"
        description="Decisions across all seven modules, framework-informed, with audit-ready exports. Monthly executive risk register included."
        actions={
          <>
            <Button>
              <Download className="h-4 w-4" />
              Export evidence binder
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4" />
              Generate executive register
            </Button>
          </>
        }
      />
      <div className="grid gap-6 px-8 py-8 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent evidence packets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Record</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Risk</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Frameworks</th>
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
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {record.frameworkTags.slice(0, 2).map((tag) => (
                              <Badge key={tag} tone="neutral">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/approve/${record.id}`} className="text-primary">
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
        <div className="space-y-6">
          {monthly ? (
            <Card>
              <CardHeader>
                <Badge tone="info">Monthly</Badge>
                <CardTitle className="mt-2">{monthly.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>{monthly.description}</p>
                <div>
                  <p className="text-xs uppercase tracking-widest text-foreground">
                    Owner
                  </p>
                  <p>{monthly.owner}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-foreground">
                    Review due
                  </p>
                  <p>{monthly.reviewDate}</p>
                </div>
                <Link href={`/approve/${monthly.id}`}>
                  <Button variant="outline" className="w-full">
                    Review register
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Language guardrails</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Records are NIST-aligned, CISA KEV-aware, and designed to support audit
              evidence. We do not claim certification, auditor approval, or guaranteed
              compliance.
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
