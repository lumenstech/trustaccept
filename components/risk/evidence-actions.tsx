"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Download, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EvidencePacketSummary } from "@/lib/evidence";
import type { RiskRecord } from "@/lib/types";

export function EvidenceActions({
  record,
}: {
  record: RiskRecord;
  summary: EvidencePacketSummary;
}) {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`/api/evidence-packets/${record.id}/export.pdf`}
        download={`trustaccept-evidence-${record.id}.pdf`}
      >
        <Button>
          <Download className="h-4 w-4" />
          Download Evidence PDF
        </Button>
      </a>
      <Button
        variant={sent ? "subtle" : "outline"}
        onClick={() => setSent(true)}
        disabled={sent}
      >
        {sent ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {sent ? "Sent to Evidence Desk" : "Send to Evidence Desk"}
      </Button>
      <Link href="/book-risk-review">
        <Button variant="outline">
          <FileText className="h-4 w-4" />
          Book 48-Hour Review
        </Button>
      </Link>
      {sent ? (
        <Badge tone="success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Filed in Evidence Desk
        </Badge>
      ) : null}
    </div>
  );
}
