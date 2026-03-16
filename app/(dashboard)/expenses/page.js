/**
 * app/(dashboard)/expenses/page.js  — Expenses Page  /expenses
 *
 * WHAT IT DOES:
 * - Shows all expenses for the selected month in a table
 * - Add expense via modal form
 * - Edit expense inline via modal
 * - Delete expense with confirmation
 * - Filter by category
 * - Month selector to browse history
 *
 * PHASE 4 (Day 3): Build after API routes are complete.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonth, CATEGORIES, CATEGORY_ICONS } from "@/lib/utils";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // null = add mode

  // ── Fetch expenses ──────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ── Delete expense ──────────────────────────────────────────────────────────
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

  // ── Month navigation ────────────────────────────────────────────────────────
  function changeMonth(direction) {
    const [year, mon] = month.split("-").map(Number);
    const d = new Date(year, mon - 1 + direction, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered =
    filterCategory === "All"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Expenses
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {filtered.length} transactions · {formatCurrency(total)}
          </p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        >
          <Plus size={15} />
          Add Expense
        </button>
      </div>

      {/* Controls: month nav + category filter */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigator */}
        <div
          className="flex items-center gap-1 rounded-xl px-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium px-2 mono" style={{ color: "var(--text-primary)" }}>
            {format(new Date(month + "-01"), "MMM yyyy")}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field text-sm px-3 py-2 rounded-xl"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-5xl mb-3">🧾</span>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>
              No expenses found
            </p>
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
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr key={exp._id} className="table-row">
                  <td className="px-5 py-3.5">
                    <span className="text-sm mono" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(exp.date), "dd MMM")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {exp.title}
                    </p>
                    {exp.description && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {exp.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "#93c5fd",
                        border: "1px solid rgba(59,130,246,0.15)",
                      }}
                    >
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
                      <button
                        onClick={() => { setEditingExpense(exp); setShowModal(true); }}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="p-1.5 rounded-lg transition hover:text-red-400"
                        style={{ color: "var(--text-muted)" }}
                      >
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

      {/* Add/Edit Modal */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          defaultDate={month + "-01"}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSaved={() => { setShowModal(false); setEditingExpense(null); fetchExpenses(); }}
        />
      )}
    </div>
  );
}

// ── Expense Modal (Add + Edit) ────────────────────────────────────────────────
function ExpenseModal({ expense, defaultDate, onClose, onSaved }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    title: expense?.title || "",
    amount: expense?.amount || "",
    category: expense?.category || CATEGORIES[0],
    date: expense?.date
      ? format(new Date(expense.date), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    description: expense?.description || "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md relative" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "var(--text-muted)" }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title *">
            <input
              name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Lunch at restaurant"
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹) *">
              <input
                name="amount" type="number" min="0.01" step="0.01"
                value={form.amount} onChange={handleChange}
                placeholder="0.00"
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm mono"
              />
            </FormField>
            <FormField label="Date *">
              <input
                name="date" type="date" value={form.date} onChange={handleChange}
                className="input-field w-full px-4 py-2.5 rounded-xl text-sm"
              />
            </FormField>
          </div>

          <FormField label="Category *">
            <select
              name="category" value={form.category} onChange={handleChange}
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Description (optional)">
            <textarea
              name="description" value={form.description} onChange={handleChange}
              placeholder="Any extra notes..."
              rows={2}
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm resize-none"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
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

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
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
            <div
              key={j}
              className="h-5 rounded"
              style={{ width: w, background: "var(--bg-input)" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}