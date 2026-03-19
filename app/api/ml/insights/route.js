// app/api/ml/insights/route.js
// FIXED: sends flat "expenses" array that matches Python ML service schema

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

    // Fetch last 6 months of expenses as flat list
    const sixMonthsAgo = subMonths(new Date(), 6);
    const expenses = await Expense.find({
      userId,
      date: { $gte: sixMonthsAgo },
    }).sort({ date: -1 }).lean();

    if (expenses.length < 3) {
      return NextResponse.json({
        insights: ["Add more expenses to see personalized AI insights."],
        pattern_type: "New User",
        pattern_description: "Keep tracking your expenses to unlock AI insights!",
        category_analysis: {},
        weekend_vs_weekday: {},
        top_category: null,
        months_analyzed: 0,
      });
    }

    // Format as flat list matching InsightsRequest schema
    const formatted = expenses.map((e) => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: new Date(e.date).toISOString().split("T")[0], // "2026-03-15"
    }));

    // Call Python ML service with correct schema
    const mlRes = await fetch(`${ML_URL}/api/ml/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses: formatted,         // ← flat list, not current/previous split
        monthly_income: null,
      }),
    });

    if (!mlRes.ok) {
      const err = await mlRes.json().catch(() => ({}));
      console.error("ML insights error:", err);
      return NextResponse.json({
        insights: ["AI insights temporarily unavailable."],
        pattern_type: "Unknown",
        pattern_description: "",
        category_analysis: {},
        weekend_vs_weekday: {},
        top_category: null,
        months_analyzed: 0,
      });
    }

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("insights route error:", error);
    return NextResponse.json({ error: "Failed to get insights" }, { status: 500 });
  }
}