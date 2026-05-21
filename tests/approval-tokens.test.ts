import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  approvalUrl,
  createStoredApprovalToken,
  verifyApprovalToken,
} from "@/src/server/approvalTokens";

const ORIGINAL_ENV = { ...process.env };

let tokenState = new Map<string, string>();

function installUpstashStub() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const [command, ...args] = url.pathname
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);

      if (command === "SET") {
        tokenState.set(args[0], args[1]);
        return Response.json({ result: "OK" });
      }
      if (command === "GET") {
        return Response.json({ result: tokenState.get(args[0]) ?? null });
      }
      if (command === "DEL") {
        tokenState.delete(args[0]);
        return Response.json({ result: 1 });
      }
      return Response.json({ error: "unsupported command" }, { status: 400 });
    }),
  );
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    TRUSTACCEPT_DISABLE_DEMO_AUTH: "1",
    TRUSTACCEPT_APPROVAL_TOKEN_SECRET: "test-approval-token-secret",
    TRUSTACCEPT_APPROVAL_TOKEN_TTL_SECONDS: "3600",
    UPSTASH_REDIS_REST_URL: "https://upstash.example",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  };
  tokenState = new Map();
  installUpstashStub();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("approval tokens", () => {
  it("creates a stored token and verifies it for the matching record", async () => {
    const token = await createStoredApprovalToken("ra-test-1");

    await expect(verifyApprovalToken("ra-test-1", token)).resolves.toBeUndefined();
    expect(tokenState.size).toBe(1);
  });

  it("returns an absolute approval URL when a public base URL is configured", async () => {
    process.env.TRUSTACCEPT_PUBLIC_BASE_URL = "https://trustaccept.example/";
    const token = await createStoredApprovalToken("ra-test-2");

    expect(approvalUrl("ra-test-2", token)).toBe(
      `https://trustaccept.example/approve/ra-test-2?token=${encodeURIComponent(token)}`,
    );
  });

  it("rejects a token presented for a different record", async () => {
    const token = await createStoredApprovalToken("ra-test-3");

    await expect(verifyApprovalToken("ra-other", token)).rejects.toThrow(
      /record mismatch/i,
    );
  });

  it("consumes the token on decision so replay is rejected", async () => {
    const token = await createStoredApprovalToken("ra-test-4");

    await expect(
      verifyApprovalToken("ra-test-4", token, { consume: true }),
    ).resolves.toBeUndefined();
    await expect(verifyApprovalToken("ra-test-4", token)).rejects.toThrow(
      /used or revoked/i,
    );
  });

  it("rejects expired tokens before consulting the token store", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    process.env.TRUSTACCEPT_APPROVAL_TOKEN_TTL_SECONDS = "1";
    const token = await createStoredApprovalToken("ra-test-5");

    vi.setSystemTime(new Date("2026-05-21T12:00:02Z"));

    await expect(verifyApprovalToken("ra-test-5", token)).rejects.toThrow(
      /expired/i,
    );
  });
});
