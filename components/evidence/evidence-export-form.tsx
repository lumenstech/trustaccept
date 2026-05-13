"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select } from "@/components/ui/form";
import { validateExportForm } from "@/lib/evidence-ui";

interface AgentOption {
  id: string;
  name: string;
}

interface Props {
  agents: AgentOption[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function EvidenceExportForm({ agents }: Props) {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [format, setFormat] = useState<"json" | "csv" | "zip">("zip");
  const [agentId, setAgentId] = useState<string>("");

  const validation = useMemo(
    () => validateExportForm({ from, to, format, agent_id: agentId || undefined }),
    [from, to, format, agentId],
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validation.ok || !validation.href) return;
    // The endpoint returns a Content-Disposition: attachment; using a
    // plain anchor click triggers the browser's download flow.
    window.location.href = validation.href;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export evidence</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bundle decisions, evidence hashes, and signed receipts for any
          window up to 90 days. Use ZIP for full bundles with a manifest and
          README for downstream verification.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="From" htmlFor="from" required>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={Boolean(validation.errors.from)}
              />
              {validation.errors.from ? (
                <p className="mt-1 text-xs text-danger">
                  {validation.errors.from}
                </p>
              ) : null}
            </FieldGroup>
            <FieldGroup label="To" htmlFor="to" required>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={Boolean(validation.errors.to)}
              />
              {validation.errors.to ? (
                <p className="mt-1 text-xs text-danger">
                  {validation.errors.to}
                </p>
              ) : null}
            </FieldGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Format" htmlFor="format" required>
              <Select
                id="format"
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as "json" | "csv" | "zip")
                }
              >
                <option value="zip">ZIP bundle (decisions + manifest + README)</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </Select>
            </FieldGroup>
            <FieldGroup
              label="Agent (optional)"
              htmlFor="agent_id"
              hint={
                agents.length === 0
                  ? "No agents registered yet. Exports will include every decision in the window."
                  : "Leave blank to export decisions across all agents in the window."
              }
            >
              <Select
                id="agent_id"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={agents.length === 0}
              >
                <option value="">All agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>
              Export windows are capped at 90 days. For longer audit ranges,
              run multiple exports and combine bundles. Each ZIP includes a
              manifest with sha256 of decisions.json, the signing key id, and
              README instructions for receipt verification.
            </p>
          </div>

          <div>
            <Button type="submit" disabled={!validation.ok}>
              <Download className="h-4 w-4" />
              Export {format.toUpperCase()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
