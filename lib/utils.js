/**
 * lib/utils.js
 *
 * Shared helper functions used across the app.
 * Keep pure functions here — no side effects, no DB calls.
 */

/**
 * Format a number as Indian Rupees
 * Example: 12500 → "₹12,500"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get current month in "YYYY-MM" format
 * Example: "2025-03"
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Parse a "YYYY-MM" string into start/end Date objects for MongoDB queries
 * Example: "2025-03" → { start: 2025-03-01 00:00:00, end: 2025-03-31 23:59:59 }
 */
export function getMonthRange(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Calculate what percentage `spent` is of `limit`
 * Returns 0–100 clamped
 */
export function calcPercent(spent, limit) {
  if (!limit || limit === 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}

/**
 * Return a Tailwind color class based on percentage used
 * Green < 70%, Yellow 70–89%, Red ≥ 90%
 */
export function getBudgetColor(percent) {
  if (percent >= 90) return "text-red-400";
  if (percent >= 70) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Expense categories list — single source of truth used in models + UI
 */
export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Other",
];

/**
 * Category emoji map for visual display
 */
export const CATEGORY_ICONS = {
  "Food & Dining": "🍽️",
  Transportation: "🚗",
  Shopping: "🛍️",
  Entertainment: "🎬",
  "Bills & Utilities": "💡",
  Healthcare: "🏥",
  Education: "📚",
  Travel: "✈️",
  Other: "📦",
};
