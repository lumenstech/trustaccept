import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { buildSlackAuthorizeUrl } from "@/src/server/slack/oauth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "ta_slack_oauth_state";

export function GET(req: NextRequest) {
  try {
    const state = req.nextUrl.searchParams.get("state") ?? randomBytes(16).toString("hex");
    const url = buildSlackAuthorizeUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set({
      name: STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Slack install failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
