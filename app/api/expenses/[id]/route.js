import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function PATCH(request,  {params} ) {
  try {
   
    const { id } = await params; 
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const expense = await Expense.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, amount, category, date, description } = body;

    if (title !== undefined) expense.title = title.trim();
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = new Date(date);
    if (description !== undefined) expense.description = description.trim();

    await expense.save();
    return NextResponse.json(expense);
  } catch (error) {
    console.error("PATCH /api/expenses/:id error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}


export async function DELETE(request, { params }) {
  try {
    const { id } = await params; 
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const deleted = await Expense.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/expenses/:id error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}