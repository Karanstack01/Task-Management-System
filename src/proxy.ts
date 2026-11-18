import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Must match SESSION_COOKIE in src/lib/store/ui-store.ts (not imported: proxy must stay self-contained). */
const SESSION_COOKIE = "ctms_session";

/** Pages reachable without a session. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/saas-expired", "/terms", "/privacy", "/support"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass framework assets, API routes, static files and public pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Signed-out requests go to the login page (remembering where they were headed)
  if (!request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Clone headers and set security context
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  response.headers.set("x-ctms-platform", "StackDrove-Enterprise");

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
