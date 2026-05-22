#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.argv[2] ?? ".env.production.example");

const required = [
  "NODE_ENV",
  "TRUSTACCEPT_STORAGE_BACKEND",
  "DATABASE_URL",
  "TRUSTACCEPT_DISABLE_DEMO_AUTH",
  "TRUSTACCEPT_PUBLIC_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TRUSTACCEPT_REQUIRE_UPSTASH",
  "TRUSTACCEPT_SESSION_KEY_PREFIX",
  "TRUSTACCEPT_APPROVAL_TOKEN_SECRET",
  "TRUSTACCEPT_APPROVAL_TOKEN_TTL_SECONDS",
  "TRUSTACCEPT_ALLOWED_TOOL_IDS",
  "SEQUENCENOW_WEBHOOK_URL",
  "SEQUENCENOW_WEBHOOK_SECRET",
  "TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK",
  "TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM",
  "TRUSTACCEPT_VERIFY_TARGET_URL",
  "TRUSTACCEPT_SMOKE_SESSION_TOKEN",
  "TRUSTACCEPT_SMOKE_CREATE_APPROVAL",
  "TRUSTACCEPT_SMOKE_TOOL_ID",
];

const exactValues = new Map([
  ["NODE_ENV", "production"],
  ["TRUSTACCEPT_STORAGE_BACKEND", "prisma"],
  ["TRUSTACCEPT_DISABLE_DEMO_AUTH", "1"],
  ["TRUSTACCEPT_REQUIRE_UPSTASH", "1"],
  ["TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK", "1"],
  ["TRUSTACCEPT_SMOKE_CREATE_APPROVAL", "0"],
]);

const httpsValues = [
  "TRUSTACCEPT_PUBLIC_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "SEQUENCENOW_WEBHOOK_URL",
  "TRUSTACCEPT_VERIFY_TARGET_URL",
];

function parseEnvTemplate(content) {
  const result = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"(.*)"$/, "$1");
    result.set(key, value);
  }
  return result;
}

function addError(errors, key, detail) {
  errors.push(`${key}: ${detail}`);
}

function checkTemplate(env) {
  const errors = [];

  for (const key of required) {
    if (!env.has(key)) {
      addError(errors, key, "missing from .env.production.example");
    }
  }

  for (const [key, expected] of exactValues) {
    const actual = env.get(key);
    if (actual !== expected) {
      addError(errors, key, `expected ${expected}, got ${actual ?? "<missing>"}`);
    }
  }

  for (const key of httpsValues) {
    const value = env.get(key) ?? "";
    if (!value.startsWith("https://")) {
      addError(errors, key, "must use an HTTPS example value");
    }
  }

  for (const key of [
    "UPSTASH_REDIS_REST_TOKEN",
    "TRUSTACCEPT_APPROVAL_TOKEN_SECRET",
    "SEQUENCENOW_WEBHOOK_SECRET",
  ]) {
    const value = env.get(key) ?? "";
    if (!value.includes("replace-with") || value.length < 24) {
      addError(errors, key, "must be a clear non-empty placeholder secret");
    }
  }

  const receiptKey = env.get("TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM") ?? "";
  if (
    !receiptKey.includes("BEGIN PRIVATE KEY") ||
    !receiptKey.includes("END PRIVATE KEY")
  ) {
    addError(errors, "TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM", "must show PEM shape");
  }

  const allowedTools = (env.get("TRUSTACCEPT_ALLOWED_TOOL_IDS") ?? "")
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
  if (!allowedTools.includes("trustaccept.request_approval.v1")) {
    addError(
      errors,
      "TRUSTACCEPT_ALLOWED_TOOL_IDS",
      "must include trustaccept.request_approval.v1",
    );
  }

  return errors;
}

const env = parseEnvTemplate(readFileSync(envPath, "utf8"));
const errors = checkTemplate(env);

if (errors.length > 0) {
  console.error("Production env template check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production env template covers required production variables");
