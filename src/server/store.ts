import {
  DEMO_ORGANIZATION_ID,
  DEMO_USER_ID,
  SEED_RECORDS,
} from "@/lib/seed-data";
import type {
  AuditLog,
  Lead,
  Organization,
  RiskRecord,
  SessionUser,
} from "@/lib/types";

export interface EvidencePacketRecord {
  id: string;
  organizationId: string;
  riskRecordId: string;
  summary: unknown;
  generatedAt: string;
}

export interface Store {
  organizations: Map<string, Organization>;
  users: Map<string, SessionUser>;
  riskRecords: Map<string, RiskRecord>;
  auditLogs: AuditLog[];
  leads: Map<string, Lead>;
  evidencePackets: Map<string, EvidencePacketRecord>;
}

function seedStore(): Store {
  const organizations = new Map<string, Organization>();
  organizations.set(DEMO_ORGANIZATION_ID, {
    id: DEMO_ORGANIZATION_ID,
    name: "Lumens Internal",
    createdAt: "2026-01-01T00:00:00Z",
  });

  const users = new Map<string, SessionUser>();
  users.set(DEMO_USER_ID, {
    id: DEMO_USER_ID,
    name: "Alex Greene",
    email: "alex@trustaccept.dev",
    role: "OWNER",
    organizationId: DEMO_ORGANIZATION_ID,
  });

  const riskRecords = new Map<string, RiskRecord>();
  const auditLogs: AuditLog[] = [];
  for (const record of SEED_RECORDS) {
    riskRecords.set(record.id, structuredClone(record));
    record.auditTimeline.forEach((entry, idx) => {
      auditLogs.push({
        id: `${record.id}-seed-${idx}`,
        organizationId: record.organizationId ?? DEMO_ORGANIZATION_ID,
        riskRecordId: record.id,
        eventType: "risk_record.created",
        actorName: entry.actor,
        metadata: { action: entry.action, detail: entry.detail },
        createdAt: entry.occurredAt,
      });
    });
  }

  return {
    organizations,
    users,
    riskRecords,
    auditLogs,
    leads: new Map(),
    evidencePackets: new Map(),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_STORE__: Store | undefined;
}

export function getStore(): Store {
  if (!globalThis.__TRUSTACCEPT_STORE__) {
    globalThis.__TRUSTACCEPT_STORE__ = seedStore();
  }
  return globalThis.__TRUSTACCEPT_STORE__;
}

/**
 * Test-only: replaces the singleton with a freshly seeded store.
 * Not exported through any user-facing surface.
 */
export function __resetStoreForTests(): Store {
  globalThis.__TRUSTACCEPT_STORE__ = seedStore();
  return globalThis.__TRUSTACCEPT_STORE__;
}
