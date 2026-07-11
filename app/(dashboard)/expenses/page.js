"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, subMonths } from "date-fns";
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonth, CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";

// ── ML Hook: debounced category prediction ────────────────────────────────────
function usePredictCategory(title, enabled = true) {
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !title || title.trim().length < 4) {
      setPrediction(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setPredicting(true);
      try {
        const res = await fetch("/api/ml/predict-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.category && data.confidence > 50) {
            setPrediction(data);
          } else {
            setPrediction(null);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setPredicting(false);
      }
    }, 700);

    return () => clearTimeout(timerRef.current);
  }, [title, enabled]);

  return { prediction, predicting };
}

// ── Helper: safe date string from MongoDB date ────────────────────────────────
// Fixes timezone issue: "2026-06-01T10:30:00.000Z" → "2026-06-01"
// Using slice avoids timezone offset shifting the date
function toDateInputValue(isoString) {
  if (!isoString) return format(new Date(), "yyyy-MM-dd");
  // slice(0,10) gives "YYYY-MM-DD" directly from ISO string
  // avoids new Date() timezone conversion
  return new Date(isoString).toISOString().slice(0, 10);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [expenses,       setExpenses]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [month,          setMonth]          = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal,      setShowModal]      = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // ── Fetch 3 months of expenses for anomaly history ─────────────────────────
  // current month expenses → for table display
  // 3 months history → for anomaly detection
  const [expenseHistory, setExpenseHistory] = useState([]); // last 3 months flat array

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch current month for table
      const res  = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [month]);

  // Fetch 3 months of history for anomaly detection
  // Runs once on mount — not dependent on month navigation
  const fetchHistory = useCallback(async () => {
    try {
      const now = new Date();
      const months = [0, 1, 2].map((i) => {
        const d = subMonths(now, i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
      // Fetch all 3 months in parallel
      const results = await Promise.all(
        months.map((m) => fetch(`/api/expenses?month=${m}`).then((r) => r.json()))
      );
      // Flatten into one array
      const flat = results.flat().filter(Array.isArray(results[0]) ? Boolean : () => true);
      setExpenseHistory(flat.filter((e) => e && e.amount));
    } catch {
      // Silently fail — anomaly just won't work
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchHistory();  }, [fetchHistory]);

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Expense deleted");
        setExpenses((prev) => prev.filter((e) => e._id !== id));
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  function changeMonth(direction) {
    const [year, mon] = month.split("-").map(Number);
    const d = new Date(year, mon - 1 + direction, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const filtered = filterCategory === "All"
    ? expenses
    : expenses.filter((e) => e.category === filterCategory);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {filtered.length} transactions · {formatCurrency(total)}
          </p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        >
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl px-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium px-2 mono" style={{ color: "var(--text-primary)" }}>
            {format(new Date(month + "-01"), "MMM yyyy")}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field text-sm px-3 py-2 rounded-xl">
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <TableSkeleton /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center"
            style={{ color: "var(--text-muted)" }}>
            <span className="text-5xl mb-3">🧾</span>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>No expenses found</p>
            <p className="text-sm mt-1">
              {filterCategory !== "All"
                ? `No ${filterCategory} expenses this month`
                : "Click 'Add Expense' to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Date", "Title", "Category", "Amount", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp, i) => (
                <tr key={exp._id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  className="transition-opacity hover:opacity-80">
                  <td className="px-5 py-3.5">
                    <span className="text-sm mono" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(exp.date), "dd MMM")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{exp.title}</p>
                    {exp.description && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{exp.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.15)" }}>
                      {CATEGORY_ICONS[exp.category]} {exp.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-bold mono" style={{ color: "#ef4444" }}>
                      -{formatCurrency(exp.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingExpense(exp); setShowModal(true); }}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ color: "var(--text-muted)" }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(exp._id)}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ color: "#ef4444" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          expenseHistory={expenseHistory}   // ← 3 months history for anomaly
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSaved={() => {
            setShowModal(false);
            setEditingExpense(null);
            fetchExpenses();  // refresh table
            fetchHistory();   // refresh anomaly history too
          }}
        />
      )}
    </div>
  );
}

// ── Expense Modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ expense, expenseHistory = [], onClose, onSaved }) {
  const isEdit = !!expense;

  const [form, setForm] = useState({
    title:       expense?.title                          || "",
    amount:      expense?.amount?.toString()             || "",  // FIX: number → string
    category:    expense?.category                       || CATEGORIES[0],
    date:        expense?.date
                   ? toDateInputValue(expense.date)      // FIX: timezone-safe
                   : format(new Date(), "yyyy-MM-dd"),
    description: expense?.description                   || "",
  });

  const [loading,        setLoading]        = useState(false);
  const [aiUsed,         setAiUsed]         = useState(false);
  const [anomalyWarning, setAnomalyWarning] = useState(null);
  const [checkingAnomaly,setCheckingAnomaly]= useState(false);

  // ML category prediction — only for new expenses
  const { prediction, predicting } = usePredictCategory(form.title, !isEdit);

  // Auto-fill category when prediction arrives
  useEffect(() => {
    if (prediction?.category && !isEdit) {
      setForm((prev) => ({ ...prev, category: prediction.category }));
      setAiUsed(true);
    }
  }, [prediction, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "category") setAiUsed(false);   // clear AI badge on manual change
    if (name === "amount")   setAnomalyWarning(null); // clear warning on amount change
  }

  // ── Anomaly check on amount blur ───────────────────────────────────────────
  async function checkAnomaly() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;

    // Filter history to SAME category as current expense
    const sameCategoryHistory = expenseHistory.filter(
      (e) => e.category === form.category
    );

    // Need minimum 5 same-category expenses for meaningful Z-Score
    // If less than 5 → not enough data → skip silently
    if (sameCategoryHistory.length < 5) {
      setAnomalyWarning(null);
      return;
    }

    setCheckingAnomaly(true);
    setAnomalyWarning(null);
    try {
      const res = await fetch("/api/ml/scan-anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense: {
            title:    form.title || "New expense",
            amount:   amount,
            category: form.category,
            date:     form.date,
          },
          // Send full 3-month history — Python filters by category internally too
          history: expenseHistory.map((e) => ({
            title:    e.title,
            amount:   e.amount,
            category: e.category,
            date:     toDateInputValue(e.date),
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_anomaly) {
          setAnomalyWarning(data.reason);
        } else {
          setAnomalyWarning(null);
        }
      }
    } catch {
      // Silently fail — anomaly is optional
    } finally {
      setCheckingAnomaly(false);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.category || !form.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      const url    = isEdit ? `/api/expenses/${expense._id}` : "/api/expenses";
      const method = isEdit ? "PATCH"                        : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(isEdit ? "Expense updated!" : "Expense added!");
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md relative" style={{ maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} className="text-2xl leading-none"
            style={{ color: "var(--text-muted)" }}>×</button>
        </div>

        {/* Anomaly checking indicator */}
        {checkingAnomaly && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span style={{ color: "#f59e0b" }}>Checking for unusual spending...</span>
          </div>
        )}

        {/* Anomaly Warning Banner */}
        {anomalyWarning && !checkingAnomaly && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)" }}>
            <AlertTriangle size={15} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: "#f59e0b" }}>
              {anomalyWarning}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Title *
            </label>
            <div className="relative">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Uber ride, Pizza Hut, Netflix..."
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm pr-12"
              />
              {predicting && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Amount (₹) *
              </label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                onBlur={checkAnomaly}         // ← anomaly fires on blur
                placeholder="0.00"
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Date *
              </label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Category with AI badge */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-2">
                Category *
                {aiUsed && prediction && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                    <Sparkles size={10} />
                    AI {prediction.confidence.toFixed(0)}%
                  </span>
                )}
              </span>
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Description (optional)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Any extra notes..."
              rows={2}
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
            >
              {loading ? "Saving..." : isEdit ? "Update" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[80, 200, 140, 80, 60].map((w, j) => (
            <div key={j} className="h-5 rounded" style={{ width: w, background: "var(--bg-input)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}