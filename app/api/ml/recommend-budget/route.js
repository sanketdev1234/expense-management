// app/api/ml/recommend-budget/route.js
// Fetches 6 months of expense data → sends to ML → returns budget recommendations

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;

    // Fetch last 6 months as flat list
    const sixMonthsAgo = subMonths(new Date(), 6);
    const expenses = await Expense.find({
      userId,
      date: { $gte: sixMonthsAgo },
    }).lean();

    if (expenses.length < 3) {
      return NextResponse.json({
        monthly_limit: 0,
        category_limits: {},
        insights: ["Add at least 3 expenses to get budget recommendations."],
        months_analyzed: 0,
      });
    }

    // Build monthly category totals for ML service
    const monthlyMap = {};
    expenses.forEach((e) => {
      const month = new Date(e.date).toISOString().slice(0, 7);
      const key   = `${month}__${e.category}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month, category: e.category, total: 0 };
      monthlyMap[key].total += e.amount;
    });

    const expensesForML = Object.values(monthlyMap);

    const mlRes = await fetch(`${ML_URL}/api/ml/recommend-budget`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses:       expensesForML,
        buffer_percent: 10,
      }),
    });

    if (!mlRes.ok) {
      const err = await mlRes.json().catch(() => ({}));
      console.error("ML recommend-budget error:", err);
      return NextResponse.json({
        monthly_limit: 0, category_limits: {},
        insights: ["AI recommendations temporarily unavailable."], months_analyzed: 0,
      });
    }

    return NextResponse.json(await mlRes.json());
  } catch (error) {
    console.error("recommend-budget route error:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}