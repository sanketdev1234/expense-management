
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}


export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthRange(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}


export function calcPercent(spent, limit) {
  if (!limit || limit === 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}


export function getBudgetColor(percent) {
  if (percent >= 90) return "text-red-400";
  if (percent >= 70) return "text-yellow-400";
  return "text-emerald-400";
}


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
