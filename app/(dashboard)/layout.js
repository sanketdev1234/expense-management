

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