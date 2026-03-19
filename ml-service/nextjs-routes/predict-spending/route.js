/**
 * app/api/ml/predict-spending/route.js
 *
 * Fetches current month expenses + budget from MongoDB,
 * sends to Python ML service to predict end-of-month total.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Budget from "@/models/Budget";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;
    const month  = getCurrentMonth();
    const { start, end } = getMonthRange(month);

    const [expenses, budget] = await Promise.all([
      Expense.find({ userId, date: { $gte: start, $lte: end } }).lean(),
      Budget.findOne({ userId, month }).lean(),
    ]);

    const mlRes = await fetch(`${ML_URL}/api/ml/predict-spending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        budget_limit: budget?.monthlyLimit || 0,
        expenses: expenses.map(e => ({
          amount: e.amount,
          date:   e.date.toISOString(),
        })),
      }),
    });

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML predict-spending error:", error);
    return NextResponse.json({ success: false, error: "ML service unavailable" }, { status: 503 });
  }
}
