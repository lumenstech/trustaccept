import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, { "content-type": "application/json", ...headers });
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

function prodEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const inheritedEnv: Record<string, string | undefined> = { ...process.env };
  return {
    ...inheritedEnv,
    NODE_ENV: "production",
    TRUSTACCEPT_STORAGE_BACKEND: "prisma",
    DATABASE_URL: "postgres://trustaccept:trustaccept@example.invalid:5432/trustaccept",
    TRUSTACCEPT_DISABLE_DEMO_AUTH: "1",
    TRUSTACCEPT_REQUIRE_UPSTASH: "1",
    UPSTASH_REDIS_REST_URL: "https://upstash.example.invalid",
    UPSTASH_REDIS_REST_TOKEN: "ci-upstash-token",
    TRUSTACCEPT_SESSION_KEY_PREFIX: "trustaccept:session",
    TRUSTACCEPT_APPROVAL_TOKEN_SECRET: "ci-approval-token-secret-32-chars",
    TRUSTACCEPT_ALLOWED_TOOL_IDS: "trustaccept.request_approval.v1",
    TRUSTACCEPT_PUBLIC_BASE_URL: "https://trustaccept.example.invalid",
    TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM:
      "-----BEGIN PRIVATE KEY-----\nci\n-----END PRIVATE KEY-----",
    TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK: "1",
    SEQUENCENOW_WEBHOOK_URL: "https://sequencenow.example.invalid/hooks/trustaccept",
    SEQUENCENOW_WEBHOOK_SECRET: "ci-sequencenow-webhook-secret-32",
    ...extra,
  };
}

const securityHeaders = {
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

describe("scripts/verify-prod.mjs", () => {
  it("passes strict production env checks without live endpoint checks", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["scripts/verify-prod.mjs"],
      {
        cwd: process.cwd(),
        env: prodEnv({ TRUSTACCEPT_VERIFY_TARGET_URL: "" }),
      },
    );

    expect(stdout).toContain("ok   NODE_ENV");
    expect(stdout).toContain("ok   TRUSTACCEPT_VERIFY_TARGET_URL - not set");
    expect(stdout).toContain("summary: 16/16 passed");
  }, 15000);

  it("passes live endpoint checks when readiness, JWKS, and security headers are valid", async () => {
    await withServer((req, res) => {
      if (req.url === "/api/health") {
        return json(res, 200, { status: "ok" }, securityHeaders);
      }
      if (req.url === "/api/ready") return json(res, 200, { status: "ok", checks: [] });
      if (req.url === "/.well-known/jwks.json") {
        return json(res, 200, { keys: [{ kid: "receipt-key", alg: "RS256" }] });
      }
      return json(res, 404, { error: "not found" });
    }, async (baseUrl) => {
      const { stdout } = await execFileAsync(
        process.execPath,
        ["scripts/verify-prod.mjs"],
        {
          cwd: process.cwd(),
          env: prodEnv({ TRUSTACCEPT_VERIFY_TARGET_URL: baseUrl }),
        },
      );

      expect(stdout).toContain("ok   endpoint /api/health - HTTP 200");
      expect(stdout).toContain("ok   endpoint /.well-known/jwks.json - 1 key(s)");
      expect(stdout).toContain("ok   endpoint security headers - required headers present");
      expect(stdout).toContain("summary: 20/20 passed");
    });
  }, 15000);

  it("fails live endpoint checks when required security headers are missing", async () => {
    await withServer((req, res) => {
      if (req.url === "/api/health") return json(res, 200, { status: "ok" });
      if (req.url === "/api/ready") return json(res, 200, { status: "ok", checks: [] });
      if (req.url === "/.well-known/jwks.json") {
        return json(res, 200, { keys: [{ kid: "receipt-key", alg: "RS256" }] });
      }
      return json(res, 404, { error: "not found" });
    }, async (baseUrl) => {
      await expect(
        execFileAsync(process.execPath, ["scripts/verify-prod.mjs"], {
          cwd: process.cwd(),
          env: prodEnv({ TRUSTACCEPT_VERIFY_TARGET_URL: baseUrl }),
        }),
      ).rejects.toMatchObject({
        stdout: expect.stringContaining("fail endpoint security headers"),
        stderr: expect.stringContaining("production verification failed: 1 error(s)"),
      });
    });
  }, 15000);
});
