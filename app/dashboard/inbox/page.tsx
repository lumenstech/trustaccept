import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { InboxCard } from "@/components/risk/inbox-card";
import { requireDashboardAccess } from "@/src/server/auth";
import { listPendingRiskRecords } from "@/src/server/riskRecords";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  const user = requireDashboardAccess();
  const pending = listPendingRiskRecords(user);

  return (
    <>
      <DashboardHeader
        eyebrow="Approval Inbox"
        title={`${pending.length} pending risk decisions`}
        description="Every pending decision across all seven modules. Accept, reject, or require remediation in line — or open the hosted approval page for full evidence."
      />
      <div className="grid gap-4 px-8 py-8 lg:grid-cols-2">
        {pending.map((record) => (
          <InboxCard key={record.id} record={record} />
        ))}
      </div>
    </>
  );
}
