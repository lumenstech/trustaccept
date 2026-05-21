import { loadPublicJwk } from "./receipts";
import { prisma } from "./prisma";
import { isPrismaStorage, storageBackend } from "./storageBackend";
import {
  isUpstashConfigured,
  isUpstashRequired,
  pingUpstash,
} from "./upstash";

export type ReadinessState = "ok" | "skipped" | "error";

export interface ReadinessCheck {
  name: string;
  state: ReadinessState;
  detail: string;
}

export interface ReadinessReport {
  status: "ok" | "not_ready";
  checks: ReadinessCheck[];
}

async function checkPrisma(): Promise<ReadinessCheck> {
  if (!isPrismaStorage()) {
    return {
      name: "neon_prisma",
      state: "skipped",
      detail: `storage backend is ${storageBackend()}`,
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: "neon_prisma",
      state: "ok",
      detail: "database query succeeded",
    };
  } catch (err) {
    return {
      name: "neon_prisma",
      state: "error",
      detail: err instanceof Error ? err.message : "database query failed",
    };
  }
}

async function checkUpstash(): Promise<ReadinessCheck> {
  if (!isUpstashConfigured()) {
    return {
      name: "upstash_redis",
      state: isUpstashRequired() ? "error" : "skipped",
      detail: isUpstashRequired()
        ? "Upstash is required but REST env vars are missing"
        : "Upstash REST env vars are not configured",
    };
  }

  try {
    const ok = await pingUpstash();
    return {
      name: "upstash_redis",
      state: ok ? "ok" : "error",
      detail: ok ? "PING succeeded" : "PING did not return PONG",
    };
  } catch (err) {
    return {
      name: "upstash_redis",
      state: "error",
      detail: err instanceof Error ? err.message : "Upstash PING failed",
    };
  }
}

function checkReceiptKey(): ReadinessCheck {
  const jwk = loadPublicJwk();
  const required = process.env.NODE_ENV === "production";
  if (jwk) {
    return {
      name: "receipt_signing_key",
      state: "ok",
      detail: "RS256 public JWK can be derived from configured private key",
    };
  }
  return {
    name: "receipt_signing_key",
    state: required ? "error" : "skipped",
    detail: required
      ? "TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM is required in production"
      : "receipt signing key not configured",
  };
}

export async function readinessReport(): Promise<ReadinessReport> {
  const checks = await Promise.all([
    checkPrisma(),
    checkUpstash(),
    Promise.resolve(checkReceiptKey()),
  ]);
  const status = checks.some((check) => check.state === "error")
    ? "not_ready"
    : "ok";
  return { status, checks };
}
