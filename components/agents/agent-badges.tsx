import { Badge } from "@/components/ui/badge";
import {
  agentRiskTierTone,
  agentStatusTone,
} from "@/lib/agents-ui";
import type { Agent } from "@/lib/types";

export function AgentStatusBadge({ status }: { status: Agent["status"] }) {
  return <Badge tone={agentStatusTone(status)}>{status}</Badge>;
}

export function AgentRiskTierBadge({ tier }: { tier: Agent["riskTier"] }) {
  return <Badge tone={agentRiskTierTone(tier)}>{tier.toUpperCase()}</Badge>;
}

const ENV_TONE: Record<Agent["environment"], "neutral" | "info" | "amber"> = {
  dev: "neutral",
  staging: "info",
  prod: "amber",
};

export function AgentEnvironmentBadge({
  environment,
}: {
  environment: Agent["environment"];
}) {
  return (
    <Badge tone={ENV_TONE[environment]}>{environment.toUpperCase()}</Badge>
  );
}

interface AllowedActionsListProps {
  actions: string[];
  emptyHint?: string;
}

/**
 * Renders the agent's allowed-action grants as a wrap of tiny info
 * badges. Falls back to a quiet hint paragraph when the list is
 * empty so the card still has a usable empty state.
 */
export function AllowedActionsList({
  actions,
  emptyHint,
}: AllowedActionsListProps) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyHint ??
          "No actions have been allowed. Decisions referencing this agent will still be recorded, but the agent cannot be granted scoped permissions without listed actions."}
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <li key={action}>
          <Badge tone="info">{action}</Badge>
        </li>
      ))}
    </ul>
  );
}
