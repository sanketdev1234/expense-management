"use client";

import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Sparkles, Target, Lightbulb
} from "lucide-react";
import { formatCurrency, CATEGORY_ICONS } from "@/lib/utils";

const COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b",
  "#ef4444","#06b6d4","#84cc16","#f97316","#ec4899",
];

export default function AnalyticsPage() {
  const [monthlyData,   setMonthlyData]   = useState([]);
  const [categoryData,  setCategoryData]  = useState([]);
  const [mlInsights,    setMlInsights]    = useState(null);
  const [mlPrediction,  setMlPrediction]  = useState(null);
  const [mlBudgetRec,   setMlBudgetRec]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [mlLoading,     setMlLoading]     = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        // Build last 6 months
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(new Date(), 5 - i);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        });

        const results = await Promise.all(
          months.map((m) => fetch(`/api/expenses?month=${m}`).then((r) => r.json())
        ));

        const mData = months.map((m, i) => ({
          month:    format(new Date(m + "-01"), "MMM yy"),
          monthKey: m,
          total:    Array.isArray(results[i])
            ? results[i].reduce((s, e) => s + e.amount, 0) : 0,
        }));
        setMonthlyData(mData);

        const currExp = Array.isArray(results[results.length - 1])
          ? results[results.length - 1] : [];
        const catMap = {};
        currExp.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
        setCategoryData(
          Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
        );

        // Fetch all ML data in parallel
        const currentSpent   = mData[mData.length - 1]?.total || 0;
        const monthlyTotals  = mData.map((m) => ({ month: m.monthKey, total: m.total }));

        setMlLoading(true);
        const [insRes, predRes, budRes] = await Promise.allSettled([
          fetch("/api/ml/insights"),
          fetch("/api/ml/predict-spending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthly_totals:       monthlyTotals,
              current_month_spent:  currentSpent,
              budget_limit:         null,
            }),
          }),
          fetch("/api/ml/recommend-budget"),
        ]);

        if (insRes.status  === "fulfilled" && insRes.value.ok)  setMlInsights(await insRes.value.json());
        if (predRes.status === "fulfilled" && predRes.value.ok) setMlPrediction(await predRes.value.json());
        if (budRes.status  === "fulfilled" && budRes.value.ok)  setMlBudgetRec(await budRes.value.json());

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setMlLoading(false);
      }
    }
    fetchAll();
  }, []);

  const total6m       = monthlyData.reduce((s, m) => s + m.total, 0);
  const nonZeroMonths = monthlyData.filter((m) => m.total > 0).length;
  const avg           = nonZeroMonths > 0 ? total6m / nonZeroMonths : 0;
  const peakMonth     = [...monthlyData].sort((a, b) => b.total - a.total)[0];

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6 page-enter">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            6-month overview + AI-powered insights
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
          <Brain size={12} /> ML Powered
        </span>
      </div>

      {/* ── KPI Cards — 4 cards, last one is AI ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "6-Month Total",   value: formatCurrency(total6m),           color: "#3b82f6" },
          { label: "Monthly Average", value: formatCurrency(Math.round(avg)),    color: "#8b5cf6" },
          { label: "Peak Month",
            value: peakMonth?.total > 0 ? peakMonth.month : "—",
            sub:   peakMonth?.total > 0 ? formatCurrency(peakMonth.total) : "no data",
            color: "#f59e0b" },
          { label: "AI Prediction",
            value: mlPrediction ? formatCurrency(mlPrediction.predicted_month_total) : "—",
            sub:   mlPrediction ? `end of ${format(new Date(), "MMMM")}` : "loading...",
            color: mlPrediction?.will_exceed_budget ? "#ef4444" : "#10b981",
            ai: true },
        ].map((k) => (
          <div key={k.label} className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}>{k.label}</p>
              {k.ai && <Sparkles size={13} color="#a78bfa" />}
            </div>
            <p className="text-xl font-bold mono" style={{ color: k.color }}>{k.value}</p>
            {k.sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── ML Spending Prediction Banner ────────────────────────────────── */}
      {mlPrediction && (
        <div className="card" style={{
          borderColor: mlPrediction.will_exceed_budget
            ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"
        }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {mlPrediction.will_exceed_budget
                ? <AlertTriangle size={20} color="#ef4444" className="flex-shrink-0 mt-0.5" />
                : <CheckCircle   size={20} color="#10b981" className="flex-shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {mlPrediction.message}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Daily rate ₹{mlPrediction.daily_spending_rate?.toFixed(0)} ·{" "}
                  {mlPrediction.days_remaining} days remaining · confidence: {mlPrediction.confidence}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Predicted total</p>
              <p className="text-lg font-bold mono"
                style={{ color: mlPrediction.will_exceed_budget ? "#ef4444" : "#10b981" }}>
                {formatCurrency(mlPrediction.predicted_month_total)}
              </p>
            </div>
          </div>
          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Spent so far",  value: formatCurrency(mlPrediction.current_spent) },
              { label: "Daily rate",    value: `₹${mlPrediction.daily_spending_rate?.toFixed(0)}/day` },
              { label: "Days left",     value: `${mlPrediction.days_remaining} days` },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-xl p-2"
                style={{ background: "var(--bg-input)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bar Chart ────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
          Monthly Spending Trend
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} barSize={36}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill:"#64748b", fontSize:13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:"#64748b", fontSize:12 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip formatter={(v) => [formatCurrency(v), "Spent"]}
              contentStyle={{ background:"var(--bg-input)", border:"1px solid var(--border)",
                borderRadius:"10px", color:"var(--text-primary)", fontSize:"12px" }}
              cursor={{ fill:"rgba(59,130,246,0.06)" }} />
            <Bar dataKey="total" fill="url(#barGrad)" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pie + Category Breakdown ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color:"var(--text-primary)" }}>
            This Month by Category
          </h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55}
                  outerRadius={85} dataKey="value" paddingAngle={3}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [formatCurrency(v), ""]}
                  contentStyle={{ background:"var(--bg-input)", border:"1px solid var(--border)",
                    borderRadius:"10px", fontSize:"12px" }} />
                <Legend formatter={(v) => (
                  <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>{v}</span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm"
              style={{ color:"var(--text-muted)" }}>No expenses this month</div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color:"var(--text-primary)" }}>
            Category Breakdown
          </h2>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((entry, i) => (
                <div key={entry.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm" style={{ color:"var(--text-muted)" }}>
                        {CATEGORY_ICONS[entry.name]} {entry.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold mono" style={{ color:"var(--text-primary)" }}>
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden ml-5"
                    style={{ background:"var(--bg-input)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min((entry.value / (categoryData[0]?.value||1)) * 100, 100)}%`,
                      background: COLORS[i % COLORS.length],
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm"
              style={{ color:"var(--text-muted)" }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── AI Smart Insights ────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Brain size={18} color="#8b5cf6" />
          <h2 className="font-semibold" style={{ color:"var(--text-primary)" }}>
            AI Smart Insights
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background:"rgba(139,92,246,0.15)", color:"#a78bfa" }}>
            Powered by ML
          </span>
        </div>

        {mlLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl" style={{ background:"var(--bg-input)", width:`${80+i*5}%` }} />
            ))}
          </div>
        ) : mlInsights ? (
          <div className="space-y-5">

            {/* Spender Pattern */}
            <div className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background:"var(--bg-input)" }}>
              <span className="text-3xl flex-shrink-0">
                {mlInsights.pattern_type === "Saver" ? "🏆"
                  : mlInsights.pattern_type === "Balanced" ? "👍" : "⚠️"}
              </span>
              <div>
                <p className="font-bold" style={{ color:"var(--text-primary)" }}>
                  Spending Pattern: {mlInsights.pattern_type}
                </p>
                <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                  {mlInsights.pattern_description}
                </p>
              </div>
            </div>

            {/* Insight messages */}
            {mlInsights.insights?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color:"var(--text-muted)" }}>Key Observations</p>
                {mlInsights.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background:"var(--bg-input)" }}>
                    <span className="text-lg flex-shrink-0">{insight.slice(0,2)}</span>
                    <p className="text-sm" style={{ color:"var(--text-muted)" }}>{insight.slice(2)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Weekend vs Weekday */}
            {mlInsights.weekend_vs_weekday?.weekend_average > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color:"var(--text-muted)" }}>Weekend vs Weekday Spending</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:"Weekend avg/expense",  value: mlInsights.weekend_vs_weekday.weekend_average, color:"#f59e0b" },
                    { label:"Weekday avg/expense",  value: mlInsights.weekend_vs_weekday.weekday_average, color:"#3b82f6" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl text-center"
                      style={{ background:"var(--bg-input)" }}>
                      <p className="text-xl font-bold mono" style={{ color:item.color }}>
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>{item.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2 text-center" style={{ color:"var(--text-muted)" }}>
                  You spend more on{" "}
                  <span style={{ color:"#f59e0b" }}>
                    {mlInsights.weekend_vs_weekday.spends_more_on}
                  </span>
                </p>
              </div>
            )}

            {/* Category Trends */}
            {mlInsights.category_analysis &&
              Object.keys(mlInsights.category_analysis).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color:"var(--text-muted)" }}>Category Trends (Month-over-Month)</p>
                <div className="space-y-2">
                  {Object.entries(mlInsights.category_analysis)
                    .sort((a,b) => b[1].total - a[1].total)
                    .slice(0, 6)
                    .map(([cat, data]) => (
                      <div key={cat} className="flex items-center justify-between py-2 px-3 rounded-xl"
                        style={{ background:"var(--bg-input)" }}>
                        <div className="flex items-center gap-2">
                          {data.trend === "increasing"
                            ? <TrendingUp  size={14} color="#ef4444" />
                            : data.trend === "decreasing"
                            ? <TrendingDown size={14} color="#10b981" />
                            : <span className="w-3 h-0.5 inline-block rounded"
                                style={{ background:"#64748b" }} />}
                          <span className="text-sm" style={{ color:"var(--text-muted)" }}>
                            {CATEGORY_ICONS[cat]} {cat}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                            background: data.mom_change > 5 ? "rgba(239,68,68,0.1)"
                              : data.mom_change < -5 ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)",
                            color: data.mom_change > 5 ? "#ef4444"
                              : data.mom_change < -5 ? "#10b981" : "var(--text-muted)",
                          }}>
                            {data.mom_change > 0 ? "+" : ""}{data.mom_change?.toFixed(0)}% MoM
                          </span>
                          <span className="text-sm font-semibold mono"
                            style={{ color:"var(--text-primary)" }}>
                            {formatCurrency(data.average_per_month)}/mo
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10" style={{ color:"var(--text-muted)" }}>
            <Brain size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Add more expenses to unlock AI insights</p>
            <p className="text-xs mt-1">Need at least 3 expenses across multiple categories</p>
          </div>
        )}
      </div>

      {/* ── AI Budget Recommendations ─────────────────────────────────────── */}
      {mlBudgetRec && mlBudgetRec.category_limits && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Target size={18} color="#10b981" />
            <h2 className="font-semibold" style={{ color:"var(--text-primary)" }}>
              AI Budget Recommendations
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background:"rgba(16,185,129,0.15)", color:"#34d399" }}>
              Based on your history
            </span>
          </div>

          <div className="mb-4 p-3 rounded-xl flex items-center justify-between"
            style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)" }}>
            <div>
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>Suggested Monthly Limit</p>
              <p className="text-2xl font-bold mono" style={{ color:"#10b981" }}>
                {formatCurrency(mlBudgetRec.monthly_limit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>Based on</p>
              <p className="text-sm font-medium" style={{ color:"var(--text-primary)" }}>
                {mlBudgetRec.months_analyzed} months data
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {Object.entries(mlBudgetRec.category_limits)
              .sort((a,b) => b[1].recommended - a[1].recommended)
              .slice(0, 6)
              .map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background:"var(--bg-input)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color:"var(--text-primary)" }}>{cat}</p>
                      <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                        Avg {formatCurrency(data.average)}/mo ·{" "}
                        <span style={{
                          color: data.trend === "increasing" ? "#ef4444"
                            : data.trend === "decreasing" ? "#10b981" : "var(--text-muted)"
                        }}>
                          {data.trend}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color:"var(--text-muted)" }}>Suggested limit</p>
                    <p className="text-sm font-bold mono" style={{ color:"#10b981" }}>
                      {formatCurrency(data.recommended)}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {/* Budget insights from ML */}
          {mlBudgetRec.insights?.length > 0 && (
            <div className="mt-4 space-y-2">
              {mlBudgetRec.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                  style={{ background:"var(--bg-input)" }}>
                  <Lightbulb size={14} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>{ins}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-36 rounded" style={{ background:"var(--bg-card)" }} />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_,i) => <div key={i} className="card h-24" />)}
      </div>
      <div className="card h-20" />
      <div className="card h-72" />
      <div className="grid grid-cols-2 gap-4">
        <div className="card h-64" /> <div className="card h-64" />
      </div>
      <div className="card h-80" />
      <div className="card h-64" />
    </div>
  );
}