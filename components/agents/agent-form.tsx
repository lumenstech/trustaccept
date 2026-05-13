"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, HelpText, Input, Select, Textarea } from "@/components/ui/form";
import { FormError } from "@/components/ui/form-error";
import {
  agentToFormInput,
  buildPatchBody,
  validateAgentForm,
  type AgentCreateBody,
  type AgentFormInput,
} from "@/lib/agents-ui";
import type { Agent } from "@/lib/types";

const EMPTY: AgentFormInput = {
  name: "",
  owner_email: "",
  department: "",
  environment: "dev",
  risk_tier: "low",
  allowed_actions_text: "",
  spend_caps: {
    per_txn_usd: "",
    daily_usd: "",
    weekly_usd: "",
    monthly_usd: "",
  },
};

type Mode =
  | { kind: "create" }
  | { kind: "edit"; agent: Agent };

interface Props {
  mode: Mode;
}

export function AgentForm({ mode }: Props) {
  const router = useRouter();
  const isEdit = mode.kind === "edit";
  const initialBody: AgentCreateBody | null = isEdit
    ? toBody(agentToFormInput(mode.agent))
    : null;
  const [state, setState] = useState<AgentFormInput>(
    isEdit ? agentToFormInput(mode.agent) : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setCap(key: keyof AgentFormInput["spend_caps"], value: string) {
    setState((s) => ({
      ...s,
      spend_caps: { ...s.spend_caps, [key]: value },
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const result = validateAgentForm(state);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (mode.kind === "create") {
        const res = await fetch("/api/v1/agents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(result.body),
        });
        if (!res.ok) {
          throw new Error(await formatErr(res, "Could not create agent"));
        }
        const json = await res.json();
        router.push(`/dashboard/agents/${json.id}`);
        router.refresh();
      } else {
        const patch = buildPatchBody(initialBody!, result.body!);
        if (Object.keys(patch).length === 0) {
          router.push(`/dashboard/agents/${mode.agent.id}`);
          return;
        }
        const res = await fetch(`/api/v1/agents/${mode.agent.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          throw new Error(await formatErr(res, "Could not update agent"));
        }
        router.push(`/dashboard/agents/${mode.agent.id}`);
        router.refresh();
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not save agent",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isEdit
    ? submitting
      ? "Saving…"
      : "Save changes"
    : submitting
      ? "Creating…"
      : "Create agent";

  const cancelHref = isEdit
    ? `/dashboard/agents/${mode.agent.id}`
    : "/dashboard/agents";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <BotMessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>
            {isEdit ? `Edit agent · ${mode.agent.name}` : "Register a new agent"}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Update environment, risk tier, allowed actions, and spend caps. Status changes (pause / revoke) are handled separately."
            : "Agents are scoped to your tenant. Once revoked, an agent cannot be reactivated — create a new one instead."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldGroup label="Name" htmlFor="name" required>
              <Input
                id="name"
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                placeholder="support-copilot"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-danger">{errors.name}</p>
              ) : null}
            </FieldGroup>
            <FieldGroup label="Owner email" htmlFor="owner_email" required>
              <Input
                id="owner_email"
                type="email"
                value={state.owner_email}
                onChange={(e) =>
                  setState((s) => ({ ...s, owner_email: e.target.value }))
                }
                placeholder="ops@yourco.com"
                aria-invalid={Boolean(errors.owner_email)}
              />
              {errors.owner_email ? (
                <p className="mt-1 text-xs text-danger">{errors.owner_email}</p>
              ) : null}
            </FieldGroup>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <FieldGroup label="Department" htmlFor="department">
              <Input
                id="department"
                value={state.department ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, department: e.target.value }))
                }
                placeholder="Customer Ops"
              />
            </FieldGroup>
            <FieldGroup label="Environment" htmlFor="environment" required>
              <Select
                id="environment"
                value={state.environment}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    environment: e.target.value as AgentFormInput["environment"],
                  }))
                }
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Risk tier" htmlFor="risk_tier" required>
              <Select
                id="risk_tier"
                value={state.risk_tier}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    risk_tier: e.target.value as AgentFormInput["risk_tier"],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup
            label="Allowed actions"
            htmlFor="allowed_actions"
            hint="One per line or comma-separated. Examples: read.customer, draft.email, send.email"
          >
            <Textarea
              id="allowed_actions"
              rows={3}
              value={state.allowed_actions_text}
              onChange={(e) =>
                setState((s) => ({ ...s, allowed_actions_text: e.target.value }))
              }
              placeholder="read.customer&#10;draft.email"
            />
          </FieldGroup>

          <fieldset className="grid gap-4">
            <legend className="text-sm font-medium">Spend caps (USD)</legend>
            <HelpText>
              Leave any cap blank to disable it. Caps are observed at decision
              time and surfaced as cap_check; enforcement comes in a later
              milestone.
            </HelpText>
            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  ["per_txn_usd", "Per transaction"],
                  ["daily_usd", "Daily"],
                  ["weekly_usd", "Weekly"],
                  ["monthly_usd", "Monthly"],
                ] as const
              ).map(([key, label]) => (
                <FieldGroup key={key} label={label} htmlFor={`cap-${key}`}>
                  <Input
                    id={`cap-${key}`}
                    inputMode="decimal"
                    value={state.spend_caps[key] ?? ""}
                    onChange={(e) => setCap(key, e.target.value)}
                    aria-invalid={Boolean(errors[`spend_caps.${key}`])}
                  />
                  {errors[`spend_caps.${key}`] ? (
                    <p className="mt-1 text-xs text-danger">
                      {errors[`spend_caps.${key}`]}
                    </p>
                  ) : null}
                </FieldGroup>
              ))}
            </div>
          </fieldset>

          <FormError message={serverError} />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => router.push(cancelHref)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function toBody(input: AgentFormInput): AgentCreateBody {
  const result = validateAgentForm(input);
  // Seeded from a live agent — values are always valid.
  return result.body!;
}

async function formatErr(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (body?.issues?.[0]) {
    return `${body.issues[0].path}: ${body.issues[0].message}`;
  }
  return body?.error ?? fallback;
}
