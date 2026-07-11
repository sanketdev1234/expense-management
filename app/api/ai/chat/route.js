// app/api/ai/chat/route.js

import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Budget from "@/models/Budget";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";
import { subMonths, format } from "date-fns";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // FIX 1: Extract previous_interaction_id sent from your frontend page components
  const { message, previous_interaction_id } = await request.json();
  const userId = session.user.id;
  const month = getCurrentMonth();

  await connectDB();

  // ── Fetch user's real data for RAG context ─────────────────
  const { start, end } = getMonthRange(month);

  const [expenses, budget, historicalExpenses] = await Promise.all([
    Expense.find({ userId, date: { $gte: start, $lte: end } })
      .sort({ date: -1 })
      .lean(),
    Budget.findOne({ userId, month }).lean(),
    Expense.find({
      userId,
      date: { $gte: subMonths(new Date(), 6) }
    }).lean(),
  ]);

  // Build category breakdown
  const catMap = {};
  expenses.forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  
  // ── FIX 2: Group historical items by month to feed monthly_totals ──
  const historicalMap = {};
  historicalExpenses.forEach((e) => {
    // Format date field into clean "YYYY-MM" keys
    const mKey = format(new Date(e.date), "yyyy-MM");
    historicalMap[mKey] = (historicalMap[mKey] || 0) + e.amount;
  });

  const monthlyTotals = Object.entries(historicalMap).map(([mName, total]) => ({
    month: mName,
    total: total
  })).sort((a, b) => b.month.localeCompare(a.month)); // Sort descending by month

  const historicalTotalSum = historicalExpenses.reduce((s, e) => s + e.amount, 0);
  const distinctMonthsCount = Object.keys(historicalMap).length || 1;
  const monthlyAvg = historicalTotalSum / distinctMonthsCount;
    
  const budgetLimit = budget?.monthlyLimit || null;
  const budgetPercent = budgetLimit
    ? Math.round((totalSpent / budgetLimit) * 100)
    : null;

  // ── Build user context matching chat.py RAG specifications ──
  const userContext = {
    month,
    total_spent: totalSpent,
    monthly_avg: monthlyAvg,
    expense_count: expenses.length,
    budget_limit: budgetLimit,
    budget_percent: budgetPercent,
    pattern_type: "Balanced",
    weekend_ratio: 1.9,
    category_breakdown: categoryBreakdown,
    monthly_totals: monthlyTotals, // Natively feeds chat.py loop instructions
    recent_expenses: expenses.slice(0, 8).map((e) => ({
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: format(new Date(e.date), "yyyy-MM-dd")
    })),
  };

  // ── Forward to Python ML service (passing interaction tracking metrics) ──
  const mlResponse = await fetch(
    `${process.env.ML_SERVICE_URL}/api/ml/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        previous_interaction_id: previous_interaction_id || null, // Pipeline flow bridge
        user_context: userContext,
      }),
    }
  );

  if (!mlResponse.ok) {
    return new Response("Error connecting to ML Service", { status: 500 });
  }

  // ── Native Stream Passthrough ──────────────────────────────
  const stream = new TransformStream();
  mlResponse.body.pipeTo(stream.writable);

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}