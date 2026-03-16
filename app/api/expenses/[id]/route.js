/**
 * app/api/expenses/[id]/route.js
 *
 * PATCH  /api/expenses/:id  → update an expense
 * DELETE /api/expenses/:id  → delete an expense
 *
 * Security: we check that the expense's userId matches the logged-in user.
 * This prevents user A from deleting user B's expenses.
 *
 * PHASE 2 (Day 1–2): Create alongside the main expenses route.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";

// ── PATCH /api/expenses/:id ──────────────────────────────────────────────────
export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find expense and verify ownership
    const expense = await Expense.findOne({
      _id: params.id,
      userId: session.user.id, // ← ownership check
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, amount, category, date, description } = body;

    // Only update fields that were sent
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

// ── DELETE /api/expenses/:id ─────────────────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // findOneAndDelete with userId check = atomic + secure
    const deleted = await Expense.findOneAndDelete({
      _id: params.id,
      userId: session.user.id, // ← ownership check
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