/**
 * app/api/auth/[...nextauth]/route.js
 *
 * WHY THIS FILE EXISTS:
 * NextAuth v5 needs a single catch-all route handler to process all
 * auth-related requests:
 *   GET  /api/auth/session       → return current session
 *   POST /api/auth/signin        → process login
 *   POST /api/auth/signout       → clear session
 *   GET  /api/auth/csrf          → CSRF token
 *   GET  /api/auth/providers     → list providers
 *   GET  /api/auth/callback/...  → OAuth callbacks (if used)
 *
 * We just re-export the handlers from lib/auth.js — that's all we need here.
 *
 * PHASE 1 (Day 1): Create this first thing.
 */

/**
 * app/api/auth/[...nextauth]/route.js
 *
 * FIX: Add explicit Node.js runtime declaration.
 * Without this, Next.js may try to run this in the Edge runtime,
 * which breaks mongoose and bcryptjs.
 */

export const runtime = "nodejs"; // ← THIS IS THE KEY FIX

export { handlers as GET, handlers as POST } from "@/lib/auth";