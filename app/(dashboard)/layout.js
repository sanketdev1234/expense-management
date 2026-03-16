/**
 * app/(dashboard)/layout.js  — Dashboard Layout
 *
 * WHY THIS FILE EXISTS:
 * All dashboard pages (/dashboard, /expenses, /budget, /analytics)
 * share the same layout: Sidebar on the left, content on the right.
 * Putting it here means we define it ONCE and all child pages inherit it.
 *
 * The (dashboard) route group means these routes don't get a /dashboard prefix —
 * routes are still /dashboard, /expenses, etc.
 *
 * This is a SERVER COMPONENT — no "use client" needed.
 * Auth check happens in middleware.js before this even renders.
 *
 * PHASE 3 (Day 2): Create after Sidebar component is built.
 */

import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Fixed left sidebar — 240px wide */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <main
        className="flex-1 ml-60 min-h-screen"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Inner scroll container with padding */}
        <div className="p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}