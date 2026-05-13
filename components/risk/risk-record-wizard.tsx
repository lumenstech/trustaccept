"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, RiskLevelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/form";
import { MODULES } from "@/lib/modules";
import type { ProductModuleKey, RiskLevel, SourceReference } from "@/lib/types";

interface WizardState {
  module: ProductModuleKey | "";
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  owner: string;
  department: string;
  dueDate: string;
  expirationDate: string;
  reviewDate: string;
  businessJustification: string;
  technicalContext: string;
  compensatingControls: string;
  evidenceSummary: string;
  frameworkTags: string;
  sourceReferences: SourceReference[];
}

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

const STEPS = [
  { id: 1, title: "Select product module", short: "Module" },
  { id: 2, title: "Describe the risk decision", short: "Describe" },
  { id: 3, title: "Add source system and risk context", short: "Source" },
  { id: 4, title: "Assign owner and dates", short: "Owner" },
  { id: 5, title: "Add compensating controls and evidence summary", short: "Controls" },
  { id: 6, title: "Review and create record", short: "Review" },
];

function emptyState(prefill: ProductModuleKey | null): WizardState {
  return {
    module: prefill ?? "",
    title: "",
    description: "",
    sourceSystem: "",
    sourceType: "",
    riskLevel: "medium",
    owner: "",
    department: "",
    dueDate: "",
    expirationDate: "",
    reviewDate: "",
    businessJustification: "",
    technicalContext: "",
    compensatingControls: "",
    evidenceSummary: "",
    frameworkTags: "",
    sourceReferences: [],
  };
}

function generateRecordId(): string {
  return `ra-draft-${Math.random().toString(36).slice(2, 7)}`;
}

export function RiskRecordWizard({ prefillModule }: { prefillModule: ProductModuleKey | null }) {
  const [step, setStep] = useState(prefillModule ? 2 : 1);
  const [state, setState] = useState<WizardState>(() => emptyState(prefillModule));
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const selectedModule = useMemo(
    () => MODULES.find((m) => m.key === state.module),
    [state.module],
  );

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function addSourceReference() {
    setState((prev) => ({
      ...prev,
      sourceReferences: [
        ...prev.sourceReferences,
        { label: "", system: "", externalId: "" },
      ],
    }));
  }

  function updateSourceReference(idx: number, patch: Partial<SourceReference>) {
    setState((prev) => ({
      ...prev,
      sourceReferences: prev.sourceReferences.map((ref, i) =>
        i === idx ? { ...ref, ...patch } : ref,
      ),
    }));
  }

  function removeSourceReference(idx: number) {
    setState((prev) => ({
      ...prev,
      sourceReferences: prev.sourceReferences.filter((_, i) => i !== idx),
    }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return Boolean(state.module);
      case 2:
        return state.title.length > 3 && state.description.length > 3;
      case 3:
        return state.sourceSystem.length > 0 && state.sourceType.length > 0;
      case 4:
        return state.owner.length > 0 && state.department.length > 0;
      case 5:
        return (
          state.compensatingControls.length > 0 && state.evidenceSummary.length > 0
        );
      default:
        return true;
    }
  }

  function handleSubmit() {
    setSubmitted({ id: generateRecordId() });
  }

  if (submitted) {
    return <WizardSuccess recordId={submitted.id} state={state} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_3fr]">
      <Stepper currentStep={step} />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Step {step} of {STEPS.length}
            </p>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 ? <StepModule state={state} update={update} /> : null}
            {step === 2 ? <StepDescribe state={state} update={update} /> : null}
            {step === 3 ? <StepSource state={state} update={update} /> : null}
            {step === 4 ? <StepOwner state={state} update={update} /> : null}
            {step === 5 ? (
              <StepControls
                state={state}
                update={update}
                addSourceReference={addSourceReference}
                updateSourceReference={updateSourceReference}
                removeSourceReference={removeSourceReference}
              />
            ) : null}
            {step === 6 ? <StepReview state={state} module={selectedModule?.name} /> : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>Create risk record</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <ol className="space-y-1 text-sm">
          {STEPS.map((step) => {
            const active = step.id === currentStep;
            const done = step.id < currentStep;
            return (
              <li
                key={step.id}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 " +
                  (active ? "bg-primary/10 text-primary" : done ? "text-foreground" : "text-muted-foreground")
                }
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold">
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
                </span>
                <span>{step.short}</span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function StepModule({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MODULES.map((module) => {
        const selected = state.module === module.key;
        return (
          <button
            key={module.key}
            type="button"
            onClick={() => update("module", module.key)}
            className={
              "rounded-md border p-4 text-left transition-colors " +
              (selected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40")
            }
          >
            <p className="text-sm font-semibold">{module.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{module.tagline}</p>
          </button>
        );
      })}
    </div>
  );
}

function StepDescribe({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Decision title" htmlFor="title" required>
        <Input
          id="title"
          placeholder="e.g. AI agent wants to export 1,240 customer records"
          value={state.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Description" htmlFor="description" required>
        <Textarea
          id="description"
          placeholder="What is the decision? What action is being approved or rejected?"
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </FieldGroup>
    </div>
  );
}

function StepSource({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldGroup label="Source system" htmlFor="sourceSystem" required>
          <Input
            id="sourceSystem"
            placeholder="Fortify, Entra ID, GitHub Actions, AgentOps…"
            value={state.sourceSystem}
            onChange={(e) => update("sourceSystem", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Source type" htmlFor="sourceType" required>
          <Input
            id="sourceType"
            placeholder="vuln.finding, identity.priv_request, agent.tool_call…"
            value={state.sourceType}
            onChange={(e) => update("sourceType", e.target.value)}
          />
        </FieldGroup>
      </div>
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
      <FieldGroup
        label="Technical context"
        htmlFor="technicalContext"
        hint="Asset class, scope, exploitability, reachable surface, version info."
      >
        <Textarea
          id="technicalContext"
          value={state.technicalContext}
          onChange={(e) => update("technicalContext", e.target.value)}
        />
      </FieldGroup>
    </div>
  );
}

function StepOwner({
  state,
  update,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldGroup label="Owner" htmlFor="owner" required>
          <Input
            id="owner"
            placeholder="Named approver"
            value={state.owner}
            onChange={(e) => update("owner", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Department" htmlFor="department" required>
          <Input
            id="department"
            placeholder="Platform SRE, Office of the CISO, Billing Engineering…"
            value={state.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </FieldGroup>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <FieldGroup label="Due date" htmlFor="dueDate">
          <Input
            id="dueDate"
            type="date"
            value={state.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
          />
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
      </div>
      <FieldGroup
        label="Business justification"
        htmlFor="businessJustification"
        hint="Why is this decision being raised? What business outcome depends on it?"
      >
        <Textarea
          id="businessJustification"
          value={state.businessJustification}
          onChange={(e) => update("businessJustification", e.target.value)}
        />
      </FieldGroup>
    </div>
  );
}

function StepControls({
  state,
  update,
  addSourceReference,
  updateSourceReference,
  removeSourceReference,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  addSourceReference: () => void;
  updateSourceReference: (idx: number, patch: Partial<SourceReference>) => void;
  removeSourceReference: (idx: number) => void;
}) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Compensating controls" htmlFor="compensatingControls" required>
        <Textarea
          id="compensatingControls"
          placeholder="WAF rule, vaulted bucket, runtime detection, session recording, expiration window…"
          value={state.compensatingControls}
          onChange={(e) => update("compensatingControls", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Evidence summary" htmlFor="evidenceSummary" required>
        <Textarea
          id="evidenceSummary"
          placeholder="Scanner finding, conditional access policy snapshot, incident reference, prior approvals…"
          value={state.evidenceSummary}
          onChange={(e) => update("evidenceSummary", e.target.value)}
        />
      </FieldGroup>
      <FieldGroup
        label="Framework tags"
        htmlFor="frameworkTags"
        hint="Comma-separated. NIST-aligned and CISA KEV-aware references are encouraged. e.g. NIST 800-53 AC-2, NIST SSDF PW.8, CISA KEV."
      >
        <Input
          id="frameworkTags"
          value={state.frameworkTags}
          onChange={(e) => update("frameworkTags", e.target.value)}
        />
      </FieldGroup>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Source references</p>
          <Button type="button" variant="outline" size="sm" onClick={addSourceReference}>
            Add reference
          </Button>
        </div>
        {state.sourceReferences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Optional. Add links to scanner findings, identity requests, or pipeline runs.
          </p>
        ) : (
          <div className="space-y-3">
            {state.sourceReferences.map((ref, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Input
                  placeholder="Label"
                  value={ref.label}
                  onChange={(e) => updateSourceReference(idx, { label: e.target.value })}
                />
                <Input
                  placeholder="System"
                  value={ref.system}
                  onChange={(e) => updateSourceReference(idx, { system: e.target.value })}
                />
                <Input
                  placeholder="External ID"
                  value={ref.externalId ?? ""}
                  onChange={(e) =>
                    updateSourceReference(idx, { externalId: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSourceReference(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepReview({ state, module }: { state: WizardState; module: string | undefined }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Module", module ?? "—"],
    ["Title", state.title || "—"],
    ["Description", state.description || "—"],
    ["Source system", state.sourceSystem || "—"],
    ["Source type", state.sourceType || "—"],
    ["Risk level", <RiskLevelBadge key="risk" level={state.riskLevel} />],
    ["Owner", state.owner || "—"],
    ["Department", state.department || "—"],
    ["Due date", state.dueDate || "—"],
    ["Expiration date", state.expirationDate || "—"],
    ["Review date", state.reviewDate || "—"],
    ["Business justification", state.businessJustification || "—"],
    ["Technical context", state.technicalContext || "—"],
    ["Compensating controls", state.compensatingControls || "—"],
    ["Evidence summary", state.evidenceSummary || "—"],
    ["Framework tags", state.frameworkTags || "—"],
    ["Source references", String(state.sourceReferences.length)],
  ];
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Review the record below. Submitting will save it locally and surface a hosted
        approval link. Persistence to Postgres is wired through Prisma; this build keeps
        everything in mock state.
      </p>
      <dl className="mt-4 divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[200px_1fr] gap-4 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function WizardSuccess({ recordId, state }: { recordId: string; state: WizardState }) {
  return (
    <Card>
      <CardHeader>
        <Badge tone="success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Record created
        </Badge>
        <CardTitle className="mt-3">Risk record drafted</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          {state.title || "Untitled risk decision"} is saved in this session. In
          production, the record would be persisted to Postgres and SequenceNow would
          deliver the approval link to the named approver.
        </p>
        <div className="rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
          Decision ID · <span className="text-foreground">{recordId}</span>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/dashboard/inbox">
            <Button>Open Approval Inbox</Button>
          </Link>
          <Link href="/dashboard/risk-records">
            <Button variant="outline">Back to Risk Records</Button>
          </Link>
          <Link href="/book-risk-review">
            <Button variant="subtle">Book a 48-Hour Review</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
