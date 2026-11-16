"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Banknote,
  CreditCard,
  Plus,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { rupeesToPaise, paiseToRupees, formatRupees } from "@/lib/currency";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/constants";

type ExpensePreset = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
};

type PresetsResponse = { presets: ExpensePreset[] };

type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  createdBy?: { name?: string | null; email?: string | null } | null;
};

type Response = { expenses: Expense[] };

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const METHOD_DEFS: Array<{
  key: PaymentMethod;
  label: string;
  icon: LucideIcon;
  className: string;
  activeClass: string;
}> = [
  {
    key: "cash",
    label: "Cash",
    icon: Banknote,
    className: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    activeClass: "border-emerald-500 bg-emerald-600 text-white shadow-sm",
  },
  {
    key: "upi",
    label: "UPI",
    icon: Smartphone,
    className: "border-green-200 bg-white text-green-700 hover:bg-green-50",
    activeClass: "border-green-500 bg-green-600 text-white shadow-sm",
  },
  {
    key: "card",
    label: "Card",
    icon: CreditCard,
    className: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    activeClass: "border-sky-500 bg-sky-600 text-white shadow-sm",
  },
  {
    key: "mixed",
    label: "Bank/Mixed",
    icon: Wallet,
    className: "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
    activeClass: "border-violet-500 bg-violet-600 text-white shadow-sm",
  },
];

const formatCategory = (c: string) =>
  c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase());

export default function ExpenseEntryTab() {
  const { data, mutate } = useSWR<Response>("/api/expenses");
  const expenses = data?.expenses ?? [];
  const { data: presetsData } = useSWR<PresetsResponse>("/api/expense-presets");
  const presets = presetsData?.presets ?? [];

  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const applyPreset = (p: ExpensePreset) => {
    setCategory(p.category);
    setAmountInput(String(paiseToRupees(p.amount)));
    setNotes(p.title);
  };

  const reset = () => {
    setCategory("miscellaneous");
    setAmountInput("");
    setMethod("cash");
    setNotes("");
  };

  const save = async () => {
    setError(null);
    setSavedMsg(null);
    const rupees = Number(amountInput);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      return setError("Amount must be a positive number");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          category,
          amount: rupeesToPaise(rupees),
          paymentMethod: method,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Failed to save");
        return;
      }
      setSavedMsg(`Logged ${formatRupees(rupeesToPaise(rupees))} expense`);
      reset();
      mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-5 lg:col-span-2">
        <div className="rounded-xl border border-slate-200/70 bg-white p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">New expense</h2>

          {presets.length > 0 && (
            <div className="mt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Presets
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                  >
                    <Plus size={12} />
                    <span>{p.title}</span>
                    <span className="text-xs text-slate-500">
                      {formatRupees(p.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {formatCategory(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Amount (₹)
              </span>
              <input
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>

          <div className="mt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payment method
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHOD_DEFS.map(m => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                      active ? m.activeClass : m.className
                    }`}
                  >
                    <Icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Vendor, invoice number, anything to remember…"
              className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          {savedMsg && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {savedMsg}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-[#1f3d2b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save expense"}
            </button>
          </div>
        </div>
      </section>

      <section className="lg:col-span-1">
        <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Recent</h2>
            <span className="text-xs text-slate-500">
              {expenses.length} entries
            </span>
          </div>
          {expenses.length === 0 ? (
            <p className="px-6 py-4 text-xs text-slate-500">
              No expenses logged yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.slice(0, 10).map(e => (
                <li key={e.id} className="px-6 py-3 transition-colors hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {formatCategory(e.category)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(e.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {e.paymentMethod}
                      </p>
                      {e.notes && (
                        <p className="truncate text-xs text-slate-600">
                          {e.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatRupees(e.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
