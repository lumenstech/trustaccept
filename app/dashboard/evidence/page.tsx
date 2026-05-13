import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { EvidenceExportForm } from "@/components/evidence/evidence-export-form";
import { requireDashboardAccess } from "@/src/server/auth";
import { listAgents } from "@/src/server/agents";

export const dynamic = "force-dynamic";

export default function EvidenceExportPage() {
  const user = requireDashboardAccess();
  const { items } = listAgents(user, { page: 1, page_size: 1000 });
  const agentOptions = items.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <DashboardHeader
        eyebrow="Evidence"
        title="Evidence export"
        description="Tamper-evident bundles of decisions, evidence hashes, and signed receipts for downstream audit and compliance review."
      />
      <div className="px-8 py-8">
        <EvidenceExportForm agents={agentOptions} />
      </div>
    </>
  );
}
