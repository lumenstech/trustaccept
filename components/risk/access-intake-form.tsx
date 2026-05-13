"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/form";
import {
  ACCESS_REQUEST_TYPES,
  IDENTITY_PROVIDERS,
  computeTemporaryAccessExpiration,
  getAccessRequestMeta,
  getIdentityProviderMeta,
  type AccessRequestType,
  type IdentityProvider,
} from "@/lib/access";
import type { RiskLevel, RiskRecord } from "@/lib/types";

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

export interface AccessIntakePrefill {
  requestType?: AccessRequestType;
  identityProvider?: IdentityProvider;
  user?: string;
  riskLevel?: RiskLevel;
  targetSystem?: string;
  eventId?: string;
}

interface AccessIntakeFormProps {
  prefill: AccessIntakePrefill;
}

interface State {
  requestType: AccessRequestType;
  requester: string;
  identityProvider: IdentityProvider;
  userOrServiceAccount: string;
  targetSystem: string;
  privilegeLevel: string;
  businessJustification: string;
  requestedDuration: string;
  expirationDate: string;
  reviewDate: string;
  compensatingControls: string;
  approvalOwner: string;
  evidenceSummary: string;
  riskLevel: RiskLevel;
  department: string;
  eventReferenceId: string;
}

function defaultExpirationDateForDuration(duration: string): string {
  const iso = computeTemporaryAccessExpiration(new Date(), duration);
  return iso ? iso.slice(0, 10) : "";
}

function initialState(prefill: AccessIntakePrefill): State {
  return {
    requestType: prefill.requestType ?? "break-glass-access",
    requester: prefill.user ?? "",
    identityProvider: prefill.identityProvider ?? "microsoft-entra",
    userOrServiceAccount: prefill.user ?? "",
    targetSystem: prefill.targetSystem ?? "",
    privilegeLevel: "",
    businessJustification: "",
    requestedDuration: "",
    expirationDate: "",
    reviewDate: "",
    compensatingControls: "",
    approvalOwner: "",
    evidenceSummary: prefill.eventId
      ? `Originating identity event: ${prefill.eventId}.`
      : "",
    riskLevel: prefill.riskLevel ?? "high",
    department: "Identity & Access Operations",
    eventReferenceId: prefill.eventId ?? "",
  };
}

export function AccessIntakeForm({ prefill }: AccessIntakeFormProps) {
  const [state, setState] = useState<State>(() => initialState(prefill));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ record: RiskRecord } | null>(null);

  const requestMeta = useMemo(() => getAccessRequestMeta(state.requestType), [state.requestType]);
  const providerMeta = useMemo(
    () => getIdentityProviderMeta(state.identityProvider),
    [state.identityProvider],
  );

  function update<K extends keyof State>(key: K, value: State[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyDuration(duration: string) {
    update("requestedDuration", duration);
    if (!state.expirationDate) {
      const inferred = defaultExpirationDateForDuration(duration);
      if (inferred) update("expirationDate", inferred);
    }
  }

  function canSubmit(): boolean {
    return (
      state.requester.length > 0 &&
      state.userOrServiceAccount.length > 0 &&
      state.targetSystem.length > 0 &&
      state.privilegeLevel.length > 0 &&
      state.businessJustification.length > 0 &&
      state.compensatingControls.length > 0 &&
      state.approvalOwner.length > 0 &&
      state.evidenceSummary.length > 0
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sourceReferences = state.eventReferenceId
        ? [
            {
              label: `Identity event ${state.eventReferenceId}`,
              system: providerMeta.label,
              externalId: state.eventReferenceId,
            },
          ]
        : [];

      const payload = {
        module: "access-accept" as const,
        title: `${requestMeta.label} — ${state.requester}`,
        description: `${requestMeta.label} requested by ${state.requester} on ${state.targetSystem}.`,
        sourceSystem: providerMeta.sourceSystem,
        sourceType: `identity.${state.requestType.replace(/-/g, "_")}`,
        riskLevel: state.riskLevel,
        owner: state.approvalOwner,
        department: state.department,
        expirationDate: state.expirationDate || undefined,
        reviewDate: state.reviewDate || undefined,
        compensatingControls: state.compensatingControls,
        evidenceSummary: state.evidenceSummary,
        businessJustification: state.businessJustification,
        technicalContext: `Identity provider: ${providerMeta.label}. Privilege level: ${state.privilegeLevel}. Requested duration: ${state.requestedDuration || "not specified"}.`,
        frameworkTags: ["NIST 800-53 AC-2", "NIST 800-53 AC-5", "NIST 800-53 IA-2"],
        sourceReferences,
        accessContext: {
          requestType: state.requestType,
          requester: state.requester,
          identityProvider: state.identityProvider,
          userOrServiceAccount: state.userOrServiceAccount,
          targetSystem: state.targetSystem,
          privilegeLevel: state.privilegeLevel,
          requestedDuration: state.requestedDuration || undefined,
          approvalOwner: state.approvalOwner,
        },
      };

      const response = await fetch("/api/risk-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          body?.issues?.[0]
            ? `${body.issues[0].path}: ${body.issues[0].message}`
            : body?.error ?? "Failed to create Access Accept record";
        throw new Error(message);
      }
      const body = (await response.json()) as { record: RiskRecord };
      setSubmitted({ record: body.record });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Access Accept record");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <SuccessState record={submitted.record} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Accept intake</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture requester, target, privilege, duration, and compensating controls.
          The record persists immediately and is available in the Approval Inbox and
          Access Accept command center.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldGroup label="Request type" htmlFor="requestType" required>
              <Select
                id="requestType"
                value={state.requestType}
                onChange={(e) => update("requestType", e.target.value as AccessRequestType)}
              >
                {ACCESS_REQUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Identity provider" htmlFor="identityProvider" required>
              <Select
                id="identityProvider"
                value={state.identityProvider}
                onChange={(e) =>
                  update("identityProvider", e.target.value as IdentityProvider)
                }
              >
                {IDENTITY_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Requester" htmlFor="requester" required>
              <Input
                id="requester"
                placeholder="user or service identity"
                value={state.requester}
                onChange={(e) => update("requester", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup
              label="User or service account"
              htmlFor="userOrServiceAccount"
              required
            >
              <Input
                id="userOrServiceAccount"
                placeholder="UPN, email, or service-account id"
                value={state.userOrServiceAccount}
                onChange={(e) => update("userOrServiceAccount", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Target system" htmlFor="targetSystem" required>
              <Input
                id="targetSystem"
                placeholder="prod tenant, billing API, GitHub org…"
                value={state.targetSystem}
                onChange={(e) => update("targetSystem", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Privilege level" htmlFor="privilegeLevel" required>
              <Input
                id="privilegeLevel"
                placeholder="GlobalAdmin, OrgOwner, Group admin, API client…"
                value={state.privilegeLevel}
                onChange={(e) => update("privilegeLevel", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Requested duration" htmlFor="requestedDuration">
              <Input
                id="requestedDuration"
                placeholder="4 hours · 30 days · 6 months"
                value={state.requestedDuration}
                onChange={(e) => applyDuration(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Risk level" htmlFor="riskLevel" required>
              <Select
                id="riskLevel"
                value={state.riskLevel}
                onChange={(e) => update("riskLevel", e.target.value as RiskLevel)}
              >
                {RISK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Expiration date" htmlFor="expirationDate">
              <Input
                id="expirationDate"
                type="date"
                value={state.expirationDate}
                onChange={(e) => update("expirationDate", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Review date" htmlFor="reviewDate">
              <Input
                id="reviewDate"
                type="date"
                value={state.reviewDate}
                onChange={(e) => update("reviewDate", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Approval owner" htmlFor="approvalOwner" required>
              <Input
                id="approvalOwner"
                placeholder="Named approver"
                value={state.approvalOwner}
                onChange={(e) => update("approvalOwner", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Department" htmlFor="department" required>
              <Input
                id="department"
                value={state.department}
                onChange={(e) => update("department", e.target.value)}
              />
            </FieldGroup>
          </div>
          <FieldGroup
            label="Business justification"
            htmlFor="businessJustification"
            required
          >
            <Textarea
              id="businessJustification"
              value={state.businessJustification}
              onChange={(e) => update("businessJustification", e.target.value)}
              placeholder="What business outcome depends on this decision?"
            />
          </FieldGroup>
          <FieldGroup
            label="Compensating controls"
            htmlFor="compensatingControls"
            required
          >
            <Textarea
              id="compensatingControls"
              value={state.compensatingControls}
              onChange={(e) => update("compensatingControls", e.target.value)}
              placeholder="Session recording, scope limit, auto-revoke, manager attestation, etc."
            />
          </FieldGroup>
          <FieldGroup label="Evidence summary" htmlFor="evidenceSummary" required>
            <Textarea
              id="evidenceSummary"
              value={state.evidenceSummary}
              onChange={(e) => update("evidenceSummary", e.target.value)}
              placeholder="Source event, ticket reference, prior approval record, attestations on file."
            />
          </FieldGroup>
          <div className="flex items-center justify-between">
            <Link href="/dashboard/access-accept">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!canSubmit() || submitting}>
              {submitting ? "Creating…" : "Create Access Accept record"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function SuccessState({ record }: { record: RiskRecord }) {
  return (
    <Card className="border-success/40 bg-success/5">
      <CardHeader>
        <Badge tone="success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Access Accept record created
        </Badge>
        <CardTitle className="mt-3">{record.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          The record is persisted to your workspace with an append-only audit entry.
          In production, SequenceNow would deliver the hosted approval link to the
          named approver.
        </p>
        <div className="rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
          Decision ID · <span className="text-foreground">{record.id}</span>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/dashboard/access-accept">
            <Button>Access Accept command center</Button>
          </Link>
          <Link href={`/approve/${record.id}`}>
            <Button variant="outline">Hosted approval page</Button>
          </Link>
          <Link href={`/dashboard/risk-records/${record.id}/evidence`}>
            <Button variant="outline">Evidence packet</Button>
          </Link>
          <Link href="/book-risk-review">
            <Button variant="subtle">Book a 48-Hour Review</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
