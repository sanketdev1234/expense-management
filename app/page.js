/**
 * app/page.js  — Landing / Home Page
 *
 * This is the public-facing landing page at route "/"
 * It's a Server Component — no "use client" needed.
 *
 * WHAT IT DOES:
 * - If user is already logged in → redirect to /dashboard
 * - If not logged in → show marketing landing page with CTA buttons
 *
 * PHASE 3 (Day 2): Build this after auth pages are working.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage() {
  // Server-side session check
  const session = await auth();

  // Already logged in? Skip landing page
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background glow effects */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl page-enter">
        {/* Logo / icon */}
        <div className="text-6xl mb-6">💰</div>

        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          <span className="gradient-text">Smart Expense</span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>Tracker</span>
        </h1>

        <p className="text-lg mb-10" style={{ color: "var(--text-muted)" }}>
          Take control of your finances. Track expenses, set budgets,
          <br />
          and visualize your spending — all in one place.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            "📊 Visual Analytics",
            "💳 Expense Tracking",
            "🎯 Budget Alerts",
            "📅 Monthly Reports",
          ].map((f) => (
            <span
              key={f}
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)",
                color: "#93c5fd",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="btn-primary px-8 py-3 rounded-xl text-base"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl text-base font-semibold transition hover:opacity-80"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Bottom credit */}
      <p
        className="absolute bottom-6 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Built with Next.js · MongoDB · NextAuth
      </p>
    </main>
  );
}
