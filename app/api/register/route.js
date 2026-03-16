/**
 * app/api/register/route.js  — POST /api/register
 *
 * WHY THIS FILE EXISTS:
 * NextAuth handles LOGIN, but not REGISTRATION.
 * We need our own endpoint to create new user accounts.
 *
 * WHAT IT DOES:
 * 1. Validates the incoming request body (name, email, password)
 * 2. Checks if email is already taken
 * 3. Hashes the password with bcrypt (10 salt rounds)
 * 4. Creates the User document in MongoDB
 * 5. Returns success or an error message
 *
 * SECURITY:
 *   - Password is NEVER stored in plain text
 *   - bcrypt's hashing is slow by design (prevents brute force)
 *   - We return generic errors to avoid leaking user info
 *
 * PHASE 2 (Day 1–2): Build models first, then this route.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // ── DB Connection ────────────────────────────────────────────────────────
    await connectDB();

    // ── Check for duplicate email ────────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 } // 409 Conflict
      );
    }

    // ── Hash password ────────────────────────────────────────────────────────
    // 10 salt rounds is the standard balance of security vs performance
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Create user ──────────────────────────────────────────────────────────
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    // Return safe user data (never return password, even hashed)
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Mongoose validation error (e.g., invalid email format)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json({ error: messages[0] }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
