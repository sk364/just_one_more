import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/invite", "/rsvp", "/_next", "/favicon.ico", "/icon", "/manifest", "/offline", "/sw.js", "/api"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + ".")
  );

  if (isPublic) return NextResponse.next();

  // Check for auth cookie or token hint
  const authCookie = request.cookies.get("auth_hint");
  const hasAuthHint = authCookie?.value === "1";

  if (!hasAuthHint && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
