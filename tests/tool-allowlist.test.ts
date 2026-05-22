import { afterEach, describe, expect, it } from "vitest";
import {
  allowedToolIds,
  isToolAllowed,
  isToolAllowlistConfigured,
} from "@/src/server/toolAllowlist";
import { readinessReport } from "@/src/server/readiness";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("tool allowlist", () => {
  it("is permissive when no allowlist is configured", () => {
    delete process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS;

    expect(isToolAllowlistConfigured()).toBe(false);
    expect(allowedToolIds()).toEqual([]);
    expect(isToolAllowed(undefined)).toBe(true);
    expect(isToolAllowed("trustaccept.request_approval.v1")).toBe(true);
  });

  it("parses comma-separated ids and rejects missing or unlisted tool ids", () => {
    process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS =
      " trustaccept.request_approval.v1,trustaccept.release_gate.v1 ";

    expect(isToolAllowlistConfigured()).toBe(true);
    expect(allowedToolIds()).toEqual([
      "trustaccept.request_approval.v1",
      "trustaccept.release_gate.v1",
    ]);
    expect(isToolAllowed("trustaccept.request_approval.v1")).toBe(true);
    expect(isToolAllowed("unknown.tool")).toBe(false);
    expect(isToolAllowed(undefined)).toBe(false);
  });

  it("marks production readiness not ready when the allowlist is missing", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
    };
    delete process.env.TRUSTACCEPT_ALLOWED_TOOL_IDS;

    const report = await readinessReport();
    const check = report.checks.find((item) => item.name === "tool_allowlist");

    expect(check).toMatchObject({
      state: "error",
      detail: "TRUSTACCEPT_ALLOWED_TOOL_IDS is required in production",
    });
  });

  it("passes the readiness allowlist check when configured", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      TRUSTACCEPT_ALLOWED_TOOL_IDS: "trustaccept.request_approval.v1",
    };

    const report = await readinessReport();
    const check = report.checks.find((item) => item.name === "tool_allowlist");

    expect(check).toMatchObject({
      state: "ok",
      detail: "1 allowed tool id(s) configured",
    });
  });
});
