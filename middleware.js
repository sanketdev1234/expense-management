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
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/budget/:path*",
    "/analytics/:path*",
  ],
};