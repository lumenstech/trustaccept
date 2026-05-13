import { notFound, redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { AgentForm } from "@/components/agents/agent-form";
import { requireDashboardAccess } from "@/src/server/auth";
import { AgentNotFoundError, getAgent } from "@/src/server/agents";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default function EditAgentPage({ params }: Props) {
  const user = requireDashboardAccess();
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect(`/dashboard/agents/${params.id}`);
  }
  let agent;
  try {
    agent = getAgent(user, params.id);
  } catch (err) {
    if (err instanceof AgentNotFoundError) notFound();
    throw err;
  }
  if (agent.status === "revoked") {
    // Revoked is terminal; bounce back to detail where the banner explains.
    redirect(`/dashboard/agents/${agent.id}`);
  }
  return (
    <>
      <DashboardHeader
        eyebrow="Agent Registry"
        title={`Edit ${agent.name}`}
        description="Update the agent's metadata, allowed actions, and spend caps. Pause and revoke remain available from the detail page."
      />
      <div className="px-8 py-8">
        <AgentForm mode={{ kind: "edit", agent }} />
      </div>
    </>
  );
}
