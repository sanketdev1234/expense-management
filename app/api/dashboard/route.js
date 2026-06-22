import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Budget from "@/models/Budget";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || getCurrentMonth();
    const { start, end } = getMonthRange(month);



    await connectDB();

    const [expenses, budget, categoryAgg] = await Promise.all([
      Expense.find({ userId: session.user.id, date: { $gte: start, $lte: end } }).sort({ date: -1 }),
      Budget.findOne({ userId: session.user.id, month }),
      Expense.aggregate([
        { $match: { userId:session.user.id, date: { $gte: start, $lte: end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const topCategory = categoryAgg[0] || null;

    return NextResponse.json({
      totalSpent,
      expenseCount: expenses.length,
      topCategory: topCategory ? { name: topCategory._id, amount: topCategory.total } : null,
      recentExpenses: expenses.slice(0, 5),
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