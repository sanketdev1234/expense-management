/**
 * app/(dashboard)/analytics/page.js  — Analytics Page  /analytics
 *
 * WHAT IT SHOWS:
 * - 6-month total + monthly average KPIs
 * - Bar chart: month-by-month spending trend (last 6 months)
 * - Pie chart: current month spending by category
 * - Category breakdown table
 *
 * PHASE 4 (Day 3): Build after dashboard page is working.
 */

"use client";

import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency, CATEGORY_ICONS } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#ec4899",
];

export default function AnalyticsPage() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // Build array of last 6 months in "YYYY-MM" format, oldest first
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(new Date(), 5 - i);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        });

        // Fetch all months in parallel
        const results = await Promise.all(
          months.map((m) =>
            fetch(`/api/expenses?month=${m}`).then((r) => r.json())
          )
        );

        // Build monthly totals for bar chart
        const mData = months.map((m, i) => ({
          month: format(new Date(m + "-01"), "MMM yy"),
          total: Array.isArray(results[i])
            ? results[i].reduce((sum, e) => sum + e.amount, 0)
            : 0,
        }));
        setMonthlyData(mData);

        // Category breakdown for current month (last item)
        const currentExpenses = Array.isArray(results[results.length - 1])
          ? results[results.length - 1]
          : [];
        const catMap = {};
        currentExpenses.forEach((e) => {
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });
        const catData = Object.entries(catMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        setCategoryData(catData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const total6m = monthlyData.reduce((s, m) => s + m.total, 0);
  const nonZeroMonths = monthlyData.filter((m) => m.total > 0).length;
  const avg = nonZeroMonths > 0 ? total6m / nonZeroMonths : 0;
  const peakMonth = [...monthlyData].sort((a, b) => b.total - a.total)[0];

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          6-month spending overview
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "6-Month Total",
            value: formatCurrency(total6m),
            color: "#3b82f6",
          },
          {
            label: "Monthly Average",
            value: formatCurrency(Math.round(avg)),
            color: "#8b5cf6",
          },
          {
            label: "Peak Month",
            value: peakMonth?.total > 0 ? peakMonth.month : "—",
            sub: peakMonth?.total > 0 ? formatCurrency(peakMonth.total) : "no data",
            color: "#f59e0b",
          },
        ].map((k) => (
          <div key={k.label} className="card">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              {k.label}
            </p>
            <p className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>
              {k.value}
            </p>
            {k.sub && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {k.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart: 6-month trend */}
      <div className="card">
        <h2 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
          Monthly Spending Trend
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} barSize={36}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
              }
            />
            <Tooltip
              formatter={(v) => [formatCurrency(v), "Spent"]}
              contentStyle={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
              cursor={{ fill: "rgba(59,130,246,0.06)" }}
            />
            <Bar dataKey="total" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + Category table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            This Month by Category
          </h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(v), ""]}
                  contentStyle={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
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

        {/* Category breakdown table */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Category Breakdown
          </h2>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((entry, i) => {
                const pct = total6m > 0 ? Math.round((entry.value / (total6m / 6)) * 100) : 0;
                return (
                  <div key={entry.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {CATEGORY_ICONS[entry.name]} {entry.name}
                        </span>
                      </div>
                      <span
                        className="text-sm font-semibold mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(entry.value)}
                      </span>
                    </div>
                    {/* Small bar */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden ml-5"
                      style={{ background: "var(--bg-input)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            (entry.value /
                              (categoryData[0]?.value || 1)) *
                              100,
                            100
                          )}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-48 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-36 rounded" style={{ background: "var(--bg-card)" }} />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-72" />
      <div className="grid grid-cols-2 gap-4">
        <div className="card h-72" />
        <div className="card h-72" />
      </div>
    </div>
  );
}