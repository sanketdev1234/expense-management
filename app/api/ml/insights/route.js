// app/api/ml/insights/route.js
//
// Bridge: Next.js → Python ML service
// 1. Fetches last 6 months of expenses from MongoDB
// 2. Formats them as flat array matching Python InsightsRequest schema
// 3. Sends to Python ML service via lib/ml.js
// 4. Returns spending patterns, category analysis, weekend vs weekday insights
//
// Uses lib/ml.js for the actual HTTP call to Python.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";
import { getInsights } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

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
    })
      .sort({ date: -1 })
      .lean();

    // ── Minimum data check ────────────────────────────────────────────────
    // Python insights router needs at least 3 expenses
    if (expenses.length < 3) {
      return NextResponse.json({
        insights:            ["Add more expenses to see personalized AI insights."],
        pattern_type:        "New User",
        pattern_description: "Keep tracking your expenses to unlock AI insights!",
        category_analysis:   {},
        weekend_vs_weekday:  {},
        top_category:        null,
        months_analyzed:     0,
      });
    }

    // ── Format expenses to match Python InsightsRequest schema ────────────
    // Python expects: [{ title, amount, category, date }, ...]
    // date must be "YYYY-MM-DD" string (not full ISO with time)
    const formatted = expenses.map((e) => ({
      title:    e.title,
      amount:   e.amount,
      category: e.category,
      date:     new Date(e.date).toISOString().split("T")[0], // "2026-03-15"
    }));

    // ── Call ML service via lib/ml.js ─────────────────────────────────────
    // getInsights() calls mlFetch() which:
    //   - POSTs { expenses, monthly_income } to /api/ml/insights
    //   - monthly_income = null (user hasn't provided income)
    //   - Returns null if ML service is down (graceful degradation)
    const result = await getInsights(formatted, null);

    // ── Graceful degradation if ML is down ────────────────────────────────
    // lib/ml.js returns null when ML service is unavailable
    // Return safe fallback so analytics page still loads
    if (!result) {
      return NextResponse.json({
        insights:            ["AI insights temporarily unavailable."],
        pattern_type:        "Unknown",
        pattern_description: "",
        category_analysis:   {},
        weekend_vs_weekday:  {},
        top_category:        null,
        months_analyzed:     0,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("insights route error:", error);
    return NextResponse.json(
      { error: "Failed to get insights" },
      { status: 500 }
    );
  }
}