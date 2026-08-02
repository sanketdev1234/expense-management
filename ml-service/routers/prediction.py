
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from datetime import datetime, date
from sklearn.linear_model import LinearRegression

router = APIRouter()

#  Schemas 
class MonthlyTotal(BaseModel):
    month: str   # "2026-01"
    total: float

class PredictionRequest(BaseModel):
    monthly_totals: List[MonthlyTotal]   # Past 3-6 months
    current_month_spent: float            # How much spent so far THIS month
    current_date: Optional[str] = None   # "2026-03-18" (defaults to today)
    budget_limit: Optional[float] = None # To calculate will-exceed warning

class PredictionResponse(BaseModel):
    predicted_month_total: float
    current_spent: float
    days_elapsed: int
    days_remaining: int
    days_in_month: int
    daily_spending_rate: float
    projected_from_daily_rate: float
    will_exceed_budget: Optional[bool]
    excess_amount: Optional[float]
    confidence: str   # "high" | "medium" | "low"
    message: str

#  Endpoint 
@router.post("/predict-spending", response_model=PredictionResponse)
def predict_spending(req: PredictionRequest):
    """
    Predict end-of-month total spending using:
    1. Linear Regression on historical monthly data
    2. Daily rate projection for current month
    Combined into a weighted average prediction.
    """
    if not req.monthly_totals:
        raise HTTPException(status_code=400, detail="No monthly data provided")

    #  Date Setup 
    if req.current_date:
        today = datetime.strptime(req.current_date, "%Y-%m-%d").date()
    else:
        today = date.today()

    days_elapsed = today.day
    # Last day of current month
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    days_in_month = (next_month - date(today.year, today.month, 1)).days
    days_remaining = days_in_month - days_elapsed

    # ── Method 1: Linear Regression on historical data 
    sorted_totals = sorted(req.monthly_totals, key=lambda x: x.month)
    historical_values = [m.total for m in sorted_totals]

    if len(historical_values) >= 2:
        X = np.arange(len(historical_values)).reshape(-1, 1)
        y = np.array(historical_values)
        reg = LinearRegression()
        reg.fit(X, y)
        lr_prediction = float(reg.predict([[len(historical_values)]])[0])
        lr_prediction = max(0.0, lr_prediction)
        confidence = "high" if len(historical_values) >= 4 else "medium"
    else:
        lr_prediction = float(np.mean(historical_values))
        confidence = "low"

    # ── Method 2: Daily Rate Projection 
    if days_elapsed > 0:
        daily_rate = req.current_month_spent / days_elapsed
        projected_from_daily = req.current_month_spent + (daily_rate * days_remaining)
    else:
        daily_rate = 0.0
        projected_from_daily = lr_prediction

    # ── Weighted Average (60% LR, 40% daily rate) 
    # More weight to daily rate when month is well underway
    if days_elapsed >= 10:
        weight_daily = 0.6
        weight_lr = 0.4
    else:
        weight_daily = 0.3
        weight_lr = 0.7

    final_prediction = (lr_prediction * weight_lr) + (projected_from_daily * weight_daily)
    final_prediction = round(final_prediction, -2)  # Round to nearest 100

    # ── Budget Check 
    will_exceed = None
    excess_amount = None
    if req.budget_limit:
        will_exceed = final_prediction > req.budget_limit
        excess_amount = round(final_prediction - req.budget_limit, 2)

    # ── Message 
    if will_exceed:
        message = (
            f"⚠️ You may exceed your budget by ₹{excess_amount:,.0f} this month. "
            f"Try to spend less than  eqaul to  ₹{req.budget_limit-(days_elapsed*daily_rate) /days_remaining :,.0f}/day."
        )
    elif req.budget_limit and final_prediction < req.budget_limit * 0.8:
        message = f"✅ You're on track! Predicted to use {(final_prediction/req.budget_limit)*100:.0f}% of your budget."
    else:
        message = f"📊 Predicted month-end spending: ₹{final_prediction:,.0f}"

    return PredictionResponse(
        predicted_month_total=final_prediction,
        current_spent=req.current_month_spent,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        days_in_month=days_in_month,
        daily_spending_rate=round(daily_rate, 2),
        projected_from_daily_rate=round(projected_from_daily, 2),
        will_exceed_budget=will_exceed,
        excess_amount=excess_amount,
        confidence=confidence,
        message=message
    )
