# ml-service/routers/budget.py
#
# FEATURE 2: Smart Budget Recommendation
#
# ENDPOINT: POST /api/ml/recommend-budget
# INPUT:  { "expenses": [ {month, category, total}, ... ] }
# OUTPUT: { "monthly_limit": 32000, "category_limits": {...}, "insights": [...] }
#
# HOW IT WORKS:
# 1. Fetch user's last 3-6 months of expenses from MongoDB
# 2. Group by category and calculate averages + trends
# 3. Apply Linear Regression to predict next month's spending per category
# 4. Add 10% buffer for safety margin
# 5. Return recommended budget breakdown

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────────
class MonthlyExpense(BaseModel):
    month: str      # "2026-01" format
    category: str   # "Food & Dining"
    total: float    # 8500.0

class BudgetRequest(BaseModel):
    expenses: List[MonthlyExpense]
    buffer_percent: float = 10.0   # add 10% buffer on top of prediction

class CategoryBudget(BaseModel):
    recommended: float
    average: float
    trend: str      # "increasing" | "decreasing" | "stable"
    trend_percent: float

class BudgetResponse(BaseModel):
    monthly_limit: float
    category_limits: Dict[str, CategoryBudget]
    insights: List[str]
    months_analyzed: int

# ── Helper Functions ───────────────────────────────────────────────────────────
def detect_trend(values: List[float]) -> tuple:
    """
    Use Linear Regression to detect spending trend.
    Returns: (trend_label, trend_percent_change)
    """
    if len(values) < 2:
        return "stable", 0.0

    X = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values)

    reg = LinearRegression()
    reg.fit(X, y)

    slope = reg.coef_[0]
    mean_val = np.mean(y)

    if mean_val == 0:
        return "stable", 0.0

    # Percent change per month
    trend_pct = (slope / mean_val) * 100

    if trend_pct > 5:
        return "increasing", round(trend_pct, 1)
    elif trend_pct < -5:
        return "decreasing", round(abs(trend_pct), 1)
    else:
        return "stable", round(abs(trend_pct), 1)

def predict_next_month(values: List[float]) -> float:
    """
    Predict next month's spending using Linear Regression.
    Falls back to average if insufficient data.
    """
    if len(values) < 2:
        return float(np.mean(values)) if values else 0.0

    X = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values)

    reg = LinearRegression()
    reg.fit(X, y)

    # Predict for next index
    next_idx = np.array([[len(values)]])
    prediction = reg.predict(next_idx)[0]

    # Never predict negative spending
    return max(0.0, float(prediction))

# ── Endpoint ───────────────────────────────────────────────────────────────────
@router.post("/recommend-budget", response_model=BudgetResponse)
def recommend_budget(req: BudgetRequest):
    """
    Analyze past expense data and recommend a smart budget
    for each category using Linear Regression trend analysis.
    """
    if not req.expenses:
        raise HTTPException(status_code=400, detail="No expense data provided")

    # Build DataFrame
    df = pd.DataFrame([e.dict() for e in req.expenses])

    # Sort months chronologically
    df = df.sort_values("month")
    months = sorted(df["month"].unique())
    months_analyzed = len(months)

    if months_analyzed < 1:
        raise HTTPException(status_code=400, detail="Insufficient data")

    # ── Per-category analysis ───────────────────────────────────────────────
    category_limits = {}
    insights = []
    total_recommended = 0.0

    categories = df["category"].unique()

    for cat in categories:
        cat_df = df[df["category"] == cat].sort_values("month")

        # Fill missing months with 0
        cat_totals = []
        for month in months:
            month_data = cat_df[cat_df["month"] == month]["total"]
            cat_totals.append(float(month_data.values[0]) if len(month_data) > 0 else 0.0)

        avg = np.mean(cat_totals)
        trend_label, trend_pct = detect_trend(cat_totals)
        predicted = predict_next_month(cat_totals)

        # Add buffer
        recommended = predicted * (1 + req.buffer_percent / 100)
        recommended = round(recommended, -2)  # Round to nearest 100
        recommended = max(recommended, 500.0)  # Minimum ₹500

        category_limits[cat] = CategoryBudget(
            recommended=recommended,
            average=round(avg, 2),
            trend=trend_label,
            trend_percent=trend_pct
        )
        total_recommended += recommended

        # Generate insights
        if trend_label == "increasing" and trend_pct > 10:
            insights.append(
                f"⚠️ Your {cat} spending is increasing by {trend_pct:.0f}% per month. "
                f"Consider reducing it."
            )
        elif trend_label == "decreasing" and trend_pct > 10:
            insights.append(
                f"✅ Great! Your {cat} spending decreased by {trend_pct:.0f}% recently."
            )

    # ── Overall insights ────────────────────────────────────────────────────
    if months_analyzed >= 3:
        # Find biggest spending category
        biggest_cat = max(category_limits.items(), key=lambda x: x[1].average)
        insights.insert(0,
            f"📊 You spend the most on {biggest_cat[0]}: "
            f"₹{biggest_cat[1].average:,.0f}/month on average."
        )

    return BudgetResponse(
        monthly_limit=round(total_recommended, -2),
        category_limits=category_limits,
        insights=insights,
        months_analyzed=months_analyzed
    )
