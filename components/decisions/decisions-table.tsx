import Link from "next/link";
import { FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  capCheckTone,
  decisionOutcomeLabel,
  decisionOutcomeTone,
  formatCapCheckSummary,
  formatEvidenceHash,
  receiptIndicator,
} from "@/lib/decisions-ui";
import type { Agent, DecisionRecord } from "@/lib/types";

interface Props {
  decisions: DecisionRecord[];
  /** Optional agent lookup. When provided, the agent column renders the
   * agent's name and links to its detail page. When omitted the agent
   * column is hidden — useful inside the agent detail view where every
   * row shares the same agent. */
  agents?: Map<string, Agent>;
  /** Limit displayed rows. Pass undefined to render everything. */
  limit?: number;
}

/**
 * Single source of truth for rendering decision rows. Used by the
 * global decisions page and the agent detail "recent decisions"
 * section, ensuring identical cap_check / receipt / evidence-hash
 * formatting everywhere.
 */
export function DecisionsTable({ decisions, agents, limit }: Props) {
  const showAgentColumn = agents !== undefined;
  const rows = typeof limit === "number" ? decisions.slice(0, limit) : decisions;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-6 py-3">Created</th>
            <th className="px-6 py-3">Decision ID</th>
            {showAgentColumn ? <th className="px-6 py-3">Agent</th> : null}
            <th className="px-6 py-3">Action</th>
            <th className="px-6 py-3">Outcome</th>
            <th className="px-6 py-3">Cap check</th>
            <th className="px-6 py-3">Evidence hash</th>
            <th className="px-6 py-3">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const indicator = receiptIndicator(d);
            const agent = showAgentColumn && d.agentId
              ? agents.get(d.agentId)
              : undefined;
            return (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="px-6 py-3 text-muted-foreground">{d.createdAt}</td>
                <td className="px-6 py-3 font-mono text-xs">
                  {d.id.slice(0, 8)}…
                </td>
                {showAgentColumn ? (
                  <td className="px-6 py-3">
                    {d.agentId ? (
                      <Link
                        href={`/dashboard/agents/${d.agentId}`}
                        className="hover:underline"
                      >
                        {agent?.name ?? d.agentId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ) : null}
                <td className="px-6 py-3">{d.action}</td>
                <td className="px-6 py-3">
                  <Badge tone={decisionOutcomeTone(d.decision)}>
                    {decisionOutcomeLabel(d.decision)}
                  </Badge>
                </td>
                <td className="px-6 py-3">
                  <Badge tone={capCheckTone(d.context.cap_check)}>
                    {formatCapCheckSummary(d.context.cap_check)}
                  </Badge>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                  {formatEvidenceHash(d.evidenceHash)}
                </td>
                <td className="px-6 py-3">
                  {indicator.signed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <FileSignature className="h-3.5 w-3.5" />
                      {indicator.short}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {indicator.label}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
