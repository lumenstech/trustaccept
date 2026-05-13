import { NextResponse, type NextRequest } from "next/server";
import { exchangeSlackOAuthCode } from "@/src/server/slack/oauth";
import { upsertSlackInstallation } from "@/src/server/slackInstallations";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "ta_slack_oauth_state";

function failure(reason: string, url: URL): NextResponse {
  const redirect = new URL("/dashboard/integrations", url);
  redirect.searchParams.set("slack", "error");
  redirect.searchParams.set("reason", reason);
  const res = NextResponse.redirect(redirect);
  res.cookies.set({ name: STATE_COOKIE, value: "", maxAge: 0, path: "/" });
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return failure(error, url);

  const code = url.searchParams.get("code");
  if (!code) return failure("missing_code", url);

  const stateParam = url.searchParams.get("state");
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return failure("state_mismatch", url);
  }

  let oauth;
  try {
    oauth = await exchangeSlackOAuthCode(code);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "oauth_exchange_failed";
    return failure(encodeURIComponent(reason), url);
  }

  const teamId = oauth.team?.id;
  const teamName = oauth.team?.name ?? "Slack workspace";
  const botUserId = oauth.bot_user_id;
  const botToken = oauth.access_token;
  if (!teamId || !botUserId || !botToken) {
    return failure("incomplete_oauth_response", url);
  }

  try {
    upsertSlackInstallation({
      slackTeamId: teamId,
      slackTeamName: teamName,
      slackBotUserId: botUserId,
      slackBotToken: botToken,
      defaultApprovalChannelId: oauth.incoming_webhook?.channel_id ?? null,
      defaultApprovalChannelName: oauth.incoming_webhook?.channel ?? null,
      installedBySlackUserId: oauth.authed_user?.id ?? null,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "install_save_failed";
    return failure(encodeURIComponent(reason), url);
  }

  const success = new URL("/dashboard/integrations", url);
  success.searchParams.set("slack", "connected");
  success.searchParams.set("team", teamName);
  const res = NextResponse.redirect(success);
  res.cookies.set({ name: STATE_COOKIE, value: "", maxAge: 0, path: "/" });
  return res;
}
