import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { RiskLevelBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { SEED_RECORDS } from "@/lib/seed-data";
import { getModule } from "@/lib/modules";

export default function RiskRecordsPage() {
  return (
    <>
      <DashboardHeader
        eyebrow="Risk Records"
        title="All risk records"
        description="A flat table of every risk record across all modules. Each row links to its hosted approval page."
      />
      <div className="px-8 py-8">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Risk</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Expires</th>
                    <th className="px-6 py-3">Frameworks</th>
                  </tr>
                </thead>
                <tbody>
                  {SEED_RECORDS.map((record) => {
                    const module = getModule(record.module);
                    return (
                      <tr key={record.id} className="border-b border-border last:border-0">
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          <Link href={`/approve/${record.id}`} className="hover:text-primary">
                            {record.id}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/approve/${record.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {record.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{module.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{record.sourceSystem}</td>
                        <td className="px-6 py-4">
                          <RiskLevelBadge level={record.riskLevel} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{record.owner}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {record.department}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {record.expirationDate ?? record.dueDate ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {record.frameworkTags.slice(0, 2).map((tag) => (
                              <Badge key={tag} tone="neutral">
                                {tag}
                              </Badge>
                            ))}
                            {record.frameworkTags.length > 2 ? (
                              <Badge tone="neutral">
                                +{record.frameworkTags.length - 2}
                              </Badge>
                            ) : null}
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
      </div>
    </>
  );
}
