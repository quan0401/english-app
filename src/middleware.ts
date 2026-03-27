import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Debug: log all cookies
  const cookies = req.cookies.getAll();
  console.log(`[middleware] ${pathname} | cookies:`, cookies.map(c => c.name).join(", ") || "none");

  // Try multiple cookie names — NextAuth v5 beta uses different names
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  let token = null;
  for (const cookieName of cookieNames) {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName,
    });
    if (token) {
      console.log(`[middleware] Token found via cookie: ${cookieName}`);
      break;
    }
  }

  if (!token) {
    console.log(`[middleware] No token found, redirecting to /login`);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/learn/:path*", "/review/:path*", "/stats/:path*", "/settings/:path*", "/onboarding/:path*", "/browse/:path*", "/practice/:path*"],
};
