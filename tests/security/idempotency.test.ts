import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetStoreForTests } from "@/src/server/store";
import {
  buildIdempotencyCompositeKey,
  checkIdempotencyKey,
  peekIdempotencyRecord,
  storeIdempotencyResponse,
} from "@/src/lib/security/idempotency";

const ORG_A = "org_a";
const ORG_B = "org_b";
const POST_DECISION = "POST /api/v1/decision-requests";
const POST_DECISION_DECISION = "POST /api/v1/decision-requests/:id/decision";

beforeEach(() => {
  __resetStoreForTests();
  vi.useRealTimers();
});

describe("buildIdempotencyCompositeKey", () => {
  it("matches the documented {orgId}:{endpoint}:{userKey} format", () => {
    expect(buildIdempotencyCompositeKey("o1", "POST /x", "abc")).toBe("o1:POST /x:abc");
  });
});

describe("checkIdempotencyKey + storeIdempotencyResponse", () => {
  it("returns null on a fresh cache", async () => {
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION, "abc")).toBeNull();
  });

  it("returns the cached response after store", async () => {
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "abc", 200, { id: "ra-1" });
    const hit = await checkIdempotencyKey(ORG_A, POST_DECISION, "abc");
    expect(hit).toEqual({ responseStatus: 200, responseBody: { id: "ra-1" } });
  });

  it("scopes by organization — same userKey, different orgs do not collide", async () => {
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "shared-key", 200, { who: "org_a" });
    await storeIdempotencyResponse(ORG_B, POST_DECISION, "shared-key", 200, { who: "org_b" });
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION, "shared-key")).toEqual({
      responseStatus: 200,
      responseBody: { who: "org_a" },
    });
    expect(await checkIdempotencyKey(ORG_B, POST_DECISION, "shared-key")).toEqual({
      responseStatus: 200,
      responseBody: { who: "org_b" },
    });
  });

  it("scopes by endpoint — same userKey, different routes do not collide", async () => {
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "k", 201, { from: "create" });
    await storeIdempotencyResponse(ORG_A, POST_DECISION_DECISION, "k", 200, { from: "decide" });
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION, "k")).toEqual({
      responseStatus: 201,
      responseBody: { from: "create" },
    });
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION_DECISION, "k")).toEqual({
      responseStatus: 200,
      responseBody: { from: "decide" },
    });
  });

  it("honours the 24h TTL on read and evicts the expired record", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T00:00:00Z"));
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "ttl", 200, { fresh: true });

    // 23h59m — still fresh.
    vi.setSystemTime(new Date("2026-05-13T23:59:00Z"));
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION, "ttl")).not.toBeNull();

    // 24h01m — expired and evicted on read.
    vi.setSystemTime(new Date("2026-05-14T00:01:00Z"));
    expect(await checkIdempotencyKey(ORG_A, POST_DECISION, "ttl")).toBeNull();
    expect(peekIdempotencyRecord(ORG_A, POST_DECISION, "ttl")).toBeUndefined();
  });

  it("write replaces an existing entry under the same composite key", async () => {
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "k", 200, { v: 1 });
    await storeIdempotencyResponse(ORG_A, POST_DECISION, "k", 200, { v: 2 });
    expect((await checkIdempotencyKey(ORG_A, POST_DECISION, "k"))?.responseBody).toEqual({ v: 2 });
  });
});
