import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/src/server/auth";
import {
  __resetNotificationsForTests,
  getSentNotifications,
  notifyDecisionRecordedAsync,
} from "@/src/server/notifications";
import { getRiskRecordPublic } from "@/src/server/riskRecords";
import { __resetStoreForTests } from "@/src/server/store";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  __resetStoreForTests();
  __resetNotificationsForTests();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("SequenceNow notification delivery", () => {
  it("posts signed decision events to the configured webhook", async () => {
    process.env.SEQUENCENOW_WEBHOOK_URL = "https://sequencenow.example/hooks/trustaccept";
    process.env.SEQUENCENOW_WEBHOOK_SECRET = "shared-secret";
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const record = getRiskRecordPublic("ra-ai-001")!;
    const user = getCurrentUser()!;
    const delivery = await notifyDecisionRecordedAsync(record, user);

    expect(delivery.channel).toBe("sequencenow");
    expect(delivery.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
      "x-trustaccept-event": "decision.recorded",
    });
    expect((init?.headers as Record<string, string>)["x-trustaccept-signature"]).toMatch(
      /^sha256=[0-9a-f]{64}$/,
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      source: "trustaccept",
      event_type: "decision.recorded",
      data: {
        record_id: "ra-ai-001",
        organization_id: user.organizationId,
      },
    });
  });

  it("records failed webhook delivery and fails closed when required", async () => {
    process.env.SEQUENCENOW_WEBHOOK_URL = "https://sequencenow.example/hooks/trustaccept";
    process.env.TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "down" }, { status: 503 })),
    );

    const record = getRiskRecordPublic("ra-ai-001")!;
    const user = getCurrentUser()!;

    await expect(notifyDecisionRecordedAsync(record, user)).rejects.toThrow(/503/);
    expect(getSentNotifications().at(-1)).toMatchObject({
      channel: "sequencenow",
      eventType: "decision.recorded",
      status: "failed",
    });
  });
});
