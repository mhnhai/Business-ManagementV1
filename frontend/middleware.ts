import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const PUBLIC_AUTH_PREFIXES = ["/auth/verify-email", "/auth/reset-password"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");
  const isPublicAuthPage = PUBLIC_AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isPublicAuthPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  if (isLoggedIn && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|terms).*)"],
};
