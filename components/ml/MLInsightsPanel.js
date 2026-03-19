// components/ml/MLInsightsPanel.js
// Add this component to your app/(dashboard)/analytics/page.js
// Shows AI-generated insights, spending pattern, and predictions

"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function MLInsightsPanel({ currentMonthSpent, budgetLimit, monthlyTotals }) {
  const [insights, setInsights] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [budgetRec, setBudgetRec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMLData() {
      try {
        // Fetch insights
        const [insightsRes, predRes] = await Promise.all([
          fetch("/api/ml/insights"),
          fetch("/api/ml/predict-spending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthly_totals: monthlyTotals,
              current_month_spent: currentMonthSpent,
              budget_limit: budgetLimit,
            }),
          }),
        ]);

        if (insightsRes.ok) setInsights(await insightsRes.json());
        if (predRes.ok) setPrediction(await predRes.json());
      } catch (err) {
        console.error("ML data fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (monthlyTotals && monthlyTotals.length > 0) {
      fetchMLData();
    } else {
      setLoading(false);
    }
  }, [currentMonthSpent, budgetLimit, monthlyTotals]);

  if (loading) return <MLSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={20} color="#8b5cf6" />
        <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
          AI Insights
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
          Powered by ML
        </span>
      </div>

      {/* Spending Prediction Card */}
      {prediction && (
        <div className="card" style={{ borderColor: prediction.will_exceed_budget ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                Month-End Prediction
              </p>
              <p className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(prediction.predicted_month_total)}
              </p>
            </div>
            {prediction.will_exceed_budget ? (
              <AlertTriangle size={22} color="#ef4444" />
            ) : (
              <CheckCircle size={22} color="#10b981" />
            )}
          </div>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            {prediction.message}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Spent", value: formatCurrency(prediction.current_spent) },
              { label: "Daily Rate", value: formatCurrency(prediction.daily_spending_rate) },
              { label: "Days Left", value: prediction.days_remaining },
            ].map((item) => (
              <div key={item.label} className="rounded-lg p-2" style={{ background: "var(--bg-input)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                <p className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Type Card */}
      {insights && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(139,92,246,0.15)" }}>
              {insights.pattern_type === "Saver" ? "🏆" :
               insights.pattern_type === "Balanced" ? "👍" : "⚠️"}
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                {insights.pattern_type}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {insights.pattern_description}
              </p>
            </div>
          </div>

          {/* Weekend vs Weekday */}
          {insights.weekend_vs_weekday?.weekend_average > 0 && (
            <div className="rounded-xl p-3 mb-4" style={{ background: "var(--bg-input)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                Weekend vs Weekday Spending
              </p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(insights.weekend_vs_weekday.weekend_average)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Weekend avg</p>
                </div>
                <div className="text-2xl">vs</div>
                <div className="text-center">
                  <p className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(insights.weekend_vs_weekday.weekday_average)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Weekday avg</p>
                </div>
              </div>
            </div>
          )}

          {/* Insights List */}
          <div className="space-y-2">
            {insights.insights?.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <span className="flex-shrink-0">{insight.slice(0, 2)}</span>
                <span>{insight.slice(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Trends */}
      {insights?.category_analysis && Object.keys(insights.category_analysis).length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Category Trends
          </h3>
          <div className="space-y-2">
            {Object.entries(insights.category_analysis)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 5)
              .map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {data.trend === "increasing" ? (
                      <TrendingUp size={14} color="#ef4444" />
                    ) : data.trend === "decreasing" ? (
                      <TrendingDown size={14} color="#10b981" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: "#64748b" }} />
                    )}
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{cat}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{
                      color: data.mom_change > 0 ? "#ef4444" : data.mom_change < 0 ? "#10b981" : "var(--text-muted)"
                    }}>
                      {data.mom_change > 0 ? "+" : ""}{data.mom_change.toFixed(0)}% MoM
                    </span>
                    <span className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(data.average_per_month)}/mo
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MLSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 rounded" style={{ background: "var(--bg-card)" }} />
      <div className="card h-40" />
      <div className="card h-56" />
    </div>
  );
}
