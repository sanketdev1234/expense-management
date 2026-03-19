/**
 * app/api/ml/scan-anomalies/route.js
 *
 * Fetches last 3 months of expenses and scans for anomalies.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;

    // Last 3 months of expenses
    const threeMonthsAgo = subMonths(new Date(), 3);
    const expenses = await Expense.find({
      userId,
      date: { $gte: threeMonthsAgo },
    }).lean();

    if (expenses.length < 5) {
      return NextResponse.json({
        success: true,
        anomalies: [],
        message: "Add more expenses (at least 5 per category) to enable anomaly detection.",
      });
    }

    const mlRes = await fetch(`${ML_URL}/api/ml/scan-all-anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses: expenses.map(e => ({
          _id:      e._id.toString(),
          title:    e.title,
          amount:   e.amount,
          category: e.category,
          date:     e.date.toISOString(),
        })),
      }),
    });

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML scan-anomalies error:", error);
    return NextResponse.json({ success: false, error: "ML service unavailable" }, { status: 503 });
  }
}
