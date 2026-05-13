import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import { AccessIntakeForm, type AccessIntakePrefill } from "@/components/risk/access-intake-form";
import {
  ACCESS_REQUEST_TYPES,
  IDENTITY_PROVIDERS,
  type AccessRequestType,
  type IdentityProvider,
} from "@/lib/access";
import type { RiskLevel } from "@/lib/types";

function pick<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined {
  if (raw == null) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function pickString(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value.length > 0 ? value : undefined;
}

const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high", "critical"];

export default function NewAccessAcceptPage({
  searchParams,
}: {
  searchParams: {
    requestType?: string | string[];
    source?: string | string[];
    user?: string | string[];
    riskLevel?: string | string[];
    targetSystem?: string | string[];
    eventId?: string | string[];
  };
}) {
  const prefill: AccessIntakePrefill = {
    requestType: pick<AccessRequestType>(
      searchParams.requestType,
      ACCESS_REQUEST_TYPES.map((t) => t.value),
    ),
    identityProvider: pick<IdentityProvider>(
      searchParams.source,
      IDENTITY_PROVIDERS.map((p) => p.value),
    ),
    user: pickString(searchParams.user),
    riskLevel: pick<RiskLevel>(searchParams.riskLevel, RISK_LEVELS),
    targetSystem: pickString(searchParams.targetSystem),
    eventId: pickString(searchParams.eventId),
  };

  return (
    <>
      <DashboardHeader
        eyebrow="New Access Accept record"
        title="Capture an identity or access decision"
        description="Builds a defensible Access Accept record with requester, target, privilege, duration, and compensating controls. Posts to /api/risk-records and writes an audit log entry."
      />
      <div className="px-8 py-8">
        <AccessIntakeForm prefill={prefill} />
      </div>
    </>
  );
}
