"""
ml-service/routes/anomaly_detector.py
─────────────────────────────────────────────────────────────
FEATURE 3: Expense Anomaly Detection

HOW IT WORKS:
  Method 1 — Z-Score:
    - Calculate mean and std of past expenses per category
    - If new expense > mean + 2*std → anomaly
    - Z-score > 2.0 = unusual, > 3.0 = very unusual

  Method 2 — IQR (Interquartile Range):
    - More robust than Z-score for small datasets
    - Q3 + 1.5 * IQR = upper fence
    - Any expense above fence = outlier

  Both methods are used and the results combined.

DATA REQUIRED FROM YOUR APP:
  - Past expenses for a user per category
  - At least 5-10 past expenses for meaningful detection
  - Format: list of { amount, category, title, date }

ENDPOINTS:
  POST /api/ml/detect-anomaly     → check one expense
  POST /api/ml/scan-all-anomalies → scan all expenses, flag anomalies
─────────────────────────────────────────────────────────────
"""

import numpy as np
from flask import Blueprint, request, jsonify

anomaly_bp = Blueprint("anomaly", __name__)


def compute_stats(values):
    """Compute mean, std, median, IQR for a list of amounts."""
    arr = np.array(values, dtype=float)
    q1 = np.percentile(arr, 25)
    q3 = np.percentile(arr, 75)
    iqr = q3 - q1
    return {
        "mean":   float(np.mean(arr)),
        "std":    float(np.std(arr)),
        "median": float(np.median(arr)),
        "q1":     float(q1),
        "q3":     float(q3),
        "iqr":    float(iqr),
        "upper_fence": float(q3 + 1.5 * iqr),  # IQR upper bound
        "count":  len(arr),
    }


def is_anomaly(amount, stats):
    """
    Check if an amount is anomalous using Z-score + IQR methods.
    Returns severity: 'normal', 'unusual', or 'very_unusual'
    """
    flags = []

    # Z-Score method (needs std > 0)
    if stats["std"] > 0:
        z_score = (amount - stats["mean"]) / stats["std"]
        if z_score > 3.0:
            flags.append({"method": "z_score", "severity": "very_unusual", "z_score": round(z_score, 2)})
        elif z_score > 2.0:
            flags.append({"method": "z_score", "severity": "unusual", "z_score": round(z_score, 2)})
    else:
        z_score = 0

    # IQR method
    if stats["iqr"] > 0 and amount > stats["upper_fence"]:
        ratio = amount / stats["upper_fence"]
        severity = "very_unusual" if ratio > 2.0 else "unusual"
        flags.append({"method": "iqr", "severity": severity, "ratio": round(ratio, 2)})

    # Also flag if amount > 3× category mean
    if stats["mean"] > 0 and amount > stats["mean"] * 3:
        flags.append({
            "method": "mean_multiple",
            "severity": "very_unusual",
            "times_above_mean": round(amount / stats["mean"], 1)
        })

    if not flags:
        return "normal", z_score, flags

    # Take the worst severity
    severity = "very_unusual" if any(f["severity"] == "very_unusual" for f in flags) else "unusual"
    return severity, z_score, flags


# ── POST /api/ml/detect-anomaly ───────────────────────────────────────────────
@anomaly_bp.route("/detect-anomaly", methods=["POST"])
def detect_anomaly():
    """
    Check if a single expense is anomalous compared to past spending.

    Request body:
    {
      "expense": {
        "title": "Dinner at restaurant",
        "amount": 4500,
        "category": "Food & Dining"
      },
      "past_expenses": [
        { "amount": 350, "category": "Food & Dining" },
        { "amount": 280, "category": "Food & Dining" },
        { "amount": 420, "category": "Food & Dining" },
        { "amount": 310, "category": "Food & Dining" }
      ]
    }

    Response:
    {
      "is_anomaly": true,
      "severity": "very_unusual",
      "message": "⚠️ This expense is 10.7× your average Food & Dining spending",
      "stats": { "mean": 420, "normal_range": "₹100 – ₹700" }
    }
    """
    try:
        body = request.get_json()
        expense = body.get("expense", {})
        past_expenses = body.get("past_expenses", [])

        amount = float(expense.get("amount", 0))
        category = expense.get("category", "")
        title = expense.get("title", "")

        # Filter past expenses to same category
        same_cat = [
            e["amount"] for e in past_expenses
            if e.get("category") == category and e.get("amount", 0) > 0
        ]

        if len(same_cat) < 3:
            return jsonify({
                "success": True,
                "is_anomaly": False,
                "severity": "normal",
                "message": "Not enough past data to detect anomalies (need 3+ expenses in this category)",
                "data_points": len(same_cat),
            })

        stats = compute_stats(same_cat)
        severity, z_score, flags = is_anomaly(amount, stats)

        # Build human-readable message
        normal_low  = max(0, stats["mean"] - 2 * stats["std"])
        normal_high = stats["mean"] + 2 * stats["std"]
        times_above = round(amount / stats["mean"], 1) if stats["mean"] > 0 else 0

        if severity == "very_unusual":
            message = (
                f"⚠️ This expense is {times_above}× your average {category} spending "
                f"(avg: ₹{int(stats['mean'])}). This looks very unusual."
            )
        elif severity == "unusual":
            message = (
                f"⚠️ This expense is higher than usual for {category}. "
                f"Your normal range is ₹{int(normal_low)}–₹{int(normal_high)}."
            )
        else:
            message = f"✅ This expense looks normal for {category}."

        return jsonify({
            "success": True,
            "is_anomaly": severity != "normal",
            "severity": severity,
            "message": message,
            "z_score": round(z_score, 2),
            "detection_flags": flags,
            "stats": {
                "category": category,
                "data_points": len(same_cat),
                "mean": int(stats["mean"]),
                "median": int(stats["median"]),
                "normal_range": f"₹{int(normal_low)} – ₹{int(normal_high)}",
                "your_expense": int(amount),
                "times_above_mean": times_above,
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── POST /api/ml/scan-all-anomalies ──────────────────────────────────────────
@anomaly_bp.route("/scan-all-anomalies", methods=["POST"])
def scan_all_anomalies():
    """
    Scan all expenses and return a list of anomalous ones.
    Use this to show an "Anomaly Report" on the analytics page.

    Request body:
    {
      "expenses": [
        { "_id": "abc", "title": "Lunch", "amount": 350, "category": "Food & Dining", "date": "2026-03-01" },
        { "_id": "def", "title": "Dinner", "amount": 4500, "category": "Food & Dining", "date": "2026-03-10" }
      ]
    }

    Response:
    {
      "anomalies": [
        {
          "_id": "def",
          "title": "Dinner",
          "amount": 4500,
          "category": "Food & Dining",
          "severity": "very_unusual",
          "message": "⚠️ 10.7× your average..."
        }
      ],
      "total_scanned": 10,
      "anomalies_found": 1
    }
    """
    try:
        body = request.get_json()
        expenses = body.get("expenses", [])

        if not expenses:
            return jsonify({"success": True, "anomalies": [], "total_scanned": 0, "anomalies_found": 0})

        # Group all expenses by category for stats
        cat_amounts = {}
        for e in expenses:
            cat = e.get("category", "Other")
            amt = float(e.get("amount", 0))
            if cat not in cat_amounts:
                cat_amounts[cat] = []
            cat_amounts[cat].append(amt)

        # Compute stats per category
        cat_stats = {}
        for cat, amounts in cat_amounts.items():
            if len(amounts) >= 3:
                cat_stats[cat] = compute_stats(amounts)

        anomalies = []
        for e in expenses:
            cat = e.get("category", "Other")
            amt = float(e.get("amount", 0))

            if cat not in cat_stats:
                continue

            stats = cat_stats[cat]
            severity, z_score, flags = is_anomaly(amt, stats)

            if severity != "normal":
                times_above = round(amt / stats["mean"], 1) if stats["mean"] > 0 else 0
                normal_low  = max(0, stats["mean"] - 2 * stats["std"])
                normal_high = stats["mean"] + 2 * stats["std"]

                anomalies.append({
                    "_id":      e.get("_id"),
                    "title":    e.get("title"),
                    "amount":   int(amt),
                    "category": cat,
                    "date":     e.get("date"),
                    "severity": severity,
                    "z_score":  round(z_score, 2),
                    "times_above_mean": times_above,
                    "normal_range": f"₹{int(normal_low)} – ₹{int(normal_high)}",
                    "message": (
                        f"⚠️ {times_above}× your average {cat} spending"
                        if severity == "very_unusual"
                        else f"Higher than usual for {cat}"
                    ),
                })

        # Sort by severity (very_unusual first) then by amount
        anomalies.sort(key=lambda x: (x["severity"] != "very_unusual", -x["amount"]))

        return jsonify({
            "success": True,
            "anomalies": anomalies,
            "total_scanned": len(expenses),
            "anomalies_found": len(anomalies),
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
