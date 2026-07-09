import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_AUTH_PREFIXES = ["/auth/verify-email", "/auth/reset-password"];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("authjs.session-token")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);
  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");
  const isPublicAuthPage = PUBLIC_AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isPublicAuthPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (isLoggedIn && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|terms).*)"],
};
