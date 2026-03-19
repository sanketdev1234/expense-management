// app/api/ml/insights/route.js
//
// Fetches all user expenses → sends to ML service → returns insights
// Called from the Analytics page

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getInsights } from "@/lib/ml";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthlyIncome = searchParams.get("income")
      ? parseFloat(searchParams.get("income"))
      : null;

    await connectDB();

    // Fetch last 6 months of expenses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await Expense.find({
      userId: session.user.id,
      date: { $gte: sixMonthsAgo },
    }).sort({ date: -1 });

    if (expenses.length < 3) {
      return NextResponse.json({
        insights: ["Add more expenses to see personalized insights."],
        pattern_type: "New User",
        pattern_description: "Keep tracking your expenses to unlock AI insights!",
        category_analysis: {},
        weekend_vs_weekday: {},
        top_category: null,
        months_analyzed: 0,
      });
    }

    // Format for ML service
    const formattedExpenses = expenses.map((e) => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: e.date.toISOString().split("T")[0],
    }));

    const result = await getInsights(formattedExpenses, monthlyIncome);

    if (!result) {
      return NextResponse.json({
        insights: ["AI insights temporarily unavailable."],
        pattern_type: "Unknown",
        pattern_description: "ML service is starting up.",
        category_analysis: {},
        weekend_vs_weekday: {},
        top_category: null,
        months_analyzed: 0,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("insights route error:", error);
    return NextResponse.json({ error: "Failed to get insights" }, { status: 500 });
  }
}
