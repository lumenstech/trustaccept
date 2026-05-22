#!/usr/bin/env node

const checks = [];

function add(name, ok, detail, severity = "error") {
  checks.push({ name, ok, detail, severity });
}

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : "";
}

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function redacted(value) {
  if (!value) return "<missing>";
  if (value.length <= 8) return "<set>";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function checkEndpoint(baseUrl, path, expectedStatus = 200) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    add(
      `endpoint ${path}`,
      res.status === expectedStatus,
      res.status === expectedStatus
        ? `HTTP ${res.status}`
        : `expected HTTP ${expectedStatus}, got HTTP ${res.status}: ${JSON.stringify(body).slice(0, 500)}`,
    );
  } catch (err) {
    add(
      `endpoint ${path}`,
      false,
      err instanceof Error ? err.message : "request failed",
    );
  }
}

async function checkJsonEndpoint(baseUrl, path, validate) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json();
    const validation = validate(body, res.status);
    add(
      `endpoint ${path}`,
      validation.ok,
      validation.detail,
    );
  } catch (err) {
    add(
      `endpoint ${path}`,
      false,
      err instanceof Error ? err.message : "request failed",
    );
  }
}

function validateEnv() {
  add(
    "NODE_ENV",
    env("NODE_ENV") === "production",
    `expected production, got ${redacted(env("NODE_ENV"))}`,
  );
  add(
    "TRUSTACCEPT_STORAGE_BACKEND",
    env("TRUSTACCEPT_STORAGE_BACKEND") === "prisma",
    `expected prisma, got ${redacted(env("TRUSTACCEPT_STORAGE_BACKEND"))}`,
  );
  add("DATABASE_URL", Boolean(env("DATABASE_URL")), "required for Prisma/Neon");
  add(
    "TRUSTACCEPT_DISABLE_DEMO_AUTH",
    env("TRUSTACCEPT_DISABLE_DEMO_AUTH") === "1",
    "must be 1 so production does not use demo identity",
  );
  add(
    "TRUSTACCEPT_REQUIRE_UPSTASH",
    env("TRUSTACCEPT_REQUIRE_UPSTASH") === "1",
    "must be 1 so readiness fails closed without Redis",
  );
  add("UPSTASH_REDIS_REST_URL", isHttpsUrl(env("UPSTASH_REDIS_REST_URL")), "HTTPS Upstash REST URL required");
  add("UPSTASH_REDIS_REST_TOKEN", Boolean(env("UPSTASH_REDIS_REST_TOKEN")), "Upstash REST token required");
  add(
    "TRUSTACCEPT_SESSION_KEY_PREFIX",
    Boolean(env("TRUSTACCEPT_SESSION_KEY_PREFIX")),
    "session key prefix required for SequenceNow session lookup",
  );
  add(
    "TRUSTACCEPT_APPROVAL_TOKEN_SECRET",
    env("TRUSTACCEPT_APPROVAL_TOKEN_SECRET").length >= 32,
    "at least 32 characters recommended for hosted approval HMAC tokens",
  );
  add(
    "TRUSTACCEPT_ALLOWED_TOOL_IDS",
    env("TRUSTACCEPT_ALLOWED_TOOL_IDS")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean).length > 0,
    "comma-separated MCP tool id allowlist required",
  );
  add(
    "TRUSTACCEPT_PUBLIC_BASE_URL",
    isHttpsUrl(env("TRUSTACCEPT_PUBLIC_BASE_URL")),
    "HTTPS public base URL required for deliverable approval links",
  );
  add(
    "TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM",
    env("TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM").includes("BEGIN") &&
      env("TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM").includes("PRIVATE KEY"),
    "RS256 private key PEM required for receipts",
  );
  add(
    "TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK",
    env("TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK") === "1",
    "must be 1 so delivery fails closed in production",
  );
  add(
    "SEQUENCENOW_WEBHOOK_URL",
    isHttpsUrl(env("SEQUENCENOW_WEBHOOK_URL")),
    "HTTPS SequenceNow webhook URL required",
  );
  add(
    "SEQUENCENOW_WEBHOOK_SECRET",
    env("SEQUENCENOW_WEBHOOK_SECRET").length >= 32,
    "at least 32 characters recommended for webhook signatures",
  );
}

function printReport() {
  const errors = checks.filter((check) => !check.ok && check.severity === "error");
  const warnings = checks.filter((check) => !check.ok && check.severity === "warn");

  for (const check of checks) {
    const marker = check.ok ? "ok" : check.severity === "warn" ? "warn" : "fail";
    console.log(`${marker.padEnd(4)} ${check.name} - ${check.detail}`);
  }

  console.log("");
  console.log(`summary: ${checks.length - errors.length - warnings.length}/${checks.length} passed`);

  if (errors.length > 0) {
    console.error(`production verification failed: ${errors.length} error(s)`);
    process.exitCode = 1;
  }
}

async function main() {
  validateEnv();

  const target = env("TRUSTACCEPT_VERIFY_TARGET_URL");
  if (target) {
    add(
      "TRUSTACCEPT_VERIFY_TARGET_URL",
      isUrl(target),
      "target URL must be http(s)",
    );
    if (isUrl(target)) {
      await checkEndpoint(target, "/api/health");
      await checkJsonEndpoint(target, "/api/ready", (body, status) => ({
        ok: status === 200 && body?.status === "ok",
        detail:
          status === 200 && body?.status === "ok"
            ? "ready"
            : `expected ready HTTP 200, got HTTP ${status}: ${JSON.stringify(body).slice(0, 500)}`,
      }));
      await checkJsonEndpoint(target, "/.well-known/jwks.json", (body, status) => {
        const keys = Array.isArray(body?.keys) ? body.keys : [];
        const hasRs256Key = keys.some((key) => key?.kid && key?.alg === "RS256");
        return {
          ok: status === 200 && hasRs256Key,
          detail:
            status === 200 && hasRs256Key
              ? `${keys.length} key(s)`
              : `expected RS256 JWKS key, got HTTP ${status}: ${JSON.stringify(body).slice(0, 500)}`,
        };
      });
    }
  } else {
    add(
      "TRUSTACCEPT_VERIFY_TARGET_URL",
      true,
      "not set; skipped live endpoint checks",
      "warn",
    );
  }

  printReport();
}

await main();
