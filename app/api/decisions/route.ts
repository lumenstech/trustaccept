import { NextResponse, type NextRequest } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import { getTrustAcceptWebhookSecret } from "@/src/server/env";
import { DecisionCreateInput } from "@/src/server/decisions/validation";
import {
  attachSlackMessage,
  createDecisionRequest,
  listDecisionRequests,
  recordDecisionAuditEvent,
} from "@/src/server/decisions/service";
import {
  getDefaultInstallation,
  getSlackInstallation,
} from "@/src/server/slackInstallations";
import { buildDecisionCard, buildPlainText } from "@/src/server/slack/blocks";
import { postSlackMessage } from "@/src/server/slack/client";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest): NextResponse | null {
  const required = getTrustAcceptWebhookSecret();
  if (!required) {
    // MVP guardrail: never accept writes when the shared secret is unset.
    return jsonError(
      "TRUSTACCEPT_WEBHOOK_SECRET is not configured. The decisions API is disabled.",
      503,
    );
  }
  const provided = req.headers.get("x-trustaccept-secret");
  if (!provided || provided !== required) {
    return jsonError("Unauthorized", 401);
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = authorize(req);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ decisions: listDecisionRequests() });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = authorize(req);
    if (unauthorized) return unauthorized;

    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return jsonError("Invalid JSON body", 400);
    }
    const input = DecisionCreateInput.parse(json);

    const decision = createDecisionRequest({
      externalId: input.external_id ?? null,
      source: input.source,
      actionType: input.action_type,
      title: input.title,
      description: input.description,
      riskLevel: input.risk_level,
      requester: input.requester,
      subject: input.subject,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      evidenceUrl: input.evidence_url ?? null,
      metadata: input.metadata ?? {},
      slackTeamId: input.slack_team_id ?? null,
      approvalChannelId: input.approval_channel_id ?? null,
    });

    const installation = input.slack_team_id
      ? getSlackInstallation(input.slack_team_id)
      : getDefaultInstallation();
    const channelId = input.approval_channel_id ?? installation?.defaultApprovalChannelId ?? null;

    let slackMessageSent = false;
    if (installation && channelId) {
      try {
        const result = await postSlackMessage({
          token: installation.slackBotToken,
          channel: channelId,
          text: buildPlainText(decision),
          blocks: buildDecisionCard({ decision }),
        });
        if (result.ok && result.ts) {
          attachSlackMessage(decision.id, {
            slackTeamId: installation.slackTeamId,
            slackChannelId: result.channel ?? channelId,
            slackMessageTs: result.ts,
          });
          slackMessageSent = true;
        } else {
          recordDecisionAuditEvent({
            decisionId: decision.id,
            eventType: "slack.post_failed",
            actorType: "system",
            message: `Slack post failed: ${result.error ?? "unknown_error"}`,
            metadata: { slackTeamId: installation.slackTeamId, channelId },
          });
        }
      } catch (err) {
        recordDecisionAuditEvent({
          decisionId: decision.id,
          eventType: "slack.post_failed",
          actorType: "system",
          message: err instanceof Error ? err.message : "Slack post threw",
          metadata: { slackTeamId: installation.slackTeamId, channelId },
        });
      }
    } else {
      recordDecisionAuditEvent({
        decisionId: decision.id,
        eventType: "slack.post_skipped",
        actorType: "system",
        message: installation
          ? "No approval_channel_id and no default channel on the Slack installation."
          : "No Slack installation found for this workspace.",
        metadata: { slackTeamId: input.slack_team_id ?? null },
      });
    }

    return NextResponse.json(
      {
        decision_id: decision.id,
        status: decision.status,
        slack_message_sent: slackMessageSent,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
