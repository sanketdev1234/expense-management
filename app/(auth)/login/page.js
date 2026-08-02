

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // signIn returns an object with error field if login fails
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false, // We handle redirect manually
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh(); // Refresh to update session in layout
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-md page-enter">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="••••••••"
                required
                autoComplete="current-password"
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
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              New here?
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Register link */}
          <Link
            href="/register"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-center transition hover:opacity-80"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}