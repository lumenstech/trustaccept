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
  // Phase 2 / EvidenceDesk receipt fields. All optional so the existing
  // PDF-export callsite (createEvidencePacket -> createReceipt wrapper)
  // continues to compile and round-trip without setting them yet.
  receiptHash?: string;
  signature?: string;
  receiptVersion?: number;
  trigger?: "decision_request_created" | "decision_recorded" | "manual_export";
  exportedAt?: string;
  recordSnapshot?: RiskRecord;
  webhookDeliveryRefs?: string[];
}

// ---------------------------------------------------------------------------
// Phase 2 / Agent Action Receipts API + Slack Approval App
// ---------------------------------------------------------------------------

export interface ApiKeyRecord {
  id: string;
  organizationId: string;
  name: string;
  prefix: string;
  keyHash: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface WebhookEndpointRecord {
  id: string;
  organizationId: string;
  url: string;
  signingSecret: string;
  enabled: boolean;
  description?: string;
  createdAt: string;
}

export type WebhookEventType =
  | "decision.created"
  | "decision.accepted"
  | "decision.rejected"
  | "decision.remediation_required"
  | "receipt.created";

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export interface WebhookDeliveryRecord {
  id: string;
  webhookEndpointId: string;
  // Nullable: receipt.created events reference a receipt, not a record.
  riskRecordId: string | null;
  eventType: WebhookEventType;
  payload: unknown;
  signature: string;
  status: WebhookDeliveryStatus;
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
}

export interface SlackInstallationRecord {
  id: string;
  organizationId: string;
  teamId: string;
  teamName?: string;
  botUserId?: string;
  botAccessToken: string;
  defaultChannelId?: string;
  installedById?: string;
  installedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type SlackApprovalMessageStatus = "sent" | "decided" | "expired";

export interface SlackApprovalMessageRecord {
  id: string;
  organizationId: string;
  riskRecordId: string;
  teamId: string;
  channelId: string;
  messageTs: string;
  status: SlackApprovalMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyKeyRecord {
  // Composite key: "{orgId}:{endpoint}:{userKey}".
  key: string;
  organizationId: string;
  endpoint: string;
  responseStatus: number;
  responseBody: unknown;
  createdAt: string;
}

export interface Store {
  organizations: Map<string, Organization>;
  users: Map<string, SessionUser>;
  riskRecords: Map<string, RiskRecord>;
  auditLogs: AuditLog[];
  leads: Map<string, Lead>;
  evidencePackets: Map<string, EvidencePacketRecord>;
  // Phase 2 collections.
  apiKeys: Map<string, ApiKeyRecord>;
  webhookEndpoints: Map<string, WebhookEndpointRecord>;
  webhookDeliveries: WebhookDeliveryRecord[];
  // Keyed by organizationId — one install per org (matches @unique constraint).
  slackInstallations: Map<string, SlackInstallationRecord>;
  slackApprovalMessages: Map<string, SlackApprovalMessageRecord>;
  idempotencyKeys: Map<string, IdempotencyKeyRecord>;
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
    apiKeys: new Map(),
    webhookEndpoints: new Map(),
    webhookDeliveries: [],
    slackInstallations: new Map(),
    slackApprovalMessages: new Map(),
    idempotencyKeys: new Map(),
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
