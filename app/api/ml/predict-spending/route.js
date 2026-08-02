
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { predictSpending } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

export async function POST(request) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const { monthly_totals, current_month_spent, budget_limit } = await request.json();


    const result = await predictSpending(
      monthly_totals,
      current_month_spent,
      budget_limit || null
    );

   
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
