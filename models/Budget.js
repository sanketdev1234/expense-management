

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


BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.Budget ||
  mongoose.model("Budget", BudgetSchema);
