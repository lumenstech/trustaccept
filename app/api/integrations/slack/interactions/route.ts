import { NextResponse, type NextRequest } from "next/server";
import { requireSlackSigningSecret } from "@/src/server/env";
import {
  getDecisionRequest,
  recordSlackDecision,
} from "@/src/server/decisions/service";
import type { DecisionRequest } from "@/src/server/decisions/types";
import { getSlackInstallation } from "@/src/server/slackInstallations";
import {
  buildDecisionCard,
  buildPlainText,
  buildRejectModal,
  type KnownBlock,
} from "@/src/server/slack/blocks";
import {
  postEphemeral,
  updateSlackMessage,
} from "@/src/server/slack/client";
import { verifySlackRequest } from "@/src/server/slack/verify";

export const dynamic = "force-dynamic";

interface SlackInteractionPayload {
  type: string;
  team?: { id?: string };
  user?: { id?: string; name?: string; username?: string };
  channel?: { id?: string };
  message?: { ts?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
  trigger_id?: string;
  response_url?: string;
  view?: {
    callback_id?: string;
    private_metadata?: string;
    state?: {
      values?: Record<string, Record<string, { value?: string }>>;
    };
  };
  container?: {
    channel_id?: string;
    message_ts?: string;
  };
}

async function openModal(
  token: string,
  triggerId: string,
  view: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetcher("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trigger_id: triggerId, view }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return (await res.json()) as { ok: boolean; error?: string };
}

export async function POST(req: NextRequest) {
  let signingSecret: string;
  try {
    signingSecret = requireSlackSigningSecret();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "config_error" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const verification = verifySlackRequest({
    signingSecret,
    signature: req.headers.get("x-slack-signature"),
    timestamp: req.headers.get("x-slack-request-timestamp"),
    rawBody,
  });
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Slack signature verification failed", reason: verification.reason },
      { status: 401 },
    );
  }

  let payload: SlackInteractionPayload;
  try {
    const params = new URLSearchParams(rawBody);
    const payloadString = params.get("payload");
    if (!payloadString) throw new Error("missing_payload");
    payload = JSON.parse(payloadString) as SlackInteractionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid Slack payload" }, { status: 400 });
  }

  const teamId = payload.team?.id;
  if (!teamId) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  }
  const installation = getSlackInstallation(teamId);
  if (!installation) {
    return NextResponse.json(
      { error: "Slack workspace is not installed in TrustAccept" },
      { status: 404 },
    );
  }

  if (payload.type === "block_actions") {
    return handleBlockActions(payload, installation.slackBotToken);
  }
  if (payload.type === "view_submission") {
    return handleViewSubmission(payload, installation.slackBotToken);
  }
  return NextResponse.json({ ok: true });
}

async function handleBlockActions(
  payload: SlackInteractionPayload,
  botToken: string,
): Promise<NextResponse> {
  const action = payload.actions?.[0];
  if (!action?.action_id) return NextResponse.json({ ok: true });

  if (action.action_id === "trustaccept_open_evidence") {
    return NextResponse.json({ ok: true });
  }

  const decisionId = action.value;
  if (!decisionId) {
    return NextResponse.json({ error: "Missing decision id" }, { status: 400 });
  }
  const decision = getDecisionRequest(decisionId);
  if (!decision) {
    return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  }

  const slackUserId = payload.user?.id ?? "unknown";
  const slackUserName =
    payload.user?.name ?? payload.user?.username ?? slackUserId;
  const channelId = payload.channel?.id ?? decision.slackChannelId;
  const messageTs = payload.message?.ts ?? decision.slackMessageTs;

  if (action.action_id === "trustaccept_reject") {
    if (payload.trigger_id) {
      await openModal(botToken, payload.trigger_id, buildRejectModal(decisionId));
      return NextResponse.json({ ok: true });
    }
    return finalizeDecision({
      action: "reject",
      decisionId,
      slackUserId,
      slackUserName,
      botToken,
      channelId,
      messageTs,
    });
  }

  if (action.action_id === "trustaccept_approve") {
    return finalizeDecision({
      action: "approve",
      decisionId,
      slackUserId,
      slackUserName,
      botToken,
      channelId,
      messageTs,
    });
  }

  if (action.action_id === "trustaccept_escalate") {
    const result = recordSlackDecision({
      decisionId,
      action: "escalate",
      slackUserId,
      slackUserName,
    });
    if (result.ok && channelId && messageTs) {
      await updateMessageWithState(botToken, channelId, messageTs, result.decision, "escalated", slackUserName);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handleViewSubmission(
  payload: SlackInteractionPayload,
  botToken: string,
): Promise<NextResponse> {
  if (payload.view?.callback_id !== "trustaccept_reject_modal") {
    return NextResponse.json({ ok: true });
  }
  const decisionId = payload.view.private_metadata;
  if (!decisionId) {
    return NextResponse.json(
      {
        response_action: "errors",
        errors: { reason_block: "Missing decision id" },
      },
      { status: 200 },
    );
  }
  const reason =
    payload.view.state?.values?.reason_block?.reason?.value?.trim() ?? "";
  if (!reason) {
    return NextResponse.json(
      {
        response_action: "errors",
        errors: { reason_block: "Reason is required" },
      },
      { status: 200 },
    );
  }
  const slackUserId = payload.user?.id ?? "unknown";
  const slackUserName =
    payload.user?.name ?? payload.user?.username ?? slackUserId;
  const result = recordSlackDecision({
    decisionId,
    action: "reject",
    slackUserId,
    slackUserName,
    reason,
  });
  if (!result.ok) {
    if (result.reason === "already_final") {
      const decision = result.decision;
      if (decision) {
        await maybeNotifyAlreadyFinal(botToken, payload, decision.status);
      }
      return NextResponse.json({ response_action: "clear" });
    }
    return NextResponse.json(
      {
        response_action: "errors",
        errors: { reason_block: "Decision not found" },
      },
      { status: 200 },
    );
  }
  if (result.decision.slackChannelId && result.decision.slackMessageTs) {
    await updateMessageWithState(
      botToken,
      result.decision.slackChannelId,
      result.decision.slackMessageTs,
      result.decision,
      "rejected",
      slackUserName,
      reason,
    );
  }
  return NextResponse.json({ response_action: "clear" });
}

interface FinalizeArgs {
  action: "approve" | "reject";
  decisionId: string;
  slackUserId: string;
  slackUserName: string;
  botToken: string;
  channelId: string | null | undefined;
  messageTs: string | null | undefined;
}

async function finalizeDecision(args: FinalizeArgs): Promise<NextResponse> {
  const result = recordSlackDecision({
    decisionId: args.decisionId,
    action: args.action,
    slackUserId: args.slackUserId,
    slackUserName: args.slackUserName,
  });
  if (!result.ok) {
    if (result.reason === "already_final" && args.channelId) {
      await postEphemeral({
        token: args.botToken,
        channel: args.channelId,
        user: args.slackUserId,
        text: `:warning: TrustAccept decision \`${args.decisionId}\` is already ${result.decision?.status}. No change recorded.`,
      });
    }
    return NextResponse.json({ ok: true });
  }
  if (args.channelId && args.messageTs) {
    await updateMessageWithState(
      args.botToken,
      args.channelId,
      args.messageTs,
      result.decision,
      args.action === "approve" ? "approved" : "rejected",
      args.slackUserName,
    );
  }
  return NextResponse.json({ ok: true });
}

async function updateMessageWithState(
  botToken: string,
  channel: string,
  ts: string,
  decision: DecisionRequest,
  finalState: "approved" | "rejected" | "escalated",
  decidedByName: string,
  reason?: string,
): Promise<void> {
  const blocks: KnownBlock[] = buildDecisionCard({
    decision,
    finalState,
    decidedByName,
    decidedAt: decision.decidedAt,
    decisionReason: reason ?? decision.decisionReason,
  });
  await updateSlackMessage({
    token: botToken,
    channel,
    ts,
    text: buildPlainText(decision),
    blocks,
  });
}

async function maybeNotifyAlreadyFinal(
  botToken: string,
  payload: SlackInteractionPayload,
  status: string,
): Promise<void> {
  const channel = payload.container?.channel_id ?? payload.channel?.id;
  const user = payload.user?.id;
  if (!channel || !user) return;
  await postEphemeral({
    token: botToken,
    channel,
    user,
    text: `:warning: That decision is already ${status}. No change recorded.`,
  });
}
