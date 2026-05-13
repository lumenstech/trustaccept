import { NextResponse, type NextRequest } from "next/server";
import { handleApiError } from "@/src/server/api";
import {
  attachSlackMessage,
  createDecisionRequest,
  recordDecisionAuditEvent,
} from "@/src/server/decisions/service";
import { getDefaultInstallation } from "@/src/server/slackInstallations";
import { buildDecisionCard, buildPlainText } from "@/src/server/slack/blocks";
import { postSlackMessage } from "@/src/server/slack/client";

export const dynamic = "force-dynamic";

const DEMO_PAYLOAD = {
  externalId: null,
  source: "AI Agent",
  actionType: "refund_customer",
  title: "Approve high-risk refund",
  description:
    "AI agent wants to issue a $3,750 refund. Amount exceeds auto-approval policy.",
  riskLevel: "high" as const,
  requester: "ai-agent@trustaccept.com",
  subject: "Customer cus_demo_123",
  amount: 3750,
  currency: "USD",
  metadata: {
    reason: "Refund exceeds auto-approval threshold",
    policy: "ai-agent-refund-policy-v3",
  },
};

async function runDemo() {
  const decision = createDecisionRequest({
    ...DEMO_PAYLOAD,
    evidenceUrl: null,
  });
  const installation = getDefaultInstallation();
  if (!installation || !installation.defaultApprovalChannelId) {
    recordDecisionAuditEvent({
      decisionId: decision.id,
      eventType: "slack.post_skipped",
      actorType: "system",
      message:
        "Demo decision created. Slack workspace is not connected — install via /dashboard/integrations to deliver this to Slack.",
      metadata: {},
    });
    return { decision, slack_message_sent: false };
  }
  try {
    const res = await postSlackMessage({
      token: installation.slackBotToken,
      channel: installation.defaultApprovalChannelId,
      text: buildPlainText(decision),
      blocks: buildDecisionCard({ decision }),
    });
    if (res.ok && res.ts) {
      attachSlackMessage(decision.id, {
        slackTeamId: installation.slackTeamId,
        slackChannelId: res.channel ?? installation.defaultApprovalChannelId,
        slackMessageTs: res.ts,
      });
      return { decision, slack_message_sent: true };
    }
    recordDecisionAuditEvent({
      decisionId: decision.id,
      eventType: "slack.post_failed",
      actorType: "system",
      message: `Slack post failed: ${res.error ?? "unknown_error"}`,
      metadata: {},
    });
    return { decision, slack_message_sent: false };
  } catch (err) {
    recordDecisionAuditEvent({
      decisionId: decision.id,
      eventType: "slack.post_failed",
      actorType: "system",
      message: err instanceof Error ? err.message : "Slack post threw",
      metadata: {},
    });
    return { decision, slack_message_sent: false };
  }
}

export async function GET() {
  try {
    const result = await runDemo();
    return NextResponse.json({
      decision_id: result.decision.id,
      status: result.decision.status,
      slack_message_sent: result.slack_message_sent,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(_req: NextRequest) {
  try {
    const result = await runDemo();
    const redirectUrl = new URL(
      `/dashboard/decisions/${result.decision.id}`,
      _req.url,
    );
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (err) {
    return handleApiError(err);
  }
}
