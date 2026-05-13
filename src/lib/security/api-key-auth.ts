import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getStore, type ApiKeyRecord } from "@/src/server/store";
import type { Organization } from "@/lib/types";

const KEY_PREFIX = "ta_live_";
const PREFIX_LENGTH = 12; // "ta_live_" + 4 random chars, safe to display
const RANDOM_BYTES = 24; // 32 base64url chars, no padding
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const DEV_DEFAULT_PEPPER = "trustaccept-dev-pepper-do-not-use-in-prod";

export class UnauthorizedError extends Error {
  readonly code = "unauthorized" as const;
  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface ApiKeyVerification {
  apiKey: ApiKeyRecord;
  organization: Organization;
}

export interface VerifyApiKeyOptions {
  /** Override the in-memory `lastUsedAt` updater. Set to `null` to disable. */
  touchLastUsed?: ((apiKeyId: string) => void) | null;
}

function getPepper(): string {
  const pepper = process.env.TRUSTACCEPT_API_KEY_PEPPER;
  if (pepper && pepper.length > 0) return pepper;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TRUSTACCEPT_API_KEY_PEPPER must be set in production",
    );
  }
  return DEV_DEFAULT_PEPPER;
}

/** Stored hash format: "{saltHex}${hashHex}" — both fields hex-encoded. */
function hashFullKey(fullKey: string, salt: Buffer): string {
  const hash = scryptSync(`${fullKey}${getPepper()}`, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}$${hash.toString("hex")}`;
}

function constantTimeMatchesStoredHash(fullKey: string, stored: string): boolean {
  const separatorIndex = stored.indexOf("$");
  if (separatorIndex <= 0) return false;
  const saltHex = stored.slice(0, separatorIndex);
  const expectedHashHex = stored.slice(separatorIndex + 1);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(expectedHashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length !== SALT_BYTES || expected.length !== SCRYPT_KEYLEN) return false;
  const candidate = scryptSync(`${fullKey}${getPepper()}`, salt, SCRYPT_KEYLEN);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateApiKey(): {
  fullKey: string;
  prefix: string;
  keyHash: string;
} {
  const random = randomBytes(RANDOM_BYTES).toString("base64url");
  const fullKey = `${KEY_PREFIX}${random}`;
  const prefix = fullKey.slice(0, PREFIX_LENGTH);
  const salt = randomBytes(SALT_BYTES);
  const keyHash = hashFullKey(fullKey, salt);
  return { fullKey, prefix, keyHash };
}

/**
 * Returns the safely displayable form of an API key, given only its
 * prefix. Never accepts a full key — callers that hold a full key must
 * extract the prefix themselves. Output: "ta_live_abcd...****".
 */
export function maskApiKey(prefix: string): string {
  if (!prefix.startsWith(KEY_PREFIX)) return "********";
  return `${prefix}...****`;
}

function parseAuthorizationHeader(rawAuthHeader: string | null): string | null {
  if (!rawAuthHeader || typeof rawAuthHeader !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(rawAuthHeader);
  if (!match) return null;
  return match[1];
}

function defaultTouchLastUsed(apiKeyId: string): void {
  const store = getStore();
  const existing = store.apiKeys.get(apiKeyId);
  if (!existing) return;
  store.apiKeys.set(apiKeyId, { ...existing, lastUsedAt: new Date().toISOString() });
}

/**
 * Verify an `Authorization: Bearer ta_live_...` header. Throws
 * UnauthorizedError on any failure (missing, malformed, unknown prefix,
 * hash mismatch, revoked, or missing organization).
 *
 * Latency budget: scrypt + a Map lookup. The lastUsedAt write is
 * scheduled via queueMicrotask and is genuinely fire-and-forget — the
 * verify path never awaits it. Never log the full key; logs may include
 * the prefix only.
 */
export async function verifyApiKey(
  rawAuthHeader: string | null,
  options: VerifyApiKeyOptions = {},
): Promise<ApiKeyVerification> {
  const fullKey = parseAuthorizationHeader(rawAuthHeader);
  if (!fullKey || !fullKey.startsWith(KEY_PREFIX) || fullKey.length <= KEY_PREFIX.length) {
    throw new UnauthorizedError();
  }
  const prefix = fullKey.slice(0, PREFIX_LENGTH);
  const store = getStore();

  let candidate: ApiKeyRecord | undefined;
  for (const record of store.apiKeys.values()) {
    if (record.prefix === prefix) {
      candidate = record;
      break;
    }
  }
  if (!candidate) throw new UnauthorizedError();
  if (candidate.revokedAt) throw new UnauthorizedError();

  if (!constantTimeMatchesStoredHash(fullKey, candidate.keyHash)) {
    throw new UnauthorizedError();
  }

  const organization = store.organizations.get(candidate.organizationId);
  if (!organization) throw new UnauthorizedError();

  // Fire-and-forget: schedule the write on a separate macrotask so the
  // verify response can resolve and flush back to the caller before the
  // write even starts. `setImmediate` (not `queueMicrotask`) is load-
  // bearing — microtasks drain inside the caller's `await`, so a slow
  // touch would surface as verify latency. When lastUsedAt eventually
  // becomes a real DB write, this scheduling boundary keeps verify
  // latency bounded to scrypt + the lookup. options.touchLastUsed === null
  // disables it entirely (used by tests that don't care).
  if (options.touchLastUsed !== null) {
    const update = options.touchLastUsed ?? defaultTouchLastUsed;
    const apiKeyId = candidate.id;
    setImmediate(() => {
      try {
        update(apiKeyId);
      } catch {
        // Swallow: lastUsedAt is a soft observability field, not a
        // correctness signal. Failures here must not break verification.
      }
    });
  }

  return { apiKey: candidate, organization };
}
