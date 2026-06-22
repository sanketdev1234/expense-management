# ml-service/routers/anomaly.py
#
# FEATURE 4: Expense Anomaly Detection
#
# ENDPOINT: POST /api/ml/detect-anomaly
# INPUT:  { "expense": {...}, "history": [...past expenses...] }
# OUTPUT: { "is_anomaly": true, "reason": "...", "severity": "high", "z_score": 2.8 }
#
# HOW IT WORKS:
# Method 1 - Z-Score: If expense is >2 standard deviations above the mean for
#             that category, it's an anomaly.
# Method 2 - IQR: If expense is above Q3 + 1.5*IQR for that category, anomaly.
# Both methods are combined — if either fires, show the alert.
#
# EXAMPLE:
# User normally spends ₹200-₹500 on food
# New expense: ₹3,500 food
# → Z-score = 3.2 → ANOMALY DETECTED

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────────
class Expense(BaseModel):
    title: str
    amount: float
    category: str
    date: str   # "2026-03-15"

class AnomalyRequest(BaseModel):
    expense: Expense              # The new expense to check
    history: List[Expense]        # Past expenses (same user)
    z_threshold: float = 2.0      # Z-score threshold (2.0 = 95% confidence)
    min_history: int = 5          # Minimum samples needed

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    severity: str               # "none" | "low" | "medium" | "high"
    reason: str
    z_score: Optional[float]
    category_average: Optional[float]
    category_std: Optional[float]
    similar_expenses_count: int

# ── Detection Logic ────────────────────────────────────────────────────────────
def calculate_z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - mean) / std

def get_severity(z_score: float) -> str:
    if z_score >= 3.5:
        return "high"
    elif z_score >= 2.5:
        return "medium"
    elif z_score >= 2.0:
        return "low"
    return "none"

# ── Endpoint ───────────────────────────────────────────────────────────────────
@router.post("/detect-anomaly", response_model=AnomalyResponse)
def detect_anomaly(req: AnomalyRequest):
    """
    Detect if an expense is unusually high compared to user's history
    in the same category using Z-Score analysis.
    """
    new_expense = req.expense
    category = new_expense.category
    amount = new_expense.amount

    # Filter history to same category only
    same_category = [
        e.amount for e in req.history
        if e.category == category and e.amount > 0
    ]
    count = len(same_category)

    # Not enough data to detect anomaly
    if count < req.min_history:
        return AnomalyResponse(
            is_anomaly=False,
            severity="none",
            reason=f"Not enough history in {category} ({count} expenses). Need at least {req.min_history}.",
            z_score=None,
            category_average=None,
            category_std=None,
            similar_expenses_count=count
        )

    amounts = np.array(same_category)
    mean = float(np.mean(amounts))
    std = float(np.std(amounts))
    median = float(np.median(amounts)) 

    # ── Z-Score Method ──────────────────────────────────────────────────────
    z_score = calculate_z_score(amount, mean, std)

    # ── IQR Method ─────────────────────────────────────────────────────────
    q1 = float(np.percentile(amounts, 25))
    q3 = float(np.percentile(amounts, 75))
    iqr = q3 - q1
    iqr_upper = q3 + 1.5 * iqr

    is_z_anomaly = z_score >= req.z_threshold
    is_iqr_anomaly = amount > iqr_upper and iqr > 0

    is_anomaly = is_z_anomaly or is_iqr_anomaly
    severity = get_severity(z_score)

    # ── Build Human-Readable Reason ─────────────────────────────────────────
    if not is_anomaly:
        reason = (
            f"This {category} expense of ₹{amount:,.0f} is within your normal range "
            f"(avg ₹{mean:,.0f}, std ₹{std:,.0f})."
        )
    else:
        times_more = amount / mean if mean > 0 else 1
        reason = (
            f"⚠️ This {category} expense of ₹{amount:,.0f} is {times_more:.1f}× "
            f"higher than your usual ₹{mean:,.0f}. "
            f"Your typical range: ₹{median - std:,.0f} – ₹{median + std:,.0f}."
        )

    return AnomalyResponse(
        is_anomaly=is_anomaly,
        severity=severity,
        reason=reason,
        z_score=round(z_score, 2),
        category_average=round(mean, 2),
        category_std=round(std, 2),
        similar_expenses_count=count
    )
