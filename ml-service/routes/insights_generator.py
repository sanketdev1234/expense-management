"""
ml-service/routes/insights_generator.py
─────────────────────────────────────────────────────────────
FEATURE 5: Smart Insights (Pattern Analysis + AI Messages)

HOW IT WORKS:
  Runs multiple statistical analyses on spending data and generates
  human-readable insights automatically:

  - Top spending category detection
  - Month-over-month category change detection
  - Weekend vs weekday spending comparison
  - Biggest single expense detection
  - Spending streak detection (days without expenses)
  - Category diversity score

DATA REQUIRED FROM YOUR APP:
  - Current month expenses with date + category + amount
  - Previous month expenses (for comparison)

ENDPOINT:
  POST /api/ml/insights
─────────────────────────────────────────────────────────────
"""

import numpy as np
from datetime import datetime
from flask import Blueprint, request, jsonify
from collections import defaultdict

insights_bp = Blueprint("insights", __name__)


# ── POST /api/ml/insights ─────────────────────────────────────────────────────
@insights_bp.route("/insights", methods=["POST"])
def generate_insights():
    """
    Generate smart spending insights.

    Request body:
    {
      "current_month_expenses": [
        { "amount": 350, "category": "Food & Dining", "date": "2026-03-01", "title": "Lunch" }
      ],
      "previous_month_expenses": [
        { "amount": 280, "category": "Food & Dining", "date": "2026-02-15", "title": "Lunch" }
      ]
    }

    Response:
    {
      "insights": [
        {
          "type": "top_category",
          "severity": "info",
          "icon": "🍽️",
          "title": "Top Spending Category",
          "message": "You spend most on Food & Dining (₹8,500 — 38% of total)"
        },
        ...
      ]
    }
    """
    try:
        body = request.get_json()
        current  = body.get("current_month_expenses", [])
        previous = body.get("previous_month_expenses", [])

        if not current:
            return jsonify({
                "success": True,
                "insights": [{
                    "type": "no_data",
                    "severity": "info",
                    "icon": "📊",
                    "title": "No Data Yet",
                    "message": "Add some expenses to start seeing smart insights!"
                }]
            })

        insights = []

        # ── Parse amounts and dates ───────────────────────────────────────
        def parse_expenses(expenses):
            parsed = []
            for e in expenses:
                try:
                    d = datetime.strptime(e.get("date", "")[:10], "%Y-%m-%d")
                    parsed.append({
                        "amount":   float(e.get("amount", 0)),
                        "category": e.get("category", "Other"),
                        "title":    e.get("title", ""),
                        "date":     d,
                        "weekday":  d.weekday(),  # 0=Mon, 6=Sun
                    })
                except Exception:
                    pass
            return parsed

        curr_parsed = parse_expenses(current)
        prev_parsed = parse_expenses(previous)

        curr_total = sum(e["amount"] for e in curr_parsed)
        prev_total = sum(e["amount"] for e in prev_parsed)

        # ── Group by category ─────────────────────────────────────────────
        curr_by_cat = defaultdict(float)
        prev_by_cat = defaultdict(float)

        for e in curr_parsed:
            curr_by_cat[e["category"]] += e["amount"]
        for e in prev_parsed:
            prev_by_cat[e["category"]] += e["amount"]

        CATEGORY_ICONS = {
            "Food & Dining": "🍽️",
            "Transportation": "🚗",
            "Shopping": "🛍️",
            "Entertainment": "🎬",
            "Bills & Utilities": "💡",
            "Healthcare": "🏥",
            "Education": "📚",
            "Travel": "✈️",
            "Other": "📦",
        }

        # ── INSIGHT 1: Top spending category ─────────────────────────────
        if curr_by_cat:
            top_cat  = max(curr_by_cat, key=curr_by_cat.get)
            top_amt  = curr_by_cat[top_cat]
            top_pct  = round((top_amt / curr_total) * 100) if curr_total > 0 else 0
            icon     = CATEGORY_ICONS.get(top_cat, "📦")
            insights.append({
                "type": "top_category",
                "severity": "info",
                "icon": icon,
                "title": "Top Spending Category",
                "message": f"You spend most on {top_cat} (₹{int(top_amt):,} — {top_pct}% of total spending this month).",
                "data": {"category": top_cat, "amount": int(top_amt), "percent": top_pct},
            })

        # ── INSIGHT 2: Month-over-month total change ───────────────────────
        if prev_total > 0:
            mom_change = ((curr_total - prev_total) / prev_total) * 100
            if abs(mom_change) >= 5:
                direction = "increased" if mom_change > 0 else "decreased"
                severity  = "warning" if mom_change > 20 else "info"
                icon      = "📈" if mom_change > 0 else "📉"
                insights.append({
                    "type": "month_over_month",
                    "severity": severity,
                    "icon": icon,
                    "title": "Spending vs Last Month",
                    "message": (
                        f"Your total spending has {direction} by {abs(round(mom_change, 1))}% "
                        f"compared to last month (₹{int(curr_total):,} vs ₹{int(prev_total):,})."
                    ),
                    "data": {"change_pct": round(mom_change, 1), "curr": int(curr_total), "prev": int(prev_total)},
                })

        # ── INSIGHT 3: Category spikes (vs last month) ────────────────────
        for cat in curr_by_cat:
            if cat in prev_by_cat and prev_by_cat[cat] > 0:
                change = ((curr_by_cat[cat] - prev_by_cat[cat]) / prev_by_cat[cat]) * 100
                if change >= 30:
                    icon = CATEGORY_ICONS.get(cat, "📦")
                    insights.append({
                        "type": "category_spike",
                        "severity": "warning",
                        "icon": icon,
                        "title": f"{cat} Spending Up",
                        "message": (
                            f"Your {cat} expenses increased by {round(change)}% this month "
                            f"(₹{int(curr_by_cat[cat]):,} vs ₹{int(prev_by_cat[cat]):,} last month). "
                            f"Consider reducing {cat} spending."
                        ),
                        "data": {"category": cat, "change_pct": round(change, 1)},
                    })
                elif change <= -30:
                    icon = CATEGORY_ICONS.get(cat, "📦")
                    insights.append({
                        "type": "category_drop",
                        "severity": "success",
                        "icon": "✅",
                        "title": f"Great — {cat} Spending Down",
                        "message": (
                            f"You reduced {cat} spending by {abs(round(change))}% this month. Great job!"
                        ),
                        "data": {"category": cat, "change_pct": round(change, 1)},
                    })

        # ── INSIGHT 4: Weekend vs Weekday spending ────────────────────────
        weekend = [e["amount"] for e in curr_parsed if e["weekday"] >= 5]
        weekday = [e["amount"] for e in curr_parsed if e["weekday"] < 5]

        if weekend and weekday:
            weekend_avg = np.mean(weekend)
            weekday_avg = np.mean(weekday)
            if weekday_avg > 0:
                ratio = weekend_avg / weekday_avg
                if ratio >= 1.5:
                    insights.append({
                        "type": "weekend_spending",
                        "severity": "info",
                        "icon": "🎉",
                        "title": "Weekend Spending Higher",
                        "message": (
                            f"Your weekend spending is {round(ratio, 1)}× higher than weekdays "
                            f"(avg ₹{int(weekend_avg):,}/expense on weekends vs ₹{int(weekday_avg):,} on weekdays)."
                        ),
                        "data": {"ratio": round(ratio, 1), "weekend_avg": int(weekend_avg), "weekday_avg": int(weekday_avg)},
                    })

        # ── INSIGHT 5: Largest single expense ─────────────────────────────
        if curr_parsed:
            biggest = max(curr_parsed, key=lambda e: e["amount"])
            pct_of_total = round((biggest["amount"] / curr_total) * 100) if curr_total > 0 else 0
            if pct_of_total >= 20:
                icon = CATEGORY_ICONS.get(biggest["category"], "📦")
                insights.append({
                    "type": "largest_expense",
                    "severity": "info",
                    "icon": icon,
                    "title": "Largest Single Expense",
                    "message": (
                        f"'{biggest['title']}' is your largest expense this month at "
                        f"₹{int(biggest['amount']):,} — {pct_of_total}% of your total spending."
                    ),
                    "data": {"title": biggest["title"], "amount": int(biggest["amount"]), "pct": pct_of_total},
                })

        # ── INSIGHT 6: Spending diversity score ───────────────────────────
        n_categories = len(curr_by_cat)
        if n_categories == 1:
            insights.append({
                "type": "diversity",
                "severity": "info",
                "icon": "💡",
                "title": "Single Category Spending",
                "message": "All your expenses are in one category this month. Consider tracking all types of spending for better insights.",
                "data": {"categories_used": n_categories},
            })

        # ── INSIGHT 7: Budget recommendation nudge ────────────────────────
        top_two = sorted(curr_by_cat.items(), key=lambda x: -x[1])[:2]
        for cat, amt in top_two:
            pct = round((amt / curr_total) * 100) if curr_total > 0 else 0
            if pct >= 40:
                insights.append({
                    "type": "budget_nudge",
                    "severity": "warning",
                    "icon": "🎯",
                    "title": "Consider Setting a Category Limit",
                    "message": (
                        f"{cat} takes up {pct}% of your spending. "
                        f"Setting a category budget limit can help you stay in control."
                    ),
                    "data": {"category": cat, "pct": pct},
                })

        # Sort: warnings first, then info, then success
        order = {"warning": 0, "info": 1, "success": 2}
        insights.sort(key=lambda x: order.get(x["severity"], 3))

        return jsonify({
            "success": True,
            "insights": insights,
            "total_insights": len(insights),
            "summary": {
                "current_total":    int(curr_total),
                "previous_total":   int(prev_total),
                "categories_used":  len(curr_by_cat),
                "total_expenses":   len(curr_parsed),
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
