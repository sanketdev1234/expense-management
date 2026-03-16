/**
 * models/Budget.js
 *
 * WHY THIS FILE EXISTS:
 * Defines the shape of a Budget document in MongoDB.
 * One budget document per user per month.
 *
 * FIELDS:
 *   userId         — links to a user
 *   monthlyLimit   — total rupee limit for the month
 *   categoryLimits — Map of { "Food & Dining": 5000, "Shopping": 3000, ... }
 *   month          — "YYYY-MM" string, e.g. "2025-03"
 *
 * UNIQUE INDEX: (userId + month) ensures one budget per user per month.
 * If you save again for the same month, it updates — see the API route for
 * how we use findOneAndUpdate with upsert: true.
 */

import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    monthlyLimit: {
      type: Number,
      required: [true, "Monthly limit is required"],
      min: [0, "Limit cannot be negative"],
    },
    // Flexible map: category name → limit in rupees
    // Example: { "Food & Dining": 5000, "Travel": 10000 }
    categoryLimits: {
      type: Map,
      of: Number,
      default: {},
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one budget per user per month
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.Budget ||
  mongoose.model("Budget", BudgetSchema);
