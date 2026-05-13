import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import {
  createEvidencePacket,
  generateEvidencePdf,
} from "@/src/server/evidencePackets";
import { getRiskRecordForOrganization } from "@/src/server/riskRecords";
import { EvidencePacketExportInput } from "@/src/lib/validation";

async function exportPdf(id: string) {
  const user = requireDashboardAccess();
  const { recordId } = EvidencePacketExportInput.parse({ recordId: id });
  const record = getRiskRecordForOrganization(user, recordId);
  const packet = createEvidencePacket(user, record);
  const pdf = generateEvidencePdf(packet);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trustaccept-evidence-${record.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return await exportPdf(params.id);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    return await exportPdf(params.id);
  } catch (err) {
    return handleApiError(err);
  }
}
