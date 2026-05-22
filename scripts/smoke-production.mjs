#!/usr/bin/env node

const checks = [];

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : "";
}

function baseUrl() {
  const target =
    env("TRUSTACCEPT_VERIFY_TARGET_URL") || env("TRUSTACCEPT_PUBLIC_BASE_URL");
  if (!target) {
    throw new Error("Set TRUSTACCEPT_VERIFY_TARGET_URL or TRUSTACCEPT_PUBLIC_BASE_URL");
  }
  return target.replace(/\/+$/, "");
}

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  const marker = ok ? "ok" : "fail";
  console.log(`${marker.padEnd(4)} ${name} - ${detail}`);
}

async function getJson(path, expectedStatus = 200, headers = {}) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, { headers, cache: "no-store" });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  if (res.status !== expectedStatus) {
    throw new Error(
      `expected HTTP ${expectedStatus}, got ${res.status}: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }
  return body;
}

async function runCheck(name, fn) {
  try {
    await fn();
  } catch (err) {
    record(name, false, err instanceof Error ? err.message : String(err));
  }
}

async function checkHealth() {
  const body = await getJson("/api/health");
  record("health", body.status === "ok", `status=${body.status ?? "<missing>"}`);
}

async function checkReadiness() {
  const body = await getJson("/api/ready", 200);
  const failures = Array.isArray(body.checks)
    ? body.checks.filter((check) => check.state === "error")
    : [];
  const failureNames = failures.map((check) => check.name).join(", ");
  record(
    "readiness",
    body.status === "ok" && failures.length === 0,
    failures.length === 0
      ? "all checks ready"
      : `${failures.length} failing check(s): ${failureNames}`,
  );
}

async function checkJwks() {
  const body = await getJson("/.well-known/jwks.json");
  const keys = Array.isArray(body.keys) ? body.keys : [];
  const hasSigningKey = keys.some((key) => key.kid && key.alg === "RS256");
  record("jwks", hasSigningKey, `${keys.length} key(s) returned`);
}

async function checkProtectedApiClosed() {
  const sessionToken = env("TRUSTACCEPT_SMOKE_SESSION_TOKEN");
  if (sessionToken) {
    const body = await getJson("/api/v1/approvals", 200, {
      cookie: `ta_session=${sessionToken}`,
    });
    record(
      "api_auth_boundary",
      Array.isArray(body.approvals),
      Array.isArray(body.approvals)
        ? "authenticated API accepted smoke session"
        : "authenticated response missing approvals array",
    );
    return;
  }

  const body = await getJson("/api/v1/approvals", 401);
  record(
    "api_auth_boundary",
    body.error === "Authentication required",
    body.error ?? "missing expected auth error",
  );
}

function smokeToolId() {
  const allowed = env("TRUSTACCEPT_ALLOWED_TOOL_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return env("TRUSTACCEPT_SMOKE_TOOL_ID") || allowed[0] || "trustaccept.request_approval.v1";
}

async function postJson(path, payload, headers) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

async function runApprovalCreate() {
  if (env("TRUSTACCEPT_SMOKE_CREATE_APPROVAL") !== "1") {
    record("approval_create", true, "skipped; set TRUSTACCEPT_SMOKE_CREATE_APPROVAL=1 to run");
    return;
  }

  const sessionToken = env("TRUSTACCEPT_SMOKE_SESSION_TOKEN");
  if (!sessionToken) {
    record("approval_create", false, "TRUSTACCEPT_SMOKE_SESSION_TOKEN required");
    return;
  }

  const body = await postJson(
    "/api/v1/approvals",
    {
      action: {
        type: "read_production_smoke_status",
        summary: "Read production smoke status",
        payload: { smoke: true, at: new Date().toISOString() },
      },
      principal: { type: "email", value: "trustaccept-smoke@example.invalid" },
      context: {
        agent_name: "trustaccept-production-smoke",
        environment: "production",
        business_justification: "Post-deploy smoke verification.",
      },
      tool_id: smokeToolId(),
    },
    {
      "content-type": "application/json",
      cookie: `ta_session=${sessionToken}`,
    },
  );
  record(
    "approval_create",
    Boolean(body.approval?.id),
    `approval=${body.approval?.id ?? "<missing>"}`,
  );
}

async function main() {
  await runCheck("health", checkHealth);
  await runCheck("readiness", checkReadiness);
  await runCheck("jwks", checkJwks);
  await runCheck("api_auth_boundary", checkProtectedApiClosed);
  await runCheck("approval_create", runApprovalCreate);

  const failed = checks.filter((check) => !check.ok);
  console.log("");
  console.log(`summary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

await main();
