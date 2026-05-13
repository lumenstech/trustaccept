import { getStore, type IdempotencyKeyRecord } from "@/src/server/store";

const TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyHit {
  responseStatus: number;
  responseBody: unknown;
}

/**
 * Composite key format: "{orgId}:{endpoint}:{userKey}". Endpoint is
 * included so the same Idempotency-Key from a client maps to different
 * cache entries across different POST routes (see §3.3 of
 * TRUSTACCEPT_PHASE2_PLAN.md). The IdempotencyKey.key column in the
 * Prisma schema stores this same composite value.
 */
export function buildIdempotencyCompositeKey(
  orgId: string,
  endpoint: string,
  userKey: string,
): string {
  return `${orgId}:${endpoint}:${userKey}`;
}

export async function checkIdempotencyKey(
  orgId: string,
  endpoint: string,
  userKey: string,
): Promise<IdempotencyHit | null> {
  const composite = buildIdempotencyCompositeKey(orgId, endpoint, userKey);
  const store = getStore();
  const hit = store.idempotencyKeys.get(composite);
  if (!hit) return null;

  const ageMs = Date.now() - new Date(hit.createdAt).getTime();
  if (ageMs > TTL_MS) {
    store.idempotencyKeys.delete(composite);
    return null;
  }

  return { responseStatus: hit.responseStatus, responseBody: hit.responseBody };
}

export async function storeIdempotencyResponse(
  orgId: string,
  endpoint: string,
  userKey: string,
  status: number,
  body: unknown,
): Promise<void> {
  const composite = buildIdempotencyCompositeKey(orgId, endpoint, userKey);
  const store = getStore();
  const record: IdempotencyKeyRecord = {
    key: composite,
    organizationId: orgId,
    endpoint,
    responseStatus: status,
    responseBody: body,
    createdAt: new Date().toISOString(),
  };
  store.idempotencyKeys.set(composite, record);
}

/**
 * Test-only helper for asserting cache state without leaking the
 * composite key format to callers.
 */
export function peekIdempotencyRecord(
  orgId: string,
  endpoint: string,
  userKey: string,
): IdempotencyKeyRecord | undefined {
  return getStore().idempotencyKeys.get(buildIdempotencyCompositeKey(orgId, endpoint, userKey));
}
