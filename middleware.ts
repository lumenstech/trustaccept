import { NextResponse, type NextRequest } from "next/server";

/**
 * Dashboard route protection. Public marketing routes and the hosted
 * /approve/[id] page are open by design. /dashboard/* and the dashboard
 * APIs require an authenticated session in production.
 *
 * In demo mode we ship a stable demo user via src/server/auth.ts and the
 * presence check below always succeeds, so no real redirect fires. The
 * structure is in place so production auth can hook in by issuing a
 * session cookie (e.g. SequenceNow-delivered token) named "ta_session".
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  if (hasDemoOrRealSession(req)) {
    return NextResponse.next();
  }

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set("reason", "signin-required");
  return NextResponse.redirect(redirectUrl);
}

function isProtected(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/api/risk-records")) return true;
  if (pathname.startsWith("/api/evidence-packets")) return true;
  if (pathname.startsWith("/api/demo/")) return true;
  return false;
}

function hasDemoOrRealSession(req: NextRequest): boolean {
  // Real session cookie. Demo mode also passes because we always treat
  // the request as the demo user (see src/server/auth.ts).
  if (req.cookies.has("ta_session")) return true;
  if (process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH === "1") return false;
  return true;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/risk-records/:path*",
    "/api/evidence-packets/:path*",
    "/api/demo/:path*",
  ],
};
