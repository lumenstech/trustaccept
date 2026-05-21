import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ForbiddenError } from "./auth";
import { isUpstashConfigured, upstashCommand } from "./upstash";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function demoLinksEnabled(): boolean {
  return process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH !== "1";
}

function tokenSecret(): string | null {
  return process.env.TRUSTACCEPT_APPROVAL_TOKEN_SECRET ?? null;
}

function tokenTtlSeconds(): number {
  const raw = Number(process.env.TRUSTACCEPT_APPROVAL_TOKEN_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TTL_SECONDS;
}

function tokenDigest(token: string): string {
  return createHmac("sha256", tokenSecret() ?? "").update(token).digest("hex");
}

function tokenStateKey(recordId: string, digest: string): string {
  return `trustaccept:approval-token:${recordId}:${digest}`;
}

function sign(recordId: string, expiresAt: number, nonce: string): string {
  const secret = tokenSecret();
  if (!secret) throw new Error("TRUSTACCEPT_APPROVAL_TOKEN_SECRET is not configured");
  return createHmac("sha256", secret)
    .update(`${recordId}.${expiresAt}.${nonce}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function approvalTokensRequired(): boolean {
  return !demoLinksEnabled();
}

export function createApprovalToken(recordId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds();
  const nonce = randomBytes(16).toString("base64url");
  const signature = sign(recordId, expiresAt, nonce);
  return `${recordId}.${expiresAt}.${nonce}.${signature}`;
}

export function approvalUrl(recordId: string, token: string): string {
  const path = `/approve/${encodeURIComponent(recordId)}?token=${encodeURIComponent(token)}`;
  const baseUrl = process.env.TRUSTACCEPT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function storeApprovalToken(recordId: string, token: string): Promise<void> {
  if (!isUpstashConfigured()) {
    if (approvalTokensRequired()) {
      throw new Error("Upstash is required for production approval tokens");
    }
    return;
  }

  await upstashCommand(
    "SET",
    tokenStateKey(recordId, tokenDigest(token)),
    "valid",
    "EX",
    String(tokenTtlSeconds()),
  );
}

export async function createStoredApprovalToken(recordId: string): Promise<string> {
  if (!approvalTokensRequired() && !tokenSecret()) return "";
  const token = createApprovalToken(recordId);
  await storeApprovalToken(recordId, token);
  return token;
}

export async function verifyApprovalToken(
  recordId: string,
  token: string | null | undefined,
  options: { consume?: boolean } = {},
): Promise<void> {
  if (!approvalTokensRequired()) return;
  if (!token) throw new ForbiddenError("Approval token required");
  if (!tokenSecret()) throw new ForbiddenError("Approval token secret is not configured");
  if (!isUpstashConfigured()) throw new ForbiddenError("Approval token store is not configured");

  const parts = token.split(".");
  if (parts.length !== 4) throw new ForbiddenError("Invalid approval token");
  const [tokenRecordId, expiresAtRaw, nonce, signature] = parts;
  if (tokenRecordId !== recordId) throw new ForbiddenError("Approval token record mismatch");

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    throw new ForbiddenError("Approval token expired");
  }

  const expected = sign(recordId, expiresAt, nonce);
  if (!safeEqual(signature, expected)) throw new ForbiddenError("Invalid approval token");

  const key = tokenStateKey(recordId, tokenDigest(token));
  const existing = await upstashCommand<string | null>("GET", key);
  if (existing.result !== "valid") {
    throw new ForbiddenError("Approval token has been used or revoked");
  }

  if (options.consume) {
    await upstashCommand("DEL", key);
  }
}
