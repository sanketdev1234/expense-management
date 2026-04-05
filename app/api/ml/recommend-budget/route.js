// app/api/ml/recommend-budget/route.js
//
// Bridge: Next.js → Python ML service
// 1. Fetches last 6 months of expenses from MongoDB
// 2. Aggregates them into monthly category totals
// 3. Sends to Python ML service via lib/ml.js
// 4. Returns AI-recommended budget limits per category
//
// Uses lib/ml.js for the actual HTTP call to Python.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";
import { recommendBudget } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

export async function GET(request) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

    // ── Fetch last 6 months from MongoDB ──────────────────────────────────
    const sixMonthsAgo = subMonths(new Date(), 6);
    const expenses = await Expense.find({
      userId,
      date: { $gte: sixMonthsAgo },
    }).lean();

    // ── Minimum data check ────────────────────────────────────────────────
    // Linear Regression needs at least a few data points
    if (expenses.length < 3) {
      return NextResponse.json({
        monthly_limit:    0,
        category_limits:  {},
        insights:         ["Add at least 3 expenses to get budget recommendations."],
        months_analyzed:  0,
      });
    }

    // ── Aggregate expenses into monthly category totals ───────────────────
    // Python ML service expects: [{ month, category, total }, ...]
    // We aggregate here to reduce payload size
    // e.g. 30 Food expenses → 1 Food total per month
    const monthlyMap = {};
    expenses.forEach((e) => {
      const month = new Date(e.date).toISOString().slice(0, 7); // "2026-03"
      const key   = `${month}__${e.category}`;                  // unique key

      if (!monthlyMap[key]) {
        monthlyMap[key] = { month, category: e.category, total: 0 };
      }
      monthlyMap[key].total += e.amount;
    });

    // Convert map → flat array for ML service
    const expensesForML = Object.values(monthlyMap);
    // e.g. [
    //   { month: "2026-03", category: "Food & Dining",    total: 6280 },
    //   { month: "2026-03", category: "Transportation",   total: 2810 },
    //   { month: "2026-02", category: "Food & Dining",    total: 10420 },
    //   ...
    // ]

    // ── Call ML service via lib/ml.js ─────────────────────────────────────
    // recommendBudget() calls mlFetch() which:
    //   - POSTs { expenses, buffer_percent } to /api/ml/recommend-budget
    //   - Returns null if ML service is down (graceful degradation)
    const result = await recommendBudget(expensesForML, 10);

    // ── Graceful degradation if ML is down ────────────────────────────────
    if (!result) {
      return NextResponse.json({
        monthly_limit:   0,
        category_limits: {},
        insights:        ["AI recommendations temporarily unavailable."],
        months_analyzed: 0,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("recommend-budget route error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}