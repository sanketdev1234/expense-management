/**
 * app/layout.js  — Root Layout
 *
 * WHY THIS FILE EXISTS:
 * Every page in the app is wrapped by this layout.
 * We use it to:
 *   1. Set the <html> and <body> tags with fonts / metadata
 *   2. Wrap the app in SessionProvider (so useSession() works in client components)
 *   3. Add the global <Toaster> for toast notifications
 *
 * SessionProvider is a Client Component, so we isolate it in a separate
 * Providers.js file to keep this layout as a Server Component.
 */

import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "./Providers";

export const metadata = {
  title: "Smart Expense Tracker",
  description: "Track your expenses, set budgets, and visualize your spending",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Providers wraps SessionProvider — must be a client component */}
        <Providers>
          {children}
        </Providers>

        {/* Global toast notifications (react-hot-toast) */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#0d1628",
              color: "#f1f5f9",
              border: "1px solid #1a2d4a",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "0.875rem",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#0d1628" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#0d1628" },
            },
          }}
        />
      </body>
    </html>
  );
}