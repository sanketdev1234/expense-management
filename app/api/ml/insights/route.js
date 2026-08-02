
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";
import { getInsights } from "@/lib/ml"; 

export async function GET(request) {
  try {
   
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

  
    const sixMonthsAgo = subMonths(new Date(), 12);
    const expenses = await Expense.find({
      userId,
      date: { $gte: sixMonthsAgo },
    })
      .sort({ date: -1 })
      .lean();


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

  
    const formatted = expenses.map((e) => ({
      title:    e.title,
      amount:   e.amount,
      category: e.category,
      date:     new Date(e.date).toISOString().split("T")[0], // "2026-03-15"
    }));


    const result = await getInsights(formatted, null);

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