// app/api/ml/predict-spending/route.js
//
// Bridge: Next.js → Python ML service
// Receives historical monthly totals + current month data from frontend,
// forwards to Python predict-spending endpoint via lib/ml.js.
//
// NOTE: This route is POST because the frontend sends the data directly.
// The analytics page collects monthly totals from /api/dashboard
// and sends them here along with current month spending.
//
// Uses lib/ml.js for the actual HTTP call to Python.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { predictSpending } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

export async function POST(request) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Read request body ─────────────────────────────────────────────────
    // Frontend sends this data (already fetched from /api/dashboard):
    // monthly_totals:      [{ month: "2026-01", total: 51462 }, ...]
    // current_month_spent: 28000  (how much spent so far this month)
    // budget_limit:        40000  (optional — user's monthly budget)
    const { monthly_totals, current_month_spent, budget_limit } = await request.json();

    // ── Call ML service via lib/ml.js ─────────────────────────────────────
    // predictSpending() calls mlFetch() which:
    //   - POSTs { monthly_totals, current_month_spent, budget_limit }
    //     to /api/ml/predict-spending
    //   - Returns null if ML service is down (graceful degradation)
    const result = await predictSpending(
      monthly_totals,
      current_month_spent,
      budget_limit || null
    );

    // ── Graceful degradation if ML is down ────────────────────────────────
    // lib/ml.js returns null when ML service is unavailable
    // Return a safe fallback so the analytics page still loads
    if (!result) {
      return NextResponse.json({
        predicted_month_total:     current_month_spent || 0,
        current_spent:             current_month_spent || 0,
        days_elapsed:              0,
        days_remaining:            0,
        days_in_month:             30,
        daily_spending_rate:       0,
        projected_from_daily_rate: 0,
        will_exceed_budget:        false,
        excess_amount:             null,
        confidence:                "low",
        message:                   "Prediction unavailable — ML service is offline",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("predict-spending route error:", error);
    return NextResponse.json(
      { error: "Failed to predict spending" },
      { status: 500 }
    );
  }
}
