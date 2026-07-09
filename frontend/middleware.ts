import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_AUTH_PREFIXES = ["/auth/verify-email", "/auth/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const isLoggedIn = !!token;
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
