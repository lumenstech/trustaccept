import { loadPublicJwk } from "./receipts";
import {
  isSequenceNowWebhookConfigured,
  isSequenceNowWebhookRequired,
} from "./notifications";
import { prisma } from "./prisma";
import { isPrismaStorage, storageBackend } from "./storageBackend";
import {
  isUpstashConfigured,
  isUpstashRequired,
  pingUpstash,
} from "./upstash";
import {
  allowedToolIds,
  isToolAllowlistConfigured,
  toolAllowlistEnvName,
} from "./toolAllowlist";

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

function checkAuthMode(): ReadinessCheck {
  if (process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH === "1") {
    return {
      name: "auth_mode",
      state: "ok",
      detail: "demo auth disabled; ta_session must resolve through SequenceNow/Upstash",
    };
  }

  return {
    name: "auth_mode",
    state: process.env.NODE_ENV === "production" ? "error" : "skipped",
    detail:
      process.env.NODE_ENV === "production"
        ? "TRUSTACCEPT_DISABLE_DEMO_AUTH=1 is required in production"
        : "demo auth enabled",
  };
}

function checkApprovalTokenSecret(): ReadinessCheck {
  if (process.env.TRUSTACCEPT_APPROVAL_TOKEN_SECRET) {
    return {
      name: "approval_token_secret",
      state: "ok",
      detail: "approval token signing secret configured",
    };
  }

  return {
    name: "approval_token_secret",
    state: process.env.NODE_ENV === "production" ? "error" : "skipped",
    detail:
      process.env.NODE_ENV === "production"
        ? "TRUSTACCEPT_APPROVAL_TOKEN_SECRET is required in production"
        : "approval token secret not configured",
  };
}

function checkSequenceNowWebhook(): ReadinessCheck {
  if (isSequenceNowWebhookConfigured()) {
    return {
      name: "sequencenow_webhook",
      state: "ok",
      detail: "SequenceNow webhook URL configured",
    };
  }

  return {
    name: "sequencenow_webhook",
    state: isSequenceNowWebhookRequired() ? "error" : "skipped",
    detail: isSequenceNowWebhookRequired()
      ? "SEQUENCENOW_WEBHOOK_URL is required"
      : "SequenceNow webhook URL not configured",
  };
}

function checkToolAllowlist(): ReadinessCheck {
  if (isToolAllowlistConfigured()) {
    return {
      name: "tool_allowlist",
      state: "ok",
      detail: `${allowedToolIds().length} allowed tool id(s) configured`,
    };
  }

  return {
    name: "tool_allowlist",
    state: process.env.NODE_ENV === "production" ? "error" : "skipped",
    detail:
      process.env.NODE_ENV === "production"
        ? `${toolAllowlistEnvName()} is required in production`
        : "tool allowlist not configured",
  };
}

export async function readinessReport(): Promise<ReadinessReport> {
  const checks = await Promise.all([
    checkPrisma(),
    checkUpstash(),
    Promise.resolve(checkReceiptKey()),
    Promise.resolve(checkAuthMode()),
    Promise.resolve(checkApprovalTokenSecret()),
    Promise.resolve(checkSequenceNowWebhook()),
    Promise.resolve(checkToolAllowlist()),
  ]);
  const status = checks.some((check) => check.state === "error")
    ? "not_ready"
    : "ok";
  return { status, checks };
}
