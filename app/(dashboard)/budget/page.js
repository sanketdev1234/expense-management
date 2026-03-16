/**
 * app/(dashboard)/budget/page.js  — Budget Page  /budget
 *
 * WHAT IT DOES:
 * - Shows current month's budget vs actual spending
 * - Progress bar for each category showing % used
 * - Form to set/update the monthly budget and per-category limits
 *
 * PHASE 4 (Day 3): Build after budget API route is ready.
 */

"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Target, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, getCurrentMonth, calcPercent, CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";

export default function BudgetPage() {
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const month = getCurrentMonth();

  // Form state
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [categoryLimits, setCategoryLimits] = useState({});

  // ── Fetch budget + spending ─────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch(`/api/budget?month=${month}`);
        const data = await res.json();
        setBudgetData(data);
        // Pre-fill form if budget exists
        if (data.budget) {
          setMonthlyLimit(data.budget.monthlyLimit.toString());
          setCategoryLimits(
            Object.fromEntries(
              Object.entries(data.budget.categoryLimits || {}).map(([k, v]) => [k, v.toString()])
            )
          );
        }
      } catch {
        toast.error("Failed to load budget");
      } finally {
        setLoading(false);
      }
    }
    fetchBudget();
  }, [month]);

  // ── Save budget ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      toast.error("Please enter a valid monthly limit");
      return;
    }
    setSaving(true);
    try {
      // Convert string values to numbers and remove empty entries
      const cleanCategoryLimits = Object.fromEntries(
        Object.entries(categoryLimits)
          .filter(([, v]) => v && parseFloat(v) > 0)
          .map(([k, v]) => [k, parseFloat(v)])
      );

      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyLimit: parseFloat(monthlyLimit),
          categoryLimits: cleanCategoryLimits,
          month,
        }),
      });

      if (res.ok) {
        toast.success("Budget saved!");
        // Refresh data
        const refreshed = await fetch(`/api/budget?month=${month}`);
        setBudgetData(await refreshed.json());
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save budget");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <BudgetSkeleton />;

  const totalSpent = budgetData?.totalSpent || 0;
  const limit = parseFloat(monthlyLimit) || 0;
  const overallPercent = calcPercent(totalSpent, limit);
  const categorySpendingMap = Object.fromEntries(
    (budgetData?.categorySpending || []).map((c) => [c._id, c.total])
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Budget
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {format(new Date(month + "-01"), "MMMM yyyy")} · Set limits for your spending
        </p>
      </div>

      {/* Overall budget status */}
      {limit > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {overallPercent >= 90 ? (
                <AlertTriangle size={18} color="#ef4444" />
              ) : (
                <CheckCircle size={18} color="#10b981" />
              )}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Monthly Budget
              </span>
            </div>
            <span
              className="text-sm font-bold mono"
              style={{
                color:
                  overallPercent >= 100
                    ? "#ef4444"
                    : overallPercent >= 80
                    ? "#f59e0b"
                    : "#10b981",
              }}
            >
              {overallPercent}% used
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-3 rounded-full overflow-hidden mb-3"
            style={{ background: "var(--bg-input)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(overallPercent, 100)}%`,
                background:
                  overallPercent >= 100
                    ? "#ef4444"
                    : overallPercent >= 80
                    ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                    : "linear-gradient(90deg, #3b82f6, #10b981)",
              }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>
              Spent:{" "}
              <span className="font-semibold mono" style={{ color: "#ef4444" }}>
                {formatCurrency(totalSpent)}
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Limit:{" "}
              <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(limit)}
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Remaining:{" "}
              <span
                className="font-semibold mono"
                style={{ color: limit - totalSpent < 0 ? "#ef4444" : "#10b981" }}
              >
                {formatCurrency(Math.abs(limit - totalSpent))}
                {limit - totalSpent < 0 ? " over" : ""}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Budget form */}
      <div className="card space-y-5">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {budgetData?.budget ? "Update Budget" : "Set Budget"}
        </h2>

        {/* Monthly limit input */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Monthly Limit (₹) *
          </label>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              ₹
            </span>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="50000"
              min="1"
              className="input-field w-full pl-8 pr-4 py-3 rounded-xl text-sm mono"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Per-Category Limits (optional)
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Category limits */}
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const spent = categorySpendingMap[cat] || 0;
            const catLimit = parseFloat(categoryLimits[cat] || "0");
            const catPercent = catLimit > 0 ? calcPercent(spent, catLimit) : 0;

            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 flex-shrink-0">
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <span
                    className="text-sm flex-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {cat}
                  </span>
                  {/* Spent badge */}
                  {spent > 0 && (
                    <span className="text-xs mono" style={{ color: catLimit > 0 && spent > catLimit ? "#ef4444" : "var(--text-muted)" }}>
                      {formatCurrency(spent)} spent
                    </span>
                  )}
                  <div className="relative w-36">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      value={categoryLimits[cat] || ""}
                      onChange={(e) =>
                        setCategoryLimits({ ...categoryLimits, [cat]: e.target.value })
                      }
                      placeholder="No limit"
                      min="0"
                      className="input-field w-full pl-6 pr-3 py-2 rounded-lg text-xs mono"
                    />
                  </div>
                </div>

                {/* Mini progress bar per category */}
                {catLimit > 0 && (
                  <div className="ml-10">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-input)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(catPercent, 100)}%`,
                          background:
                            catPercent >= 100
                              ? "#ef4444"
                              : catPercent >= 80
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
        >
          <Target size={15} />
          {saving ? "Saving..." : budgetData?.budget ? "Update Budget" : "Set Budget"}
        </button>
      </div>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 rounded" style={{ background: "var(--bg-card)" }} />
      <div className="card h-32" />
      <div className="card h-96" />
    </div>
  );
}