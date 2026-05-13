import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { RiskRecordWizard } from "@/components/risk/risk-record-wizard";
import { parseModuleQuery } from "@/lib/module-query";

export default function NewRiskRecordPage({
  searchParams,
}: {
  searchParams: { module?: string | string[] };
}) {
  const prefill = parseModuleQuery(searchParams?.module);

  return (
    <>
      <DashboardHeader
        eyebrow="New Risk Record"
        title="Create a defensible risk decision"
        description="Six steps. Module, description, source context, owner, controls and evidence, then review. Every record produced has the same shape across all seven modules."
      />
      <div className="px-8 py-8">
        <RiskRecordWizard prefillModule={prefill} />
      </div>
    </>
  );
}
