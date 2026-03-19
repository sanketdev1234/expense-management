// app/api/ml/predict-spending/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { monthly_totals, current_month_spent, budget_limit } = body;

    const mlRes = await fetch(`${ML_URL}/api/ml/predict-spending`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthly_totals,
        current_month_spent,
        budget_limit: budget_limit || null,
      }),
    });

    if (!mlRes.ok) {
      return NextResponse.json({
        predicted_month_total: current_month_spent || 0,
        message: "Prediction unavailable",
        will_exceed_budget: false,
        confidence: "low",
        days_remaining: 0,
        daily_spending_rate: 0,
        current_spent: current_month_spent || 0,
      });
    }

    return NextResponse.json(await mlRes.json());
  } catch (error) {
    console.error("predict-spending route error:", error);
    return NextResponse.json({ error: "Failed to predict" }, { status: 500 });
  }
}