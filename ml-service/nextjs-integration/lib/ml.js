// lib/ml.js
//
// PURPOSE: Helper functions to call the Python FastAPI ML service
// from Next.js API routes. All ML calls go through this file.
//
// USAGE: Import in any API route:
//   import { predictCategory, detectAnomaly } from "@/lib/ml"

const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper for ML service calls
 */
async function mlFetch(endpoint, body) {
  try {
    const res = await fetch(`${ML_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`ML service error [${endpoint}]:`, err);
      return null;
    }

    return await res.json();
  } catch (error) {
    // ML service down — fail gracefully, don't crash the app
    console.error(`ML service unavailable [${endpoint}]:`, error.message);
    return null;
  }
}

// ── Feature 1: Category Prediction ─────────────────────────────────────────
export async function predictCategory(title) {
  return mlFetch("/api/ml/predict-category", { title });
}

// ── Feature 2: Budget Recommendation ───────────────────────────────────────
export async function recommendBudget(expenses, bufferPercent = 10) {
  return mlFetch("/api/ml/recommend-budget", {
    expenses,
    buffer_percent: bufferPercent,
  });
}

// ── Feature 4: Anomaly Detection ────────────────────────────────────────────
export async function detectAnomaly(expense, history) {
  return mlFetch("/api/ml/detect-anomaly", { expense, history });
}

// ── Feature 5: Spending Prediction ─────────────────────────────────────────
export async function predictSpending(monthlyTotals, currentSpent, budgetLimit) {
  return mlFetch("/api/ml/predict-spending", {
    monthly_totals: monthlyTotals,
    current_month_spent: currentSpent,
    budget_limit: budgetLimit,
  });
}

// ── Feature 3+6: Smart Insights ─────────────────────────────────────────────
export async function getInsights(expenses, monthlyIncome) {
  return mlFetch("/api/ml/insights", {
    expenses,
    monthly_income: monthlyIncome,
  });
}
