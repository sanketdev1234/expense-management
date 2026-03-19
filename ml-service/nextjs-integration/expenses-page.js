// app/(dashboard)/expenses/page.js
// UPDATED VERSION — adds ML category auto-prediction when user types title
// Changes from original:
//   1. Added usePredictCategory hook in ExpenseModal
//   2. Title input has debounced prediction call
//   3. AI badge shown when category is auto-predicted
//   4. Anomaly warning shown after adding expense

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonth, CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";

// ── ML Hook: debounced category prediction ────────────────────────────────────
function usePredictCategory(title, enabled = true) {
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !title || title.length < 3) {
      setPrediction(null);
      return;
    }

    // Debounce — wait 600ms after user stops typing
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setPredicting(true);
      try {
        const res = await fetch("/api/ml/predict-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.category && data.confidence > 60) {
            setPrediction(data);
          } else {
            setPrediction(null);
          }
        }
      } catch {
        // Silently fail — ML is optional
      } finally {
        setPredicting(false);
      }
    }, 600);

    return () => clearTimeout(timerRef.current);
  }, [title, enabled]);

  return { prediction, predicting };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

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
        <div className="flex items-center gap-1 rounded-xl px-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium px-2 mono" style={{ color: "var(--text-primary)" }}>
            {format(new Date(month + "-01"), "MMM yyyy")}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field text-sm px-3 py-2 rounded-xl"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <TableSkeleton /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: "var(--text-muted)" }}>
            <span className="text-5xl mb-3">🧾</span>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>No expenses found</p>
            <p className="text-sm mt-1">
              {filterCategory !== "All" ? `No ${filterCategory} expenses this month` : "Click 'Add Expense' to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Date", "Title", "Category", "Amount", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr key={exp._id} className="table-row">
                  <td className="px-5 py-3.5">
                    <span className="text-sm mono" style={{ color: "var(--text-muted)" }}>{format(new Date(exp.date), "dd MMM")}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{exp.title}</p>
                    {exp.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{exp.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.15)" }}>
                      {CATEGORY_ICONS[exp.category]} {exp.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-bold mono" style={{ color: "#ef4444" }}>-{formatCurrency(exp.amount)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingExpense(exp); setShowModal(true); }} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(exp._id)} className="p-1.5 rounded-lg transition hover:text-red-400" style={{ color: "var(--text-muted)" }}>
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

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          allExpenses={expenses}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSaved={() => { setShowModal(false); setEditingExpense(null); fetchExpenses(); }}
        />
      )}
    </div>
  );
}

// ── Expense Modal with ML Category Prediction ─────────────────────────────────
function ExpenseModal({ expense, allExpenses, onClose, onSaved }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    title: expense?.title || "",
    amount: expense?.amount || "",
    category: expense?.category || CATEGORIES[0],
    date: expense?.date ? format(new Date(expense.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    description: expense?.description || "",
  });
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [anomalyWarning, setAnomalyWarning] = useState(null);

  // ML: predict category as user types title (only for new expenses)
  const { prediction, predicting } = usePredictCategory(form.title, !isEdit);

  // Auto-fill category when prediction arrives
  useEffect(() => {
    if (prediction && prediction.category && !isEdit) {
      setForm((prev) => ({ ...prev, category: prediction.category }));
      setAiUsed(true);
    }
  }, [prediction, isEdit]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "category") setAiUsed(false);
  }

  // Check anomaly before submitting
  async function checkAnomaly() {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    try {
      const res = await fetch("/api/ml/detect-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense: {
            title: form.title,
            amount: parseFloat(form.amount),
            category: form.category,
            date: form.date,
          },
          history: allExpenses.map((e) => ({
            title: e.title,
            amount: e.amount,
            category: e.category,
            date: new Date(e.date).toISOString().split("T")[0],
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_anomaly) setAnomalyWarning(data.reason);
      }
    } catch {
      // Fail silently
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.amount || !form.category || !form.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/expenses/${expense._id}` : "/api/expenses";
      const method = isEdit ? "PATCH" : "POST";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md relative" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "var(--text-muted)" }}>×</button>
        </div>

        {/* Anomaly Warning */}
        {anomalyWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <AlertTriangle size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: "#f59e0b" }}>{anomalyWarning}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title with ML indicator */}
          <FormField label="Title *">
            <div className="relative">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                onBlur={checkAnomaly}
                placeholder="e.g. Lunch at restaurant"
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm pr-10"
              />
              {predicting && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹) *">
              <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} placeholder="0.00" className="input-field w-full px-4 py-2.5 rounded-xl text-sm mono" />
            </FormField>
            <FormField label="Date *">
              <input name="date" type="date" value={form.date} onChange={handleChange} className="input-field w-full px-4 py-2.5 rounded-xl text-sm" />
            </FormField>
          </div>

          {/* Category with AI badge */}
          <FormField label={
            <span className="flex items-center gap-2">
              Category *
              {aiUsed && prediction && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                  <Sparkles size={10} /> AI {prediction.confidence}%
                </span>
              )}
            </span>
          }>
            <select name="category" value={form.category} onChange={handleChange} className="input-field w-full px-4 py-2.5 rounded-xl text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </FormField>

          <FormField label="Description (optional)">
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Any extra notes..." rows={2} className="input-field w-full px-4 py-2.5 rounded-xl text-sm resize-none" />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5 rounded-xl text-sm">
              {loading ? "Saving..." : isEdit ? "Update" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
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
