import { createHmac } from "node:crypto";
import type { Lead, RiskRecord, SessionUser } from "@/lib/types";

export interface NotificationDelivery {
  channel: "log" | "sequencenow";
  eventType: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed";
  error?: string;
}

const SENT: NotificationDelivery[] = [];

/**
 * Mock notification dispatcher. In production this can be delivered by
 * SequenceNow through the async helpers below. The sync helpers preserve the
 * local/demo inspection path and existing service-layer API.
 */
function sendLog(eventType: string, subject: string, body: string): NotificationDelivery {
  const delivery: NotificationDelivery = {
    channel: "log",
    eventType,
    subject,
    body,
    sentAt: new Date().toISOString(),
    status: "sent",
  };
  SENT.push(delivery);
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info(`[trustaccept:notify] ${subject}`);
  }
  return delivery;
}

function sequenceNowWebhookUrl(): string | null {
  return process.env.SEQUENCENOW_WEBHOOK_URL ?? null;
}

export function isSequenceNowWebhookRequired(): boolean {
  return process.env.TRUSTACCEPT_REQUIRE_SEQUENCENOW_WEBHOOK === "1";
}

export function isSequenceNowWebhookConfigured(): boolean {
  return Boolean(sequenceNowWebhookUrl());
}

function signatureFor(payload: string): string | null {
  const secret = process.env.SEQUENCENOW_WEBHOOK_SECRET;
  if (!secret) return null;
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

async function sendSequenceNow(
  eventType: string,
  subject: string,
  body: string,
  data: unknown,
): Promise<NotificationDelivery> {
  const url = sequenceNowWebhookUrl();
  if (!url) {
    if (isSequenceNowWebhookRequired()) {
      throw new Error("SEQUENCENOW_WEBHOOK_URL is required");
    }
    return sendLog(eventType, subject, body);
  }

  const payload = JSON.stringify({
    source: "trustaccept",
    event_type: eventType,
    subject,
    body,
    data,
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "trustaccept/notification-webhook",
    "x-trustaccept-event": eventType,
  };
  const signature = signatureFor(payload);
  if (signature) headers["x-trustaccept-signature"] = signature;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`SequenceNow webhook failed with HTTP ${res.status}`);
    }
    const delivery: NotificationDelivery = {
      channel: "sequencenow",
      eventType,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    SENT.push(delivery);
    return delivery;
  } catch (err) {
    const delivery: NotificationDelivery = {
      channel: "sequencenow",
      eventType,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: "failed",
      error: err instanceof Error ? err.message : "SequenceNow webhook failed",
    };
    SENT.push(delivery);
    if (isSequenceNowWebhookRequired()) throw err;
    return delivery;
  }
}

export function notifyLeadReceived(lead: Lead): NotificationDelivery {
  return sendLog(
    "lead.received",
    `New TrustAccept lead: ${lead.formType}`,
    `${lead.name} (${lead.company}) submitted a ${lead.formType} request for risk area ${lead.riskArea}, urgency ${lead.urgency}.`,
  );
}

export function notifyLeadReceivedAsync(lead: Lead): Promise<NotificationDelivery> {
  return sendSequenceNow(
    "lead.received",
    `New TrustAccept lead: ${lead.formType}`,
    `${lead.name} (${lead.company}) submitted a ${lead.formType} request for risk area ${lead.riskArea}, urgency ${lead.urgency}.`,
    { lead },
  );
}

export function notifyDecisionRecorded(
  record: RiskRecord,
  actor: SessionUser,
): NotificationDelivery {
  return sendLog(
    "decision.recorded",
    `Decision recorded for ${record.id}`,
    `${actor.name} marked ${record.id} as ${record.status} via ${record.module}.`,
  );
}

export function notifyDecisionRecordedAsync(
  record: RiskRecord,
  actor: SessionUser,
): Promise<NotificationDelivery> {
  return sendSequenceNow(
    "decision.recorded",
    `Decision recorded for ${record.id}`,
    `${actor.name} marked ${record.id} as ${record.status} via ${record.module}.`,
    {
      record_id: record.id,
      organization_id: record.organizationId,
      module: record.module,
      status: record.status,
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        organizationId: actor.organizationId,
      },
    },
  );
}

export function getSentNotifications(): readonly NotificationDelivery[] {
  return SENT;
}

export function __resetNotificationsForTests(): void {
  SENT.length = 0;
}
