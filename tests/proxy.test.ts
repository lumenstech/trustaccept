import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://trustaccept.example${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy auth boundary", () => {
  it("allows public marketing routes without a session", () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";

    const res = proxy(request("/pricing"));

    expect(res.status).toBe(200);
  });

  it("redirects protected dashboard page requests without a production session", () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";

    const res = proxy(request("/dashboard"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://trustaccept.example/?reason=signin-required",
    );
  });

  it("returns JSON 401 for protected API requests without a production session", async () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";

    const res = proxy(request("/api/v1/approvals"));

    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("allows protected API requests when a ta_session cookie is present", () => {
    process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH = "1";

    const res = proxy(request("/api/v1/approvals", "ta_session=session-token"));

    expect(res.status).toBe(200);
  });

  it("allows protected routes in demo mode without a cookie", () => {
    delete process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH;

    const res = proxy(request("/api/v1/approvals"));

    expect(res.status).toBe(200);
  });
});
