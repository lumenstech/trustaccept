import Link from "next/link";
import { ArrowUpRight, Building2, CalendarClock, Clock, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, RiskLevelBadge, StatusBadge } from "@/components/ui/badge";
import { getModule } from "@/lib/modules";
import type { RiskRecord } from "@/lib/types";

export function InboxCard({ record }: { record: RiskRecord }) {
  const module = getModule(record.module);
  const expiresOrDue = record.expirationDate ?? record.dueDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{module.name}</Badge>
          <RiskLevelBadge level={record.riskLevel} />
          <StatusBadge status={record.status} />
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {record.id}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug">{record.title}</h3>
        <p className="text-sm text-muted-foreground">{record.description}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <dt className="sr-only">Source system</dt>
            <dd>
              <span className="text-muted-foreground">Source:</span> {record.sourceSystem}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <User2 className="h-4 w-4 text-muted-foreground" />
            <dt className="sr-only">Owner</dt>
            <dd>
              <span className="text-muted-foreground">Owner:</span> {record.owner}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <dt className="sr-only">Expires</dt>
            <dd>
              <span className="text-muted-foreground">
                {record.expirationDate ? "Expires:" : "Due:"}
              </span>{" "}
              {expiresOrDue ?? "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <dt className="sr-only">Review</dt>
            <dd>
              <span className="text-muted-foreground">Review:</span>{" "}
              {record.reviewDate ?? "—"}
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button variant="accept" size="sm">
          {module.acceptLabel}
        </Button>
        <Button variant="reject" size="sm">
          {module.rejectLabel}
        </Button>
        <Button variant="remediate" size="sm">
          {module.remediateLabel}
        </Button>
        <Link href={`/approve/${record.id}`} className="ml-auto">
          <Button variant="outline" size="sm">
            View Evidence
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
