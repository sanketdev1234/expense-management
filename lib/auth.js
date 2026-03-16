/**
 * lib/auth.js
 *
 * WHY THIS FILE EXISTS:
 * This is the central NextAuth v5 configuration.
 * It defines HOW users log in (Credentials provider = email + password),
 * what goes into the JWT token, and what the session object looks like.
 *
 * IMPORTANT: We export { handlers, auth, signIn, signOut }
 *   - handlers → used in app/api/auth/[...nextauth]/route.js
 *   - auth      → used in server components / API routes to get session
 *   - signIn / signOut → used in client components
 *
 * WHEN TO USE:
 *   - Import { auth } to protect server-side routes
 *   - Import { signIn, signOut } in login/logout buttons
 */
/**
 * lib/auth.js
 *
 * FIXES APPLIED:
 * 1. "Function.prototype.apply was called on #<Object>" 
 *    → Was caused by incorrect NextAuth v5 beta config syntax.
 *    → Solution: use NextAuth() with proper config object structure.
 *
 * 2. "edge runtime does not support Node.js 'stream' module"
 *    → bcryptjs and mongoose use Node.js built-ins.
 *    → Solution: add `trustHost: true` and ensure we're NOT running
 *      the auth config in edge context. The middleware fix handles runtime.
 *
 * NextAuth v5 beta correct import pattern for Next.js App Router:
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import User from "@/models/User";

export const authConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();

          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
          }).lean(); // .lean() returns plain JS object (faster)

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) return null;

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login", // redirect auth errors to login page
  },

  // Required for NextAuth v5 beta
  trustHost: true,

  // Suppress debug logs in production
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);