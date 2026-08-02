
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";


import { connectDB } from "@/lib/mongodb";
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


    const { start, end } = getMonthRange(month);

    const expenses = await Expense.find({
      userId: session.user.id,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 }); 

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}


export async function POST(request) {
  try {
   const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, amount, category, date, description } = body;

    if (!title || !amount || !category || !date) {
      return NextResponse.json(
        { error: "Title, amount, category, and date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const expense = await Expense.create({
      userId: session.user.id,
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      date: new Date(date),
      description: description?.trim() || "",
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json({ error: messages[0] }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
