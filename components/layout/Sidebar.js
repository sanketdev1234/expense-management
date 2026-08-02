
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Receipt,
  Target,
  BarChart2,
  LogOut,
  TrendingDown,
  MessageCircle
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/expenses",   label: "Expenses",   icon: Receipt },
  { href: "/budget",     label: "Budget",     icon: Target },
  { href: "/analytics",  label: "Analytics",  icon: BarChart2 },
  { href: "/chat",       label: "FinBot AI",  icon: MessageCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-30"
      style={{
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        >
          <TrendingDown size={16} color="white" />
        </div>
        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          Expense Tracker
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section + Sign Out */}
      <div
        className="px-3 py-4 space-y-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* User info */}
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {session.user.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {session.user.email}
              </p>
            </div>
          </div>
        )}

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="nav-link w-full text-left hover:text-red-400"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}