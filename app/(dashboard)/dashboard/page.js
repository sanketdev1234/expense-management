

"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Receipt, Target, Wallet, AlertTriangle } from "lucide-react";
import { formatCurrency, getCurrentMonth, calcPercent, CATEGORY_ICONS } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#ec4899",
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`/api/dashboard?month=${getCurrentMonth()}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p style={{ color: "var(--text-muted)" }}>Failed to load dashboard.</p>;

  const budgetPercent = data.budget
    ? calcPercent(data.totalSpent, data.budget.monthlyLimit)
    : 0;

  const kpis = [
    {
      label: "Total Spent",
      value: formatCurrency(data.totalSpent),
      icon: Wallet,
      color: "#3b82f6",
      sub: format(new Date(), "MMMM yyyy"),
    },
    {
      label: "Transactions",
      value: data.expenseCount,
      icon: Receipt,
      color: "#8b5cf6",
      sub: "this month",
    },
    {
      label: "Top Category",
      value: data.topCategory?.name || "—",
      icon: TrendingUp,
      color: "#10b981",
      sub: data.topCategory ? formatCurrency(data.topCategory.amount) : "no data",
    },
    {
      label: "Budget Used",
      value: data.budget ? `${budgetPercent}%` : "Not set",
      icon: Target,
      color: budgetPercent >= 90 ? "#ef4444" : budgetPercent >= 70 ? "#f59e0b" : "#10b981",
      sub: data.budget
        ? `of ${formatCurrency(data.budget.monthlyLimit)}`
        : "Set a budget →",
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
      </div>

      {/* Budget Alert */}
      {data.budget && budgetPercent >= 80 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: budgetPercent >= 100 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
            border: `1px solid ${budgetPercent >= 100 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
          }}
        >
          <AlertTriangle
            size={18}
            color={budgetPercent >= 100 ? "#ef4444" : "#f59e0b"}
          />
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {budgetPercent >= 100
              ? `⚠️ You've exceeded your monthly budget of ${formatCurrency(data.budget.monthlyLimit)}!`
              : `You've used ${budgetPercent}% of your monthly budget. ${formatCurrency(data.budget.monthlyLimit - data.totalSpent)} remaining.`}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts + Recent row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Spending by Category
          </h2>
          {data.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {data.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(v), "spent"]}
                  contentStyle={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex items-center justify-center h-48 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No expenses this month
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent Expenses
          </h2>
          {data.recentExpenses.length > 0 ? (
            <div className="space-y-3">
              {data.recentExpenses.map((exp) => (
                <div key={exp._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {CATEGORY_ICONS[exp.category] || "📦"}
                    </span>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {exp.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {exp.category} · {format(new Date(exp.date), "d MMM")}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold mono" style={{ color: "#ef4444" }}>
                    -{formatCurrency(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-48 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No expenses yet this month
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components 

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={15} color={color} />
        </div>
      </div>
      <p className="text-xl font-bold mono mb-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg" style={{ background: "var(--bg-card)" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-28" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card h-72" />
        <div className="card h-72" />
      </div>
    </div>
  );
}