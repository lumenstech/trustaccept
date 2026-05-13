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
  summary,
}: {
  record: RiskRecord;
  summary: EvidencePacketSummary;
}) {
  const [sent, setSent] = useState(false);

  function downloadPdf() {
    const lines = [
      `TrustAccept · Evidence Packet`,
      `==============================`,
      ``,
      `Decision ID: ${summary.decisionId}`,
      `Module:      ${summary.module}`,
      `Risk level:  ${summary.riskLevel}`,
      `Source:      ${summary.sourceSystem}`,
      `Owner:       ${summary.owner}`,
      `Expires:     ${summary.expirationDate}`,
      `Outcome:     ${summary.outcome}`,
      ``,
      `Frameworks:`,
      ...summary.frameworkTags.map((tag) => `  - ${tag}`),
      ``,
      `Executive summary`,
      `-----------------`,
      summary.executiveSummary,
      ``,
      `Compensating controls`,
      `---------------------`,
      record.compensatingControls,
      ``,
      `Evidence summary`,
      `----------------`,
      record.evidenceSummary,
      ``,
      `Audit timeline`,
      `--------------`,
      ...record.auditTimeline.map(
        (e) => `  [${e.occurredAt}] ${e.actor} ${e.action} — ${e.detail}`,
      ),
      ``,
      `NIST-aligned · CISA KEV-aware · designed to support audit evidence`,
      `TrustAccept is a Lumens Technology product. Approval delivery powered by SequenceNow.`,
    ].join("\n");

    const blob = new Blob([lines], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${summary.decisionId}-evidence.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={downloadPdf}>
        <Download className="h-4 w-4" />
        Download Evidence PDF
      </Button>
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
