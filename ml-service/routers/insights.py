# ml-service/routers/insights.py
#
# FEATURE 3 + 6: Spending Pattern Analysis + Smart Insights
#
# ENDPOINT: POST /api/ml/insights
# INPUT:  { "expenses": [...all user expenses...] }
# OUTPUT: { "insights": [...], "pattern_type": "balanced", "category_analysis": {...} }
#
# WHAT IT DETECTS:
# - Which category you overspend on
# - Month-over-month % change per category
# - Weekend vs weekday spending comparison
# - User spending pattern type (Saver / Balanced / Heavy Spender)
# - Actionable reduction suggestions

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
from datetime import datetime

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────────
class ExpenseItem(BaseModel):
    title: str
    amount: float
    category: str
    date: str   # "2026-03-15"

class InsightsRequest(BaseModel):
    expenses: List[ExpenseItem]
    monthly_income: Optional[float] = None   # Optional: for % of income analysis

class CategoryAnalysis(BaseModel):
    total: float
    average_per_month: float
    percent_of_spending: float
    trend: str   # "increasing" | "decreasing" | "stable"
    mom_change: float   # Month-over-month % change

class InsightsResponse(BaseModel):
    insights: List[str]
    pattern_type: str          # "Saver" | "Balanced" | "Heavy Spender"
    pattern_description: str
    category_analysis: Dict[str, CategoryAnalysis]
    weekend_vs_weekday: Dict
    top_category: str
    months_analyzed: int

# ── Helper Functions ───────────────────────────────────────────────────────────
def classify_spender(total_monthly_avg: float, income: Optional[float]) -> tuple:
    """Classify user spending pattern"""
    if income:
        ratio = total_monthly_avg / income
        if ratio < 0.5:
            return "Saver", "You save more than 50% of your income. Excellent financial discipline! 🏆"
        elif ratio < 0.75:
            return "Balanced", "You have a balanced approach to spending and saving. 👍"
        else:
            return "Heavy Spender", "You're spending more than 75% of your income. Consider reducing expenses. ⚠️"
    else:
        return "Analyzer", "Add your monthly income in settings for personalized insights."

def get_mom_change(monthly_data: pd.Series) -> float:
    """Calculate month-over-month % change"""
    if len(monthly_data) < 2:
        return 0.0
    last = monthly_data.iloc[-1]
    prev = monthly_data.iloc[-2]
    if prev == 0:
        return 0.0
    return round(((last - prev) / prev) * 100, 1)

# ── Endpoint ───────────────────────────────────────────────────────────────────
@router.post("/insights", response_model=InsightsResponse)
def get_insights(req: InsightsRequest):
    """
    Analyze expense patterns and generate smart insights
    including spending pattern classification, category trends,
    and weekend vs weekday analysis.
    """
    if len(req.expenses) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 expenses for insights")

    # ── Build DataFrame ─────────────────────────────────────────────────────
    df = pd.DataFrame([e.dict() for e in req.expenses])
    print(df)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.strftime("%Y-%m")
    df["day_of_week"] = df["date"].dt.dayofweek  # 0=Mon, 6=Sun
    df["is_weekend"] = df["day_of_week"] >= 5
    print(df)
    months = sorted(df["month"].unique())
    months_analyzed = len(months)
    print(months)
    insights = []

    # ── Category Analysis ───────────────────────────────────────────────────
    total_spending = df["amount"].sum()
    category_analysis = {}

    for cat in df["category"].unique():
        cat_df = df[df["category"] == cat]
        cat_total = float(cat_df["amount"].sum())
        cat_pct = round((cat_total / total_spending) * 100, 1) if total_spending > 0 else 0

        # Monthly breakdown
        monthly = cat_df.groupby("month")["amount"].sum().reindex(months, fill_value=0)
        avg_per_month = float(monthly.mean())
        mom = get_mom_change(monthly)

        # Trend detection
        if len(monthly) >= 2:
            if mom > 10:
                trend = "increasing"
            elif mom < -10:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "stable"

        category_analysis[cat] = CategoryAnalysis(
            total=round(cat_total, 2),
            average_per_month=round(avg_per_month, 2),
            percent_of_spending=cat_pct,
            trend=trend,
            mom_change=mom
        )

    # ── Weekend vs Weekday ──────────────────────────────────────────────────
    weekend_df = df[df["is_weekend"]]
    weekday_df = df[~df["is_weekend"]]

    weekend_avg = float(weekend_df["amount"].mean()) if len(weekend_df) > 0 else 0
    weekday_avg = float(weekday_df["amount"].mean()) if len(weekday_df) > 0 else 0
    weekend_total = float(weekend_df["amount"].sum())
    weekday_total = float(weekday_df["amount"].sum())

    weekend_ratio = weekend_avg / weekday_avg if weekday_avg > 0 else 1.0

    weekend_vs_weekday = {
        "weekend_average": round(weekend_avg, 2),
        "weekday_average": round(weekday_avg, 2),
        "weekend_total": round(weekend_total, 2),
        "weekday_total": round(weekday_total, 2),
        "weekend_ratio": round(weekend_ratio, 2),
        "spends_more_on": "weekends" if weekend_ratio > 1.2 else "weekdays" if weekend_ratio < 0.8 else "both equally"
    }

    # ── Generate Insights ───────────────────────────────────────────────────
    # Top category insight
    top_cat = max(category_analysis.items(), key=lambda x: x[1].total)
    top_cat_name = top_cat[0]
    top_cat_pct = top_cat[1].percent_of_spending
    insights.append(
        f"📊 You spend the most on {top_cat_name} ({top_cat_pct:.0f}% of total spending)."
    )

    # Month-over-month changes
    for cat, analysis in category_analysis.items():
        if analysis.mom_change > 25:
            insights.append(
                f"⚠️ Your {cat} spending increased by {analysis.mom_change:.0f}% this month."
            )
        elif analysis.mom_change < -20:
            insights.append(
                f"✅ Your {cat} spending decreased by {abs(analysis.mom_change):.0f}% this month — great job!"
            )

    # Weekend insight
    if weekend_ratio > 1.5:
        insights.append(
            f"🗓️ Your weekend spending is {weekend_ratio:.1f}× higher than weekdays "
            f"(₹{weekend_avg:,.0f} vs ₹{weekday_avg:,.0f} per expense). "
            f"Consider planning weekend activities in advance."
        )

    # Income percentage insight
    monthly_totals = df.groupby("month")["amount"].sum()
    avg_monthly = float(monthly_totals.mean())

    if req.monthly_income:
        pct_income = (avg_monthly / req.monthly_income) * 100
        savings = req.monthly_income - avg_monthly
        insights.append(
            f"💰 You spend {pct_income:.0f}% of your income (₹{avg_monthly:,.0f}/month). "
            f"You save approximately ₹{savings:,.0f}/month."
        )

    # Reduction suggestion
    if top_cat_pct > 35:
        insights.append(
            f"💡 Consider reducing {top_cat_name} by 10–15% to save "
            f"₹{top_cat[1].average_per_month * 0.12:,.0f}/month."
        )

    # ── Spender Classification ──────────────────────────────────────────────
    pattern_type, pattern_description = classify_spender(avg_monthly, req.monthly_income)

    return InsightsResponse(
        insights=insights,
        pattern_type=pattern_type,
        pattern_description=pattern_description,
        category_analysis=category_analysis,
        weekend_vs_weekday=weekend_vs_weekday,
        top_category=top_cat_name,
        months_analyzed=months_analyzed
    )
