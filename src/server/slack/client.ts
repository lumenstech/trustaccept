import type { KnownBlock } from "./blocks";

const SLACK_API = "https://slack.com/api";

export interface SlackPostMessageResult {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
}

export interface PostMessageArgs {
  token: string;
  channel: string;
  text: string;
  blocks?: KnownBlock[];
  threadTs?: string;
}

async function slackCall<T extends { ok: boolean; error?: string }>(
  method: string,
  token: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const res = await fetcher(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Slack ${method} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function postSlackMessage(
  args: PostMessageArgs,
  fetcher: typeof fetch = fetch,
): Promise<SlackPostMessageResult> {
  return slackCall<SlackPostMessageResult>(
    "chat.postMessage",
    args.token,
    {
      channel: args.channel,
      text: args.text,
      blocks: args.blocks,
      thread_ts: args.threadTs,
    },
    fetcher,
  );
}

export interface UpdateMessageArgs {
  token: string;
  channel: string;
  ts: string;
  text: string;
  blocks?: KnownBlock[];
}

export async function updateSlackMessage(
  args: UpdateMessageArgs,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  return slackCall(
    "chat.update",
    args.token,
    {
      channel: args.channel,
      ts: args.ts,
      text: args.text,
      blocks: args.blocks,
    },
    fetcher,
  );
}

export interface PostEphemeralArgs {
  token: string;
  channel: string;
  user: string;
  text: string;
}

export async function postEphemeral(
  args: PostEphemeralArgs,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  return slackCall(
    "chat.postEphemeral",
    args.token,
    {
      channel: args.channel,
      user: args.user,
      text: args.text,
    },
    fetcher,
  );
}
