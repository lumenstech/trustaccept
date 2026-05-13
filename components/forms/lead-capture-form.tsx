"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/form";

export const RISK_AREAS = [
  { value: "ai-agent-action", label: "AI agent action" },
  { value: "identity-access-event", label: "Identity / access event" },
  { value: "vulnerability-exception", label: "Vulnerability exception" },
  { value: "cisa-kev-exposure", label: "CISA KEV exposure" },
  { value: "secure-release", label: "Secure release" },
  { value: "device-access", label: "Device access" },
  { value: "evidence-desk", label: "Evidence Desk" },
  { value: "other", label: "Other" },
] as const;

const URGENCY_OPTIONS = [
  { value: "48-hours", label: "Within 48 hours" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "exploring", label: "Exploring" },
] as const;

interface LeadCaptureFormProps {
  submitLabel?: string;
  successTitle?: string;
  defaultRiskArea?: string;
}

export function LeadCaptureForm({
  submitLabel = "Submit request",
  successTitle = "Request recorded",
  defaultRiskArea,
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
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
            A Lumens Technology / TrustAccept specialist will follow up. Approval
            delivery and identity workflow support powered by SequenceNow.
          </p>
          <div className="rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
            Reference · {`req-${Math.random().toString(36).slice(2, 8)}`}
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
          <Button type="submit" size="lg">
            {submitLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            By submitting, you authorize Lumens Technology to contact you about
            TrustAccept service offers. Approval delivery powered by SequenceNow.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
