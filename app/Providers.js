/**
 * app/Providers.js
 *
 * WHY THIS FILE EXISTS:
 * Next.js App Router requires SessionProvider to be in a Client Component
 * (it uses React Context internally). But our root layout.js should be a
 * Server Component. This pattern isolates the client boundary.
 *
 * USAGE: Wrap your layout's children with <Providers>.
 */
"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}