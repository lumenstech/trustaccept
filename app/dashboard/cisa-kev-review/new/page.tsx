import { DashboardHeader } from "@/components/dashboard/dashboard-shell";
import {
  KevIntakeForm,
  type KevIntakePrefill,
} from "@/components/risk/kev-intake-form";
import {
  KEV_ASSET_TYPES,
  KEV_EXPOSURE_STATUSES,
  KEV_PATCH_AVAILABILITIES,
  KEV_SOURCES,
  KEV_STATUSES,
  type KevAssetType,
  type KevExposureStatus,
  type KevPatchAvailability,
  type KevSource,
  type KevStatus,
} from "@/lib/kev";
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

export default function NewKevRecordPage({
  searchParams,
}: {
  searchParams: {
    cve?: string | string[];
    source?: string | string[];
    asset?: string | string[];
    assetType?: string | string[];
    exposureStatus?: string | string[];
    patchAvailability?: string | string[];
    riskLevel?: string | string[];
    kevStatus?: string | string[];
    findingId?: string | string[];
    title?: string | string[];
    emergency?: string | string[];
  };
}) {
  const prefill: KevIntakePrefill = {
    cve: pickString(searchParams.cve),
    source: pick<KevSource>(searchParams.source, KEV_SOURCES.map((s) => s.value)),
    asset: pickString(searchParams.asset),
    assetType: pick<KevAssetType>(
      searchParams.assetType,
      KEV_ASSET_TYPES.map((a) => a.value),
    ),
    exposureStatus: pick<KevExposureStatus>(
      searchParams.exposureStatus,
      KEV_EXPOSURE_STATUSES.map((e) => e.value),
    ),
    patchAvailability: pick<KevPatchAvailability>(
      searchParams.patchAvailability,
      KEV_PATCH_AVAILABILITIES.map((p) => p.value),
    ),
    riskLevel: pick<RiskLevel>(searchParams.riskLevel, RISK_LEVELS),
    kevStatus: pick<KevStatus>(searchParams.kevStatus, KEV_STATUSES.map((s) => s.value)),
    findingId: pickString(searchParams.findingId),
    title: pickString(searchParams.title),
    emergency: pickString(searchParams.emergency) === "1",
  };

  return (
    <>
      <DashboardHeader
        eyebrow="New KEV Exposure Review record"
        title="Capture a known exploited vulnerability exposure decision"
        description="Builds a defensible KEV Exposure Review record with CVE, KEV status, source, affected asset, asset type, exposure status, patch availability, remediation owner, compensating controls, and review timeline. Posts to /api/risk-records and writes an audit log entry."
      />
      <div className="px-8 py-8">
        <KevIntakeForm prefill={prefill} />
      </div>
    </>
  );
}
