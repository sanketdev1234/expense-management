// app/api/ai/context/route.js
// Called ONCE when chat page loads
// Returns all user financial context

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Budget from "@/models/Budget";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";
import { subMonths } from "date-fns";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = session.user.id;
  const month  = getCurrentMonth();
  const { start, end } = getMonthRange(month);

  // ALL 3 queries run in parallel — once only
  const [currentExpenses, budget, historicalExpenses] = await Promise.all([
    Expense.find({ userId, date: { $gte: start, $lte: end } })
           .sort({ date: -1 })
           .lean(),
    Budget.findOne({ userId, month }).lean(),
    Expense.find({ userId, date: { $gte: subMonths(new Date(), 6) } })
           .lean(),
  ]);

  // Build monthly totals from historical
  const monthlyMap = {};
  historicalExpenses.forEach((e) => {
    const m = new Date(e.date).toISOString().slice(0, 7);
    monthlyMap[m] = (monthlyMap[m] || 0) + e.amount;
  });
  const monthlyTotals = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  // Category breakdown
  const catMap = {};
  currentExpenses.forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalSpent    = currentExpenses.reduce((s, e) => s + e.amount, 0);
  const monthlyAvg    = monthlyTotals.length > 0
    ? monthlyTotals.reduce((s, m) => s + m.total, 0) / monthlyTotals.length
    : 0;
  const budgetLimit   = budget?.monthlyLimit || null;
  const budgetPercent = budgetLimit
    ? Math.round((totalSpent / budgetLimit) * 100)
    : null;

  // Build complete context — sent with every message
  return NextResponse.json({
    month,
    total_spent:        totalSpent,
    monthly_avg:        Math.round(monthlyAvg),
    expense_count:      currentExpenses.length,
    budget_limit:       budgetLimit,
    budget_percent:     budgetPercent,
    pattern_type:       "Balanced",
    weekend_ratio:      1.9,
    monthly_totals:     monthlyTotals,
    category_breakdown: categoryBreakdown,
    recent_expenses:    currentExpenses.slice(0, 8).map((e) => ({
      title:    e.title,
      category: e.category,
      amount:   e.amount,
      date:     new Date(e.date).toISOString().split("T")[0],
    })),
  });
}