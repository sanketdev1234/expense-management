/**
 * app/api/dashboard/route.js
 *
 * GET /api/dashboard?month=YYYY-MM
 *
 * Returns all the data needed for the dashboard in ONE request:
 *   - totalSpent (this month)
 *   - expenseCount (this month)
 *   - topCategory (most spent category)
 *   - recentExpenses (last 5)
 *   - budget (monthly limit + % used)
 *   - categoryBreakdown (for pie chart)
 *
 * Batching this into one endpoint is better than 3–4 separate fetches
 * from the dashboard page.
 *
 * PHASE 4 (Day 3): Create when building the Dashboard page.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Budget from "@/models/Budget";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || getCurrentMonth();
    const { start, end } = getMonthRange(month);
    const userId = session.user.id;

    await connectDB();

    // Run all DB queries in parallel for speed
    const [expenses, budget, categoryAgg] = await Promise.all([
      // All expenses this month, sorted by date desc
      Expense.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: -1 }),

      // Budget for this month
      Budget.findOne({ userId, month }),

      // Category breakdown (for pie chart + top category)
      Expense.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Top category is the one with highest spending
    const topCategory = categoryAgg[0] || null;

    return NextResponse.json({
      totalSpent,
      expenseCount: expenses.length,
      topCategory: topCategory ? { name: topCategory._id, amount: topCategory.total } : null,
      recentExpenses: expenses.slice(0, 5), // Last 5
      budget: budget
        ? {
            monthlyLimit: budget.monthlyLimit,
            categoryLimits: Object.fromEntries(budget.categoryLimits || new Map()),
          }
        : null,
      categoryBreakdown: categoryAgg.map((c) => ({
        name: c._id,
        value: c.total,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}