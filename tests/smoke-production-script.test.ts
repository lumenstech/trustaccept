import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function withServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("test server did not bind to a TCP port");
  }
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function smokeEnv(baseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    TRUSTACCEPT_VERIFY_TARGET_URL: baseUrl,
    TRUSTACCEPT_ALLOWED_TOOL_IDS: "trustaccept.request_approval.v1",
    TRUSTACCEPT_SMOKE_CREATE_APPROVAL: "0",
  };
}

describe("scripts/smoke-production.mjs", () => {
  beforeEach(() => {
    delete process.env.TRUSTACCEPT_VERIFY_TARGET_URL;
    delete process.env.TRUSTACCEPT_PUBLIC_BASE_URL;
  });

  it("passes health, readiness, JWKS, and skipped approval checks", async () => {
    await withServer((req, res) => {
      if (req.url === "/api/health") return json(res, 200, { status: "ok" });
      if (req.url === "/api/ready") return json(res, 200, { status: "ok", checks: [] });
      if (req.url === "/.well-known/jwks.json") {
        return json(res, 200, { keys: [{ kid: "k1", alg: "RS256" }] });
      }
      if (req.url === "/api/v1/approvals") {
        return json(res, 401, { error: "Authentication required" });
      }
      if (
        req.url === "/api/v1/policy" ||
        req.url === "/api/v1/approvals/evaluate" ||
        req.url === "/api/v1/approvals/by-run/trustaccept-smoke-run"
      ) {
        return json(res, 401, { error: "Authentication required" });
      }
      return json(res, 404, { error: "not found" });
    }, async (baseUrl) => {
      const { stdout } = await execFileAsync(
        process.execPath,
        ["scripts/smoke-production.mjs"],
        {
          cwd: process.cwd(),
          env: smokeEnv(baseUrl),
        },
      );

      expect(stdout).toContain("ok   health");
      expect(stdout).toContain("ok   readiness");
      expect(stdout).toContain("ok   jwks");
      expect(stdout).toContain("ok   api_auth_boundary");
      expect(stdout).toContain("ok   policy_surface");
      expect(stdout).toContain("ok   approval_create - skipped");
      expect(stdout).toContain("summary: 6/6 passed");
    });
  }, 15000);

  it("validates the authenticated API boundary when a smoke session token is provided", async () => {
    await withServer((req, res) => {
      if (req.url === "/api/health") return json(res, 200, { status: "ok" });
      if (req.url === "/api/ready") return json(res, 200, { status: "ok", checks: [] });
      if (req.url === "/.well-known/jwks.json") {
        return json(res, 200, { keys: [{ kid: "k1", alg: "RS256" }] });
      }
      if (req.url === "/api/v1/approvals") {
        expect(req.headers.cookie).toBe("ta_session=smoke-session-token");
        return json(res, 200, { approvals: [] });
      }
      if (req.url === "/api/v1/policy") {
        expect(req.headers.cookie).toBe("ta_session=smoke-session-token");
        return json(res, 200, {
          policy: { version: "v1", default_decision: "require_human", rules: [] },
        });
      }
      if (req.url === "/api/v1/approvals/evaluate") {
        expect(req.method).toBe("POST");
        expect(req.headers.cookie).toBe("ta_session=smoke-session-token");
        return json(res, 200, {
          decision: "require_human",
          matched_rule_id: null,
          reason: "No matching policy; defaulting to human approval.",
          suggested_request_approval_args: {
            action: {
              type: "read_production_smoke_status",
              summary: "Read production smoke status",
              payload: { smoke: true },
            },
            principal: {
              type: "email",
              value: "trustaccept-smoke@example.invalid",
            },
            context: {
              agent_name: "trustaccept-production-smoke",
              business_justification: "Read production smoke status",
              metadata: {
                agent_run_id: "trustaccept-smoke-run",
                action_type: "read_production_smoke_status",
                principal_role: "sre",
              },
            },
          },
          policy_set_version: "v1",
          evaluated_at: new Date().toISOString(),
        });
      }
      if (req.url === "/api/v1/approvals/by-run/trustaccept-smoke-run") {
        expect(req.headers.cookie).toBe("ta_session=smoke-session-token");
        return json(res, 200, {
          agent_run_id: "trustaccept-smoke-run",
          actions: [],
          total: 0,
          summary: {
            auto_approved: 0,
            human_approved: 0,
            denied_or_blocked: 0,
            pending: 0,
          },
        });
      }
      return json(res, 404, { error: "not found" });
    }, async (baseUrl) => {
      const { stdout } = await execFileAsync(
        process.execPath,
        ["scripts/smoke-production.mjs"],
        {
          cwd: process.cwd(),
          env: {
            ...smokeEnv(baseUrl),
            TRUSTACCEPT_SMOKE_SESSION_TOKEN: "smoke-session-token",
          },
        },
      );

      expect(stdout).toContain(
        "ok   api_auth_boundary - authenticated API accepted smoke session",
      );
      expect(stdout).toContain(
        "ok   policy_surface - authenticated policy, evaluate, and run-rollup endpoints responded",
      );
      expect(stdout).toContain("summary: 6/6 passed");
    });
  }, 15000);

  it("reports all failed checks instead of stopping after the first failure", async () => {
    await withServer((req, res) => {
      if (req.url === "/api/health") return json(res, 500, { status: "down" });
      if (req.url === "/api/ready") {
        return json(res, 503, {
          status: "not_ready",
          checks: [{ name: "upstash_redis", state: "error" }],
        });
      }
      if (req.url === "/.well-known/jwks.json") return json(res, 200, { keys: [] });
      if (req.url === "/api/v1/approvals") return json(res, 200, { approvals: [] });
      if (
        req.url === "/api/v1/policy" ||
        req.url === "/api/v1/approvals/evaluate" ||
        req.url === "/api/v1/approvals/by-run/trustaccept-smoke-run"
      ) {
        return json(res, 401, { error: "Authentication required" });
      }
      return json(res, 404, { error: "not found" });
    }, async (baseUrl) => {
      await expect(
        execFileAsync(process.execPath, ["scripts/smoke-production.mjs"], {
          cwd: process.cwd(),
          env: smokeEnv(baseUrl),
        }),
      ).rejects.toMatchObject({
        stdout: expect.stringContaining("summary: 2/6 passed"),
      });
    });
  }, 15000);

  it("rejects non-HTTPS non-loopback production targets", async () => {
    await expect(
      execFileAsync(process.execPath, ["scripts/smoke-production.mjs"], {
        cwd: process.cwd(),
        env: smokeEnv("http://trustaccept.example"),
      }),
    ).rejects.toMatchObject({
      stdout: expect.stringContaining(
        "Production smoke target must use HTTPS unless it is localhost/loopback",
      ),
    });
  }, 15000);
});
