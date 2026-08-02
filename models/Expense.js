
import mongoose from "mongoose";
import { CATEGORIES } from "@/lib/utils";

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, 
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
