

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";


import { connectDB } from "@/lib/mongodb";
import Budget from "@/models/Budget";
import Expense from "@/models/Expense";
import { getMonthRange, getCurrentMonth } from "@/lib/utils";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || getCurrentMonth();

    await connectDB();

    const budget = await Budget.findOne({
      userId: session.user.id,
      month,
    });

    const { start, end } = getMonthRange(month);
    const categorySpending = await Expense.aggregate([
      {
        $match: {
          userId: session.user.id,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalSpent = categorySpending.reduce((sum, c) => sum + c.total, 0);

    return NextResponse.json({
      budget: budget
        ? {
            monthlyLimit: budget.monthlyLimit,
            categoryLimits: Object.fromEntries(budget.categoryLimits || new Map()),
            month: budget.month,
          }
        : null,
      totalSpent,
      categorySpending,
    });
  } catch (error) {
    console.error("GET /api/budget error:", error);
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { monthlyLimit, categoryLimits, month } = body;

    if (!monthlyLimit || !month) {
      return NextResponse.json(
        { error: "Monthly limit and month are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const budget = await Budget.findOneAndUpdate(
      { userId: session.user.id, month },
      {
        $set: {
          monthlyLimit: parseFloat(monthlyLimit),
          categoryLimits: categoryLimits || {},
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "Budget saved successfully",
      budget: {
        monthlyLimit: budget.monthlyLimit,
        categoryLimits: Object.fromEntries(budget.categoryLimits || new Map()),
        month: budget.month,
      },
    });
  } catch (error) {
    console.error("POST /api/budget error:", error);
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}