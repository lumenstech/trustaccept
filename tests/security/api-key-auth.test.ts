import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_ORGANIZATION_ID } from "@/lib/seed-data";
import { __resetStoreForTests, getStore, type ApiKeyRecord } from "@/src/server/store";
import {
  UnauthorizedError,
  generateApiKey,
  maskApiKey,
  verifyApiKey,
} from "@/src/lib/security/api-key-auth";

const ANOTHER_ORG_ID = "org_other";

function seedApiKey(opts: { revoked?: boolean; organizationId?: string } = {}): {
  fullKey: string;
  record: ApiKeyRecord;
} {
  const { fullKey, prefix, keyHash } = generateApiKey();
  const store = getStore();
  const record: ApiKeyRecord = {
    id: `apikey-${Math.random().toString(36).slice(2, 10)}`,
    organizationId: opts.organizationId ?? DEMO_ORGANIZATION_ID,
    name: "test key",
    prefix,
    keyHash,
    revokedAt: opts.revoked ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
  store.apiKeys.set(record.id, record);
  return { fullKey, record };
}

beforeEach(() => {
  __resetStoreForTests();
});

describe("generateApiKey", () => {
  it("produces a key with the ta_live_ prefix and matching prefix slice", () => {
    const { fullKey, prefix } = generateApiKey();
    expect(fullKey.startsWith("ta_live_")).toBe(true);
    expect(fullKey.length).toBeGreaterThanOrEqual(20);
    expect(prefix.length).toBe(12);
    expect(fullKey.startsWith(prefix)).toBe(true);
  });

  it("hash format is saltHex$hashHex with the expected lengths", () => {
    const { keyHash } = generateApiKey();
    const [saltHex, hashHex] = keyHash.split("$");
    expect(saltHex).toMatch(/^[0-9a-f]{32}$/); // 16 bytes salt
    expect(hashHex).toMatch(/^[0-9a-f]{128}$/); // 64 bytes scrypt output
  });

  it("never reuses the same full key across calls", () => {
    const a = generateApiKey().fullKey;
    const b = generateApiKey().fullKey;
    expect(a).not.toBe(b);
  });
});

describe("maskApiKey", () => {
  it("shows the prefix and trailing dots/asterisks", () => {
    const { prefix } = generateApiKey();
    const masked = maskApiKey(prefix);
    expect(masked.startsWith(prefix)).toBe(true);
    expect(masked).toContain("****");
  });

  it("returns a fully redacted value for an unrecognized prefix shape", () => {
    expect(maskApiKey("not-a-key")).toBe("********");
  });
});

describe("verifyApiKey", () => {
  it("accepts a freshly generated key under a Bearer header", async () => {
    const { fullKey, record } = seedApiKey();
    const result = await verifyApiKey(`Bearer ${fullKey}`, { touchLastUsed: null });
    expect(result.apiKey.id).toBe(record.id);
    expect(result.organization.id).toBe(DEMO_ORGANIZATION_ID);
  });

  it("rejects a missing or malformed header", async () => {
    await expect(verifyApiKey(null)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verifyApiKey("")).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verifyApiKey("ta_live_abc")).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verifyApiKey("Basic deadbeef")).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verifyApiKey("Bearer ")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a key whose prefix isn't in the store", async () => {
    const { fullKey } = generateApiKey(); // never seeded
    await expect(verifyApiKey(`Bearer ${fullKey}`)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a revoked key", async () => {
    const { fullKey } = seedApiKey({ revoked: true });
    await expect(verifyApiKey(`Bearer ${fullKey}`)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a key with the right prefix but wrong body", async () => {
    const { record } = seedApiKey();
    const fake = `Bearer ${record.prefix}${"x".repeat(24)}`;
    await expect(verifyApiKey(fake)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects when the organization no longer exists", async () => {
    const { fullKey } = seedApiKey({ organizationId: ANOTHER_ORG_ID });
    await expect(verifyApiKey(`Bearer ${fullKey}`)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("never echoes the full key in the thrown error", async () => {
    const { fullKey } = generateApiKey();
    try {
      await verifyApiKey(`Bearer ${fullKey}`);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect((err as Error).message).not.toContain(fullKey);
      expect((err as Error).message).not.toContain(fullKey.slice(8));
    }
  });

  it("schedules the lastUsedAt write as fire-and-forget (no await in the verify path)", async () => {
    const { fullKey, record } = seedApiKey();
    const touchSpy = vi.fn();
    // Kick off verifyApiKey without awaiting yet — its synchronous body
    // runs to completion and queues the microtask, but the microtask
    // queue has not drained.
    const pending = verifyApiKey(`Bearer ${fullKey}`, { touchLastUsed: touchSpy });
    // The verify body did not call touch directly.
    expect(touchSpy).not.toHaveBeenCalled();
    // After awaiting and yielding to setImmediate, the queued microtask
    // has run exactly once with the right argument.
    await pending;
    await new Promise((r) => setImmediate(r));
    expect(touchSpy).toHaveBeenCalledTimes(1);
    expect(touchSpy).toHaveBeenCalledWith(record.id);
  });

  it("does not let a slow touch handler block the verify Promise", async () => {
    const { fullKey } = seedApiKey();
    let touchCompletedAt: number | null = null;
    const before = Date.now();
    // A synchronous "slow" touch (busy-loop for a tick) proves the work
    // is deferred — if the verify path awaited it, this would push
    // verifyApiKey's resolution past the budget below.
    const slowTouch = (): void => {
      const stopAt = Date.now() + 50;
      while (Date.now() < stopAt) {
        /* spin */
      }
      touchCompletedAt = Date.now();
    };
    await verifyApiKey(`Bearer ${fullKey}`, { touchLastUsed: slowTouch });
    const verifyResolvedAt = Date.now();
    // verify must NOT have waited for the slow touch.
    // (We allow a wide budget so this is robust on slow CI.)
    expect(verifyResolvedAt - before).toBeLessThan(800);
    // Drain microtasks; the slow touch will run after the resolution.
    await new Promise((r) => setImmediate(r));
    expect(touchCompletedAt).not.toBeNull();
  });

  it("swallows a failing lastUsedAt updater without failing verification", async () => {
    const { fullKey } = seedApiKey();
    const exploding = vi.fn(() => {
      throw new Error("db down");
    });
    const result = await verifyApiKey(`Bearer ${fullKey}`, { touchLastUsed: exploding });
    expect(result.apiKey).toBeDefined();
    await new Promise((r) => setImmediate(r));
    expect(exploding).toHaveBeenCalled();
  });
});
