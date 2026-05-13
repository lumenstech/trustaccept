import { requireSlackOAuthConfig } from "@/src/server/env";

export const SLACK_BOT_SCOPES = [
  "chat:write",
  "commands",
  "users:read",
  "channels:read",
  "incoming-webhook",
] as const;

export function buildSlackAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = requireSlackOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SLACK_BOT_SCOPES.join(","),
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface SlackOAuthV2Response {
  ok: boolean;
  error?: string;
  app_id?: string;
  authed_user?: { id?: string };
  team?: { id?: string; name?: string };
  bot_user_id?: string;
  access_token?: string;
  scope?: string;
  incoming_webhook?: {
    channel?: string;
    channel_id?: string;
    url?: string;
  };
}

export async function exchangeSlackOAuthCode(
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<SlackOAuthV2Response> {
  const { clientId, clientSecret, redirectUri } = requireSlackOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetcher("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Slack OAuth exchange failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as SlackOAuthV2Response;
  if (!payload.ok) {
    throw new Error(`Slack OAuth error: ${payload.error ?? "unknown_error"}`);
  }
  return payload;
}
