import { summarizeRecordForEvidence, type EvidencePacketSummary } from "@/lib/evidence";
import type { RiskRecord, SessionUser } from "@/lib/types";
import { recordAuditEvent } from "./auditLogs";
import { assertCanAccessOrganizationRecord } from "./auth";
import { listAuditLogsForRecord } from "./auditLogs";
import { getStore, type EvidencePacketRecord } from "./store";

let counter = 0;
function generatePacketId(): string {
  counter += 1;
  return `evidence-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface EvidencePacket {
  id: string;
  organizationId: string;
  riskRecordId: string;
  summary: EvidencePacketSummary;
  generatedAt: string;
  record: RiskRecord;
}

export function buildEvidencePacketSummary(record: RiskRecord): EvidencePacketSummary {
  return summarizeRecordForEvidence(record);
}

export function createEvidencePacket(
  user: SessionUser,
  record: RiskRecord,
): EvidencePacket {
  assertCanAccessOrganizationRecord(user, record);
  const summary = buildEvidencePacketSummary(record);
  const stored: EvidencePacketRecord = {
    id: generatePacketId(),
    organizationId: user.organizationId,
    riskRecordId: record.id,
    summary,
    generatedAt: new Date().toISOString(),
  };
  getStore().evidencePackets.set(stored.id, stored);

  recordAuditEvent({
    eventType: "evidence_packet.generated",
    actor: user,
    organizationId: user.organizationId,
    riskRecordId: record.id,
    metadata: { packetId: stored.id },
  });

  return { ...stored, summary, record };
}

export function getEvidencePacketForRiskRecord(
  user: SessionUser,
  record: RiskRecord,
): EvidencePacket {
  assertCanAccessOrganizationRecord(user, record);
  return {
    id: `inline-${record.id}`,
    organizationId: user.organizationId,
    riskRecordId: record.id,
    summary: buildEvidencePacketSummary(record),
    generatedAt: new Date().toISOString(),
    record,
  };
}

/**
 * Mock PDF generator. Produces a small, syntactically valid PDF
 * containing the evidence packet body. Real production should swap
 * this for a typeset renderer (pdfkit, react-pdf, etc.).
 */
export function generateEvidencePdf(packet: EvidencePacket): Buffer {
  const auditLogs = listAuditLogsForRecord(packet.organizationId, packet.riskRecordId);
  const lines = [
    "TrustAccept Evidence Packet",
    "===========================",
    "",
    `Decision ID: ${packet.summary.decisionId}`,
    `Module:      ${packet.summary.module}`,
    `Risk level:  ${packet.summary.riskLevel}`,
    `Source:      ${packet.summary.sourceSystem}`,
    `Owner:       ${packet.summary.owner}`,
    `Expires:     ${packet.summary.expirationDate}`,
    `Outcome:     ${packet.summary.outcome}`,
    "",
    "Frameworks:",
    ...packet.summary.frameworkTags.map((t) => `  - ${t}`),
    "",
    "Executive summary",
    "-----------------",
    packet.summary.executiveSummary,
    "",
    "Compensating controls",
    "---------------------",
    packet.record.compensatingControls,
    "",
    "Business justification",
    "----------------------",
    packet.record.businessJustification,
    "",
    "Technical context",
    "-----------------",
    packet.record.technicalContext,
    "",
    "Evidence summary",
    "----------------",
    packet.record.evidenceSummary,
    "",
    "Audit log",
    "---------",
    ...auditLogs.map(
      (log) =>
        `[${log.createdAt}] ${log.eventType} actor=${log.actorName}` +
        (log.previousStatus || log.newStatus
          ? ` ${log.previousStatus ?? "—"} → ${log.newStatus ?? "—"}`
          : ""),
    ),
    "",
    `Generated at ${packet.generatedAt}`,
    "NIST-aligned · CISA KEV-aware · designed to support audit evidence",
    "TrustAccept is a Lumens Technology product. Approval delivery powered by SequenceNow.",
  ];

  return buildMinimalPdf(lines.join("\n"));
}

/**
 * Builds a minimal valid single-page PDF wrapping the given text.
 * Sufficient to satisfy Content-Type: application/pdf and open in
 * most PDF viewers. Real layout is intentionally out of scope.
 */
function buildMinimalPdf(text: string): Buffer {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const lines = text.split("\n");
  const streamBody = [
    "BT",
    "/F1 10 Tf",
    "36 770 Td",
    "12 TL",
    ...lines.map((line) => `(${escape(line)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj",
  );
  objects.push(
    `4 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj`,
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj",
  );

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body));
    body += obj + "\n";
  }
  const xrefStart = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body, "binary");
}
