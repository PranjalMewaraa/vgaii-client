"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Download } from "lucide-react";
import { formatRupees } from "@/lib/currency";
import {
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  type PaymentMethod,
  type ExpenseCategory,
} from "@/lib/constants";
import { useStoredUser } from "@/lib/client-auth";

type Payment = {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  patientName?: string | null;
  patientPhone?: string | null;
  createdAt: string;
  lead?: { id: string; name: string; phone: string } | null;
  collectedBy?: { id: string; name?: string | null; email?: string | null } | null;
  items: Array<{ title: string; amount: number }>;
};

type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  createdBy?: { id: string; name?: string | null; email?: string | null } | null;
};

type Staff = { id: string; name?: string | null; email: string };

type Preset = "today" | "week" | "month" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  custom: "Custom",
};

const formatCategory = (c: string) =>
  c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase());

// Build [from, to] for the given preset. Returns ISO strings ready to drop
// into a URL.
const rangeFor = (preset: Preset, custom: { from: string; to: string }) => {
  const now = new Date();
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (preset === "month") {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  // custom — fall back to "today" if either date is missing.
  if (!custom.from || !custom.to) {
    return rangeFor("today", custom);
  }
  return {
    from: new Date(custom.from).toISOString(),
    to: new Date(`${custom.to}T23:59:59`).toISOString(),
  };
};

// CSV helpers — wrap quotes, double up existing quotes.
const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const blob = new Blob([rows.map(r => r.map(csvCell).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function ReportsTab() {
  const [section, setSection] = useState<"payments" | "expenses">("payments");

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex border-b border-slate-200">
          <SectionTab
            label="Payments"
            active={section === "payments"}
            onClick={() => setSection("payments")}
          />
          <SectionTab
            label="Expenses"
            active={section === "expenses"}
            onClick={() => setSection("expenses")}
          />
        </div>
      </div>
      {section === "payments" ? <PaymentsReport /> : <ExpensesReport />}
    </div>
  );
}

function SectionTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-indigo-600 text-indigo-700"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function PaymentsReport() {
  const user = useStoredUser();
  const isAdmin = user?.role === "CLIENT_ADMIN" || user?.role === "SUPER_ADMIN";

  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [staff, setStaff] = useState<string>("");

  const { from, to } = rangeFor(preset, { from: customFrom, to: customTo });

  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  if (method) params.set("method", method);
  if (staff) params.set("collectedBy", staff);
  const { data, isLoading } = useSWR<{ payments: Payment[] }>(
    `/api/payments?${params.toString()}`,
  );
  const payments = useMemo(() => data?.payments ?? [], [data]);

  // Staff list only fetched for admins — the endpoint is admin-only.
  const { data: staffData } = useSWR<{ staff: Staff[] }>(
    isAdmin ? "/api/staff" : null,
  );
  const staffOptions = staffData?.staff ?? [];

  const totals = useMemo(() => {
    let collected = 0;
    let pending = 0;
    for (const p of payments) {
      if (p.paymentMethod === "pending") pending += p.finalAmount;
      else collected += p.finalAmount;
    }
    return { collected, pending };
  }, [payments]);

  const exportCsv = () => {
    const rows: string[][] = [
      [
        "Date",
        "Patient",
        "Phone",
        "Items",
        "Amount",
        "Discount",
        "Final",
        "Method",
        "Collected by",
        "Notes",
      ],
      ...payments.map(p => [
        new Date(p.createdAt).toISOString(),
        p.lead?.name ?? p.patientName ?? "",
        p.lead?.phone ?? p.patientPhone ?? "",
        p.items.map(i => i.title).join(" + "),
        String(p.amount / 100),
        String(p.discount / 100),
        String(p.finalAmount / 100),
        p.paymentMethod,
        p.collectedBy?.name ?? p.collectedBy?.email ?? "",
        p.notes,
      ]),
    ];
    downloadCsv(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  };

  return (
    <div className="space-y-3">
      <FilterBar
        preset={preset}
        setPreset={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        extras={
          <>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Method
              </span>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as typeof method)}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            {isAdmin && (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Staff
                </span>
                <select
                  value={staff}
                  onChange={e => setStaff(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Anyone</option>
                  {staffOptions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        }
        onExport={payments.length > 0 ? exportCsv : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryTile
          label="Collected"
          value={formatRupees(totals.collected)}
          hint={`${payments.filter(p => p.paymentMethod !== "pending").length} payments`}
          tone="emerald"
        />
        <SummaryTile
          label="Pending"
          value={formatRupees(totals.pending)}
          hint={`${payments.filter(p => p.paymentMethod === "pending").length} entries`}
          tone="amber"
        />
        <SummaryTile
          label="Total entries"
          value={String(payments.length)}
          tone="slate"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">
            No payments in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Patient</th>
                  <th className="px-4 py-2 text-left">Items</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-left">Collected by</th>
                  <th className="px-4 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {p.lead?.name ?? p.patientName ?? "—"}
                      {(p.lead?.phone || p.patientPhone) && (
                        <span className="ml-2 text-xs text-slate-500">
                          {p.lead?.phone ?? p.patientPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      <span className="truncate">
                        {p.items.map(i => i.title).join(" + ")}
                      </span>
                      {p.discount > 0 && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          (−{formatRupees(p.discount)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {p.collectedBy?.name ?? p.collectedBy?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatRupees(p.finalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpensesReport() {
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState<"" | ExpenseCategory>("");

  const { from, to } = rangeFor(preset, { from: customFrom, to: customTo });

  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  if (category) params.set("category", category);
  const { data, isLoading } = useSWR<{ expenses: Expense[] }>(
    `/api/expenses?${params.toString()}`,
  );
  const expenses = useMemo(() => data?.expenses ?? [], [data]);

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }
    return { total, byCategory };
  }, [expenses]);

  const exportCsv = () => {
    const rows: string[][] = [
      ["Date", "Category", "Method", "Amount", "Created by", "Notes"],
      ...expenses.map(e => [
        new Date(e.createdAt).toISOString(),
        e.category,
        e.paymentMethod,
        String(e.amount / 100),
        e.createdBy?.name ?? e.createdBy?.email ?? "",
        e.notes,
      ]),
    ];
    downloadCsv(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-3">
      <FilterBar
        preset={preset}
        setPreset={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        extras={
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Category
            </span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as typeof category)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))}
            </select>
          </label>
        }
        onExport={expenses.length > 0 ? exportCsv : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryTile
          label="Total spent"
          value={formatRupees(totals.total)}
          hint={`${expenses.length} entries`}
          tone="rose"
        />
        <SummaryTile
          label="Top category"
          value={(() => {
            const top = [...totals.byCategory.entries()].sort(
              (a, b) => b[1] - a[1],
            )[0];
            return top ? formatCategory(top[0]) : "—";
          })()}
          tone="slate"
        />
        <SummaryTile
          label="Categories used"
          value={String(totals.byCategory.size)}
          tone="indigo"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">
            No expenses in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-left">Created by</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-t border-slate-200">
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(e.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {formatCategory(e.category)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {e.createdBy?.name ?? e.createdBy?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      <span className="line-clamp-1">{e.notes || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatRupees(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  extras,
  onExport,
}: {
  preset: Preset;
  setPreset: (p: Preset) => void;
  customFrom: string;
  setCustomFrom: (s: string) => void;
  customTo: string;
  setCustomTo: (s: string) => void;
  extras?: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "week", "month", "custom"] as Preset[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              preset === p
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download size={12} />
            Export CSV
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {preset === "custom" && (
          <>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                From
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                To
              </span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </>
        )}
        {extras}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber" | "rose" | "indigo" | "slate";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    indigo: "text-indigo-700",
    slate: "text-slate-900",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-bold leading-tight ${toneClass[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
