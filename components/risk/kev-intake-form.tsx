"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/form";
import {
  KEV_ASSET_TYPES,
  KEV_EXPOSURE_STATUSES,
  KEV_PATCH_AVAILABILITIES,
  KEV_SOURCES,
  KEV_STATUSES,
  computeExposureExpiration,
  getKevSourceMeta,
  type KevAssetType,
  type KevExposureStatus,
  type KevPatchAvailability,
  type KevSource,
  type KevStatus,
} from "@/lib/kev";
import type { RiskLevel, RiskRecord } from "@/lib/types";

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

export interface KevIntakePrefill {
  cve?: string;
  source?: KevSource;
  asset?: string;
  assetType?: KevAssetType;
  exposureStatus?: KevExposureStatus;
  patchAvailability?: KevPatchAvailability;
  riskLevel?: RiskLevel;
  kevStatus?: KevStatus;
  findingId?: string;
  title?: string;
  emergency?: boolean;
}

interface State {
  cve: string;
  kevStatus: KevStatus;
  source: KevSource;
  affectedAsset: string;
  assetType: KevAssetType;
  exposureStatus: KevExposureStatus;
  patchAvailability: KevPatchAvailability;
  businessReasonForDelay: string;
  remediationOwner: string;
  ownerOfRecord: string;
  department: string;
  dueDate: string;
  expirationDate: string;
  reviewDate: string;
  exposureWindow: string;
  compensatingControls: string;
  evidenceSummary: string;
  executiveSummaryNote: string;
  riskLevel: RiskLevel;
  emergency: boolean;
  title: string;
  findingId: string;
}

function defaultExpirationForWindow(window: string): string {
  const iso = computeExposureExpiration(new Date(), window);
  return iso ? iso.slice(0, 10) : "";
}

function initialState(prefill: KevIntakePrefill): State {
  return {
    cve: prefill.cve ?? "",
    kevStatus: prefill.kevStatus ?? "known-exploited",
    source: prefill.source ?? "cisa-kev-reference",
    affectedAsset: prefill.asset ?? "",
    assetType: prefill.assetType ?? "internet-facing-server",
    exposureStatus: prefill.exposureStatus ?? "exposed",
    patchAvailability: prefill.patchAvailability ?? "patch-available",
    businessReasonForDelay: "",
    remediationOwner: "",
    ownerOfRecord: "",
    department: "Infrastructure Security",
    dueDate: "",
    expirationDate: "",
    reviewDate: "",
    exposureWindow: "",
    compensatingControls: "",
    evidenceSummary: prefill.findingId
      ? `Originating KEV finding: ${prefill.findingId}.`
      : "",
    executiveSummaryNote: "",
    riskLevel: prefill.riskLevel ?? "critical",
    emergency: prefill.emergency ?? false,
    title: prefill.title ?? "",
    findingId: prefill.findingId ?? "",
  };
}

export function KevIntakeForm({ prefill }: { prefill: KevIntakePrefill }) {
  const [state, setState] = useState<State>(() => initialState(prefill));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ record: RiskRecord } | null>(null);

  const sourceMeta = useMemo(() => getKevSourceMeta(state.source), [state.source]);

  function update<K extends keyof State>(key: K, value: State[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyWindow(window: string) {
    update("exposureWindow", window);
    if (!state.expirationDate) {
      const inferred = defaultExpirationForWindow(window);
      if (inferred) update("expirationDate", inferred);
    }
  }

  function canSubmit(): boolean {
    return (
      state.cve.length > 0 &&
      state.affectedAsset.length > 0 &&
      state.businessReasonForDelay.length > 0 &&
      state.remediationOwner.length > 0 &&
      state.ownerOfRecord.length > 0 &&
      state.compensatingControls.length > 0 &&
      state.evidenceSummary.length > 0
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sourceReferences = [
        { label: state.cve, system: "CISA KEV reference" },
      ];
      if (state.findingId.length > 0) {
        sourceReferences.push({
          label: `Finding ${state.findingId}`,
          system: sourceMeta.label,
        });
      }

      const payload = {
        module: "kev-exposure-review" as const,
        title: state.title.length > 0 ? state.title : `${state.cve} on ${state.affectedAsset}`,
        description:
          state.title.length > 0
            ? state.title
            : `${state.cve} known exploited vulnerability exposure on ${state.affectedAsset}.`,
        sourceSystem: sourceMeta.defaultSourceSystem,
        sourceType: `kev.${state.source.replace(/-/g, "_")}`,
        riskLevel: state.riskLevel,
        owner: state.ownerOfRecord,
        department: state.department,
        dueDate: state.dueDate || undefined,
        expirationDate: state.expirationDate || undefined,
        reviewDate: state.reviewDate || undefined,
        compensatingControls: state.compensatingControls,
        evidenceSummary: state.evidenceSummary,
        businessJustification: state.businessReasonForDelay,
        technicalContext: `KEV status: ${state.kevStatus}. Exposure status: ${state.exposureStatus}. Patch availability: ${state.patchAvailability}.`,
        frameworkTags: ["CISA KEV", "NIST 800-53 SI-2", "NIST 800-53 RA-5"],
        sourceReferences,
        kevContext: {
          cve: state.cve,
          kevStatus: state.kevStatus,
          source: state.source,
          affectedAsset: state.affectedAsset,
          assetType: state.assetType,
          exposureStatus: state.exposureStatus,
          patchAvailability: state.patchAvailability,
          remediationOwner: state.remediationOwner,
          businessReasonForDelay: state.businessReasonForDelay,
          executiveSummaryNote: state.executiveSummaryNote || undefined,
          emergency: state.emergency,
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
            : body?.error ?? "Failed to create KEV Exposure Review record";
        throw new Error(message);
      }
      const body = (await response.json()) as { record: RiskRecord };
      setSubmitted({ record: body.record });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create KEV Exposure Review record");
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
        <CardTitle>KEV Exposure Review intake</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture CVE, KEV status, source, affected asset, exposure status, patch
          availability, remediation owner, compensating controls, and the business
          reason for delay. The record persists immediately and is available in the
          Approval Inbox and KEV Exposure Review command center.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldGroup label="CVE" htmlFor="cve" required>
              <Input
                id="cve"
                placeholder="CVE-YYYY-NNNN"
                value={state.cve}
                onChange={(e) => update("cve", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="KEV status" htmlFor="kevStatus" required>
              <Select
                id="kevStatus"
                value={state.kevStatus}
                onChange={(e) => update("kevStatus", e.target.value as KevStatus)}
              >
                {KEV_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Source" htmlFor="source" required>
              <Select
                id="source"
                value={state.source}
                onChange={(e) => update("source", e.target.value as KevSource)}
              >
                {KEV_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Finding ID" htmlFor="findingId">
              <Input
                id="findingId"
                placeholder="Scanner-side finding id, if any"
                value={state.findingId}
                onChange={(e) => update("findingId", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Affected asset" htmlFor="affectedAsset" required>
              <Input
                id="affectedAsset"
                placeholder="Hostname, service, image, host group…"
                value={state.affectedAsset}
                onChange={(e) => update("affectedAsset", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Asset type" htmlFor="assetType" required>
              <Select
                id="assetType"
                value={state.assetType}
                onChange={(e) => update("assetType", e.target.value as KevAssetType)}
              >
                {KEV_ASSET_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Exposure status" htmlFor="exposureStatus" required>
              <Select
                id="exposureStatus"
                value={state.exposureStatus}
                onChange={(e) => update("exposureStatus", e.target.value as KevExposureStatus)}
              >
                {KEV_EXPOSURE_STATUSES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Patch availability" htmlFor="patchAvailability" required>
              <Select
                id="patchAvailability"
                value={state.patchAvailability}
                onChange={(e) =>
                  update("patchAvailability", e.target.value as KevPatchAvailability)
                }
              >
                {KEV_PATCH_AVAILABILITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Remediation owner" htmlFor="remediationOwner" required>
              <Input
                id="remediationOwner"
                placeholder="Named remediation owner"
                value={state.remediationOwner}
                onChange={(e) => update("remediationOwner", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Owner of record" htmlFor="ownerOfRecord" required>
              <Input
                id="ownerOfRecord"
                placeholder="Named approver of the exposure decision"
                value={state.ownerOfRecord}
                onChange={(e) => update("ownerOfRecord", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Department" htmlFor="department" required>
              <Input
                id="department"
                value={state.department}
                onChange={(e) => update("department", e.target.value)}
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
            <FieldGroup label="Due date" htmlFor="dueDate">
              <Input
                id="dueDate"
                type="date"
                value={state.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup
              label="Exposure acceptance window"
              htmlFor="exposureWindow"
              hint="Auto-fills expiration. Examples: 48 hours, 14 days, 1 month."
            >
              <Input
                id="exposureWindow"
                value={state.exposureWindow}
                onChange={(e) => applyWindow(e.target.value)}
                placeholder="14 days"
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
            <FieldGroup label="Emergency exposure?" htmlFor="emergency">
              <Select
                id="emergency"
                value={state.emergency ? "yes" : "no"}
                onChange={(e) => update("emergency", e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes — emergency exposure</option>
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup label="Business reason for delay" htmlFor="businessReasonForDelay" required>
            <Textarea
              id="businessReasonForDelay"
              value={state.businessReasonForDelay}
              onChange={(e) => update("businessReasonForDelay", e.target.value)}
              placeholder="What business outcome depends on the remediation timing?"
            />
          </FieldGroup>
          <FieldGroup label="Compensating controls" htmlFor="compensatingControls" required>
            <Textarea
              id="compensatingControls"
              value={state.compensatingControls}
              onChange={(e) => update("compensatingControls", e.target.value)}
              placeholder="Firewall rule, IPS signature, segmentation, monitoring, attestation cadence."
            />
          </FieldGroup>
          <FieldGroup label="Evidence summary" htmlFor="evidenceSummary" required>
            <Textarea
              id="evidenceSummary"
              value={state.evidenceSummary}
              onChange={(e) => update("evidenceSummary", e.target.value)}
              placeholder="Scanner export, vendor advisory, policy diff, prior precedent."
            />
          </FieldGroup>
          <FieldGroup label="Executive summary note" htmlFor="executiveSummaryNote">
            <Textarea
              id="executiveSummaryNote"
              value={state.executiveSummaryNote}
              onChange={(e) => update("executiveSummaryNote", e.target.value)}
              placeholder="Short line for the executive risk register."
            />
          </FieldGroup>
          <FieldGroup label="Title (optional override)" htmlFor="title">
            <Input
              id="title"
              value={state.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Defaults to `<CVE> on <asset>` if left blank."
            />
          </FieldGroup>

          <div className="flex items-center justify-between">
            <Link href="/dashboard/cisa-kev-review">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!canSubmit() || submitting}>
              {submitting ? "Creating…" : "Create KEV Exposure Review record"}
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
          <CheckCircle2 className="h-3.5 w-3.5" /> KEV Exposure Review record created
        </Badge>
        <CardTitle className="mt-3">{record.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          The record is persisted to your workspace with an append-only audit entry.
          In production, SequenceNow would deliver the hosted approval link to the
          named remediation owner.
        </p>
        <div className="rounded-md border border-border bg-card/40 p-4 font-mono text-xs">
          Decision ID · <span className="text-foreground">{record.id}</span>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/dashboard/cisa-kev-review">
            <Button>KEV Exposure Review command center</Button>
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
