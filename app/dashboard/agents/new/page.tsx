import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { AgentForm } from "@/components/agents/agent-form";
import { requireDashboardAccess } from "@/src/server/auth";

export const dynamic = "force-dynamic";

export default function NewAgentPage() {
  const user = requireDashboardAccess();
  // Admin-only write; non-admins land back on the list.
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/dashboard/agents");
  }
  return (
    <>
      <DashboardHeader
        eyebrow="Agent Registry"
        title="Register a new agent"
        description="Configure environment, risk tier, allowed actions, and spend caps. All fields can be edited later except for revocation, which is terminal."
      />
      <div className="px-8 py-8">
        <AgentForm mode={{ kind: "create" }} />
      </div>
    </>
  );
}
