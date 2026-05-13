import type { AuditEventType, AuditLog, RiskStatus, SessionUser } from "@/lib/types";
import { getStore } from "./store";

let counter = 0;
function generateAuditId(): string {
  counter += 1;
  return `audit-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface RecordAuditEventInput {
  eventType: AuditEventType;
  actor: SessionUser | { id?: string; name: string };
  organizationId: string;
  riskRecordId?: string;
  previousStatus?: RiskStatus;
  newStatus?: RiskStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Append a new audit event. The store treats this collection as
 * append-only: nothing in this module is allowed to mutate or delete
 * an existing entry.
 */
export function recordAuditEvent(input: RecordAuditEventInput): AuditLog {
  const entry: AuditLog = {
    id: generateAuditId(),
    organizationId: input.organizationId,
    riskRecordId: input.riskRecordId,
    eventType: input.eventType,
    actorId: "id" in input.actor ? input.actor.id : undefined,
    actorName: input.actor.name,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  getStore().auditLogs.push(entry);
  return entry;
}

export function listAuditLogsForRecord(
  organizationId: string,
  riskRecordId: string,
): AuditLog[] {
  return getStore()
    .auditLogs.filter(
      (log) => log.organizationId === organizationId && log.riskRecordId === riskRecordId,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listAuditLogsForOrganization(organizationId: string): AuditLog[] {
  return getStore()
    .auditLogs.filter((log) => log.organizationId === organizationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
