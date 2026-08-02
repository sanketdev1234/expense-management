
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
    date: str   
class AnomalyRequest(BaseModel):
    expense: Expense             
    history: List[Expense]       
    z_threshold: float = 2.0     
    min_history: int = 5          
class AnomalyResponse(BaseModel):
    is_anomaly: bool
    severity: str              
    reason: str
    z_score: Optional[float]
    category_average: Optional[float]
    category_std: Optional[float]
    similar_expenses_count: int


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

 
    z_score = calculate_z_score(amount, mean, std)


    q1 = float(np.percentile(amounts, 25))
    q3 = float(np.percentile(amounts, 75))
    iqr = q3 - q1
    iqr_upper = q3 + 1.5 * iqr

    is_z_anomaly = z_score >= req.z_threshold
    is_iqr_anomaly = amount > iqr_upper and iqr > 0

    is_anomaly = is_z_anomaly or is_iqr_anomaly
    severity = get_severity(z_score)


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
