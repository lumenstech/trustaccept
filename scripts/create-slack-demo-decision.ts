/**
 * Posts the canonical TrustAccept demo decision to a configured Slack
 * workspace. Run with:
 *
 *   pnpm dlx tsx scripts/create-slack-demo-decision.ts
 *   # or
 *   npx tsx scripts/create-slack-demo-decision.ts
 *
 * Requires the server to be running and `TRUSTACCEPT_WEBHOOK_SECRET` to be
 * set. Override the target host with TRUSTACCEPT_APP_URL. Pass
 * --slack-team-id and --approval-channel-id to route the message to a
 * specific workspace/channel.
 */

interface Args {
  slackTeamId?: string;
  approvalChannelId?: string;
  appUrl?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--slack-team-id" && next) {
      args.slackTeamId = next;
      i++;
    } else if (token === "--approval-channel-id" && next) {
      args.approvalChannelId = next;
      i++;
    } else if (token === "--app-url" && next) {
      args.appUrl = next;
      i++;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const appUrl =
    args.appUrl ?? process.env.TRUSTACCEPT_APP_URL ?? "http://localhost:3000";
  const secret = process.env.TRUSTACCEPT_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[create-slack-demo-decision] TRUSTACCEPT_WEBHOOK_SECRET is not set. Cannot call /api/decisions.",
    );
    process.exit(2);
  }

  const payload = {
    source: "AI Agent",
    action_type: "refund_customer",
    title: "Approve high-risk refund",
    description:
      "AI agent wants to issue a $3,750 refund. Amount exceeds auto-approval policy.",
    risk_level: "high" as const,
    requester: "ai-agent@trustaccept.com",
    subject: "Customer cus_demo_123",
    amount: 3750,
    currency: "USD",
    metadata: {
      reason: "Refund exceeds auto-approval threshold",
      policy: "ai-agent-refund-policy-v3",
    },
    ...(args.slackTeamId ? { slack_team_id: args.slackTeamId } : {}),
    ...(args.approvalChannelId
      ? { approval_channel_id: args.approvalChannelId }
      : {}),
  };

  const res = await fetch(`${appUrl}/api/decisions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-trustaccept-secret": secret,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}\n${text}`);
    process.exit(1);
  }
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
