import type { DecisionRequest } from "@/src/server/decisions/types";
import { getTrustAcceptAppUrl } from "@/src/server/env";

export type KnownBlock = Record<string, unknown>;

const RISK_EMOJI: Record<string, string> = {
  low: ":large_green_circle:",
  medium: ":large_yellow_circle:",
  high: ":large_orange_circle:",
  critical: ":red_circle:",
};

function formatAmount(amount: number | null, currency: string | null): string | null {
  if (amount === null || amount === undefined) return null;
  if (!currency) return amount.toLocaleString();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export interface DecisionCardOptions {
  decision: DecisionRequest;
  finalState?: "approved" | "rejected" | "escalated";
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionReason?: string | null;
}

/**
 * Builds the enterprise-grade approval card. The same builder is reused
 * for the initial post and the post-decision update so the surface stays
 * consistent — only the action row and the status banner change.
 */
export function buildDecisionCard(opts: DecisionCardOptions): KnownBlock[] {
  const { decision, finalState } = opts;
  const riskKey = decision.riskLevel.toLowerCase();
  const riskEmoji = RISK_EMOJI[riskKey] ?? ":white_circle:";
  const decisionUrl = `${getTrustAcceptAppUrl()}/dashboard/decisions/${decision.id}`;

  const fields: KnownBlock[] = [
    { type: "mrkdwn", text: `*Source*\n${truncate(decision.source, 200)}` },
    { type: "mrkdwn", text: `*Action*\n${truncate(decision.actionType, 200)}` },
    {
      type: "mrkdwn",
      text: `*Risk level*\n${riskEmoji} ${decision.riskLevel.toUpperCase()}`,
    },
    { type: "mrkdwn", text: `*Requester*\n${truncate(decision.requester, 200)}` },
    { type: "mrkdwn", text: `*Subject*\n${truncate(decision.subject, 200)}` },
  ];
  const amount = formatAmount(decision.amount, decision.currency);
  if (amount) {
    fields.push({ type: "mrkdwn", text: `*Amount*\n${amount}` });
  }
  fields.push({
    type: "mrkdwn",
    text: `*Decision ID*\n\`${decision.id}\``,
  });

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "TrustAccept Approval Required", emoji: true },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: ":lock: Approve risky AI-agent actions in Slack before they happen.",
        },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${truncate(decision.title, 240)}*` },
    },
    {
      type: "section",
      fields,
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason / description*\n${truncate(decision.description, 2800)}`,
      },
    },
  ];

  if (decision.evidenceUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:page_facing_up: <${decision.evidenceUrl}|Open supporting evidence>`,
        },
      ],
    });
  }

  if (finalState === "approved") {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: *Approved* by ${opts.decidedByName ?? "Slack user"}${
          opts.decidedAt ? ` at <!date^${toEpoch(opts.decidedAt)}^{date_short_pretty} {time}|${opts.decidedAt}>` : ""
        }.`,
      },
    });
  } else if (finalState === "rejected") {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:x: *Rejected* by ${opts.decidedByName ?? "Slack user"}${
          opts.decisionReason ? `\n_Reason:_ ${truncate(opts.decisionReason, 600)}` : ""
        }`,
      },
    });
  } else if (finalState === "escalated") {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:rotating_light: *Escalated* by ${opts.decidedByName ?? "Slack user"}. Decision remains pending in TrustAccept.`,
      },
    });
  } else {
    const actionElements: KnownBlock[] = [
      {
        type: "button",
        action_id: "trustaccept_approve",
        style: "primary",
        text: { type: "plain_text", text: "Approve", emoji: true },
        value: decision.id,
        confirm: {
          title: { type: "plain_text", text: "Approve this action?" },
          text: {
            type: "mrkdwn",
            text: `This will record an *approval* in TrustAccept for \`${decision.id}\` and may release the action to the source system.`,
          },
          confirm: { type: "plain_text", text: "Approve" },
          deny: { type: "plain_text", text: "Cancel" },
        },
      },
      {
        type: "button",
        action_id: "trustaccept_reject",
        style: "danger",
        text: { type: "plain_text", text: "Reject", emoji: true },
        value: decision.id,
      },
      {
        type: "button",
        action_id: "trustaccept_escalate",
        text: { type: "plain_text", text: "Escalate", emoji: true },
        value: decision.id,
      },
    ];
    if (decision.evidenceUrl) {
      actionElements.push({
        type: "button",
        action_id: "trustaccept_open_evidence",
        text: { type: "plain_text", text: "Open Evidence", emoji: true },
        url: decision.evidenceUrl,
        value: decision.id,
      });
    }
    blocks.push({ type: "actions", block_id: `ta_actions_${decision.id}`, elements: actionElements });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `:bookmark_tabs: TrustAccept is the system of record. <${decisionUrl}|View audit trail>`,
      },
    ],
  });

  return blocks;
}

export function buildRejectModal(decisionId: string): Record<string, unknown> {
  return {
    type: "modal",
    callback_id: "trustaccept_reject_modal",
    private_metadata: decisionId,
    title: { type: "plain_text", text: "Reject request" },
    submit: { type: "plain_text", text: "Reject" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Recording a *rejection* for \`${decisionId}\`. Provide a short reason — this is stored in the TrustAccept audit log.`,
        },
      },
      {
        type: "input",
        block_id: "reason_block",
        label: { type: "plain_text", text: "Reason" },
        element: {
          type: "plain_text_input",
          action_id: "reason",
          multiline: true,
          max_length: 600,
        },
      },
    ],
  };
}

export function buildPlainText(decision: DecisionRequest): string {
  return `TrustAccept approval required: ${decision.title} (${decision.riskLevel.toUpperCase()})`;
}

function toEpoch(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
}
