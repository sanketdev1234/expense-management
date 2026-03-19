/**
 * app/api/ml/recommend-budget/route.js
 *
 * Fetches last 6 months of expenses from MongoDB,
 * groups them by category per month,
 * and sends to Python ML service for budget recommendation.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getMonthRange } from "@/lib/utils";
import { subMonths } from "date-fns";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;

    // Build last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }).reverse(); // oldest first

    // Fetch all months in parallel
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const { start, end } = getMonthRange(month);
        const expenses = await Expense.find({
          userId,
          date: { $gte: start, $lte: end },
        }).lean();

        // Group by category
        const catMap = {};
        expenses.forEach(e => {
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });

        return {
          month,
          expenses: Object.entries(catMap).map(([category, total]) => ({ category, total })),
        };
      })
    );

    // Only send months that have data
    const monthsWithData = monthlyData.filter(m => m.expenses.length > 0);

    if (monthsWithData.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Not enough expense history to make recommendations. Add expenses for at least 1 month."
      });
    }

    // Call Python ML service
    const mlRes = await fetch(`${ML_URL}/api/ml/recommend-budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_data: monthsWithData }),
    });

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML recommend-budget error:", error);
    return NextResponse.json({ success: false, error: "ML service unavailable" }, { status: 503 });
  }
}
