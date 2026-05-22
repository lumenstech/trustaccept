import { handleApiError } from "@/src/server/api";
import { requireDashboardAccessAsync } from "@/src/server/auth";
import {
  createEvidencePacketAsync,
  generateEvidencePdfAsync,
} from "@/src/server/evidencePackets";
import { getRiskRecordForOrganizationAsync } from "@/src/server/riskRecords";
import { EvidencePacketExportInput } from "@/src/lib/validation";

async function exportPdf(id: string) {
  const user = await requireDashboardAccessAsync();
  const { recordId } = EvidencePacketExportInput.parse({ recordId: id });
  const record = await getRiskRecordForOrganizationAsync(user, recordId);
  const packet = await createEvidencePacketAsync(user, record);
  const pdf = await generateEvidencePdfAsync(packet);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trustaccept-evidence-${record.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await exportPdf(id);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await exportPdf(id);
  } catch (err) {
    return handleApiError(err);
  }
}
