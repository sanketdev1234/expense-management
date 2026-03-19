"""
ml-service/routes/spending_predictor.py
─────────────────────────────────────────────────────────────
FEATURE 4: Expense Prediction (Future Spending)

HOW IT WORKS:
  Method 1 — Linear Regression on daily cumulative spending:
    - Plot spending so far this month day by day
    - Fit a line through the points
    - Extrapolate to end of month

  Method 2 — Monthly average × days remaining:
    - Daily average = total so far / days elapsed
    - Predicted end-of-month = daily_avg × total_days_in_month

  Both predictions are blended (60% regression, 40% average).

DATA REQUIRED FROM YOUR APP:
  - All expenses for the current month with dates
  - Format: list of { amount, date } for current month

ENDPOINT:
  POST /api/ml/predict-spending
─────────────────────────────────────────────────────────────
"""

import numpy as np
from datetime import datetime, date
import calendar
from flask import Blueprint, request, jsonify
from sklearn.linear_model import LinearRegression

spending_bp = Blueprint("spending", __name__)


# ── POST /api/ml/predict-spending ────────────────────────────────────────────
@spending_bp.route("/predict-spending", methods=["POST"])
def predict_spending():
    """
    Predict end-of-month spending based on current month expenses.

    Request body:
    {
      "expenses": [
        { "amount": 350, "date": "2026-03-01" },
        { "amount": 280, "date": "2026-03-03" },
        { "amount": 1200, "date": "2026-03-07" }
      ],
      "budget_limit": 30000,
      "month": "2026-03"
    }

    Response:
    {
      "predicted_total": 24500,
      "current_total": 9800,
      "days_elapsed": 10,
      "days_remaining": 21,
      "daily_average": 980,
      "will_exceed_budget": false,
      "budget_limit": 30000,
      "message": "You're on track. Predicted: ₹24,500 of ₹30,000 budget."
    }
    """
    try:
        body = request.get_json()
        expenses = body.get("expenses", [])
        budget_limit = body.get("budget_limit", 0)
        month_str = body.get("month", datetime.now().strftime("%Y-%m"))

        if not expenses:
            return jsonify({
                "success": True,
                "predicted_total": 0,
                "current_total": 0,
                "message": "No expenses recorded yet this month.",
                "days_elapsed": 0,
            })

        # Parse month
        year, month = map(int, month_str.split("-"))
        total_days = calendar.monthrange(year, month)[1]
        today = date.today()
        days_elapsed = min(today.day, total_days)
        days_remaining = total_days - days_elapsed

        # Build daily cumulative spending
        # day_totals[i] = total spending on day i of the month
        day_totals = {}
        for e in expenses:
            date_str = e.get("date", "")[:10]  # take only YYYY-MM-DD
            try:
                exp_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                day = exp_date.day
            except Exception:
                continue
            day_totals[day] = day_totals.get(day, 0) + float(e.get("amount", 0))

        # Build cumulative series up to today
        cumulative = []
        running = 0
        for d in range(1, days_elapsed + 1):
            running += day_totals.get(d, 0)
            cumulative.append((d, running))

        current_total = running

        if days_elapsed == 0:
            return jsonify({
                "success": True,
                "predicted_total": 0,
                "current_total": 0,
                "days_elapsed": 0,
                "days_remaining": total_days,
                "message": "No spending data yet for this month."
            })

        # Method 1: Linear Regression on cumulative spending
        X = np.array([c[0] for c in cumulative]).reshape(-1, 1)
        y = np.array([c[1] for c in cumulative])

        lr = LinearRegression()
        lr.fit(X, y)
        predicted_lr = float(lr.predict([[total_days]])[0])
        predicted_lr = max(predicted_lr, current_total)  # can't be less than current

        # Method 2: Daily average extrapolation
        daily_avg = current_total / days_elapsed
        predicted_avg = daily_avg * total_days

        # Blend: 60% regression + 40% daily average
        predicted_total = round(0.6 * predicted_lr + 0.4 * predicted_avg)
        predicted_total = max(predicted_total, current_total)

        # Budget analysis
        will_exceed = budget_limit > 0 and predicted_total > budget_limit
        budget_gap = budget_limit - predicted_total if budget_limit > 0 else None

        # Safe daily spend for remaining days
        if days_remaining > 0 and budget_limit > 0:
            safe_daily = max(0, (budget_limit - current_total) / days_remaining)
        else:
            safe_daily = daily_avg

        # Build message
        if budget_limit > 0:
            if will_exceed:
                overshoot = predicted_total - budget_limit
                message = (
                    f"⚠️ You may exceed your budget by ₹{int(overshoot):,}. "
                    f"Spend max ₹{int(safe_daily):,}/day for the remaining {days_remaining} days to stay on track."
                )
            else:
                message = (
                    f"✅ You're on track! Predicted: ₹{int(predicted_total):,} "
                    f"of ₹{int(budget_limit):,} budget. "
                    f"₹{int(budget_gap):,} to spare."
                )
        else:
            message = (
                f"Based on your spending pace, you'll spend approximately "
                f"₹{int(predicted_total):,} this month."
            )

        return jsonify({
            "success": True,
            "predicted_total": int(predicted_total),
            "current_total": int(current_total),
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "total_days_in_month": total_days,
            "daily_average": round(daily_avg),
            "safe_daily_spend": round(safe_daily),
            "will_exceed_budget": will_exceed,
            "budget_limit": budget_limit,
            "budget_gap": int(budget_gap) if budget_gap is not None else None,
            "prediction_breakdown": {
                "linear_regression": int(predicted_lr),
                "daily_average_method": int(predicted_avg),
                "blended_prediction": int(predicted_total),
            },
            "message": message,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
