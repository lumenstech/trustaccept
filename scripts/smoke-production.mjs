#!/usr/bin/env node

const checks = [];

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : "";
}

function isLoopbackHttp(url) {
  return (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  );
}

function baseUrl() {
  const target =
    env("TRUSTACCEPT_VERIFY_TARGET_URL") || env("TRUSTACCEPT_PUBLIC_BASE_URL");
  if (!target) {
    throw new Error("Set TRUSTACCEPT_VERIFY_TARGET_URL or TRUSTACCEPT_PUBLIC_BASE_URL");
  }
  const parsed = new URL(target);
  if (parsed.protocol !== "https:" && !isLoopbackHttp(parsed)) {
    throw new Error("Production smoke target must use HTTPS unless it is localhost/loopback");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  const marker = ok ? "ok" : "fail";
  console.log(`${marker.padEnd(4)} ${name} - ${detail}`);
}

async function getJson(path, expectedStatus = 200, headers = {}) {
  return requestJson("GET", path, undefined, expectedStatus, headers);
}

async function requestJson(method, path, payload, expectedStatus = 200, headers = {}) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: payload
      ? { "content-type": "application/json", ...headers }
      : headers,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
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

async function checkPolicySurface() {
  const sessionToken = env("TRUSTACCEPT_SMOKE_SESSION_TOKEN");
  if (sessionToken) {
    const headers = { cookie: `ta_session=${sessionToken}` };
    const policy = await getJson("/api/v1/policy", 200, headers);
    const run = await getJson(
      "/api/v1/approvals/by-run/trustaccept-smoke-run",
      200,
      headers,
    );
    record(
      "policy_surface",
      policy.policy?.default_decision === "require_human" &&
        typeof run.total === "number" &&
        run.agent_run_id === "trustaccept-smoke-run",
      "authenticated policy and run-rollup endpoints responded",
    );
    return;
  }

  const policy = await getJson("/api/v1/policy", 401);
  const evaluate = await requestJson(
    "POST",
    "/api/v1/approvals/evaluate",
    {},
    401,
  );
  const run = await getJson("/api/v1/approvals/by-run/trustaccept-smoke-run", 401);
  const closed = [policy, evaluate, run].every(
    (body) => body.error === "Authentication required",
  );
  record(
    "policy_surface",
    closed,
    closed
      ? "policy endpoints reject unauthenticated requests"
      : "one or more policy endpoints did not fail closed",
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
  await runCheck("policy_surface", checkPolicySurface);
  await runCheck("approval_create", runApprovalCreate);

  const failed = checks.filter((check) => !check.ok);
  console.log("");
  console.log(`summary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

await main();
