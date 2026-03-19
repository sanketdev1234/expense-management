"""
ml-service/routes/budget_recommender.py
─────────────────────────────────────────────────────────────
FEATURE 2: Smart Budget Recommendation

HOW IT WORKS:
  1. Takes last 3-6 months of expense data per category
  2. Calculates weighted moving average (recent months weighted more)
  3. Adds 10% buffer for realistic headroom
  4. Also uses Linear Regression if enough data (3+ months)
  5. Returns recommended budget per category + overall monthly limit

DATA REQUIRED FROM YOUR APP:
  - Last 3-6 months of expenses from MongoDB
  - Grouped by category with monthly totals
  - Format: list of { month: "2026-01", category: "Food", total: 9000 }

ENDPOINT:
  POST /api/ml/recommend-budget
─────────────────────────────────────────────────────────────
"""

import numpy as np
from flask import Blueprint, request, jsonify
from sklearn.linear_model import LinearRegression

budget_bp = Blueprint("budget", __name__)


# ── POST /api/ml/recommend-budget ────────────────────────────────────────────
@budget_bp.route("/recommend-budget", methods=["POST"])
def recommend_budget():
    """
    Recommend budget limits based on past spending.

    Request body:
    {
      "monthly_data": [
        {
          "month": "2025-10",
          "expenses": [
            { "category": "Food & Dining", "total": 8500 },
            { "category": "Transportation", "total": 3200 }
          ]
        },
        {
          "month": "2025-11",
          "expenses": [
            { "category": "Food & Dining", "total": 9200 },
            { "category": "Transportation", "total": 2800 }
          ]
        }
      ]
    }

    Response:
    {
      "recommendations": {
        "Food & Dining":    { "recommended": 9500, "avg": 8850, "trend": "increasing" },
        "Transportation":   { "recommended": 3200, "avg": 3000, "trend": "stable" }
      },
      "suggested_monthly_total": 28000,
      "method": "weighted_moving_average"
    }
    """
    try:
        body = request.get_json()
        monthly_data = body.get("monthly_data", [])

        if len(monthly_data) < 1:
            return jsonify({
                "success": False,
                "error": "At least 1 month of data is required"
            }), 400

        # ── Build per-category time series ────────────────────────────────
        # { "Food & Dining": [8500, 9200, 8800], "Transport": [3200, 2800] }
        category_series = {}

        for month_entry in monthly_data:
            for exp in month_entry.get("expenses", []):
                cat = exp["category"]
                total = exp["total"]
                if cat not in category_series:
                    category_series[cat] = []
                category_series[cat].append(total)

        if not category_series:
            return jsonify({"success": False, "error": "No expense data found"}), 400

        # ── Compute recommendations per category ──────────────────────────
        recommendations = {}
        n_months = len(monthly_data)

        for category, values in category_series.items():
            values = np.array(values, dtype=float)
            avg = float(np.mean(values))

            # Weighted moving average — recent months count more
            # weights: [1, 2, 3, 4] for 4 months (last month = weight 4)
            weights = np.arange(1, len(values) + 1, dtype=float)
            weighted_avg = float(np.average(values, weights=weights))

            # Trend detection: compare last month vs first month
            if len(values) >= 2:
                change_pct = ((values[-1] - values[0]) / values[0]) * 100
                if change_pct > 10:
                    trend = "increasing"
                    buffer = 0.15  # 15% buffer if spending is growing
                elif change_pct < -10:
                    trend = "decreasing"
                    buffer = 0.05  # 5% buffer if spending is shrinking
                else:
                    trend = "stable"
                    buffer = 0.10  # 10% buffer for stable spending
            else:
                trend = "insufficient_data"
                buffer = 0.10

            # Linear Regression for prediction if 3+ months available
            if len(values) >= 3:
                X = np.arange(len(values)).reshape(-1, 1)
                y = values
                lr = LinearRegression()
                lr.fit(X, y)
                # Predict next month (index = len(values))
                predicted_next = float(lr.predict([[len(values)]])[0])
                # Use max of weighted avg and prediction to be safe
                base = max(weighted_avg, predicted_next)
                method = "linear_regression"
            else:
                base = weighted_avg
                method = "weighted_moving_average"

            # Final recommendation = base + buffer, rounded to nearest 500
            recommended = round((base * (1 + buffer)) / 500) * 500
            recommended = max(recommended, 500)  # minimum ₹500

            recommendations[category] = {
                "recommended": int(recommended),
                "average_spending": int(round(avg)),
                "weighted_average": int(round(weighted_avg)),
                "trend": trend,
                "trend_change_pct": round(((values[-1] - values[0]) / values[0]) * 100, 1) if len(values) >= 2 else 0,
                "months_analyzed": len(values),
                "method": method,
            }

        # ── Overall monthly budget suggestion ─────────────────────────────
        total_recommended = sum(r["recommended"] for r in recommendations.values())
        # Round overall to nearest 1000
        suggested_total = round(total_recommended / 1000) * 1000

        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "suggested_monthly_total": suggested_total,
            "categories_analyzed": len(recommendations),
            "months_of_data": n_months,
            "message": f"Based on your last {n_months} month(s) of spending"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
