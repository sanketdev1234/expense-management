/**
 * app/api/ml/insights/route.js
 * app/api/ml/recommend-budget/route.js
 * app/api/ml/detect-anomaly/route.js
 * app/api/ml/predict-spending/route.js
 *
 * ALL follow this same pattern — copy this file into each folder,
 * just change the ENDPOINT constant.
 *
 * This file shows the INSIGHTS route as example.
 * Copy to: app/api/ml/insights/route.js
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";
import { subMonths } from "date-fns";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

// ── GET /api/ml/insights ──────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;

    // Current month
    const currentMonth = getCurrentMonth();
    const { start: currStart, end: currEnd } = getMonthRange(currentMonth);

    // Previous month
    const prevDate  = subMonths(new Date(), 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth);

    const [currentExpenses, previousExpenses] = await Promise.all([
      Expense.find({ userId, date: { $gte: currStart, $lte: currEnd } }).lean(),
      Expense.find({ userId, date: { $gte: prevStart, $lte: prevEnd } }).lean(),
    ]);

    // Call Python ML service
    const mlRes = await fetch(`${ML_URL}/api/ml/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_month_expenses: currentExpenses.map(e => ({
          amount:   e.amount,
          category: e.category,
          title:    e.title,
          date:     e.date.toISOString(),
        })),
        previous_month_expenses: previousExpenses.map(e => ({
          amount:   e.amount,
          category: e.category,
          title:    e.title,
          date:     e.date.toISOString(),
        })),
      }),
    });

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML insights error:", error);
    return NextResponse.json({ success: false, error: "ML service unavailable" }, { status: 503 });
  }
}
