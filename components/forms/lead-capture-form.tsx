"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/form";
import { RISK_AREAS, URGENCY_OPTIONS } from "@/lib/leads";
import type { LeadFormType } from "@/lib/types";

export { RISK_AREAS };

interface LeadCaptureFormProps {
  formType: LeadFormType;
  submitLabel?: string;
  successTitle?: string;
  defaultRiskArea?: string;
}

export function LeadCaptureForm({
  formType,
  submitLabel = "Submit request",
  successTitle = "Request recorded",
  defaultRiskArea,
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    riskArea: defaultRiskArea ?? "ai-agent-action",
    urgency: "this-week",
    description: "",
  });

  function update(field: keyof typeof state, value: string) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, ...state }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }
      const body = (await response.json()) as { lead: { id: string } };
      setSubmitted({ id: body.lead.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-success/40 bg-success/5">
        <CardHeader>
          <Badge tone="success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {successTitle}
          </Badge>
          <CardTitle className="mt-3">
            Your request has been recorded.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Your request has been recorded. A Lumens Technology / TrustAccept
            specialist will follow up.
          </p>
          <div className="rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
            Reference · {submitted.id}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about the decision</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldGroup label="Full name" htmlFor="name" required>
              <Input
                id="name"
                required
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Company" htmlFor="company" required>
              <Input
                id="company"
                required
                value={state.company}
                onChange={(e) => update("company", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Work email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                required
                value={state.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Phone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={state.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Risk area" htmlFor="riskArea" required>
              <Select
                id="riskArea"
                value={state.riskArea}
                onChange={(e) => update("riskArea", e.target.value)}
              >
                {RISK_AREAS.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Urgency" htmlFor="urgency" required>
              <Select
                id="urgency"
                value={state.urgency}
                onChange={(e) => update("urgency", e.target.value)}
              >
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup
            label="Describe the decision"
            htmlFor="description"
            hint="What needs to be accepted, rejected, or remediated? What's the deadline?"
            required
          >
            <Textarea
              id="description"
              required
              value={state.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </FieldGroup>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Submitting…" : submitLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <p className="text-xs text-muted-foreground">
            By submitting, you authorize Lumens Technology to contact you about
            TrustAccept service offers. Approval delivery powered by SequenceNow.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
