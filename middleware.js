/**
 * middleware.js  (lives at project ROOT, not inside /app)
 *
 * WHY THIS FILE EXISTS:
 * Next.js Middleware runs on EVERY request before it reaches a page or API.
 * We use it as a "route guard" — if a user hits /dashboard, /expenses, etc.
 * without being logged in, they get redirected to /login automatically.
 *
 * HOW IT WORKS:
 * NextAuth v5's auth() function checks for a valid JWT session cookie.
 * If no session → redirect to /login.
 * If session exists → allow the request through.
 *
 * THE matcher CONFIG:
 * We only run middleware on the routes listed below — this skips
 * static files, images, and public pages like / /login /register.
 */

/**
 * middleware.js
 *
 * FIX: NextAuth v5 with Credentials + mongoose uses Node.js modules
 * (stream, crypto, etc.) that are NOT available in the Edge runtime.
 * We must explicitly set the runtime to "nodejs" here.
 *
 * Also: the "middleware" file convention warning is just a Next.js notice —
 * middleware.js at the root is still fully supported.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth(function middleware(req) {
  const { nextUrl, auth: session } = req;

  const isLoggedIn = !!session;
  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  // If not logged in and trying to access protected route → redirect to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If logged in and trying to access auth pages → redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/budget/:path*",
    "/analytics/:path*",
    "/login",
    "/register",
  ],
  // CRITICAL: force Node.js runtime so mongoose/bcrypt work
  runtime: "nodejs",
};

