import type { Lead, RiskRecord, SessionUser } from "@/lib/types";

export interface NotificationDelivery {
  channel: "log";
  subject: string;
  body: string;
  sentAt: string;
}

const SENT: NotificationDelivery[] = [];

/**
 * Mock notification dispatcher. In production this is delivered by
 * SequenceNow. Here we record the delivery for inspection.
 */
function send(subject: string, body: string): NotificationDelivery {
  const delivery: NotificationDelivery = {
    channel: "log",
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
  SENT.push(delivery);
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info(`[trustaccept:notify] ${subject}`);
  }
  return delivery;
}

export function notifyLeadReceived(lead: Lead): NotificationDelivery {
  return send(
    `New TrustAccept lead: ${lead.formType}`,
    `${lead.name} (${lead.company}) submitted a ${lead.formType} request for risk area ${lead.riskArea}, urgency ${lead.urgency}.`,
  );
}

export function notifyDecisionRecorded(
  record: RiskRecord,
  actor: SessionUser,
): NotificationDelivery {
  return send(
    `Decision recorded for ${record.id}`,
    `${actor.name} marked ${record.id} as ${record.status} via ${record.module}.`,
  );
}

export function getSentNotifications(): readonly NotificationDelivery[] {
  return SENT;
}

export function __resetNotificationsForTests(): void {
  SENT.length = 0;
}
