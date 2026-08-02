
const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

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

    console.error(`ML service unavailable [${endpoint}]:`, error.message);
    return null;
  }
}

 
export async function predictCategory(title) {
  return mlFetch("/api/ml/predict-category", { title });
}


export async function recommendBudget(expenses, bufferPercent = 10) {
  return mlFetch("/api/ml/recommend-budget", {
    expenses,
    buffer_percent: bufferPercent,
  });
}


export async function detectAnomaly(expense, history) {
  return mlFetch("/api/ml/detect-anomaly", { expense, history });
}


export async function predictSpending(monthlyTotals, currentSpent, budgetLimit) {
  return mlFetch("/api/ml/predict-spending", {
    monthly_totals: monthlyTotals,
    current_month_spent: currentSpent,
    budget_limit: budgetLimit,
  });
}

 
export async function getInsights(expenses, monthlyIncome) {
  return mlFetch("/api/ml/insights", {
    expenses,
    monthly_income: monthlyIncome,
  });
}
