/**
 * models/Expense.js
 *
 * WHY THIS FILE EXISTS:
 * Defines the shape of an Expense document in MongoDB.
 *
 * FIELDS:
 *   userId      — links expense to a user (from session.user.id)
 *   title       — short description, e.g. "Lunch at Subway"
 *   amount      — in rupees, must be positive
 *   category    — must be one of the CATEGORIES array (enforced by enum)
 *   date        — when the expense occurred (can differ from createdAt)
 *   description — optional longer note
 *
 * INDEX: userId is indexed for fast per-user queries.
 */

import mongoose from "mongoose";
import { CATEGORIES } from "@/lib/utils";

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Speed up queries like "all expenses for user X"
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "Invalid category",
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);
