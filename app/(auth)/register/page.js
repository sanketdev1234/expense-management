

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side validation
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create the account
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      // Step 2: Auto-login after successful registration
      const loginResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (loginResult?.error) {
        // Account was created but login failed — redirect to login
        toast.success("Account created! Please sign in.");
        router.push("/login");
      } else {
        toast.success("Account created! Welcome aboard 🎉");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background glow */}
      <div
        className="fixed top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-md page-enter">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Start tracking your expenses today
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                required
                autoComplete="name"
                className="input-field w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input-field w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                autoComplete="new-password"
                className="input-field w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                className="input-field w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:opacity-80 transition"
              style={{ color: "var(--accent-blue)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}